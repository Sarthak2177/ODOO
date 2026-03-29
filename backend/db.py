import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load variables from .env file
load_dotenv()

# Get URI from .env, with a fallback just in case
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)

db = client["reimbursementDB"]
users_collection = db["users"]
expenses_collection = db["expenses"]

# Auto-seed admin user for the demo
if users_collection.count_documents({}) == 0:
    users_collection.insert_one({
        "email": "anita@company.com", 
        "password": "password123", 
        "role": "admin", 
        "name": "Anita Singh",
        "department": "Operations"
    })