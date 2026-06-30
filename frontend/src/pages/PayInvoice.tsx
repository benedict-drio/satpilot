import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Check, AlertTriangle, Bitcoin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useInvoice, usePayInvoice, usePayInvoiceStx } from "@/hooks/useContract";
import { useWallet, truncate } from "@/contexts/WalletContext";
import { ASSET_NAMES } from "@/lib/contract";

function fmt(amount: number, asset: number): { base: string; whole: string } {
  if (asset === 1) return { base: `${amount.toLocaleString()} µSTX`, whole: `${(amount / 1_000_000).toFixed(6)} STX` };
  return { base: `${amount.toLocaleString()} sats`, whole: `₿ ${(amount / 100_000_000).toFixed(8)}` };
}

export default function PayInvoice() {
  const { id } = useParams();
  const numericId = id && /^\d+$/.test(id) ? Number(id) : null;
  useDocumentTitle(numericId ? `Pay invoice #${numericId}` : "Pay");

  const { address, isConnected, connect } = useWallet();
  const { data: invoice, isLoading, refetch } = useInvoice(numericId);
  const payStx = usePayInvoiceStx();
  const paySbtc = usePayInvoice();

  const [amount, setAmount] = useState("");
  const remaining = invoice ? Math.max(0, invoice.amount - invoice.amountPaid) : 0;

  // Default the amount field to the remaining balance once the invoice loads.
  useEffect(() => {
    if (invoice) setAmount(String(Math.max(0, invoice.amount - invoice.amountPaid)));
  }, [invoice?.id, invoice?.amountPaid]);

  if (!numericId) {
    return <Centered><p className="text-muted-foreground">Invalid invoice link.</p></Centered>;
  }
  if (isLoading) {
    return <Centered><div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading invoice…</div></Centered>;
  }
  if (!invoice) {
    return <Centered><p className="text-muted-foreground">Invoice #{numericId} not found.</p></Centered>;
  }

  const isStx = invoice.asset === 1;
  const isPaid = invoice.statusName === "paid";
  const isClosed = ["paid", "cancelled", "expired", "refunded"].includes(invoice.statusName);
  const isSelf = !!address && address === invoice.merchant;
  const isPending = payStx.isPending || paySbtc.isPending;
  const amountNum = parseInt(amount) || 0;

  const handlePay = () => {
    if (!isConnected) { connect(); return; }
    const params = { invoiceId: invoice.id, amount: amountNum };
    const onDone = {
      onSuccess: async () => {
        toast.success("Payment sent", { description: `${fmt(amountNum, invoice.asset).base} for invoice #${invoice.id}` });
        await refetch();
      },
      onError: (err: unknown) => toast.error("Payment failed", {
        description: err instanceof Error ? err.message : "Transaction was rejected",
      }),
    };
    if (isStx) payStx.mutate(params, onDone);
    else paySbtc.mutate(params, onDone);
  };

  const amountFmt = fmt(invoice.amount, invoice.asset);
  const remainingFmt = fmt(remaining, invoice.asset);

  return (
    <div className="min-h-screen bg-background gradient-dark-glow flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-bitcoin flex items-center justify-center">
              <Bitcoin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invoice #{invoice.id}</p>
              <p className="text-sm font-medium text-foreground">{truncate(invoice.merchant, 6, 6)}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
            {ASSET_NAMES[invoice.asset]}
          </span>
        </div>

        <div className="text-center py-2">
          <p className="text-3xl font-display font-bold text-foreground">{amountFmt.base}</p>
          <p className="text-sm text-muted-foreground mt-1">{amountFmt.whole}</p>
          {invoice.memo?.trim() && <p className="text-sm text-muted-foreground mt-2">{invoice.memo}</p>}
        </div>

        {isPaid ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center">
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="font-medium text-foreground">Paid in full</p>
          </div>
        ) : isClosed ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="font-medium text-foreground capitalize">{invoice.statusName}</p>
            <p className="text-xs text-muted-foreground">This invoice can no longer be paid.</p>
          </div>
        ) : (
          <>
            {invoice.amountPaid > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                {remainingFmt.base} remaining of {amountFmt.base}
              </p>
            )}
            <div className="space-y-2">
              <Label>Amount to pay ({isStx ? "µSTX" : "sats"})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!invoice.allowPartial && !invoice.allowOverpay}
                className="bg-secondary border-border font-mono"
              />
              {invoice.allowPartial && <p className="text-xs text-muted-foreground">Partial payments allowed.</p>}
            </div>

            {isSelf ? (
              <p className="text-xs text-center text-amber-500">You can't pay your own invoice.</p>
            ) : (
              <Button
                className="w-full gradient-bitcoin text-primary-foreground"
                onClick={handlePay}
                disabled={isPending || amountNum <= 0}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : !isConnected ? "Connect Wallet to Pay" : `Pay ${fmt(amountNum, invoice.asset).base}`}
              </Button>
            )}
          </>
        )}

        <p className="text-[11px] text-center text-muted-foreground">Powered by Satpilot · non-custodial sBTC &amp; STX rails</p>
      </motion.div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background gradient-dark-glow flex items-center justify-center p-4">
      {children}
    </div>
  );
}
