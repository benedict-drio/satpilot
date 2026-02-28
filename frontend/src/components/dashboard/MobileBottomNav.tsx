import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  RotateCcw,
  Settings,
} from "lucide-react";
import { invoices } from "@/data/mockDashboard";
import { cn } from "@/lib/utils";

const pendingCount = invoices.filter((i) => i.status === "pending").length;

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, end: true },
  { title: "Invoices", url: "/dashboard/invoices", icon: FileText, badge: pendingCount },
  { title: "Payments", url: "/dashboard/payments", icon: CreditCard },
  { title: "Refunds", url: "/dashboard/refunds", icon: RotateCcw },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (url: string, end?: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-sm border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.url, item.end);
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-[44px] min-h-[44px] gap-0.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
              aria-label={item.title}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
              {item.badge ? (
                <span className="absolute -top-0.5 right-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full bg-primary text-primary-foreground leading-none">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
