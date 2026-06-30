import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSats } from "@/data/mockDashboard";
import { useRefundInvoice, useRefundInvoiceStx } from "@/hooks/useContract";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display id (e.g. "INV-001") shown to the user. */
  invoiceId: string;
  amountSats: number;
  /** On-chain numeric invoice id. Required to submit a real refund. */
  onchainInvoiceId?: number;
  /** Payer principal that paid the invoice and will receive the refund. */
  recipient?: string;
  /** Invoice asset: 0 = sBTC, 1 = STX. Chooses the refund path. */
  asset?: number;
}

export function RefundDialog({
  open,
  onOpenChange,
  invoiceId,
  amountSats,
  onchainInvoiceId,
  recipient,
  asset = 0,
}: Props) {
  const [refundAmount, setRefundAmount] = useState(amountSats.toString());
  const [reason, setReason] = useState("");
  const sbtcRefund = useRefundInvoice();
  const stxRefund = useRefundInvoiceStx();
  const { mutate: refund, isPending } = asset === 1 ? stxRefund : sbtcRefund;

  // A real refund needs the on-chain invoice id and the payer's principal.
  const canSubmitOnChain = onchainInvoiceId != null && !!recipient;

  const handleConfirm = (e: React.MouseEvent) => {
    // Keep the dialog open so we can reflect pending/error state and close on success.
    e.preventDefault();
    const amount = parseInt(refundAmount) || 0;

    if (!canSubmitOnChain) {
      // Demo mode: dashboard is still backed by mock data with no payer principal.
      toast.success("Refund issued successfully", {
        description: `${formatSats(amount)} sats refunded for ${invoiceId}`,
      });
      onOpenChange(false);
      return;
    }

    refund(
      {
        invoiceId: onchainInvoiceId!,
        recipient: recipient!,
        refundAmount: amount,
        reason: reason || "Merchant-issued refund",
      },
      {
        onSuccess: () => {
          toast.success("Refund submitted", {
            description: `${formatSats(amount)} sats refunding to the payer for ${invoiceId}`,
          });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error("Refund failed", {
            description: err instanceof Error ? err.message : "Transaction was rejected",
          });
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border backdrop-blur-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Issue Refund</AlertDialogTitle>
          <AlertDialogDescription>
            Refund payment for invoice {invoiceId}. Original amount: {formatSats(amountSats)} sats.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Refund Amount (sats)</Label>
            <Input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="bg-secondary border-border font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              placeholder="Customer request, duplicate charge..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Processing…" : "Confirm Refund"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
