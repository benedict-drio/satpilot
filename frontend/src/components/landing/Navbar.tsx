import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Menu, X, Wallet, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWallet, truncate } from "@/contexts/WalletContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
  { label: "Docs", href: "#docs" },
  { label: "Dashboard", href: "/dashboard", isRoute: true },
];

export function Navbar() {
  const navigate = useNavigate();
  const { isConnected, address, isConnecting, connect, disconnect } = useWallet();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (link: typeof navLinks[0]) => {
    const wasMobileOpen = mobileOpen;
    setMobileOpen(false);
    if (link.isRoute) {
      navigate(link.href);
    } else if (link.href.startsWith("#")) {
      const scrollToEl = () => {
        const el = document.getElementById(link.href.slice(1));
        if (el) el.scrollIntoView({ behavior: "smooth" });
      };
      if (wasMobileOpen) {
        setTimeout(scrollToEl, 300);
      } else {
        scrollToEl();
      }
    }
  };

  const WalletButton = ({ className, mobile }: { className?: string; mobile?: boolean }) => {
    if (isConnected && address) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border border-success/30 bg-success/10 text-success text-sm font-semibold transition-all hover:bg-success/20",
                mobile && "w-full justify-center py-2.5",
                className
              )}
            >
              <Wallet className="w-4 h-4" />
              {truncate(address)}
            </button>
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
      );
    }

    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className={cn(
          "flex items-center gap-2 px-5 py-2 rounded-lg gradient-bitcoin text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all shadow-glow disabled:opacity-70",
          mobile && "w-full justify-center py-2.5 mt-2",
          className
        )}
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  };

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled
          ? "bg-background/70 backdrop-blur-xl border-b border-border/50 shadow-lg"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5"
          aria-label="SatsTerminal home"
        >
          <div className="w-8 h-8 rounded-lg gradient-bitcoin flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">
            SatsTerminal
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-foreground"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-b border-border/50"
          >
            <div className="container mx-auto px-6 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left py-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <WalletButton mobile />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
