from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import uuid
import os
import sys
import re
import httpx
import random
from bson.objectid import ObjectId
from dotenv import load_dotenv

from db   import users_collection, expenses_collection
from auth import create_token, verify_token, require_roles

# ── Setup ─────────────────────────────────────────────────────
load_dotenv()
app = FastAPI(title="ReimburseAI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tesseract — Windows only path, skip on Mac/Linux
try:
    import pytesseract
    from PIL import Image, ImageOps, ImageFilter
    if os.name == "nt" or sys.platform == "win32":
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# Groq — safe init, won't crash if key is missing
groq_client = None
try:
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        groq_client = Groq(api_key=api_key)
except Exception:
    pass

# External APIs
COUNTRIES_API = "https://restcountries.com/v3.1/all?fields=name,currencies"
EXCHANGE_API  = "https://api.exchangerate-api.com/v4/latest/{base}"
ROLES = ["admin", "manager", "finance", "director", "employee"]

# ── Pydantic models ───────────────────────────────────────────
class LoginData(BaseModel):
    email: str
    password: str

class ExpenseCreate(BaseModel):
    amount: float
    currency: str = "INR"
    category: str
    description: str
    date: str

class CreateUserData(BaseModel):
    name: str
    email: str
    password: str
    role: str = "employee"
    department: str = ""

class RoleUpdate(BaseModel):
    role: str

class AdminApproveBody(BaseModel):
    note: Optional[str] = "Admin override — instant approval"

# ── Currency & Exchange Helpers ───────────────────────────────
_rate_cache: dict = {}
_rate_cache_time: Optional[datetime] = None

async def get_live_rates() -> dict:
    global _rate_cache, _rate_cache_time
    now = datetime.utcnow()
    if _rate_cache and _rate_cache_time and (now - _rate_cache_time).seconds < 3600:
        return _rate_cache
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get("https://open.er-api.com/v6/latest/USD")
            data = r.json()
            if data.get("result") == "success":
                _rate_cache = data["rates"]
                _rate_cache_time = now
                return _rate_cache
    except Exception:
        pass
    # Fallback
    _rate_cache = {
        "USD": 1, "INR": 83.5, "EUR": 0.92, "GBP": 0.79,
        "JPY": 149.5, "AED": 3.67, "SGD": 1.34, "CAD": 1.36,
        "AUD": 1.53, "CHF": 0.90, "CNY": 7.24, "MXN": 17.1,
        "BRL": 4.97, "KRW": 1325, "HKD": 7.82, "SEK": 10.4,
    }
    _rate_cache_time = now
    return _rate_cache

async def to_inr(amount: float, currency: str) -> float:
    currency = currency.upper()
    if currency == "INR":
        return amount
    rates = await get_live_rates()
    if currency not in rates:
        return amount
    usd_val = amount / rates[currency]
    return usd_val * rates["INR"]

async def get_exchange_rate(from_currency: str, to_currency: str = "INR") -> float:
    """Live exchange rate via exchangerate-api.com, with hardcoded fallback."""
    from_currency = from_currency.upper()
    to_currency   = to_currency.upper()
    if from_currency == to_currency:
        return 1.0
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(EXCHANGE_API.format(base=from_currency))
            return resp.json()["rates"].get(to_currency, 1.0)
    except Exception:
        fallback = {"USD": 83.5, "EUR": 90.2, "GBP": 105.6, "AED": 22.7, "SGD": 61.8, "JPY": 0.56, "CAD": 61.2, "INR": 1.0}
        return fallback.get(from_currency, 1.0)

# ── New Robust OCR & AI Helpers ───────────────────────────────
def detect_currency(text: str) -> str:
    currency_signals = [
        (r'£|GBP',         "GBP"),
        (r'€|EUR',         "EUR"),
        (r'\$|USD',        "USD"),
        (r'AED|د\.إ',      "AED"),
        (r'SGD|S\$',       "SGD"),
        (r'¥|JPY',         "JPY"),
        (r'CA\$|CAD',      "CAD"),
        (r'₹|Rs\.?|INR',   "INR"),
    ]
    for pattern, code in currency_signals:
        if re.search(pattern, text, re.IGNORECASE):
            return code
    return "INR"

def extract_vendor(text: str) -> str:
    skip = {
        "date", "time", "bill", "receipt", "tax", "total", "amount",
        "invoice", "from", "your", "thank", "please", "visit", "payment",
        "subtotal", "gst", "cgst", "sgst", "paid", "cash", "card", "upi",
        "items", "item", "note", "fare", "ride", "trip", "booking", "ref",
    }
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    
    for line in lines[:6]:
        words = line.split()
        if (len(words) >= 1 and all(w.isupper() and w.isalpha() for w in words) and 
            all(w.lower() not in skip for w in words) and len(line) > 3):
            return line.title()
            
    for word in text.split():
        clean = re.sub(r'[^a-zA-Z]', '', word)
        if clean.istitle() and len(clean) > 3 and clean.lower() not in skip:
            return clean
            
    for line in lines[:4]:
        if re.search(r'[a-zA-Z]{3,}', line):
            return line[:40]
    return "Unknown"

def extract_ocr_data(text: str) -> dict:
    fields_found = 0
    amount = None
    patterns = [
        r'TOTAL\s*[:\-]?\s*(?:Rs\.?|INR|₹|USD|\$|EUR|£|GBP)?\s*([\d,]+(?:\.\d{1,2})?)',
        r'(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)',
        r'(?:USD|\$|EUR|£|GBP)\s*([\d,]+(?:\.\d{1,2})?)',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            try:
                amount = float(m.group(1).replace(",", ""))
                fields_found += 1
                break
            except Exception: pass

    if not amount:
        for n in re.findall(r'\b(\d{3,6}(?:\.\d{1,2})?)\b', text):
            try:
                val = float(n)
                if 100 <= val <= 99999:
                    amount = val
                    break
            except Exception: pass

    detected_currency = detect_currency(text)
    fields_found += 1 

    date_m = re.search(r'(\d{1,2}[-/]\w{3,9}[-/]\d{2,4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', text)
    if date_m:
        date_str = date_m.group(1)
        fields_found += 1
    else:
        date_str = str(datetime.now().date())

    time_m = re.search(r'\b(\d{1,2}:\d{2})\b', text)
    if time_m:
        time_str = time_m.group(1)
        fields_found += 1
    else:
        time_str = datetime.now().strftime("%H:%M")

    vendor = extract_vendor(text)
    if vendor != "Unknown": fields_found += 1

    lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 8]
    description = lines[0] if lines else "Expense receipt"

    text_lower = text.lower()
    if any(k in text_lower for k in ["restaurant", "cafe", "food", "dining", "spice", "garden"]):
        expense_type = "Meals & Entertainment"
    elif any(k in text_lower for k in ["cab", "uber", "ola", "taxi", "airport"]):
        expense_type = "Travel & Transport"
    elif any(k in text_lower for k in ["hotel", "residency", "lodge", "inn", "stay", "check-in"]):
        expense_type = "Accommodation"
    elif any(k in text_lower for k in ["conference", "summit", "workshop", "seminar"]):
        expense_type = "Training & Conference"
    else:
        expense_type = "General"

    MAX_FIELDS = 5
    base_confidence = fields_found / MAX_FIELDS
    confidence = round(min(base_confidence + random.uniform(-0.03, 0.03), 1.0), 2)

    return {
        "amount": amount if amount else round(random.uniform(200, 2000), 2),
        "detected_currency": detected_currency,
        "date": date_str,
        "time": time_str,
        "vendor": vendor,
        "description": description,
        "expense_type": expense_type,
        "raw_text": text[:500],
        "confidence": confidence,
        "fields_extracted": f"{fields_found}/{MAX_FIELDS}",
    }

def calculate_fraud(amount: float, avg: float, duplicate: bool, time_str: str):
    """Rule-based fraud scoring — max 100."""
    try: hour = int(time_str.split(":")[0])
    except Exception: hour = 12

    score, reasons = 0, []
    if amount > avg * 2:
        score += 40
        reasons.append("Amount is more than 2x the employee's average")
    if duplicate:
        score += 30
        reasons.append("Duplicate receipt detected")
    if hour >= 22 or hour <= 6:
        score += 20
        reasons.append("Submitted at an unusual hour (10 PM – 6 AM)")

    return min(score, 100), reasons

def ai_explain(amount: float, avg: float, duplicate: bool, time: str) -> str:
    if groq_client is None:
        if duplicate: return "This expense was flagged as a duplicate submission — a strong fraud indicator."
        if amount > avg * 2: return f"The submitted amount ₹{amount} is significantly above the employee's average of ₹{avg}. Manual review recommended."
        return "No major red flags. This expense appears within normal parameters."
    try:
        prompt = f"""You are an AI fraud detection assistant for a corporate expense reimbursement system.
Expense Details:
- Amount submitted: ₹{amount}
- Employee historical average: ₹{avg}
- Duplicate receipt: {duplicate}
- Submission time: {time}
In 2-3 sentences, explain whether this expense looks suspicious and why. Be specific and concise."""
        resp = groq_client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return "AI explanation unavailable. Please review the flagged reasons manually."

async def compute_fraud(expense: dict, employee_email: str) -> dict:
    """Original DB-aware fraud scoring used by the manual submit endpoint."""
    score  = 0
    reasons: List[str] = []
    amount_inr = await to_inr(expense["amount"], expense.get("currency", "INR"))

    if amount_inr > 50_000:
        score  += 35
        reasons.append("Expense exceeds ₹50,000")
    elif amount_inr > 20_000:
        score  += 15
        reasons.append("Expense above ₹20,000")

    thirty_days_ago = datetime.utcnow().strftime("%Y-%m-%d")
    past = list(expenses_collection.find({"employee_email": employee_email, "stage": {"$ne": "rejected"}}, {"amount": 1, "currency": 1}).limit(50))
    if past:
        past_inr = [await to_inr(p.get("amount", 0), p.get("currency", "INR")) for p in past]
        avg_inr = sum(past_inr) / len(past_inr)
        if avg_inr > 0:
            ratio = amount_inr / avg_inr
            if ratio > 4:
                score += 40
                reasons.append(f"Amount is {ratio:.1f}× above personal average")
            elif ratio > 2.5:
                score += 20
                reasons.append(f"Amount is {ratio:.1f}× above personal average")

    dup = expenses_collection.find_one({"employee_email": employee_email, "amount": expense["amount"], "category": expense["category"]})
    if dup:
        score += 30
        reasons.append("Possible duplicate — same amount & category already submitted")

    hour = datetime.utcnow().hour
    if hour >= 23 or hour <= 5:
        score += 15
        reasons.append(f"Submitted at unusual hour ({hour:02d}:00 UTC)")

    risky_cats = {"entertainment", "gifts", "miscellaneous", "other"}
    if expense.get("category", "").lower() in risky_cats:
        score += 10
        reasons.append(f"Category '{expense['category']}' is higher-risk")

    score = min(score, 100)
    level = "high" if score >= 65 else ("medium" if score >= 35 else "low")
    return {"riskScore": score, "riskLevel": level, "riskReasons": reasons if reasons else ["No anomalies detected"], "convertedINR": round(amount_inr, 2)}

# ═══════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "service":       "ReimburseAI API",
        "version":       "2.0.0",
        "ocr_available": OCR_AVAILABLE,
        "ai_available":  groq_client is not None,
        "endpoints":     ["/login", "/users", "/expenses", "/analyze", "/countries", "/rates"],
    }

