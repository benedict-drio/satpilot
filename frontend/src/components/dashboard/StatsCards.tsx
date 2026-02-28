import { motion } from "framer-motion";
import { Bitcoin, FileText, TrendingUp, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { statsCards } from "@/data/mockDashboard";

const iconMap: Record<string, React.ElementType> = {
  Bitcoin,
  FileText,
  TrendingUp,
  Percent,
};

function formatValue(value: number, format: string): string {
  switch (format) {
    case "btc":
      return `₿ ${value.toFixed(4)}`;
    case "btc-fee":
      return `₿ ${value.toFixed(4)}`;
    case "count":
      return value.toString();
    case "percent":
      return `${value.toFixed(1)}%`;
    default:
      return value.toString();
  }
}

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat, i) => (
        <StatCard key={stat.label} stat={stat} index={i} />
      ))}
    </div>
  );
}

function StatCard({ stat, index }: { stat: typeof statsCards[0]; index: number }) {
  const Icon = iconMap[stat.icon] || Bitcoin;
  const isPositive = stat.trend >= 0;
  const multiplier = stat.format === "count" ? 1 : stat.format === "percent" ? 10 : 10000;
  const { count, ref } = useCountUp(Math.round(stat.value * multiplier), 1500);

  const displayValue = stat.format === "count"
    ? count.toString()
    : stat.format === "percent"
    ? `${(count / 10).toFixed(1)}%`
    : `₿ ${(count / 10000).toFixed(4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(stat.trend)}%
        </div>
      </div>
      <p ref={ref as React.RefObject<HTMLParagraphElement>} className="text-2xl font-display font-bold text-foreground">
        {displayValue}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
    </motion.div>
  );
}
