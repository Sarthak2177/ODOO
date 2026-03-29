import { LogOut, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  role: "employee" | "manager" | "finance" | "director" | "admin";
  name?: string;
  onLogout: () => void;
}

const roleBadge: Record<string, { label: string; color: string }> = {
  employee: { label: "Employee", color: "bg-primary/10 text-primary" },
  manager:  { label: "Manager",  color: "bg-amber-100 text-amber-700" },
  finance:  { label: "Finance",  color: "bg-cyan-100 text-cyan-700" },
  director: { label: "Director", color: "bg-pink-100 text-pink-700" },
  admin:    { label: "Admin",    color: "bg-violet-100 text-violet-700" },
};

const Navbar = ({ role, name, onLogout }: NavbarProps) => {
  const badge = roleBadge[role] ?? roleBadge.employee;
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground tracking-tight font-syne">ReimburseAI</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
            {badge.label}
          </span>
          {name && (
            <span className="text-xs text-muted-foreground hidden sm:block">· {name}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
