export interface Expense {
  id: string;
  employee: string;
  amount: number;
  currency: string;
  convertedINR: number;
  category: string;
  description: string;
  date: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  riskReasons: string[];
  stage: "submitted" | "manager_approved" | "finance_approved" | "director_approved" | "approved" | "rejected";
  auditTrail: AuditEntry[];
  ocrConfidence: number;
  rejectionComment?: string;
  rejectedAt?: string;
}

export interface AuditEntry {
  stage: string;
  action: string;
  by: string;
  timestamp: string;
  comment?: string;
}

export const CATEGORIES = [
  "Travel",
  "Meals & Entertainment",
  "Office Supplies",
  "Software & Tools",
  "Equipment",
  "Training",
  "Miscellaneous",
];

export const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

export const EXCHANGE_RATES: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 91.2,
  GBP: 106.3,
};

export const mockExpenses: Expense[] = [
  {
    id: "EXP-001",
    employee: "Arjun Mehta",
    amount: 450,
    currency: "USD",
    convertedINR: 37575,
    category: "Travel",
    description: "Client visit flight tickets - Mumbai to Bangalore",
    date: "2026-03-25",
    riskScore: 12,
    riskLevel: "low",
    riskReasons: ["Amount within policy", "Valid receipt attached"],
    stage: "submitted",
    ocrConfidence: 94,
    auditTrail: [
      { stage: "Submitted", action: "Expense submitted", by: "Arjun Mehta", timestamp: "2026-03-25 09:30" },
    ],
  },
  {
    id: "EXP-002",
    employee: "Priya Sharma",
    amount: 12500,
    currency: "INR",
    convertedINR: 12500,
    category: "Meals & Entertainment",
    description: "Team dinner - Q1 celebration",
    date: "2026-03-24",
    riskScore: 45,
    riskLevel: "medium",
    riskReasons: ["Amount above average for category", "Weekend submission"],
    stage: "submitted",
    ocrConfidence: 87,
    auditTrail: [
      { stage: "Submitted", action: "Expense submitted", by: "Priya Sharma", timestamp: "2026-03-24 18:45" },
    ],
  },
  {
    id: "EXP-003",
    employee: "Rahul Verma",
    amount: 2800,
    currency: "USD",
    convertedINR: 233800,
    category: "Equipment",
    description: "MacBook Pro for development",
    date: "2026-03-22",
    riskScore: 78,
    riskLevel: "high",
    riskReasons: ["Unusually high amount", "No prior approval found", "Duplicate vendor detected"],
    stage: "submitted",
    ocrConfidence: 91,
    auditTrail: [
      { stage: "Submitted", action: "Expense submitted", by: "Rahul Verma", timestamp: "2026-03-22 11:00" },
    ],
  },
  {
    id: "EXP-004",
    employee: "Neha Gupta",
    amount: 150,
    currency: "EUR",
    convertedINR: 13680,
    category: "Software & Tools",
    description: "Figma annual subscription",
    date: "2026-03-20",
    riskScore: 8,
    riskLevel: "low",
    riskReasons: ["Standard recurring expense"],
    stage: "approved",
    ocrConfidence: 96,
    auditTrail: [
      { stage: "Submitted", action: "Expense submitted", by: "Neha Gupta", timestamp: "2026-03-20 14:00" },
      { stage: "Manager", action: "Approved by manager", by: "Sneha Kapoor", timestamp: "2026-03-21 09:00" },
      { stage: "Finance", action: "Approved by finance", by: "Ravi Kumar", timestamp: "2026-03-21 14:00" },
      { stage: "Director", action: "Final approval by director", by: "Anita Singh", timestamp: "2026-03-22 10:00" },
    ],
  },
  {
    id: "EXP-005",
    employee: "Karan Patel",
    amount: 5200,
    currency: "INR",
    convertedINR: 5200,
    category: "Training",
    description: "AWS certification exam fee",
    date: "2026-03-18",
    riskScore: 5,
    riskLevel: "low",
    riskReasons: ["Pre-approved training expense"],
    stage: "manager_approved",
    ocrConfidence: 99,
    auditTrail: [
      { stage: "Submitted", action: "Expense submitted", by: "Karan Patel", timestamp: "2026-03-18 10:00" },
      { stage: "Manager", action: "Approved by manager", by: "Sneha Kapoor", timestamp: "2026-03-19 09:30" },
    ],
  },
  {
    id: "EXP-006",
    employee: "Arjun Mehta",
    amount: 8900,
    currency: "INR",
    convertedINR: 8900,
    category: "Travel",
    description: "Hotel stay - 2 nights Delhi",
    date: "2026-03-15",
    riskScore: 62,
    riskLevel: "high",
    riskReasons: ["Rate exceeds city benchmark", "No prior travel request"],
    stage: "rejected",
    ocrConfidence: 72,
    rejectionComment: "Hotel rate exceeds the city limit. Please book within policy next time.",
    rejectedAt: "Manager",
    auditTrail: [
      { stage: "Submitted", action: "Expense submitted", by: "Arjun Mehta", timestamp: "2026-03-15 08:00" },
      { stage: "Manager", action: "Rejected by manager", by: "Sneha Kapoor", timestamp: "2026-03-16 11:00", comment: "Hotel rate exceeds the city limit. Please book within policy next time." },
    ],
  },
];

export const chartData = {
  categoryBreakdown: [
    { name: "Travel", value: 46475, color: "#3B82F6" },
    { name: "Meals", value: 12500, color: "#22C55E" },
    { name: "Equipment", value: 233800, color: "#EF4444" },
    { name: "Software", value: 13680, color: "#F59E0B" },
    { name: "Training", value: 5200, color: "#8B5CF6" },
  ],
  monthlyTrend: [
    { month: "Oct", amount: 85000 },
    { month: "Nov", amount: 120000 },
    { month: "Dec", amount: 95000 },
    { month: "Jan", amount: 145000 },
    { month: "Feb", amount: 110000 },
    { month: "Mar", amount: 311655 },
  ],
};
