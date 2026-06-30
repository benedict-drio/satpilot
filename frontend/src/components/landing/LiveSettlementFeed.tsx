import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

// "Money in motion" — a continuously streaming feed of settlements so the page
// proves the core promise (payments confirm in seconds) instead of claiming it.
// Data is illustrative; amounts and merchants are generated client-side.

const MERCHANTS = [
  "blackbird.coffee", "northwind.store", "lumen.studio", "atlas-goods.btc",
  "harbor.market", "fox&fern.shop", "meridian.io", "saltwater.co",
  "ember.kitchen", "vellum.press", "tidal.gear", "orchard.supply",
];

type Settlement = { id: number; btc: string; merchant: string; secs: number };

function makeSettlement(id: number): Settlement {
  const btc = (Math.random() * 0.049 + 0.0008).toFixed(4);
  const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
  const secs = Math.floor(Math.random() * 9) + 4; // 4–12s, the settlement story
  return { id, btc, merchant, secs };
}

function Chip({ s }: { s: Settlement }) {
  return (
    <div className="flex items-center gap-3 whitespace-nowrap rounded-full border border-border bg-card px-5 py-2.5 shadow-sm">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
        <Check className="h-3 w-3 text-success" strokeWidth={3} />
      </span>
      <span className="font-mono text-sm font-semibold text-foreground tabular-nums">{s.btc} BTC</span>
      <span className="text-sm text-muted-foreground">{s.merchant}</span>
      <span className="rounded-full bg-success/10 px-2 py-0.5 font-mono text-xs text-success tabular-nums">{s.secs}s</span>
    </div>
  );
}

export function LiveSettlementFeed() {
  const reduce = useReducedMotion();
  const seed = useRef(0);
  const [row] = useState<Settlement[]>(() =>
    Array.from({ length: 10 }, () => makeSettlement(seed.current++)),
  );

  // Live count that ticks up, reinforcing "happening right now".
  const [count, setCount] = useState(84213);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 3) + 1), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <section aria-label="Live settlements" className="border-y border-border bg-background py-6">
      <div className="container mx-auto mb-4 flex items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {!reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
            )}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-sm font-medium text-foreground">Settling now on Stacks</span>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-semibold text-foreground tabular-nums">{count.toLocaleString()}</span> payments
          settled
        </p>
      </div>

      {/* Edge-faded marquee */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <motion.div
          className="flex w-max gap-3 px-3"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={reduce ? undefined : { duration: 38, ease: "linear", repeat: Infinity }}
        >
          {[...row, ...row].map((s, i) => (
            <Chip key={`${s.id}-${i}`} s={s} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
