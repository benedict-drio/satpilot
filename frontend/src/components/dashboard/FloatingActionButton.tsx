import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { CreateInvoiceSheet } from "./CreateInvoiceSheet";

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      <motion.button
        initial={shouldReduceMotion ? {} : { scale: 0 }}
        animate={shouldReduceMotion ? {} : { scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full gradient-bitcoin flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Create new invoice"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>
      <CreateInvoiceSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