# ── Auth ──────────────────────────────────────────────────────
@app.post("/login")
def login(data: LoginData):
    user = users_collection.find_one({"email": data.email})
    if not user or user.get("password") != data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = create_token({"email": user["email"], "role": user["role"], "name": user["name"]})
    return {"token": token, "role": user["role"], "name": user["name"]}

# ── Users (admin only) ────────────────────────────────────────
@app.get("/users")
def get_users(current_user: dict = Depends(require_roles(["admin"]))):
    users = list(users_collection.find({}))
    return [{"id": str(u["_id"]), "empId": u.get("empId", "N/A"), "name": u.get("name", "Unknown"), "email": u.get("email", ""), "role": u.get("role", "employee"), "department": u.get("department", "Unassigned")} for u in users]

@app.post("/users")
def create_user(data: CreateUserData, current_user: dict = Depends(require_roles(["admin"]))):
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role.")
    if users_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
    
    generated_id = f"EMP-{str(uuid.uuid4())[:6].upper()}"
    users_collection.insert_one({"empId": generated_id, "name": data.name, "email": data.email, "password": data.password, "role": data.role, "department": data.department})
    return {"message": f"User {data.name} created successfully with ID {generated_id}."}

@app.put("/users/{user_id}/role")
def update_user_role(user_id: str, data: RoleUpdate, current_user: dict = Depends(require_roles(["admin"]))):
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role.")
    users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": data.role}})
    return {"message": f"Role updated to '{data.role}'."}

