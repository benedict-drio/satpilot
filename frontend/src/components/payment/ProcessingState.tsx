import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";

interface ProcessingStateProps {
  onComplete: () => void;
}

const steps = ["Sent", "Confirming", "Done"];
const TX_HASH = "0x7a3f...b4c2e891";

export function ProcessingState({ onComplete }: ProcessingStateProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [confirmations, setConfirmations] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Step 0 -> 1 after 1s
    const t1 = setTimeout(() => setActiveStep(1), 1000);
    // Simulate confirmations filling in
    const t2 = setTimeout(() => setConfirmations(1), 1500);
    const t3 = setTimeout(() => setConfirmations(2), 2000);
    const t4 = setTimeout(() => setConfirmations(3), 2500);
    const t5 = setTimeout(() => setConfirmations(4), 3000);
    const t6 = setTimeout(() => setConfirmations(5), 3500);
    const t7 = setTimeout(() => {
      setConfirmations(6);
      setActiveStep(2);
    }, 4000);
    const t8 = setTimeout(onComplete, 4500);
    return () => [t1, t2, t3, t4, t5, t6, t7, t8].forEach(clearTimeout);
  }, [onComplete]);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-5 space-y-5"
    >
      {/* Stepper */}
      <div className="flex items-center justify-between px-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-0 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  i < activeStep
                    ? "bg-success text-success-foreground"
                    : i === activeStep
                    ? "gradient-bitcoin text-primary-foreground animate-bitcoin-pulse"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < activeStep ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  i <= activeStep ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-2 mb-5 transition-colors duration-300 ${
                  i < activeStep ? "bg-success" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Spinner */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-muted border-t-primary animate-spin shadow-glow" />
      </div>

      {/* TX Hash */}
      <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Transaction Hash</p>
          <code className="text-xs font-mono text-foreground">{TX_HASH}</code>
        </div>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Confirmation dots */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">{confirmations}</span> of 6 confirmations
        </p>
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                i < confirmations ? "bg-primary" : "bg-muted"
              }`}
              animate={i < confirmations ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
