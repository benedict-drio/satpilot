import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, ChevronLeft, Bitcoin } from "lucide-react";

interface ExpandedStateProps {
  onConnect: () => void;
  onBack: () => void;
}

export function ExpandedState({ onConnect, onBack }: ExpandedStateProps) {
  const [copied, setCopied] = useState(false);
  const [seconds, setSeconds] = useState(14 * 60 + 59);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-5 space-y-4">
        {/* QR placeholder */}
        <div className="mx-auto w-44 h-44 rounded-xl border-2 border-primary/60 p-2 flex items-center justify-center">
          <div className="w-full h-full rounded-lg bg-muted/40 grid grid-cols-7 grid-rows-7 gap-[2px] p-2">
            {Array.from({ length: 49 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-[1px] ${
                  [0,1,2,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,46,47,48,
                   3,10,17,24,31,38,45,8,9,11,12,15,16,18,19,22,23,25,26,29,30,32,33,36,37,39,40
                  ].includes(i)
                    ? "bg-foreground/80"
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Address */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <code className="text-xs font-mono text-muted-foreground truncate mr-2">
            SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0J
          </code>
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <a
            href="#"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            View on Explorer <ExternalLink className="w-3 h-3" />
          </a>
          <span>
            Expires in{" "}
            <span className="text-warning font-mono">
              {mm}:{ss}
            </span>
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onConnect}
          className="w-full py-3.5 rounded-xl gradient-bitcoin text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-glow"
        >
          <Bitcoin className="w-4 h-4" />
          Connect Wallet & Pay
        </button>

        <button
          onClick={onBack}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" /> Back
        </button>
      </div>
    </motion.div>
  );
}
