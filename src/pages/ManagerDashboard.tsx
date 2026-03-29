import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Clock, CheckCircle, ShieldAlert, X, Filter, MessageSquare } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import GlassCard from "@/components/GlassCard";
import BackgroundOrb from "@/components/BackgroundOrb";
import Navbar from "@/components/Navbar";
import RiskBadge from "@/components/RiskBadge";
import StageBadge from "@/components/StageBadge";
import { ApprovalFlowLabeled } from "@/components/ApprovalFlow";
import AuditTrail from "@/components/AuditTrail";
import AnimatedCounter from "@/components/AnimatedCounter";
import FraudCard from "@/components/FraudCard";
import { fetchExpenses, approveExpense } from "@/api"; // <-- Real API functions
import { chartData, CATEGORIES, type Expense } from "@/data/mockData"; // Note: mockExpenses is GONE
import { toast } from "sonner";

interface Props { onLogout: () => void; }

const ManagerDashboard = ({ onLogout }: Props) => {
  const [expenses, setExpenses] = useState<Expense[]>([]); // Starts empty, fetches from DB
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // FETCH REAL DATA ON MOUNT
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchExpenses();
        setExpenses(data);
      } catch (error) {
        toast.error("Failed to load expenses from database.");
      }
    };
    loadData();
  }, []);

  const filteredExpenses = expenses.filter(exp => {
    if (statusFilter !== "all" && exp.stage !== statusFilter) return false;
    if (riskFilter !== "all" && exp.riskLevel !== riskFilter) return false;
    if (categoryFilter !== "all" && exp.category !== categoryFilter) return false;
    if (searchQuery && !exp.employee.toLowerCase().includes(searchQuery.toLowerCase()) && !exp.id.toLowerCase().includes(searchQuery.toLowerCase()) && !exp.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalAmount = expenses.reduce((s, e) => s + (e.convertedINR || 0), 0);
  const pending = expenses.filter(e => e.stage === "submitted").length;
  const approved = expenses.filter(e => e.stage === "approved").length;
  const highRisk = expenses.filter(e => e.riskLevel === "high").length;

  const metrics = [
    { label: "Total Expenses", value: totalAmount, prefix: "₹", icon: DollarSign, color: "bg-blue-50 text-blue-600" },
    { label: "Pending Review", value: pending, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Fully Approved", value: approved, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
    { label: "High Risk", value: highRisk, icon: ShieldAlert, color: "bg-red-50 text-red-600" },
  ];

  // REAL DB APPROVAL INTEGRATION
  const handleApprove = async (exp: Expense) => {
    try {
      toast.loading("Approving expense...");
      const updated = await approveExpense(exp.id);
      
      setExpenses(prev =>
        prev.map(e => e.id === exp.id ? updated : e)
      );
      setSelectedExpense(updated);
      
      toast.dismiss();
      toast.success("Expense approved! Forwarded to next stage ✅");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to approve expense on the server.");
    }
  };

  // REJECT REMAINS FRONTEND-ONLY FOR THE DEMO (as requested)
  const handleReject = (exp: Expense) => {
    if (!rejectComment.trim()) { toast.error("Please add a comment before rejecting"); return; }
    
    const updated = expenses.map(e =>
      e.id === exp.id ? {
        ...e,
        stage: "rejected" as const,
        rejectionComment: rejectComment,
        rejectedAt: "Manager",
        auditTrail: [...(e.auditTrail || []), { stage: "Rejected", action: "Expense rejected by manager", by: "Logged In Manager", timestamp: new Date().toLocaleString(), comment: rejectComment }],
      } : e
    );
    
    setExpenses(updated);
    setSelectedExpense(null);
    setRejectComment(""); 
    setShowRejectInput(false);
    toast.success("Expense rejected");
  };

  return (
    <div className="min-h-screen bg-background">
      <BackgroundOrb />
      <Navbar role="manager" onLogout={onLogout} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-12 space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <GlassCard key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
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

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard hover={false} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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

          <GlassCard hover={false} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <ReTooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: "#3B82F6", r: 4, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Team Expenses</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Input placeholder="Search employee, ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-background text-sm" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Pending Review</SelectItem>
                <SelectItem value="manager_approved">Manager ✓</SelectItem>
                <SelectItem value="finance_approved">Finance ✓</SelectItem>
                <SelectItem value="director_approved">Director ✓</SelectItem>
                <SelectItem value="approved">Fully Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="bg-background text-sm"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-background text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <GlassCard hover={false} className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground bg-muted/50">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp, i) => (
                    <motion.tr key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => { setSelectedExpense(exp); setShowRejectInput(false); setRejectComment(""); }}>
                      <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{exp.id}</td>
                      <td className="px-4 py-3 text-foreground">{exp.employee}</td>
                      <td className="px-4 py-3">
                        <div className="text-foreground font-medium">₹{exp.convertedINR?.toLocaleString("en-IN")}</div>
                        {exp.currency !== "INR" && <div className="text-[10px] text-muted-foreground">{exp.currency} {exp.amount}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{exp.category}</td>
                      <td className="px-4 py-3"><RiskBadge score={exp.riskScore} level={exp.riskLevel} /></td>
                      <td className="px-4 py-3"><StageBadge stage={exp.stage} /></td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" className="text-xs">Review</Button>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No expenses match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Expense Detail Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
            onClick={() => { setSelectedExpense(null); setShowRejectInput(false); setRejectComment(""); }}>
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
                <button onClick={() => { setSelectedExpense(null); setShowRejectInput(false); }} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Category</span><span className="text-foreground font-medium">{selectedExpense.category}</span></div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <div className="text-right">
                    <span className="text-foreground font-semibold">₹{selectedExpense.convertedINR?.toLocaleString("en-IN")}</span>
                    {selectedExpense.currency !== "INR" && <span className="text-xs text-muted-foreground block">{selectedExpense.currency} {selectedExpense.amount}</span>}
                  </div>
                </div>
                <div className="text-sm"><span className="text-muted-foreground">Description / Vendor</span><p className="text-foreground mt-1">{selectedExpense.description}</p></div>
              </div>

              <FraudCard riskScore={selectedExpense.riskScore} riskLevel={selectedExpense.riskLevel} reasons={selectedExpense.riskReasons || []} />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Approval Status</h4>
                <ApprovalFlowLabeled currentStage={selectedExpense.stage} rejected={selectedExpense.stage === "rejected"} rejectedAt={selectedExpense.rejectedAt} />
              </div>

              {selectedExpense.stage === "rejected" && selectedExpense.rejectionComment && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-xs font-semibold text-red-700">Rejection Comment</span>
                  </div>
                  <p className="text-sm text-red-800">{selectedExpense.rejectionComment}</p>
                </div>
              )}

              {/* ACTION BUTTONS: Only show Approve/Reject if the expense is still pending manager review */}
              {selectedExpense.stage === "submitted" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(selectedExpense)} className="flex-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white">
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setShowRejectInput(true)} className="flex-1 text-xs">
                      <XCircle className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                  </div>
                  
                  {/* Sliding Reject Reason Input */}
                  <AnimatePresence>
                    {showRejectInput && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                        <Textarea placeholder="Add a comment explaining the rejection to the employee..." value={rejectComment} onChange={e => setRejectComment(e.target.value)}
                          className="bg-background text-sm min-h-[80px] mt-2" />
                        <Button size="sm" variant="destructive" onClick={() => handleReject(selectedExpense)} className="w-full text-xs">
                          Confirm Rejection
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Audit Trail</h4>
                <AuditTrail entries={selectedExpense.auditTrail || []} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManagerDashboard;