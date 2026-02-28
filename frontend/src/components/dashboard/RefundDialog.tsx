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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  amountSats: number;
}

export function RefundDialog({ open, onOpenChange, invoiceId, amountSats }: Props) {
  const [refundAmount, setRefundAmount] = useState(amountSats.toString());
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    toast.success("Refund issued successfully", {
      description: `${formatSats(parseInt(refundAmount) || 0)} sats refunded for ${invoiceId}`,
    });
    onOpenChange(false);
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
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            Confirm Refund
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
