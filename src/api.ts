const BASE_URL = "http://localhost:8000";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const loginUser = async (data: any) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const fetchExpenses = async () => {
  const res = await fetch(`${BASE_URL}/expenses`, { headers: getHeaders() });
  return res.json();
};

export const createExpense = async (data: any) => {
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const approveExpense = async (id: string) => {
  const res = await fetch(`${BASE_URL}/approve/${id}`, {
    method: "POST",
    headers: getHeaders(),
  });
  return res.json();
};

export const runOCR = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/ocr`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return res.json();
};

export const fetchUsers = async () => {
  const res = await fetch(`${BASE_URL}/users`, { headers: getHeaders() });
  return res.json();
};

export const updateUserRole = async (userId: string, role: string) => {
  const res = await fetch(`${BASE_URL}/users/${userId}/role`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ role }),
  });
  return res.json();
};

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
  empId?: string;
}) => {
  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create user");
  }
  return res.json();
};