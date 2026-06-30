import { motion } from "framer-motion";
import { ArrowRight, Play, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PaymentWidgetDemo } from "./PaymentWidgetDemo";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "@/hooks/use-toast";

export function HeroSection() {
  const navigate = useNavigate();
  const { isConnected, connect, isConnecting } = useWallet();

  const handleGetStarted = () => {
    if (isConnected) {
      navigate("/dashboard");
    } else {
      connect();
      toast({ title: "Connecting wallet…", description: "Click again once connected." });
    }
  };

  const handleViewDemo = () => {
    document.getElementById("widget-showcase")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Background: layered glow + fading grid for depth */}
      <div className="absolute inset-0 gradient-dark-glow" />
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_65%_60%_at_50%_42%,#000,transparent)]"
      >
        <div className="absolute -inset-[52px] opacity-[0.08] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:52px_52px] will-change-transform motion-safe:animate-grid-pan" />
      </div>
      <div aria-hidden className="absolute right-[6%] top-1/2 h-[460px] w-[460px] -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
              <span className="text-xs font-medium text-primary">Built on Stacks · Secured by Bitcoin</span>
            </motion.div>

            <h1 className="text-fluid-display font-display font-bold text-foreground">
              Accept Bitcoin Payments in{" "}
              <span className="text-gradient-bitcoin">Seconds</span>, Not Hours
            </h1>

            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-md">
              Satpilot brings instant sBTC payments to your business:
              low fees, self-custody, and a fast checkout powered by the Stacks blockchain.
            </p>

            <div className="flex flex-wrap gap-4 mt-10">
              <button onClick={handleGetStarted} disabled={isConnecting} className="group px-8 py-4 rounded-xl gradient-bitcoin text-primary-foreground font-semibold text-base flex items-center gap-2 hover:brightness-110 transition-all shadow-glow disabled:opacity-70">
                {isConnecting ? "Connecting…" : isConnected ? "Go to Dashboard" : "Get Started"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={handleViewDemo} className="px-8 py-4 rounded-xl border border-border/60 text-foreground font-semibold text-base flex items-center gap-2 hover:bg-secondary/50 transition-all">
                <Play className="w-4 h-4" />
                View Demo
              </button>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" /> 0.5% flat fee
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" /> ~12s settlement
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" /> Self-custody
              </span>
            </div>
          </motion.div>

          {/* Right — Widget Demo with glow halo for presence */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end lg:pr-6 xl:pr-10"
          >
            <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
            <div className="relative">
              <PaymentWidgetDemo />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
