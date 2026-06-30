import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { ArrowUpRight } from "lucide-react";

function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <p className="font-display text-5xl font-bold tabular-nums text-foreground md:text-6xl">
        {count.toLocaleString()}
        <span className="text-primary">{suffix}</span>
      </p>
      <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-muted-foreground">{label}</p>
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 py-28">
      <div className="absolute inset-0 gradient-dark-glow opacity-90" />
      <div
        className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)" }}
      />
      <div className="container relative z-10 mx-auto px-6">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-fluid-heading font-display font-bold text-foreground">
              Built for how Bitcoin actually works
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              No card networks, no chargebacks, no custody risk. A flat 0.5% fee, and the
              money lands in your wallet, not ours.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 gap-12 sm:grid-cols-3"
          >
            <StatCard value={12} suffix="s" label="Typical time from checkout to confirmed" />
            <StatCard value={100} suffix="%" label="Of funds self-custodied by you" />
            <StatCard value={0} suffix="" label="Chargebacks, by design" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <button className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
            Start accepting Bitcoin
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
