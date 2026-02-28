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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Simple,{" "}
            <span className="text-gradient-bitcoin">Transparent Pricing</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No monthly minimums. Just the lowest rates in crypto payments.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`glass-card p-8 flex flex-col ${
                plan.highlighted ? "border-primary/40 shadow-glow" : ""
              }`}
            >
              <h3 className="text-lg font-display font-semibold text-foreground">
                {plan.name}
              </h3>
              <div className="mt-4 mb-2">
                <span className="text-4xl font-display font-bold text-foreground">
                  {plan.price}
                </span>
                {plan.priceLabel && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {plan.priceLabel}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
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
    </section>
  );
}
