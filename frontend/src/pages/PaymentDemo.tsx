import { useState } from "react";
import { PaymentWidget } from "@/components/payment/PaymentWidget";
import { RotateCcw } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const PaymentDemo = () => {
  useDocumentTitle("Payment Demo");
  const [key, setKey] = useState(0);

  return (
    <div className="min-h-screen bg-background gradient-dark-glow flex flex-col items-center justify-center p-4 gap-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground text-center">
          Payment Widget Demo
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Click through all 4 states
        </p>
      </div>

      <PaymentWidget key={key} onReset={() => setKey((k) => k + 1)} />

      <button
        onClick={() => setKey((k) => k + 1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="w-4 h-4" /> Reset
      </button>
    </div>
  );
};

export default PaymentDemo;
