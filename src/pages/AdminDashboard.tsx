import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, Settings, DollarSign, CheckCircle, Clock, ShieldAlert, X, UserPlus, Search, Filter } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GlassCard from "@/components/GlassCard";
import BackgroundOrb from "@/components/BackgroundOrb";
import Navbar from "@/components/Navbar";
import RiskBadge from "@/components/RiskBadge";
import StageBadge from "@/components/StageBadge";
import { ApprovalFlowLabeled } from "@/components/ApprovalFlow";
import AuditTrail from "@/components/AuditTrail";
import AnimatedCounter from "@/components/AnimatedCounter";
import FraudCard from "@/components/FraudCard";
import { fetchExpenses, approveExpense, fetchUsers, updateUserRole, createUser } from "@/api"; // API Imports
import { chartData, CATEGORIES, type Expense } from "@/data/mockData";
import { toast } from "sonner";

interface Props { onLogout: () => void; }

type Tab = "overview" | "users" | "expenses" | "rules";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Shield },
  { id: "users", label: "Users", icon: Users },
  { id: "expenses", label: "All Expenses", icon: DollarSign },
  { id: "rules", label: "Approval Rules", icon: Settings },
];

interface UserEntry {
  id: string;
  empId: string; // FIXED: Added Employee ID
  name: string;
  email: string;
  role: "employee" | "manager" | "admin" | "finance" | "director";
  department: string;
}

const roleBadge: Record<string, string> = {
  employee: "bg-blue-50 text-blue-700 border-blue-200",
  manager: "bg-amber-50 text-amber-700 border-amber-200",
  admin: "bg-violet-50 text-violet-700 border-violet-200",
  finance: "bg-cyan-50 text-cyan-700 border-cyan-200",
  director: "bg-rose-50 text-rose-700 border-rose-200",
};