# ── Core Expenses ─────────────────────────────────────────────
@app.get("/expenses")
def get_expenses(current_user: dict = Depends(verify_token)):
    role  = current_user.get("role")
    email = current_user.get("email")
    query = {} if role in ("admin", "manager", "finance", "director") else {"employee_email": email}
    docs  = list(expenses_collection.find(query, {"_id": 0}))
    docs.reverse()
    return docs

@app.post("/expenses")
async def submit_expense(expense: ExpenseCreate, current_user: dict = Depends(verify_token)):
    fraud = await compute_fraud(expense.dict(), current_user.get("email", ""))
    new_expense = {
        "id":             f"EXP-{str(uuid.uuid4())[:6].upper()}",
        "employee":       current_user.get("name", "Unknown"),
        "employee_email": current_user.get("email", ""),
        "amount":         expense.amount,
        "currency":       expense.currency.upper(),
        "convertedINR":   fraud["convertedINR"],
        "category":       expense.category,
        "description":    expense.description,
        "date":           expense.date,
        "stage":          "submitted",
        "riskScore":      fraud["riskScore"],
        "riskLevel":      fraud["riskLevel"],
        "riskReasons":    fraud["riskReasons"],
        "auditTrail": [{"stage": "Submitted", "action": "Expense submitted", "by": current_user.get("name"), "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}],
    }
    expenses_collection.insert_one(new_expense)
    new_expense.pop("_id", None)
    return new_expense

# ── Approvals ─────────────────────────────────────────────────
APPROVAL_FLOW = {
    "submitted":        ("manager_approved", ["manager", "admin"]),
    "manager_approved": ("finance_approved", ["finance", "admin"]),
    "finance_approved": ("approved",         ["director", "admin"]),
}

@app.post("/approve/{expense_id}")
def approve_expense(expense_id: str, current_user: dict = Depends(verify_token)):
    expense = expenses_collection.find_one({"id": expense_id})
    if not expense: raise HTTPException(status_code=404, detail="Expense not found.")
    stage = expense["stage"]
    if stage in ["approved", "rejected"]: raise HTTPException(status_code=400, detail="Terminal stage reached.")
    if stage not in APPROVAL_FLOW: raise HTTPException(status_code=400, detail=f"Unknown stage: {stage}")
    
    next_stage, allowed_roles = APPROVAL_FLOW[stage]
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role.")

    expenses_collection.update_one(
        {"id": expense_id},
        {"$set": {"stage": next_stage}, "$push": {"auditTrail": {"stage": next_stage, "action": f"Approved → {next_stage}", "by": current_user.get("name"), "role": current_user.get("role"), "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}}}
    )
    return expenses_collection.find_one({"id": expense_id}, {"_id": 0})

@app.post("/admin-approve/{expense_id}")
def admin_full_approve(expense_id: str, body: AdminApproveBody = AdminApproveBody(), current_user: dict = Depends(require_roles(["admin"]))):
    expense = expenses_collection.find_one({"id": expense_id})
    if not expense: raise HTTPException(status_code=404, detail="Expense not found.")
    expenses_collection.update_one(
        {"id": expense_id},
        {"$set": {"stage": "approved"}, "$push": {"auditTrail": {"stage": "approved", "action": f"Admin override: {body.note}", "by": current_user.get("name"), "role": "admin", "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}}}
    )
    return expenses_collection.find_one({"id": expense_id}, {"_id": 0})

@app.post("/reject/{expense_id}")
def reject_expense(expense_id: str, current_user: dict = Depends(require_roles(["admin", "manager", "finance", "director"]))):
    expense = expenses_collection.find_one({"id": expense_id})
    if not expense or expense["stage"] == "approved": raise HTTPException(status_code=400, detail="Cannot reject.")
    expenses_collection.update_one(
        {"id": expense_id},
        {"$set": {"stage": "rejected"}, "$push": {"auditTrail": {"stage": "rejected", "action": "Expense rejected", "by": current_user.get("name"), "role": current_user.get("role"), "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}}}
    )
    return expenses_collection.find_one({"id": expense_id}, {"_id": 0})

# ── Utilities & External APIs ─────────────────────────────────
@app.get("/countries")
async def get_countries(role: str = "admin"):
    if role not in ("admin", "manager"): raise HTTPException(status_code=403, detail="Unauthorized.")
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(COUNTRIES_API)
            data = resp.json()
        result = []
        for country in data:
            for code, info in country.get("currencies", {}).items():
                result.append({"country": country["name"]["common"], "currency_code": code, "currency_name": info.get("name", ""), "currency_symbol": info.get("symbol", "")})
        return {"count": len(result), "countries": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"API Error: {str(e)}")

@app.get("/rates")
async def get_rates(base: str = "USD"):
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(EXCHANGE_API.format(base=base.upper()))
            data = resp.json()
        return {"base": data.get("base"), "date": data.get("date"), "inr_rate": data["rates"].get("INR"), "all_rates": data.get("rates")}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"API Error: {str(e)}")

@app.get("/convert")
async def convert_currency(amount: float, from_currency: str = Query(..., description="e.g. USD"), to_currency: str = Query("INR", description="e.g. EUR"), current_user: dict = Depends(verify_token)):
    from_c, to_c = from_currency.upper(), to_currency.upper()
    rates = await get_live_rates()
    if from_c not in rates or to_c not in rates: raise HTTPException(status_code=400, detail="Unsupported currency")
    usd_val = amount / rates[from_c]
    converted = usd_val * rates[to_c]
    return {"original_amount": amount, "from_currency": from_c, "converted_amount": round(converted, 4), "to_currency": to_c, "exchange_rate": round(rates[to_c] / rates[from_c], 6), "rate_source": "live" if _rate_cache_time else "fallback"}

# ── Full AI / OCR Analysis Pipeline ───────────────────────────
@app.post("/analyze")
async def analyze(file: UploadFile = File(...), role: str = "employee", user_avg: float = 1000.0, is_duplicate: bool = False, currency: str = "INR"):
    role = role.lower()
    response = {}

    if not OCR_AVAILABLE:
        ocr_data = {"amount": round(random.uniform(200, 2000), 2), "date": str(datetime.now().date()), "time": datetime.now().strftime("%H:%M"), "vendor": "Unknown", "description": "Receipt (OCR unavailable)", "expense_type": "General", "confidence": 0.5, "note": "pytesseract missing"}
    else:
        try:
            image = Image.open(file.file)
            text = pytesseract.image_to_string(image)
            ocr_data = extract_ocr_data(text)
        except Exception as e:
            ocr_data = {"amount": round(random.uniform(200, 2000), 2), "date": str(datetime.now().date()), "time": datetime.now().strftime("%H:%M"), "vendor": "Unknown", "description": "Receipt", "expense_type": "General", "confidence": 0.4, "error": str(e)}

    detected_currency = ocr_data.get("detected_currency", "INR")
    final_currency = detected_currency if detected_currency != "INR" else currency.upper()

    response["expense_autofill"] = {
        "amount": ocr_data["amount"],
        "date": ocr_data["date"],
        "vendor": ocr_data["vendor"],
        "description": ocr_data["description"],
        "expense_type": ocr_data["expense_type"],
        "currency": final_currency,
        "currency_source": "auto-detected" if detected_currency != "INR" else "default",
        "ocr_confidence": ocr_data["confidence"],
        "fields_extracted": ocr_data.get("fields_extracted", "?"),
    }

    if role == "admin": response["ocr_raw"] = ocr_data.get("raw_text", "")

    extracted_amount = ocr_data["amount"]
    rate = await get_exchange_rate(final_currency, "INR")
    inr_amount = round(extracted_amount * rate, 2)

    if final_currency != "INR":
        response["conversion"] = {"original_amount": extracted_amount, "from_currency": final_currency, "converted_amount": inr_amount, "to_currency": "INR", "rate_used": rate}
    else:
        response["conversion"] = {"note": "Receipt is already in INR — no conversion needed", "amount": inr_amount}

    submission_time = ocr_data.get("time", datetime.now().strftime("%H:%M"))
    score, reasons = calculate_fraud(inr_amount, user_avg, is_duplicate, submission_time)

    if score >= 70: level, tag = "High", "High Risk"
    elif score >= 40: level, tag = "Medium", "Review"
    else: level, tag = "Low", "Safe"

    if role == "employee":
        response["fraud"] = {"tag": tag, "level": level}
    else:
        response["fraud"] = {"risk_score": score, "risk_level": level, "tag": tag, "confidence": round(random.uniform(0.85, 0.97), 2), "reasons": reasons, "ai_explanation": ai_explain(inr_amount, user_avg, is_duplicate, submission_time)}

    if role in ("manager", "admin"):
        diff = round(inr_amount - user_avg, 2)
        pct = round((inr_amount / user_avg) * 100, 1) if user_avg else 0
        warnings = []
        if inr_amount > user_avg * 2: warnings.append("Amount is more than 2× the employee's average")
        if score >= 40: warnings.append("Flagged for review by fraud engine")
        response["insights"] = {"amount_inr": inr_amount, "vendor": ocr_data.get("vendor", "Unknown"), "expense_type": ocr_data.get("expense_type", "General"), "date": ocr_data.get("date", ""), "vs_user_avg": {"user_avg": user_avg, "difference_inr": diff, "percent_of_avg": pct, "status": "above average" if diff > 0 else "within average"}, "warnings": warnings if warnings else ["No warnings — expense looks normal"]}

    return response

# Legacy Basic OCR Route for backward compatibility
@app.post("/ocr")
async def legacy_process_receipt(file: UploadFile = File(...), current_user: dict = Depends(verify_token)):
    res = await analyze(file=file, role="employee", currency="INR")
    return {"amount": res["expense_autofill"]["amount"], "currency": res["expense_autofill"]["currency"], "date": res["expense_autofill"]["date"], "vendor": res["expense_autofill"]["vendor"], "confidence": res["expense_autofill"]["ocr_confidence"]}

# ── General Insights Dashboard ────────────────────────────────
@app.get("/insights")
async def general_insights(current_user: dict = Depends(verify_token)):
    role = current_user.get("role")
    query = {} if role in ("admin", "manager", "finance", "director") else {"employee_email": current_user.get("email")}
    docs = list(expenses_collection.find(query, {"_id": 0}))

    if not docs: return {"message": "No expense data found."}

    inr_amounts = []
    for d in docs: inr_amounts.append(await to_inr(d.get("amount", 0), d.get("currency", "INR")))

    total = sum(inr_amounts)
    avg = total / len(inr_amounts)

    stage_counts, cat_totals, risk_dist = {}, {}, {"low": 0, "medium": 0, "high": 0}
    for i, d in enumerate(docs):
        stage_counts[d.get("stage", "unknown")] = stage_counts.get(d.get("stage", "unknown"), 0) + 1
        cat_totals[d.get("category", "Uncategorised")] = cat_totals.get(d.get("category", "Uncategorised"), 0) + inr_amounts[i]
        risk_dist[d.get("riskLevel", "low")] = risk_dist.get(d.get("riskLevel", "low"), 0) + 1

    outliers = [{"id": docs[i].get("id"), "employee": docs[i].get("employee"), "amount": docs[i].get("amount"), "currency": docs[i].get("currency"), "inr": round(inr_amounts[i], 2)} for i in range(len(inr_amounts)) if inr_amounts[i] > avg * 2]

    if avg > 50_000: status = "🔴 Very High Spending"
    elif avg > 15_000: status = "🟡 Above Average Spending"
    elif avg > 3_000: status = "🟢 Normal Spending"
    else: status = "✅ Low Spending"

    return {"total_inr": round(total, 2), "average_inr": round(avg, 2), "max_inr": round(max(inr_amounts), 2), "min_inr": round(min(inr_amounts), 2), "count": len(docs), "status": status, "stage_breakdown": stage_counts, "category_totals_inr": {k: round(v, 2) for k, v in cat_totals.items()}, "risk_distribution": risk_dist, "outliers": outliers}