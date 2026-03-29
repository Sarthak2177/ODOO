import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { runOCR, createExpense, fetchExpenses } from "@/api"; // <-- Real API functions
import { Upload, Loader2, Sparkles, LayoutDashboard, PlusCircle, FileText, User, X, MessageSquare, Files, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GlassCard from "@/components/GlassCard";
import BackgroundOrb from "@/components/BackgroundOrb";
import Navbar from "@/components/Navbar";
import FraudCard from "@/components/FraudCard";
import RiskBadge from "@/components/RiskBadge";
import StageBadge from "@/components/StageBadge";
import { ApprovalFlowLabeled } from "@/components/ApprovalFlow";
import AuditTrail from "@/components/AuditTrail";
import AnimatedCounter from "@/components/AnimatedCounter";
import { CATEGORIES, CURRENCIES, type Expense } from "@/data/mockData"; // Note: mockExpenses is GONE
import { toast } from "sonner";

interface Props { onLogout: () => void; }
type Tab = "dashboard" | "new" | "expenses" | "profile";

const menuItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new", label: "New Expense", icon: PlusCircle },
  { id: "expenses", label: "My Expenses", icon: FileText },
  { id: "profile", label: "Profile", icon: User },
];

const EmployeeDashboard = ({ onLogout }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]); // Starts empty, fetches from DB
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [fraudResult, setFraudResult] = useState<{ score: number; level: "low" | "medium" | "high"; reasons: string[] } | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);

  // FETCH REAL DATA ON MOUNT
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchExpenses();
        // Assuming current user is an employee, the backend might return all expenses.
        // For a true production app, backend filters by user. We'll just display what we get.
        setExpenses(data);
      } catch (error) {
        toast.error("Failed to load expenses from database.");
      }
    };
    loadData();
  }, []);

  // REAL OCR API INTEGRATION
  const handleFileUpload = async (file: File) => {
    setScanning(true);
    setScanned(false);
    toast.info("Analyzing receipt...");

    try {
      const data = await runOCR(file);
      // Auto-fill form with extracted data
      setAmount(data.amount || "");
      setDate(data.date || "");
      setDescription(data.vendor || "");
      toast.success("Receipt scanned successfully!");
    } catch (error) {
      toast.error("OCR failed. Check backend connection.");
    } finally {
      setScanning(false);
      setScanned(true);
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBulkFiles(files);
    toast.success(`${files.length} receipt(s) selected for upload`);
  };

  const handleBulkSubmit = async () => {
    if (bulkFiles.length === 0) return;
    toast.loading("Submitting bulk expenses...");
    
    try {
      // Loop and create real expenses via API for the hackathon demo
      const promises = bulkFiles.map((file, i) => {
        return createExpense({
          amount: Math.floor(Math.random() * 5000) + 500, // Dummy amount for unscanned bulk files
          currency: "INR",
          category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
          description: `Bulk Receipt: ${file.name}`,
          date: new Date().toISOString().split("T")[0]
        });
      });

      const newExpenses = await Promise.all(promises);
      setExpenses(prev => [...newExpenses, ...prev]);
      setBulkFiles([]);
      toast.dismiss();
      toast.success(`${newExpenses.length} expenses submitted via bulk upload!`);
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to submit bulk expenses");
    }
  };

  // REAL DB SUBMIT INTEGRATION
  const handleSubmit = async () => {
    if (!amount || !category) {
      toast.error("Please fill in the required fields");
      return;
    }

    try {
      const res = await createExpense({
        amount: parseFloat(amount),
        currency,
        category,
        description,
        date
      });

      // Update UI with the new expense from DB
      setExpenses(prev => [res, ...prev]);
      
      if (res.riskScore !== undefined) {
        setFraudResult({
          score: res.riskScore,
          level: res.riskLevel,
          reasons: res.riskReasons || []
        });
      }
      
      toast.success("Expense submitted successfully!");

      setTimeout(() => {
        setAmount(""); setCategory(""); setDescription(""); setDate("");
        setScanned(false); setFraudResult(null);
      }, 3000);
    } catch (error) {
      toast.error("Failed to submit expense to database");
    }
  };

  const totalAmount = expenses.reduce((s, e) => s + (e.convertedINR || 0), 0);
  const pending = expenses.filter(e => e.stage === "submitted").length;
  const approved = expenses.filter(e => e.stage === "approved").length;
  const rejected = expenses.filter(e => e.stage === "rejected").length;

  const metrics = [
    { label: "Total Expenses", value: totalAmount, prefix: "₹", icon: DollarSign, color: "bg-blue-50 text-blue-600" },
    { label: "Pending", value: pending, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Approved", value: approved, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
    { label: "Rejected", value: rejected, icon: XCircle, color: "bg-red-50 text-red-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <BackgroundOrb />
      <Navbar role="employee" onLogout={onLogout} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-12">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl bg-muted w-fit">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent Expenses</h3>
              <GlassCard hover={false} className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground bg-muted/50">
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.slice(0, 5).map((exp, i) => (
                        <motion.tr key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedExpense(exp)}>
                          <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{exp.id}</td>
                          <td className="px-4 py-3 text-foreground">{exp.description}</td>
                          <td className="px-4 py-3 text-foreground font-medium">₹{exp.convertedINR?.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3"><StageBadge stage={exp.stage} /></td>
                        </motion.tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No recent expenses found. Submit one!</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {/* New Expense Tab */}
        {activeTab === "new" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Submit Expense</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <GlassCard hover={false}>
                <div className="space-y-4">
                  <label className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all block relative">
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }} 
                    />
                    <AnimatePresence mode="wait">
                      {scanning ? (
                        <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <p className="text-sm text-primary font-medium">Analyzing receipt via OCR...</p>
                        </motion.div>
                      ) : scanned ? (
                        <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2">
                          <Sparkles className="w-8 h-8 text-emerald-500" />
                          <p className="text-sm text-emerald-600 font-medium">Fields auto-filled!</p>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">AI OCR Complete</span>
                        </motion.div>
                      ) : (
                        <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Upload receipt for Smart OCR</p>
                          <p className="text-xs text-muted-foreground/60">Click to scan automatically</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-background" />
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Description / Vendor" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background" />
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background" />
                  <Button onClick={handleSubmit} className="w-full">Submit Expense</Button>
                </div>
              </GlassCard>

              <div className="space-y-6">
                <GlassCard hover={false}>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Files className="w-4 h-4 text-primary" />
                    Bulk Receipt Upload
                  </h3>
                  <label className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all block">
                    <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleBulkUpload} />
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drop multiple receipts or click to select</p>
                  </label>
                  {bulkFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">{bulkFiles.length} file(s) selected:</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {bulkFiles.map((f, i) => (
                          <div key={i} className="text-xs text-foreground flex items-center gap-2 bg-muted/50 rounded px-2 py-1">
                            <FileText className="w-3 h-3 text-primary" />
                            {f.name}
                          </div>
                        ))}
                      </div>
                      <Button onClick={handleBulkSubmit} size="sm" className="w-full mt-2">
                        Submit All ({bulkFiles.length})
                      </Button>
                    </div>
                  )}
                </GlassCard>

                <AnimatePresence>
                  {fraudResult && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                      <FraudCard riskScore={fraudResult.score} riskLevel={fraudResult.level} reasons={fraudResult.reasons} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* My Expenses Tab */}
        {activeTab === "expenses" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">My Expenses</h2>
            <GlassCard hover={false} className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground bg-muted/50">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Risk</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp, i) => (
                      <motion.tr key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{exp.id}</td>
                        <td className="px-4 py-3 text-foreground">{exp.description}</td>
                        <td className="px-4 py-3">
                          <div className="text-foreground font-medium">₹{exp.convertedINR?.toLocaleString("en-IN")}</div>
                          {exp.currency !== "INR" && <div className="text-[10px] text-muted-foreground">{exp.currency} {exp.amount}</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{exp.category}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{exp.date}</td>
                        <td className="px-4 py-3"><RiskBadge score={exp.riskScore} level={exp.riskLevel} /></td>
                        <td className="px-4 py-3"><StageBadge stage={exp.stage} /></td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedExpense(exp)}>View</Button>
                        </td>
                      </motion.tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">You have no expense history.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Profile</h2>
            <GlassCard hover={false}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  {/* For the demo, this relies on the seeded user logic */}
                  <h3 className="text-foreground font-semibold">Logged In User</h3>
                  <p className="text-sm text-muted-foreground">Employee</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">Department</span><span className="text-foreground font-medium">Engineering</span></div>
                <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">Manager</span><span className="text-foreground font-medium">Sneha Kapoor</span></div>
                <div className="flex justify-between py-2"><span className="text-muted-foreground">Total Claims</span><span className="text-foreground font-medium">{expenses.length}</span></div>
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
                  <p className="text-xs text-muted-foreground">{selectedExpense.date}</p>
                </div>
                <button onClick={() => setSelectedExpense(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
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
                <div className="text-sm"><span className="text-muted-foreground">Description</span><p className="text-foreground mt-1">{selectedExpense.description}</p></div>
              </div>

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

              <FraudCard riskScore={selectedExpense.riskScore} riskLevel={selectedExpense.riskLevel} reasons={selectedExpense.riskReasons || []} />

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

export default EmployeeDashboard;