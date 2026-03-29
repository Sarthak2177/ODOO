import { useState } from "react";
import Login from "./Login";
import EmployeeDashboard from "./EmployeeDashboard";
import ManagerDashboard from "./ManagerDashboard";
import AdminDashboard from "./AdminDashboard";

type Role = "employee" | "manager" | "admin" | null;

const Index = () => {
  const [role, setRole] = useState<Role>(null);

  if (!role) return <Login onLogin={(r) => setRole(r)} />;
  if (role === "employee") return <EmployeeDashboard onLogout={() => setRole(null)} />;
  if (role === "manager")  return <ManagerDashboard onLogout={() => setRole(null)} />;
  return <AdminDashboard onLogout={() => setRole(null)} />;
};

export default Index;
