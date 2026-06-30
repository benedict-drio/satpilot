import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For indie builders getting started with Bitcoin payments.",
    features: ["Up to 100 transactions/mo", "Payment widget", "Basic dashboard", "Community support"],
    cta: "Start Free",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro",
    price: "0.5%",
    priceLabel: "per transaction",
    description: "For growing businesses that need full payment infrastructure.",
    features: ["Unlimited transactions", "Advanced analytics", "Refund management", "Priority support", "Custom branding"],
    highlighted: true,
    cta: "Get Started",
    ctaVariant: "default" as const,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-32 relative scroll-mt-20">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <h2 className="text-fluid-heading font-display font-bold text-foreground">
              Simple, transparent pricing
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              No hidden fees, no monthly minimums. Start free, and pay a flat 0.5% only when
              you get paid.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`relative flex flex-col rounded-xl border bg-card p-8 ${
                  plan.highlighted ? "border-primary/50 shadow-glow" : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mb-2 mt-4">
                  <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.priceLabel && (
                    <span className="ml-2 text-sm text-muted-foreground">{plan.priceLabel}</span>
                  )}
                </div>
                <p className="mb-6 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.ctaVariant}
                  className={`mt-auto w-full ${plan.highlighted ? "gradient-bitcoin text-primary-foreground" : ""}`}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
