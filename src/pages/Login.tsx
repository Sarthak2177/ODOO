import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, ArrowLeft, Check, X, Globe, ChevronDown, Info,
  Shield, Users, Briefcase, TrendingUp, Target, AlertCircle, Loader2
} from "lucide-react";
import { loginUser } from "@/api"; // <-- REAL API IMPORTED HERE

type Role = "employee" | "manager" | "finance" | "director" | "admin";
type AuthView = "landing" | "login" | "signup" | "pending" | "admin_requests";

interface PendingUser {
  id: number;
  name: string;
  empId: string;
  email: string;
  role: Role;
  country: string;
  currency: string;
  currencySymbol: string;
  time: string;
}

interface LoginProps {
  onLogin: (role: "employee" | "manager" | "admin") => void;
}

const COUNTRIES = [
  { name: "India", code: "IN", currency: "INR", symbol: "₹" },
  { name: "United States", code: "US", currency: "USD", symbol: "$" },
  { name: "United Kingdom", code: "GB", currency: "GBP", symbol: "£" },
  { name: "Germany", code: "DE", currency: "EUR", symbol: "€" },
  { name: "France", code: "FR", currency: "EUR", symbol: "€" },
  { name: "Japan", code: "JP", currency: "JPY", symbol: "¥" },
  { name: "Canada", code: "CA", currency: "CAD", symbol: "CA$" },
  { name: "Australia", code: "AU", currency: "AUD", symbol: "A$" },
  { name: "Singapore", code: "SG", currency: "SGD", symbol: "S$" },
  { name: "UAE", code: "AE", currency: "AED", symbol: "د.إ" },
  { name: "Brazil", code: "BR", currency: "BRL", symbol: "R$" },
  { name: "South Korea", code: "KR", currency: "KRW", symbol: "₩" },
  { name: "Mexico", code: "MX", currency: "MXN", symbol: "MX$" },
  { name: "Switzerland", code: "CH", currency: "CHF", symbol: "Fr" },
  { name: "Sweden", code: "SE", currency: "SEK", symbol: "kr" },
  { name: "Norway", code: "NO", currency: "NOK", symbol: "kr" },
  { name: "China", code: "CN", currency: "CNY", symbol: "¥" },
  { name: "South Africa", code: "ZA", currency: "ZAR", symbol: "R" },
  { name: "Netherlands", code: "NL", currency: "EUR", symbol: "€" },
  { name: "Spain", code: "ES", currency: "EUR", symbol: "€" },
];

const ROLE_CONFIG = {
  employee: { label: "Employee",  icon: Users,      color: "#f97316", bg: "rgba(249,115,22,0.1)",  desc: "Submit & track expenses",   requiresApproval: true },
  manager:  { label: "Manager",   icon: Briefcase,  color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", desc: "Approve team expenses",     requiresApproval: true },
  finance:  { label: "Finance",   icon: TrendingUp, color: "#06b6d4", bg: "rgba(6,182,212,0.1)",  desc: "Finance department review", requiresApproval: true },
  director: { label: "Director",  icon: Target,     color: "#ec4899", bg: "rgba(236,72,153,0.1)", desc: "Senior approver",           requiresApproval: true },
  admin:    { label: "Admin",     icon: Shield,     color: "#10b981", bg: "rgba(16,185,129,0.1)", desc: "Full system control",       requiresApproval: false },
};

/* ─── Animated Background ─── */
const AnimatedBg = () => (
  <div
    className="fixed inset-0 z-0 overflow-hidden"
    style={{ background: "linear-gradient(135deg,#060d1a 0%,#0d1f35 50%,#080f1e 100%)" }}
  >
    {[
      { w:600, h:600, bg:"radial-gradient(circle,rgba(0,200,150,0.18) 0%,transparent 70%)", top:"-15%", right:"-10%", delay:0 },
      { w:500, h:500, bg:"radial-gradient(circle,rgba(59,130,246,0.15) 0%,transparent 70%)", bottom:"-10%", left:"-8%", delay:-5 },
      { w:350, h:350, bg:"radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)", top:"40%", left:"45%", delay:-9 },
    ].map((orb, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{ width:orb.w, height:orb.h, background:orb.bg,
          ...(orb.top ? { top: orb.top } : {}), ...(orb.bottom ? { bottom: orb.bottom } : {}),
          ...(orb.right ? { right: orb.right } : {}), ...(orb.left ? { left: orb.left } : {}) }}
        animate={{ x:[0,20,-15,0], y:[0,-15,20,0], scale:[1,1.04,0.97,1] }}
        transition={{ duration:14, repeat:Infinity, delay:orb.delay, ease:"easeInOut" }}
      />
    ))}
    <div className="absolute inset-0" style={{
      backgroundImage:"linear-gradient(rgba(0,200,150,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,150,0.03) 1px,transparent 1px)",
      backgroundSize:"52px 52px"
    }} />
    {Array.from({length:12}).map((_,i) => (
      <motion.div key={`p${i}`} className="absolute rounded-full"
        style={{ width:2+(i%3), height:2+(i%3), background:"rgba(0,200,150,0.4)", left:`${8+i*8}%`, top:`${15+(i*37)%70}%` }}
        animate={{ y:[0,-30,0], opacity:[0.3,0.8,0.3] }}
        transition={{ duration:4+i%4, repeat:Infinity, delay:i*0.6, ease:"easeInOut" }}
      />
    ))}
  </div>
);

