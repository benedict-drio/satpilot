import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Copy, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InvoiceStatusBadge } from "@/components/dashboard/InvoiceStatusBadge";
import { RefundDialog } from "@/components/dashboard/RefundDialog";
import type { Invoice } from "@/data/mockDashboard";
import { formatSats, satsToBtc } from "@/data/mockDashboard";

function CopyableValue({ text, children }: { text: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <button onClick={handleCopy} aria-label="Copy to clipboard" className="text-muted-foreground hover:text-foreground transition-colors">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}

interface PaymentDetailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export function PaymentDetailDialog({ invoice, open, onOpenChange }: PaymentDetailDialogProps) {
  const navigate = useNavigate();
  const [refundOpen, setRefundOpen] = useState(false);

  useEffect(() => {
    if (!open || refundOpen || !invoice) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key.toLowerCase() === "r" && invoice.status === "paid") {
        setRefundOpen(true);
      } else if (e.key.toLowerCase() === "v") {
        onOpenChange(false);
        navigate(`/dashboard/invoices/${invoice.id}`);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, refundOpen, invoice]);

  if (!invoice) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <DialogTitle className="text-2xl font-display font-bold">
                {formatSats(invoice.amountPaidSats)} sats
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1 font-mono">
                ₿ {satsToBtc(invoice.amountPaidSats)}
              </DialogDescription>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </DialogHeader>

        <Separator />

        {/* Details Grid */}
        <div className="space-y-0.5">
          <DetailRow label="Invoice ID" value={<CopyableValue text={invoice.id}><span className="font-mono">{invoice.id}</span></CopyableValue>} />
          <DetailRow label="Customer" value={invoice.customer} />
          <DetailRow label="Memo" value={invoice.memo} />
          <DetailRow label="Reference" value={<span className="font-mono text-xs">{invoice.reference}</span>} />
          <DetailRow label="Created" value={format(parseISO(invoice.createdAt), "MMM d, yyyy h:mm a")} />
          <DetailRow label="Expires" value={format(parseISO(invoice.expiresAt), "MMM d, yyyy h:mm a")} />
          <DetailRow
            label="Tx Hash"
            value={
              invoice.txHash ? (
                <CopyableValue text={invoice.txHash}><span className="font-mono text-xs text-primary">{invoice.txHash}</span></CopyableValue>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
        </div>

        <Separator />

        {/* Payment Timeline */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Payment Timeline</h4>
          <div className="space-y-0">
            {invoice.events.map((event, i) => (
              <div key={i} className="flex gap-3">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary/30 mt-1 shrink-0" />
                  {i < invoice.events.length - 1 && (
                    <div className="w-px flex-1 bg-border min-h-[20px]" />
                  )}
                </div>
                {/* Content */}
                <div className="pb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">{event.label}</span>
                    <span className="text-xs text-muted-foreground">{event.time}</span>
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {invoice.status === "paid" && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setRefundOpen(true)}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Issue Refund
            </Button>
          )}
          <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-2 mr-auto">
            {invoice.status === "paid" && (
              <>
                <span><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">R</kbd> Refund</span>
                <span>·</span>
              </>
            )}
            <span><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">V</kbd> Details</span>
            <span>·</span>
            <span><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">Esc</kbd> Close</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate(`/dashboard/invoices/${invoice.id}`);
            }}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            View Full Details
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RefundDialog
      open={refundOpen}
      onOpenChange={setRefundOpen}
      invoiceId={invoice.id}
      amountSats={invoice.amountSats}
    />
    </>
  );
}
