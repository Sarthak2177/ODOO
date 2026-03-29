Gemini said
ReimburseAI - Intelligent Expense Management
ReimburseAI is a high-performance reimbursement management system built for hackathons. It features a polished glassmorphism UI, real-time backend integration, and intelligent automation including AI-driven fraud detection and OCR receipt scanning.

🔐 Default Account Credentials
For demonstration purposes, the system is seeded with default accounts representing different organizational roles.

🛡️ Administrator
Email: anita@company.com

Password: password123

Permissions: Full system control, user role management, and admin override for expense approvals.

💼 Manager
Email: sneha@company.com

Password: password123

Permissions: Review team expenses, approve valid claims, or reject with comments.

🧑‍💻 Employee
Email: arjun@company.com

Password: password123

Permissions: Submit expenses, upload receipts for AI OCR scanning, and track reimbursement status.

🛠️ Tech Stack
Frontend: React, TypeScript, Vite, Tailwind CSS, Framer Motion.

Backend: FastAPI (Python).

Database: MongoDB Atlas.

Authentication: JWT (JSON Web Tokens).

🚀 Getting Started
1. Backend Setup
Navigate to the backend directory and install dependencies:

Bash
cd backend
pip install fastapi uvicorn pymongo python-dotenv python-jose python-multipart
Create a .env file in the backend folder:

Code snippet
MONGO_URI="your_mongodb_atlas_connection_string"
Start the server:

Bash
uvicorn main:app --reload
2. Frontend Setup
Navigate to the root directory and install dependencies:

Bash
npm install
Start the development server:

Bash
npm run dev
🌟 Key Features
Smart OCR Scanning: Automatically extracts amount, date, and vendor from uploaded receipts.

AI Fraud Detection: Rule-based engine that flags high-risk submissions based on patterns and policy limits.

Multi-Stage Approval: Seamless flow from submitted → manager_approved → finance_approved → approved.

Admin Override: Allows administrators to bypass standard approval chains for urgent claims.

Interactive Analytics: Real-time charts and metrics for company-wide spending insights.

📁 Project Structure
Plaintext
/backend          # FastAPI server, JWT Auth, MongoDB logic
/src              # React Frontend
  /api            # Axios/Fetch API configurations
  /components     # Reusable UI components (GlassCard, badges, etc.)
  /pages          # Role-based Dashboards and Login flow
Built for the 2026 Odoo Hackathon.
