import { motion, AnimatePresence } from "framer-motion";
import { Bitcoin, ArrowRight } from "lucide-react";

type DisplayUnit = "sats" | "BTC" | "USD";

const amounts: Record<DisplayUnit, string> = {
  sats: "250,000",
  BTC: "0.00250000",
  USD: "$245.00",
};

interface CompactStateProps {
  unit: DisplayUnit;
  setUnit: (u: DisplayUnit) => void;
  onPay: () => void;
}

export function CompactState({ unit, setUnit, onPay }: CompactStateProps) {
  return (
    <div className="p-5 space-y-4">
      {/* Amount */}
      <div className="text-center">
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
        <p className="text-xs text-muted-foreground mt-3">
          Premium T-Shirt — Black Edition
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onPay}
        className="w-full py-3.5 rounded-xl gradient-bitcoin text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-glow"
      >
        <Bitcoin className="w-4 h-4" />
        Pay with sBTC
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
