import { motion } from "framer-motion";
import { Zap, Shield, Percent, Layers, RotateCcw, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Settlements",
    description: "Receive sBTC payments confirmed in seconds with Stacks' fast block times.",
  },
  {
    icon: Shield,
    title: "Secure Self-Custody",
    description: "Your keys, your coins. Funds go directly to your wallet — no intermediaries.",
  },
  {
    icon: Percent,
    title: "Low Fees (0.5%)",
    description: "Industry-low platform fees. Keep more of every payment you receive.",
  },
  {
    icon: Layers,
    title: "Partial Payments",
    description: "Accept partial payments and track remaining balances automatically.",
  },
  {
    icon: RotateCcw,
    title: "Built-in Refunds",
    description: "One-click refund processing with full audit trail and status tracking.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time revenue charts, transaction history, and business insights.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeaturesGrid() {
  return (
    <section id="features" className="py-32 relative scroll-mt-20">
      <div className="absolute inset-0 gradient-dark-glow opacity-50" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Everything You Need to{" "}
            <span className="text-gradient-bitcoin">Accept Bitcoin</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete payment infrastructure designed for businesses building on Stacks.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group glass-card p-7 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