/* ─── Input Field ─── */
const Field = ({
  label, type="text", value, onChange, placeholder, icon:Icon, rightEl, error,
}: {
  label:string; type?:string; value:string; onChange:(v:string)=>void;
  placeholder?:string; icon?:React.ElementType; rightEl?:React.ReactNode; error?:string;
}) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.6px",
      color:"rgba(255,255,255,0.45)", textTransform:"uppercase", marginBottom:6 }}>
      {label}
    </label>
    <div style={{ position:"relative" }}>
      {Icon && (
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
          color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", pointerEvents:"none" }}>
          <Icon size={15} />
        </span>
      )}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", height:46,
          padding:`0 ${rightEl?"44px":"14px"} 0 ${Icon?"40px":"14px"}`,
          background:"rgba(255,255,255,0.06)",
          border:`1.5px solid ${error?"#ef4444":"rgba(255,255,255,0.12)"}`,
          borderRadius:12, color:"#fff", fontSize:14, fontFamily:"inherit", outline:"none",
          boxSizing:"border-box", transition:"border-color 0.2s, background 0.2s" }}
        onFocus={e => { e.target.style.borderColor="#00c896"; e.target.style.background="rgba(0,200,150,0.06)"; }}
        onBlur={e => { e.target.style.borderColor=error?"#ef4444":"rgba(255,255,255,0.12)"; e.target.style.background="rgba(255,255,255,0.06)"; }}
      />
      {rightEl && (
        <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)" }}>
          {rightEl}
        </span>
      )}
    </div>
    {error && (
      <p style={{ fontSize:11, color:"#ef4444", marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
        <AlertCircle size={11} />{error}
      </p>
    )}
  </div>
);

/* ─── Password strength ─── */
const getStrength = (pw:string) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
const strengthLabel = ["","Weak","Fair","Good","Strong"];
const strengthColors = ["","#ef4444","#f97316","#10b981","#00c896"];

/* ─── Card wrapper style ─── */
const CARD: React.CSSProperties = {
  background:"rgba(14,25,45,0.88)",
  backdropFilter:"blur(24px)",
  WebkitBackdropFilter:"blur(24px)",
  borderRadius:24,
  border:"1px solid rgba(0,200,150,0.15)",
  boxShadow:"0 32px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.04) inset",
  overflow:"hidden",
  width:"100%",
};
const cardVariants = {
  hidden:  { opacity:0, y:32, scale:0.97 },
  visible: { opacity:1, y:0, scale:1, transition:{ duration:0.5, ease:[0.16,1,0.3,1] as number[] } },
  exit:    { opacity:0, y:-20, scale:0.97, transition:{ duration:0.25 } },
};

/* ═══════════════════════════════════════════ */
const Login = ({ onLogin }: LoginProps) => {
  const [view, setView] = useState<AuthView>("landing");
  const [loginRole,  setLoginRole]  = useState<Role>("employee");
  const [signupRole, setSignupRole] = useState<Role>("employee");
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0]|null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  
  // Cleaned up: Real dynamic system means NO hardcoded users at start!
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  
  const [form, setForm] = useState({ firstName:"", lastName:"", empId:"", email:"", password:"", confirm:"" });
  const [loginForm, setLoginForm] = useState({ email:"", password:"" }); // FIXED: Removed empId requirement

  /* Auto-detect country from browser locale */
  useEffect(() => {
    const regionMap: Record<string,string> = {
      IN:"India", US:"United States", GB:"United Kingdom", DE:"Germany", FR:"France",
      JP:"Japan", CA:"Canada", AU:"Australia", SG:"Singapore", AE:"UAE", BR:"Brazil",
      KR:"South Korea", MX:"Mexico", CH:"Switzerland", SE:"Sweden", NO:"Norway",
      CN:"China", ZA:"South Africa", NL:"Netherlands", ES:"Spain",
    };
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const region = locale.split("-")[1] || "";
      const name = regionMap[region];
      if (name) { const c = COUNTRIES.find(x => x.name === name); if (c) setSelectedCountry(c); }
    } catch (_) {}
  }, []);

  const pwStrength = getStrength(form.password);
  const setF  = (k: keyof typeof form)      => (v:string) => setForm(f => ({...f,[k]:v}));
  const setLF = (k: keyof typeof loginForm) => (v:string) => setLoginForm(f => ({...f,[k]:v}));

  /* ─── REAL BACKEND API LOGIN FUNCTION ─── */
  const doLogin = async () => {
    setError("");
    if (!loginForm.email || !loginForm.password) { setError("Please enter email and password."); return; } // FIXED: Removed empId validation
    
    setLoading(true);
    try {
      // Fetching authentication from FastAPI backend
      const res = await loginUser({ email: loginForm.email, password: loginForm.password });
      
      if (res.token) {
        localStorage.setItem("token", res.token);
        
        // Exact original logic preserved:
        if (res.role === "admin") { 
          setView("admin_requests"); 
        } else {
          const mapped = (res.role === "manager" || res.role === "finance" || res.role === "director") ? "manager" : "employee";
          onLogin(mapped as "employee"|"manager"|"admin");
        }
      } else {
        setError(res.error || "Invalid credentials. Try anita@company.com / password123");
      }
    } catch (err) {
      setError("Server error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const doSignup = () => {
    setError("");
    if (!form.firstName || !form.lastName) { setError("Enter your full name."); return; }
    if (!form.empId) { setError("Employee ID / Number is required."); return; }
    if (!form.email.includes("@")) { setError("Enter a valid work email."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!selectedCountry) { setError("Please select your country — it sets the company currency."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPendingUsers(p => [...p, {
        id: Date.now(), name:`${form.firstName} ${form.lastName}`, empId:form.empId,
        email:form.email, role:signupRole,
        country:selectedCountry.name, currency:selectedCountry.currency, currencySymbol:selectedCountry.symbol,
        time:"Just now",
      }]);
      setView("pending");
    }, 1400);
  };

  const approveUser = (id:number) => setPendingUsers(p => p.filter(u => u.id !== id));
  const rejectUser  = (id:number) => setPendingUsers(p => p.filter(u => u.id !== id));
  const badgeColor: Record<Role,string> = { employee:"#f97316", manager:"#8b5cf6", finance:"#06b6d4", director:"#ec4899", admin:"#10b981" };

  /* ════════════════ LANDING ════════════════ */
  if (view === "landing") return (
    <div className="min-h-screen flex items-center justify-center p-5 relative">
      <AnimatedBg />
      <motion.div style={{...CARD, maxWidth:480, position:"relative", zIndex:10}} variants={cardVariants} initial="hidden" animate="visible">
        <div style={{ padding:"40px 34px 34px" }}>
          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <motion.div
              style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:72, height:72, borderRadius:22, background:"linear-gradient(135deg,#00c896,#00a87e)", marginBottom:16 }}
              animate={{ boxShadow:["0 0 0 10px rgba(0,200,150,0.1)","0 0 0 18px rgba(0,200,150,0.04)","0 0 0 10px rgba(0,200,150,0.1)"] }}
              transition={{ duration:3, repeat:Infinity }}
            >
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                <path d="M6 9h22M6 14h16M6 19h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="25" cy="24" r="7" fill="white" fillOpacity="0.9"/>
                <path d="M22.5 24l2 2L27 21.5" stroke="#00c896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:30, fontWeight:800, color:"#fff", letterSpacing:-0.8, marginBottom:6 }}>
              Reimburse<span style={{ color:"#00c896" }}>AI</span>
            </h1>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.38)", letterSpacing:0.5 }}>Intelligent Expense Reimbursement Platform</p>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:28 }}>
            {[["₹2.4Cr","Processed"],["98%","Accuracy"],["3x","Faster"]].map(([v,l]) => (
              <div key={l} style={{ textAlign:"center", padding:"14px 8px", background:"rgba(255,255,255,0.04)", borderRadius:14, border:"1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize:20, fontWeight:800, color:"#00c896", fontFamily:"'Syne',sans-serif" }}>{v}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.38)", marginTop:2, letterSpacing:0.5 }}>{l}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize:11, fontWeight:700, letterSpacing:0.8, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", marginBottom:12 }}>Continue as</p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            {(["employee","manager","finance","director"] as Role[]).map(r => {
              const cfg = ROLE_CONFIG[r]; const Icon = cfg.icon;
              return (
                <motion.button key={r} whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:0.97 }}
                  onClick={() => { setLoginRole(r); setView("login"); }}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"16px 10px", borderRadius:16,
                    border:"1.5px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", cursor:"pointer",
                    transition:"border-color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor=cfg.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor="rgba(255,255,255,0.1)")}
                >
                  <div style={{ width:40, height:40, borderRadius:12, background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{cfg.label}</span>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.38)", textAlign:"center", lineHeight:1.3 }}>{cfg.desc}</span>
                </motion.button>
              );
            })}
          </div>

          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
            onClick={() => { setLoginRole("admin"); setView("login"); }}
            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"14px",
              borderRadius:16, border:"1.5px solid rgba(16,185,129,0.25)", background:"rgba(16,185,129,0.06)", cursor:"pointer" }}
          >
            <Shield size={18} color="#10b981" />
            <span style={{ fontSize:13, fontWeight:700, color:"#10b981" }}>Admin</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)" }}>— Full system control</span>
          </motion.button>

          <p style={{ textAlign:"center", marginTop:20, fontSize:12, color:"rgba(255,255,255,0.35)" }}>
            New here?{" "}
            <button onClick={() => setView("signup")} style={{ fontSize:12, color:"#00c896", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
              Create an account →
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );

  /* ════════════════ LOGIN ════════════════ */
  if (view === "login") {
    const cfg = ROLE_CONFIG[loginRole]; const Icon = cfg.icon;
    return (
      <div className="min-h-screen flex items-center justify-center p-5 relative">
        <AnimatedBg />
        <AnimatePresence mode="wait">
          <motion.div key="login" style={{...CARD, maxWidth:460, position:"relative", zIndex:10}} variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <div style={{ height:4, background:`linear-gradient(90deg,${cfg.color},${cfg.color}77)` }} />
            <div style={{ padding:"28px 32px 32px" }}>
              <div style={{ display:"flex", alignItems:"center", marginBottom:22 }}>
                <motion.button whileHover={{ x:-3 }} onClick={() => setView("landing")}
                  style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"rgba(255,255,255,0.38)", background:"none", border:"none", cursor:"pointer", padding:0 }}>
                  <ArrowLeft size={14} /> Back
                </motion.button>
                <div style={{ flex:1 }} />
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.color}44` }}>
                  <Icon size={12} color={cfg.color} />
                  <span style={{ fontSize:11, fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                </div>
              </div>

              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:"#fff", marginBottom:4 }}>Welcome back</h2>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.38)", marginBottom:22 }}>Sign in to your ReimburseAI account</p>

              {error && (
                <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, marginBottom:16, fontSize:13, color:"#fca5a5" }}>
                  <AlertCircle size={14} color="#ef4444" />{error}
                </motion.div>
              )}

              <p style={{ fontSize:11, fontWeight:700, letterSpacing:0.6, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", marginBottom:10 }}>Sign in as</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:20 }}>
                {(["employee","manager","finance","director","admin"] as Role[]).map(r => {
                  const rc = ROLE_CONFIG[r]; const RI = rc.icon;
                  return (
                    <motion.button key={r} whileTap={{ scale:0.93 }} onClick={() => { setLoginRole(r); setError(""); }}
                      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 4px", borderRadius:12,
                        border:`1.5px solid ${loginRole===r?rc.color:"rgba(255,255,255,0.1)"}`,
                        background:loginRole===r?rc.bg:"rgba(255,255,255,0.03)", cursor:"pointer", transition:"all 0.2s" }}>
                      <RI size={14} color={loginRole===r?rc.color:"rgba(255,255,255,0.38)"} />
                      <span style={{ fontSize:9, fontWeight:700, color:loginRole===r?rc.color:"rgba(255,255,255,0.38)", letterSpacing:0.3 }}>{rc.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <Field label="Work Email" type="email" value={loginForm.email} onChange={setLF("email")} placeholder="you@company.com" icon={Globe} />
              <Field label="Password" type={showPw?"text":"password"} value={loginForm.password} onChange={setLF("password")} placeholder="••••••••" icon={Shield}
                rightEl={<button onClick={() => setShowPw(v=>!v)} style={{ color:"rgba(255,255,255,0.38)", background:"none", border:"none", cursor:"pointer", display:"flex" }}>{showPw?<EyeOff size={15}/>:<Eye size={15}/>}</button>}
              />

              <div style={{ textAlign:"right", marginBottom:20, marginTop:-6 }}>
                <button style={{ fontSize:12, color:"#00c896", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Forgot password?</button>
              </div>

              <motion.button whileHover={{ scale:1.02, y:-2 }} whileTap={{ scale:0.98 }} onClick={doLogin} disabled={loading}
                style={{ width:"100%", height:50, background:loading?"rgba(0,200,150,0.4)":"linear-gradient(135deg,#00c896,#00a87e)", border:"none", borderRadius:14, color:"#fff", fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 8px 24px rgba(0,200,150,0.28)", fontFamily:"inherit", transition:"all 0.2s" }}>
                {loading ? <><Loader2 size={18} className="animate-spin" />Signing in…</> : `Sign In as ${cfg.label}`}
              </motion.button>

              <p style={{ textAlign:"center", marginTop:18, fontSize:12, color:"rgba(255,255,255,0.35)" }}>
                Don't have an account?{" "}
                <button onClick={() => { setView("signup"); setError(""); }} style={{ color:"#00c896", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Sign up</button>
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  /* ════════════════ SIGNUP ════════════════ */
  if (view === "signup") {
    const cfg = ROLE_CONFIG[signupRole];
    return (
      <div className="min-h-screen flex items-center justify-center p-5 relative">
        <AnimatedBg />
        <AnimatePresence mode="wait">
          <motion.div key="signup" style={{...CARD, maxWidth:500, position:"relative", zIndex:10}} variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <div style={{ height:4, background:`linear-gradient(90deg,${cfg.color},${cfg.color}77)` }} />
            <div style={{ padding:"28px 32px 32px" }}>
              <motion.button whileHover={{ x:-3 }} onClick={() => { setView("landing"); setError(""); }}
                style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"rgba(255,255,255,0.38)", background:"none", border:"none", cursor:"pointer", padding:0, marginBottom:20 }}>
                <ArrowLeft size={14} /> Back
              </motion.button>

              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:"#fff", marginBottom:4 }}>Create Account</h2>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.38)", marginBottom:20 }}>Join your company's expense platform</p>

              <p style={{ fontSize:11, fontWeight:700, letterSpacing:0.6, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", marginBottom:10 }}>I am signing up as</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {(["employee","manager","finance","director"] as Role[]).map(r => {
                  const rc = ROLE_CONFIG[r]; const RI = rc.icon;
                  return (
                    <motion.button key={r} whileTap={{ scale:0.96 }} onClick={() => setSignupRole(r)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:14,
                        border:`1.5px solid ${signupRole===r?rc.color:"rgba(255,255,255,0.1)"}`,
                        background:signupRole===r?rc.bg:"rgba(255,255,255,0.03)", cursor:"pointer", transition:"all 0.2s" }}>
                      <div style={{ width:32, height:32, borderRadius:10, background:signupRole===r?`${rc.color}22`:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <RI size={15} color={signupRole===r?rc.color:"rgba(255,255,255,0.35)"} />
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:signupRole===r?rc.color:"rgba(255,255,255,0.8)" }}>{rc.label}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", lineHeight:1.3 }}>{rc.desc}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", background:"rgba(0,200,150,0.08)", border:"1px solid rgba(0,200,150,0.2)", borderRadius:12, marginBottom:16, fontSize:12.5, color:"rgba(0,200,150,0.9)", lineHeight:1.5 }}>
                <Info size={15} style={{ flexShrink:0, marginTop:1 }} />
                <span>All new accounts require <strong>Admin approval</strong> before you can log in. You'll receive an email once your account is activated.</span>
              </motion.div>

              {error && (
                <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, marginBottom:14, fontSize:13, color:"#fca5a5" }}>
                  <AlertCircle size={14} color="#ef4444" />{error}
                </motion.div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="First Name" value={form.firstName} onChange={setF("firstName")} placeholder="Riya" />
                <Field label="Last Name" value={form.lastName} onChange={setF("lastName")} placeholder="Sharma" />
              </div>

              <Field label="Employee ID / Number" value={form.empId} onChange={setF("empId")} placeholder="EMP-0042" icon={Shield} />
              <Field label="Work Email" type="email" value={form.email} onChange={setF("email")} placeholder="riya@company.com" icon={Globe} />

              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.6px", color:"rgba(255,255,255,0.45)", textTransform:"uppercase", marginBottom:6 }}>
                  Country <span style={{ color:"#00c896", fontWeight:600, textTransform:"none", letterSpacing:0, fontSize:11 }}>→ sets company currency</span>
                </label>

                {selectedCountry && (
                  <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(0,200,150,0.1)", border:"1px solid rgba(0,200,150,0.3)", borderRadius:12, marginBottom:8 }}>
                    <Globe size={14} color="#00c896" />
                    <span style={{ fontSize:13, color:"rgba(255,255,255,0.8)", flex:1 }}>{selectedCountry.name}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", background:"rgba(0,200,150,0.15)", borderRadius:8, border:"1px solid rgba(0,200,150,0.3)" }}>
                      <span style={{ fontSize:16, fontWeight:800, color:"#00c896" }}>{selectedCountry.symbol}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"rgba(0,200,150,0.85)" }}>{selectedCountry.currency}</span>
                    </div>
                  </motion.div>
                )}

                <div style={{ position:"relative" }}>
                  <button onClick={() => setCountryOpen(v=>!v)}
                    style={{ width:"100%", height:46, padding:"0 44px 0 40px", background:"rgba(255,255,255,0.06)",
                      border:`1.5px solid ${selectedCountry?"rgba(0,200,150,0.4)":"rgba(255,255,255,0.12)"}`,
                      borderRadius:12, color:selectedCountry?"#fff":"rgba(255,255,255,0.28)", fontSize:14, fontFamily:"inherit",
                      textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                    <Globe size={15} color="rgba(255,255,255,0.3)" style={{ position:"absolute", left:14 }} />
                    <span style={{ paddingLeft:24 }}>{selectedCountry ? `Change country (${selectedCountry.name})` : "Select your country…"}</span>
                    <ChevronDown size={14} color="rgba(255,255,255,0.3)" style={{ position:"absolute", right:14 }} />
                  </button>

                  <AnimatePresence>
                    {countryOpen && (
                      <motion.div initial={{ opacity:0, y:-8, scaleY:0.95 }} animate={{ opacity:1, y:0, scaleY:1 }} exit={{ opacity:0, y:-8, scaleY:0.95 }}
                        style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#0e1929",
                          border:"1px solid rgba(0,200,150,0.2)", borderRadius:14, zIndex:100, maxHeight:220, overflowY:"auto",
                          boxShadow:"0 16px 48px rgba(0,0,0,0.7)" }}>
                        {COUNTRIES.map(c => (
                          <button key={c.code} onClick={() => { setSelectedCountry(c); setCountryOpen(false); }}
                            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                              padding:"10px 16px", background:selectedCountry?.code===c.code?"rgba(0,200,150,0.1)":"transparent",
                              border:"none", cursor:"pointer", fontSize:13, color:selectedCountry?.code===c.code?"#00c896":"rgba(255,255,255,0.7)",
                              textAlign:"left" }}>
                            <span>{c.name}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:selectedCountry?.code===c.code?"#00c896":"rgba(255,255,255,0.35)" }}>
                              {c.symbol} {c.currency}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Password" type={showPw?"text":"password"} value={form.password} onChange={setF("password")} placeholder="Min 8 chars" icon={Shield}
                  rightEl={<button onClick={()=>setShowPw(v=>!v)} style={{ color:"rgba(255,255,255,0.38)", background:"none", border:"none", cursor:"pointer", display:"flex" }}>{showPw?<EyeOff size={15}/>:<Eye size={15}/>}</button>}
                />
                <Field label="Confirm" type={showPw2?"text":"password"} value={form.confirm} onChange={setF("confirm")} placeholder="Repeat" icon={Shield}
                  rightEl={<button onClick={()=>setShowPw2(v=>!v)} style={{ color:"rgba(255,255,255,0.38)", background:"none", border:"none", cursor:"pointer", display:"flex" }}>{showPw2?<EyeOff size={15}/>:<Eye size={15}/>}</button>}
                />
              </div>

              {form.password && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, marginTop:-6 }}>
                  <div style={{ display:"flex", gap:4, flex:1 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<=pwStrength?strengthColors[pwStrength]:"rgba(255,255,255,0.1)", transition:"background 0.3s" }} />
                    ))}
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color:strengthColors[pwStrength], minWidth:36 }}>{strengthLabel[pwStrength]}</span>
                </motion.div>
              )}

              <motion.button whileHover={{ scale:1.02, y:-2 }} whileTap={{ scale:0.98 }} onClick={doSignup} disabled={loading}
                style={{ width:"100%", height:50, background:loading?"rgba(0,200,150,0.4)":"linear-gradient(135deg,#00c896,#00a87e)", border:"none", borderRadius:14, color:"#fff", fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 8px 24px rgba(0,200,150,0.28)", fontFamily:"inherit", transition:"all 0.2s", marginBottom:16 }}>
                {loading?<><Loader2 size={18} className="animate-spin"/>Creating account…</>:"Create Account"}
              </motion.button>

              <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.35)" }}>
                Already have an account?{" "}
                <button onClick={() => { setView("login"); setError(""); }} style={{ color:"#00c896", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Sign in</button>
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  /* ════════════════ PENDING ════════════════ */
  if (view === "pending") return (
    <div className="min-h-screen flex items-center justify-center p-5 relative">
      <AnimatedBg />
      <motion.div style={{...CARD, maxWidth:440, position:"relative", zIndex:10}} variants={cardVariants} initial="hidden" animate="visible">
        <div style={{ padding:"36px 32px" }}>
          <motion.div animate={{ rotate:[0,-8,8,-8,0] }} transition={{ delay:0.5, duration:0.6 }}
            style={{ width:72, height:72, borderRadius:"50%", background:"rgba(245,166,35,0.1)", border:"2px solid rgba(245,166,35,0.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:32 }}>
            ⏳
          </motion.div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:"#fff", textAlign:"center", marginBottom:10 }}>Request Submitted!</h2>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", textAlign:"center", lineHeight:1.7, marginBottom:24 }}>
            Your account is <span style={{ color:"#f5a623", fontWeight:600 }}>pending admin approval</span>. You'll receive an email once approved and can then log in.
          </p>
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"14px 16px", marginBottom:24, border:"1px solid rgba(255,255,255,0.07)" }}>
            {[["1","Admin reviews your request"],["2","Approval or rejection email sent"],["3","Log in with your credentials"]].map(([n,txt]) => (
              <div key={n} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:n!=="3"?"1px solid rgba(255,255,255,0.06)":"none" }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(0,200,150,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#00c896", flexShrink:0 }}>{n}</div>
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.55)" }}>{txt}</span>
              </div>
            ))}
          </div>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            onClick={() => { setView("landing"); setForm({ firstName:"", lastName:"", empId:"", email:"", password:"", confirm:"" }); }}
            style={{ width:"100%", height:46, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, color:"rgba(255,255,255,0.75)", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Back to Sign In
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  /* ════════════════ ADMIN REQUESTS ════════════════ */
  if (view === "admin_requests") return (
    <div className="min-h-screen flex items-center justify-center p-5 relative">
      <AnimatedBg />
      <motion.div style={{...CARD, maxWidth:520, position:"relative", zIndex:10}} variants={cardVariants} initial="hidden" animate="visible">
        <div style={{ height:4, background:"linear-gradient(90deg,#10b981,#10b98177)" }} />
        <div style={{ padding:"28px 28px 32px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Shield size={18} color="#10b981" />
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:"#fff" }}>Admin Panel</h2>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ padding:"4px 12px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:20, fontSize:12, fontWeight:700, color:"#10b981" }}>
                {pendingUsers.length} pending
              </div>
              <motion.button whileHover={{ scale:1.04 }} onClick={() => onLogin("admin")}
                style={{ fontSize:12, color:"rgba(255,255,255,0.5)", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                Full Dashboard →
              </motion.button>
            </div>
          </div>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:16 }}>Pending signup approvals</p>

          <motion.button whileHover={{ x:-2 }} onClick={() => setView("landing")}
            style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"rgba(255,255,255,0.32)", background:"none", border:"none", cursor:"pointer", marginBottom:16, padding:0 }}>
            <ArrowLeft size={12} />Logout
          </motion.button>

          <div style={{ maxHeight:440, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
            <AnimatePresence>
              {pendingUsers.length === 0 && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                  style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,0.28)", fontSize:13 }}>
                  ✅ No pending requests — all clear!
                </motion.div>
              )}
              {pendingUsers.map(u => (
                <motion.div key={u.id} layout initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:-30, height:0, marginBottom:0, overflow:"hidden", padding:0 }}
                  transition={{ duration:0.3 }}
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                    <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#00c896,#0070f3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>
                      {u.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                        <span style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{u.name}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6,
                          background:`${badgeColor[u.role]}22`, color:badgeColor[u.role],
                          border:`1px solid ${badgeColor[u.role]}44`, letterSpacing:0.5, textTransform:"uppercase" }}>
                          {u.role}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", display:"flex", gap:6, flexWrap:"wrap" }}>
                        <span>{u.empId}</span><span>·</span><span>{u.email}</span><span>·</span><span>{u.time}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, padding:"7px 12px", background:"rgba(0,200,150,0.07)", borderRadius:10, border:"1px solid rgba(0,200,150,0.15)" }}>
                    <Globe size={12} color="#00c896" />
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)", flex:1 }}>{u.country}</span>
                    <span style={{ fontSize:13, fontWeight:800, color:"#00c896" }}>{u.currencySymbol}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"rgba(0,200,150,0.8)" }}>{u.currency}</span>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>— company currency</span>
                  </div>

                  <div style={{ display:"flex", gap:8 }}>
                    <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={() => approveUser(u.id)}
                      style={{ flex:1, height:34, borderRadius:10, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", color:"#10b981", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit", transition:"all 0.2s" }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#10b981";(e.currentTarget as HTMLElement).style.color="#fff";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(16,185,129,0.1)";(e.currentTarget as HTMLElement).style.color="#10b981";}}>
                      <Check size={14} />Approve
                    </motion.button>
                    <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={() => rejectUser(u.id)}
                      style={{ flex:1, height:34, borderRadius:10, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit", transition:"all 0.2s" }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#ef4444";(e.currentTarget as HTMLElement).style.color="#fff";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.1)";(e.currentTarget as HTMLElement).style.color="#ef4444";}}>
                      <X size={14} />Reject
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return null;
};

export default Login;