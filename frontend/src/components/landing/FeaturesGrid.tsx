import { motion } from "framer-motion";
import { Zap, Shield, Percent, Layers, RotateCcw, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant settlements",
    description: "Receive sBTC payments confirmed in seconds on Stacks' fast block times.",
  },
  {
    icon: Shield,
    title: "Secure self-custody",
    description: "Your keys, your coins. Funds go directly to your wallet, with no intermediaries.",
  },
  {
    icon: Percent,
    title: "Low fees (0.5%)",
    description: "A flat 0.5% platform fee. Keep more of every payment you receive.",
  },
  {
    icon: Layers,
    title: "Partial payments",
    description: "Accept partial payments and track remaining balances automatically.",
  },
  {
    icon: RotateCcw,
    title: "Built-in refunds",
    description: "One-click refund processing with a full audit trail and status tracking.",
  },
  {
    icon: BarChart3,
    title: "Analytics dashboard",
    description: "Real-time revenue charts, transaction history, and business insights.",
  },
];

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-border bg-card py-32">
      <div className="container mx-auto px-6">
        <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Heading column — left-aligned, sticky, breaks the centered monotony */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <h2 className="text-fluid-heading font-display font-bold text-foreground">
              Everything you need to accept Bitcoin
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              A complete payment infrastructure for businesses building on Stacks: invoicing,
              settlement, refunds, and analytics in one place.
            </p>
          </motion.div>

          {/* Feature rows — hairline separated, no cards */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.08 }}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={item}
                className="grid grid-cols-[auto_1fr] gap-5 border-t border-border py-7 first:border-t-0 first:pt-0"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
