import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface SuccessStateProps {
  onDone: () => void;
}

const particles = Array.from({ length: 12 }).map((_, i) => ({
  x: (Math.random() - 0.5) * 160,
  y: (Math.random() - 0.5) * 160,
  color: i % 3 === 0 ? "bg-success" : "bg-primary",
  delay: Math.random() * 0.3,
  size: Math.random() > 0.5 ? "w-2 h-2" : "w-1.5 h-1.5",
}));

export function SuccessState({ onDone }: SuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-5 space-y-4 text-center"
    >
      {/* Checkmark with glow */}
      <div className="relative flex justify-center py-2">
        {/* Particles */}
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className={`absolute ${p.size} ${p.color} rounded-full`}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: p.x, y: p.y, scale: 0 }}
            transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
          />
        ))}
        {/* Glow ring */}
        <div className="absolute w-20 h-20 rounded-full bg-success/20 animate-glow-pulse" />
        {/* Checkmark */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="relative z-10"
        >
          <circle cx="32" cy="32" r="30" stroke="hsl(var(--success))" strokeWidth="3" opacity="0.3" />
          <motion.circle
            cx="32" cy="32" r="30"
            stroke="hsl(var(--success))"
            strokeWidth="3"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <path
            d="M20 33 L28 41 L44 25"
            stroke="hsl(var(--success))"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="animate-draw-check"
          />
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-display font-bold text-foreground">Payment Complete</h3>
        <p className="text-2xl font-display font-bold text-foreground mt-1">250,000 sats</p>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
        <div className="flex justify-between">
          <span>Invoice</span>
          <span className="text-foreground font-mono">#1042</span>
        </div>
        <div className="flex justify-between">
          <span>Merchant</span>
          <span className="text-foreground">CryptoMerch</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span className="text-foreground font-mono">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href="#"
          className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
        >
          View on Explorer <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={onDone}
          className="flex-1 py-2.5 rounded-xl gradient-bitcoin text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}
