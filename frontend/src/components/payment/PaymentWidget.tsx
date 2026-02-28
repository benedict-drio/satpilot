import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bitcoin } from "lucide-react";
import { CompactState } from "./CompactState";
import { ExpandedState } from "./ExpandedState";
import { ProcessingState } from "./ProcessingState";
import { SuccessState } from "./SuccessState";

type WidgetState = "compact" | "expanded" | "processing" | "success";
type DisplayUnit = "sats" | "BTC" | "USD";

interface PaymentWidgetProps {
  onReset?: () => void;
}

export function PaymentWidget({ onReset }: PaymentWidgetProps) {
  const [state, setState] = useState<WidgetState>("compact");
  const [unit, setUnit] = useState<DisplayUnit>("sats");

  const handleComplete = useCallback(() => setState("success"), []);
  const handleDone = useCallback(() => {
    setState("compact");
    onReset?.();
  }, [onReset]);

  return (
    <motion.div
      className="w-full max-w-sm glass-card overflow-hidden shadow-glow"
      layout
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

      {/* State panels */}
      <AnimatePresence mode="wait">
        {state === "compact" && (
          <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CompactState unit={unit} setUnit={setUnit} onPay={() => setState("expanded")} />
          </motion.div>
        )}
        {state === "expanded" && (
          <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ExpandedState onConnect={() => setState("processing")} onBack={() => setState("compact")} />
          </motion.div>
        )}
        {state === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProcessingState onComplete={handleComplete} />
          </motion.div>
        )}
        {state === "success" && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuccessState onDone={handleDone} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-5 pb-4 text-center">
        <p className="text-[10px] text-muted-foreground/60">
          Powered by <span className="text-gradient-bitcoin font-semibold">SatsTerminal</span>
        </p>
      </div>
    </motion.div>
  );
}
