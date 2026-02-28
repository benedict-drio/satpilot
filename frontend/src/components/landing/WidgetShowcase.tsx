import { Link } from "react-router-dom";
import { PaymentWidget } from "@/components/payment/PaymentWidget";
import { ArrowRight } from "lucide-react";

export function WidgetShowcase() {
  return (
    <section id="widget-showcase" className="py-24 px-4 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 gradient-dark-glow opacity-50" />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Beautiful Payment Experience
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            A polished, embeddable widget that guides customers through payment in seconds.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
          {/* Browser frame mockup */}
          <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden shadow-card max-w-sm w-full">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/40 bg-muted/30">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                yourstore.com/checkout
              </span>
            </div>
            <div className="p-4 flex justify-center">
              <PaymentWidget />
            </div>
          </div>

          {/* Description */}
          <div className="max-w-md space-y-4">
            <h3 className="text-xl font-display font-semibold text-foreground">
              4-Step Payment Flow
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full gradient-bitcoin text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                Invoice amount with sats / BTC / USD toggle
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full gradient-bitcoin text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                QR code & address with countdown timer
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full gradient-bitcoin text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                Real-time confirmation tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full gradient-bitcoin text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                Animated success with receipt
              </li>
            </ul>
            <Link
              to="/pay"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:brightness-110 transition-all"
            >
              Try the Interactive Demo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
