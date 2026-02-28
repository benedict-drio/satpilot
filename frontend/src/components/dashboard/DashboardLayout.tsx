import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Wallet, Home, LogOut, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationDropdown } from "./NotificationDropdown";
import { MobileBottomNav } from "./MobileBottomNav";
import { FloatingActionButton } from "./FloatingActionButton";
import { ErrorBoundary } from "./ErrorBoundary";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useWallet, truncate } from "@/contexts/WalletContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { isConnected, address, isConnecting, connect, disconnect } = useWallet();

  return (
    <SidebarProvider>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-3">
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
            </div>
            <div className="flex items-center gap-1">
              <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ThemeToggle />
              </div>
              <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                <NotificationDropdown />
              </div>
              {isConnected && address ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 min-h-[44px] border-success/30 text-success hover:bg-success/10">
                      <Wallet className="w-4 h-4" />
                      <span className="hidden sm:inline">{truncate(address)}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs font-mono text-muted-foreground">
                      {truncate(address)}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={disconnect} className="text-destructive focus:text-destructive cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 min-h-[44px]"
                  onClick={connect}
                  disabled={isConnecting}
                  aria-label="Connect Wallet"
                >
                  {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isConnecting ? "Connecting…" : "Connect Wallet"}</span>
                </Button>
              )}
            </div>
          </header>
          <main id="main-content" className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
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
