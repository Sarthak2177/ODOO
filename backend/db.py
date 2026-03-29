import os
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set in .env")

client = MongoClient(MONGO_URI)
db = client["reimbursementDB"]

users_collection     = db["users"]
expenses_collection  = db["expenses"]

# ── Indexes ──────────────────────────────────────────────────
users_collection.create_index([("email", ASCENDING)], unique=True)
expenses_collection.create_index([("id", ASCENDING)],  unique=True)
expenses_collection.create_index([("employee_email", ASCENDING)])
expenses_collection.create_index([("stage", ASCENDING)])

# ── Demo seed (runs only when collection is empty) ────────────
DEMO_USERS = [
    {
        "email":      "anita@company.com",
        "password":   "password123",          # plain-text for demo only
        "role":       "admin",
        "name":       "Anita Singh",
        "department": "Operations",
    },
    {
        "email":      "sneha@company.com",
        "password":   "password123",
        "role":       "manager",
        "name":       "Sneha Sharma",
        "department": "Engineering",
    },
    {
        "email":      "arjun@company.com",
        "password":   "password123",
        "role":       "employee",
        "name":       "Arjun Mehta",
        "department": "Engineering",
    },
    {
        "email":      "rahul@company.com",
        "password":   "password123",
        "role":       "finance",
        "name":       "Rahul Gupta",
        "department": "Finance",
    },
    {
        "email":      "priya@company.com",
        "password":   "password123",
        "role":       "director",
        "name":       "Priya Nair",
        "department": "Leadership",
    },
]

if users_collection.count_documents({}) == 0:
    users_collection.insert_many(DEMO_USERS)
    print("[db] Demo users seeded.")
