from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import uuid
import random
from bson.objectid import ObjectId

from db import users_collection, expenses_collection
from auth import create_token, verify_token

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginData(BaseModel):
    email: str
    password: str

class ExpenseCreate(BaseModel):
    amount: float
    currency: str
    category: str
    description: str
    date: str

class RoleUpdate(BaseModel):
    role: str

@app.post("/login")
def login(data: LoginData):
    user = users_collection.find_one({"email": data.email})
    if not user or user.get("password") != data.password:
        return {"error": "Invalid credentials."}
    
    token = create_token({"email": user["email"], "role": user["role"], "name": user["name"]})
    return {"token": token, "role": user["role"]}

# --- NEW USER ENDPOINTS ---

@app.get("/users")
def get_users(current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view users")
    
    users = list(users_collection.find({}))
    result = []
    for u in users:
        result.append({
            "id": str(u["_id"]),
            "name": u.get("name", "Unknown"),
            "email": u.get("email", ""),
            "role": u.get("role", "employee"),
            "department": u.get("department", "Unassigned")
        })
    return result

@app.put("/users/{user_id}/role")
def update_user_role(user_id: str, data: RoleUpdate, current_user: dict = Depends(verify_token)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update roles")
    
    users_collection.update_one(
        {"_id": ObjectId(user_id)}, 
        {"$set": {"role": data.role}}
    )
    return {"message": "Role updated successfully"}

# --- EXPENSE ENDPOINTS ---

@app.get("/expenses")
def get_expenses(current_user: dict = Depends(verify_token)):
    docs = list(expenses_collection.find({}, {"_id": 0}))
    docs.reverse() # Newest first
    return docs

@app.post("/expenses")
def submit_expense(expense: ExpenseCreate, current_user: dict = Depends(verify_token)):
    risk_score = random.randint(5, 85)
    risk_level = "low" if risk_score < 30 else "medium" if risk_score < 60 else "high"
    
    new_expense = {
        "id": f"EXP-{str(uuid.uuid4())[:6].upper()}",
        "employee": current_user.get("name", "Arjun Mehta"),
        "amount": expense.amount,
        "currency": expense.currency,
        "convertedINR": expense.amount,
        "category": expense.category,
        "description": expense.description,
        "date": expense.date,
        "stage": "submitted",
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "riskReasons": ["AI Flagged"] if risk_level != "low" else ["Clear"],
        "auditTrail": [{"stage": "Submitted", "action": "Expense submitted", "by": current_user.get("name", "Employee"), "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}]
    }
    expenses_collection.insert_one(new_expense)
    new_expense.pop('_id', None)
    return new_expense

@app.post("/approve/{expense_id}")
def approve_expense(expense_id: str, current_user: dict = Depends(verify_token)):
    expense = expenses_collection.find_one({"id": expense_id})
    if not expense: return {"error": "Not found"}
    
    next_stage = "approved" if expense["stage"] in ["manager_approved", "finance_approved"] else "manager_approved"
    
    expenses_collection.update_one(
        {"id": expense_id},
        {"$set": {"stage": next_stage}, "$push": {"auditTrail": {"stage": "Approved", "action": "Approved step", "by": current_user.get("name"), "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}}}
    )
    return expenses_collection.find_one({"id": expense_id}, {"_id": 0})

@app.post("/ocr")
def process_receipt(file: UploadFile = File(...), current_user: dict = Depends(verify_token)):
    return {"amount": "3250", "date": datetime.now().strftime("%Y-%m-%d"), "vendor": "Scanned Vendor", "confidence": 92}