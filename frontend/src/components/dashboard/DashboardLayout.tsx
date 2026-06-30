import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Home } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/invoices": "Invoices",
  "/dashboard/payments": "Payments",
  "/dashboard/refunds": "Refunds",
  "/dashboard/settings": "Settings",
  "/dashboard/admin": "Admin",
};
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationDropdown } from "./NotificationDropdown";
import { MobileBottomNav } from "./MobileBottomNav";
import { FloatingActionButton } from "./FloatingActionButton";
import { ErrorBoundary } from "./ErrorBoundary";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WalletButton } from "@/components/wallet/WalletButton";

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/dashboard/invoices/") ? "Invoice details" : "Dashboard");

  return (
    <SidebarProvider>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="hidden md:block">
                <SidebarTrigger />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="min-w-[44px] min-h-[44px]"
                onClick={() => navigate("/")}
                aria-label="Go to home"
              >
                <Home className="w-4 h-4" />
              </Button>
              <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
              <span className="hidden truncate font-display text-base font-semibold text-foreground sm:block">
                {pageTitle}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ThemeToggle />
              </div>
              <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                <NotificationDropdown />
              </div>
              <WalletButton variant="compact" />
            </div>
          </header>
          <main id="main-content" className="flex-1 overflow-auto p-4 md:p-6 xl:p-8 pb-20 md:pb-6">
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeInOut" }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </main>
        </div>
        <MobileBottomNav />
        <FloatingActionButton />
      </div>
    </SidebarProvider>
  );
}
