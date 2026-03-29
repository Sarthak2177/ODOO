from db import users_collection

users_collection.delete_many({})  # clear existing

users_collection.insert_many([
    {"empId": "EMP-A1B2C3", "email": "anita@company.com",  "password": "password123", "role": "admin",    "name": "Anita Singh",  "department": "Operations"},
    {"empId": "EMP-D4E5F6", "email": "sneha@company.com",  "password": "password123", "role": "manager",  "name": "Sneha Sharma", "department": "Engineering"},
    {"empId": "EMP-G7H8I9", "email": "arjun@company.com",  "password": "password123", "role": "employee", "name": "Arjun Mehta",  "department": "Engineering"},
    {"empId": "EMP-J0K1L2", "email": "rahul@company.com",  "password": "password123", "role": "finance",  "name": "Rahul Gupta",  "department": "Finance"},
    {"empId": "EMP-M3N4O5", "email": "priya@company.com",  "password": "password123", "role": "director", "name": "Priya Nair",   "department": "Leadership"},
])

print("✅ All 5 demo users seeded successfully with Employee IDs.")