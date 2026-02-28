import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bitcoin, Copy, Check, ArrowRight } from "lucide-react";

type DisplayUnit = "sats" | "BTC" | "USD";

const amounts: Record<DisplayUnit, string> = {
  sats: "250,000",
  BTC: "0.00250000",
  USD: "$245.00",
};

export function PaymentWidgetDemo() {
  const [unit, setUnit] = useState<DisplayUnit>("sats");
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<"compact" | "expanded">("compact");

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="w-full max-w-sm glass-card overflow-hidden shadow-glow"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="p-5 pb-3 flex items-center gap-3 border-b border-border/40">
        <div className="w-9 h-9 rounded-lg gradient-bitcoin flex items-center justify-center">
          <Bitcoin className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">CryptoMerch</p>
          <p className="text-xs text-muted-foreground">Invoice #1042</p>
        </div>
      </div>

      {/* Amount */}
      <div className="p-5 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={unit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-4xl font-display font-bold tracking-tight text-foreground tabular-nums"
          >
            {amounts[unit]}
          </motion.p>
        </AnimatePresence>
        <div className="flex items-center justify-center gap-1 mt-3">
          {(["sats", "BTC", "USD"] as DisplayUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                unit === u
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Premium T-Shirt — Black Edition</p>
      </div>

      {/* Expanded state */}
      <AnimatePresence>
        {state === "expanded" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/40"
          >
            <div className="p-5 space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <code className="text-xs font-mono text-muted-foreground truncate mr-2">
                  SP2J6ZY48...V6HMKR9B
                </code>
                <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors">
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                Expires in <span className="text-warning font-mono">14:32</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <div className="p-5 pt-0">
        <button
          onClick={() => setState(state === "compact" ? "expanded" : "compact")}
          className="w-full py-3.5 rounded-xl gradient-bitcoin text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-glow"
        >
          <Bitcoin className="w-4 h-4" />
          {state === "compact" ? "Pay with sBTC" : "Connect Wallet & Pay"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 text-center">
        <p className="text-[10px] text-muted-foreground/60">
          Powered by <span className="text-gradient-bitcoin font-semibold">SatsTerminal</span>
        </p>
      </div>
    </motion.div>
  );
}
