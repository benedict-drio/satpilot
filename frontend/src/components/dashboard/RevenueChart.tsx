import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { revenueData } from "@/data/mockDashboard";

const chartConfig: ChartConfig = {
  revenue: {
    label: "Revenue (BTC)",
    color: "hsl(25 95% 53%)",
  },
};

export function RevenueChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="glass-card p-5"
    >
      <h3 className="text-lg font-display font-semibold text-foreground mb-4">Revenue — Last 7 Days</h3>
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(25 95% 53%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(25 95% 53%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₿${v}`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(25 95% 53%)"
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ChartContainer>
    </motion.div>
  );
}
