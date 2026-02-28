import { motion } from "framer-motion";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is sBTC and how does it work?",
    answer:
      "sBTC is a 1:1 Bitcoin-backed asset on the Stacks blockchain. When a customer pays with sBTC, they're sending real Bitcoin value that settles on Stacks with the security guarantees of Bitcoin's proof-of-work. You receive sBTC directly in your wallet — no intermediaries involved.",
  },
  {
    question: "How fast are payment confirmations?",
    answer:
      "Stacks produces blocks every few seconds, so payments are confirmed almost instantly. Your dashboard updates in real time as transactions settle, giving you and your customers a seamless checkout experience.",
  },
  {
    question: "What are the fees?",
    answer:
      "SatsTerminal charges a flat 0.5% fee per transaction on the Pro plan — one of the lowest rates in crypto payments. There are no hidden fees, monthly minimums, or setup costs. The Starter plan is completely free for up to 100 transactions per month.",
  },
  {
    question: "Do I need to KYC my customers?",
    answer:
      "SatsTerminal is a self-custody payment tool — we never hold your funds or your customers' data. Whether you need to collect KYC information depends on your local regulations and business requirements. We provide the payment rails; compliance is up to you.",
  },
  {
    question: "How do refunds work?",
    answer:
      "Refunds are handled directly from your merchant dashboard with a single click. Each refund is logged with a full audit trail including timestamps, amounts, and transaction hashes so you always have a clear record.",
  },
  {
    question: "How do I integrate SatsTerminal?",
    answer:
      "Drop our payment widget into your site with a few lines of code. Generate your API keys from the dashboard, configure your preferred settings, and you're ready to accept Bitcoin payments. Full documentation and code examples are available to get you live in minutes.",
  },
];

const item = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export function FAQSection() {
  return (
    <section id="faq" className="py-32 relative scroll-mt-20">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Frequently Asked{" "}
            <span className="text-gradient-bitcoin">Questions</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about accepting Bitcoin payments with
            SatsTerminal.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto glass-card p-6 md:p-8">
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={item}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <AccordionItem
                  value={`faq-${i}`}
                  className="border-border/50"
                >
                  <AccordionTrigger className="text-left text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