const AdminDashboard = ({ onLogout }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [expenses, setExpenses] = useState<Expense[]>([]); 
  const [users, setUsers] = useState<UserEntry[]>([]); // Starts empty, fetches from DB
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState(""); // FIXED: Added missing state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "employee", department: "" });
  const [addUserLoading, setAddUserLoading] = useState(false);

  // FETCH ALL REAL DATA ON MOUNT
  useEffect(() => {
    const loadData = async () => {
      try {
        const [expensesData, usersData] = await Promise.all([
          fetchExpenses(),
          fetchUsers()
        ]);
        setExpenses(expensesData);
        if (Array.isArray(usersData)) setUsers(usersData);
      } catch (error) {
        toast.error("Failed to load dashboard data from backend.");
      }
    };
    loadData();
  }, []);

  const totalAmount = expenses.reduce((s, e) => s + (e.convertedINR || 0), 0);
  const pending = expenses.filter(e => e.stage !== "approved" && e.stage !== "rejected").length;
  const approved = expenses.filter(e => e.stage === "approved").length;
  const highRisk = expenses.filter(e => e.riskLevel === "high").length;

  const metrics = [
    { id: "total", label: "Total Expenses", value: totalAmount, prefix: "₹", icon: DollarSign, color: "bg-blue-50 text-blue-600" },
    { id: "pending", label: "Pending Approvals", value: pending, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { id: "approved", label: "Fully Approved", value: approved, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
    { id: "high_risk", label: "High Risk", value: highRisk, icon: ShieldAlert, color: "bg-red-50 text-red-600" },
  ];

  const handleMetricClick = (metricId: string) => {
    setActiveTab("expenses");
    setSearchQuery(""); 
    if (metricId === "total") { setStatusFilter("all"); setRiskFilter("all"); } 
    else if (metricId === "pending") { setStatusFilter("pending"); setRiskFilter("all"); } 
    else if (metricId === "approved") { setStatusFilter("approved"); setRiskFilter("all"); } 
    else if (metricId === "high_risk") { setStatusFilter("all"); setRiskFilter("high"); }
  };

  const filteredExpenses = expenses.filter(exp => {
    if (statusFilter === "pending" && (exp.stage === "approved" || exp.stage === "rejected")) return false;
    if (statusFilter !== "all" && statusFilter !== "pending" && exp.stage !== statusFilter) return false;
    if (riskFilter !== "all" && exp.riskLevel !== riskFilter) return false;
    if (searchQuery && !exp.employee.toLowerCase().includes(searchQuery.toLowerCase()) && !exp.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleOverrideApprove = async (exp: Expense) => {
    try {
      toast.loading("Applying Admin Override...");
      let updated = exp;
      while (updated.stage !== "approved") {
        updated = await approveExpense(updated.id);
      }
      setExpenses(prev => prev.map(e => e.id === exp.id ? updated : e));
      setSelectedExpense(updated);
      toast.dismiss();
      toast.success("Admin override: Expense fully approved ✅");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to perform admin override approval.");
    }
  };

  // REAL ROLE UPDATE
  const handleRoleChange = async (userId: string, newRole: string, userName: string) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      toast.success(`${userName}'s role updated to ${newRole}`);
    } catch (error) {
      toast.error(`Failed to update role for ${userName}`);
    }
  };

  const departmentData = [
    { name: "Engineering", amount: 280000 },
    { name: "Marketing", amount: 45000 },
    { name: "Design", amount: 32000 },
    { name: "Finance", amount: 15000 },
    { name: "Operations", amount: 28000 },
  ];

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Name, email and password are required.");
      return;
    }
    setAddUserLoading(true);
    try {
      await createUser(newUser);
      const usersData = await fetchUsers();
      if (Array.isArray(usersData)) setUsers(usersData);
      setShowAddUser(false);
      setNewUser({ name: "", email: "", password: "", role: "employee", department: "" });
      toast.success(`User ${newUser.name} added successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add user.");
    } finally {
      setAddUserLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <BackgroundOrb />
      <Navbar role="admin" onLogout={onLogout} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-12">
        <div className="flex gap-1 mb-8 p-1 rounded-xl bg-muted w-fit">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((m, i) => (
                <GlassCard 
                  key={m.label} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleMetricClick(m.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.color}`}>
                      <m.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
                      <p className="text-xl font-bold text-foreground">
                        <AnimatedCounter target={m.value} prefix={m.prefix || ""} />
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <GlassCard hover={false}>
                <h3 className="text-sm font-semibold text-foreground mb-4">Category Breakdown</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={chartData.categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {chartData.categoryBreakdown.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}
                    </Pie>
                    <ReTooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {chartData.categoryBreakdown.map(c => (
                    <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard hover={false}>
                <h3 className="text-sm font-semibold text-foreground mb-4">Department Spend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <ReTooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                    <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>

            <GlassCard hover={false}>
              <h3 className="text-sm font-semibold text-foreground mb-3">Team Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === "employee").length}</p>
                  <p className="text-xs text-blue-600/70 font-medium">Employees</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-600">{users.filter(u => u.role === "manager").length}</p>
                  <p className="text-xs text-amber-600/70 font-medium">Managers</p>
                </div>
                <div className="p-4 bg-violet-50 rounded-xl">
                  <p className="text-2xl font-bold text-violet-600">{users.filter(u => u.role === "admin").length}</p>
                  <p className="text-xs text-violet-600/70 font-medium">Admins</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Manage Users</h2>
              <Button size="sm" className="gap-1.5" onClick={() => setShowAddUser(true)}>
                <UserPlus className="w-4 h-4" /> Add User
              </Button>
            </div>
            <GlassCard hover={false} className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground bg-muted/50">
                      <th className="px-4 py-3 font-medium">Emp ID</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-primary text-xs font-semibold">{u.empId || "N/A"}</td>
                        <td className="px-4 py-3 text-foreground font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadge[u.role] || roleBadge.employee}`}>
                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{u.department}</td>
                        <td className="px-4 py-3 flex gap-1">
                          <Select defaultValue={u.role} onValueChange={(val) => handleRoleChange(u.id, val, u.name)}>
                            <SelectTrigger className="h-7 text-xs w-28 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </motion.tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* All Expenses */}
        {activeTab === "expenses" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">All Expenses (Admin View)</h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 w-48 text-xs bg-background" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-32 text-xs bg-background"><Filter className="w-3 h-3 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <GlassCard hover={false} className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground bg-muted/50">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Employee</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Risk</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp, i) => (
                      <motion.tr key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedExpense(exp)}>
                        <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{exp.id}</td>
                        <td className="px-4 py-3 text-foreground">{exp.employee}</td>
                        <td className="px-4 py-3 text-foreground font-medium">₹{exp.convertedINR?.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3"><RiskBadge score={exp.riskScore} level={exp.riskLevel} /></td>
                        <td className="px-4 py-3"><StageBadge stage={exp.stage} /></td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm" className="text-xs">View</Button>
                        </td>
                      </motion.tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No expenses match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Approval Rules */}
        {activeTab === "rules" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-semibold text-foreground">Approval Rules Configuration</h2>

            <GlassCard hover={false}>
              <h3 className="text-sm font-semibold text-foreground mb-4">Approval Chain</h3>
              <div className="space-y-3">
                {["Manager Review", "Finance Review", "Director Approval"].map((step, i) => (
                  <div key={step} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{step}</p>
                      <p className="text-xs text-muted-foreground">
                        {i === 0 ? "Required for all expenses" : i === 1 ? "Required for expenses > ₹10,000" : "Required for expenses > ₹50,000"}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Active</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard hover={false}>
              <h3 className="text-sm font-semibold text-foreground mb-4">Auto-Flag Rules</h3>
              <div className="space-y-3">
                {[
                  { rule: "Amount exceeds ₹50,000", action: "Flag as High Risk" },
                  { rule: "Weekend/Holiday submission", action: "Flag as Medium Risk" },
                  { rule: "Duplicate vendor within 7 days", action: "Flag as High Risk" },
                  { rule: "Missing receipt attachment", action: "Block submission" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.rule}</p>
                      <p className="text-xs text-muted-foreground">Action: {r.action}</p>
                    </div>
                    <div className="w-10 h-5 rounded-full bg-emerald-500 relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* Expense Detail Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
            onClick={() => setSelectedExpense(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedExpense.id}</h3>
                  <p className="text-xs text-muted-foreground">{selectedExpense.employee} · {selectedExpense.date}</p>
                </div>
                <button onClick={() => setSelectedExpense(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="text-foreground font-semibold">₹{selectedExpense.convertedINR?.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Category</span><span className="text-foreground font-medium">{selectedExpense.category}</span></div>
              </div>

              <FraudCard riskScore={selectedExpense.riskScore} riskLevel={selectedExpense.riskLevel} reasons={selectedExpense.riskReasons || []} />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Approval Status</h4>
                <ApprovalFlowLabeled currentStage={selectedExpense.stage} rejected={selectedExpense.stage === "rejected"} rejectedAt={selectedExpense.rejectedAt} />
              </div>

              {selectedExpense.stage !== "approved" && selectedExpense.stage !== "rejected" && (
                <Button size="sm" onClick={() => handleOverrideApprove(selectedExpense)} className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs">
                  <Shield className="w-3.5 h-3.5 mr-1.5" /> Admin Override — Fully Approve
                </Button>
              )}

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Audit Trail</h4>
                <AuditTrail entries={selectedExpense.auditTrail || []} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
            onClick={() => setShowAddUser(false)}>
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl border border-border p-6 max-w-md w-full space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold">New User Account</h3>
              <div className="space-y-3">
                <Input placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <Input placeholder="Work Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                <Input placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowAddUser(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleAddUser} disabled={addUserLoading}>Provision Account</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;