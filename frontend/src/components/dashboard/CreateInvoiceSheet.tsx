import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInvoice } from "@/hooks/useContract";
import { useWallet } from "@/contexts/WalletContext";
import { ASSET } from "@/lib/contract";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Expiry durations expressed in burn (Bitcoin) blocks — ~144 blocks/day.
const EXPIRY_OPTIONS = [
  { label: "1 hour", blocks: 6 },
  { label: "6 hours", blocks: 36 },
  { label: "24 hours", blocks: 144 },
  { label: "3 days", blocks: 432 },
  { label: "7 days", blocks: 1008 },
  { label: "30 days", blocks: 4320 },
];

const MIN_AMOUNT = 1000; // MIN_INVOICE_AMOUNT (base units)

const invoiceSchema = z.object({
  amount: z.number({ invalid_type_error: "Amount is required" }).min(MIN_AMOUNT, `Minimum ${MIN_AMOUNT}`),
  memo: z.string().max(200, "Memo must be under 200 characters").optional(),
  reference: z.string().max(50, "Reference must be under 50 characters").optional(),
});

type FieldErrors = Partial<Record<"amount" | "memo" | "reference", string>>;

export function CreateInvoiceSheet({ open, onOpenChange }: Props) {
  const { isConnected, connect } = useWallet();
  const createInvoice = useCreateInvoice();

  const [asset, setAsset] = useState<"sbtc" | "stx">("sbtc");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");
  const [allowPartial, setAllowPartial] = useState(false);
  const [allowOverpayment, setAllowOverpayment] = useState(false);
  const [expiry, setExpiry] = useState("144");
  const [errors, setErrors] = useState<FieldErrors>({});

  const isStx = asset === "stx";
  const unit = isStx ? "µSTX" : "sats";
  const baseNum = parseInt(amount) || 0;
  // Whole-unit equivalents: sBTC = 8 decimals, STX = 6 decimals.
  const wholeVal = isStx ? (baseNum / 1_000_000).toFixed(6) : (baseNum / 100_000_000).toFixed(8);
  const wholeLabel = isStx ? "STX" : "₿";

  const reset = () => {
    setAmount(""); setMemo(""); setReference(""); setErrors({});
    setAllowPartial(false); setAllowOverpayment(false);
  };

  const validate = (): boolean => {
    const result = invoiceSchema.safeParse({
      amount: baseNum || undefined,
      memo: memo || undefined,
      reference: reference || undefined,
    });
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleCreate = () => {
    if (!isConnected) { connect(); return; }
    if (!validate()) return;

    createInvoice.mutate(
      {
        amount: baseNum,
        asset: isStx ? ASSET.STX : ASSET.SBTC,
        memo: memo || " ",
        referenceId: reference || undefined,
        expiresInBlocks: parseInt(expiry),
        allowPartial,
        allowOverpay: allowOverpayment,
      },
      {
        onSuccess: () => {
          toast.success("Invoice created", {
            description: `${baseNum.toLocaleString()} ${unit} • ${isStx ? "STX" : "sBTC"}`,
          });
          reset();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error("Could not create invoice", {
            description: err instanceof Error ? err.message : "Transaction was rejected",
          });
        },
      }
    );
  };

  const isPending = createInvoice.isPending || createInvoice.isWaiting;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Create Invoice</SheetTitle>
          <SheetDescription>Generate a new payment invoice for your customer.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Asset toggle */}
          <div className="space-y-2">
            <Label>Pay with</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["sbtc", "stx"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAsset(a)}
                  className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                    asset === a
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {a === "sbtc" ? "sBTC" : "STX"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount ({unit})</Label>
            <Input
              type="number"
              placeholder={isStx ? "1000000" : "250000"}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); if (errors.amount) setErrors((p) => ({ ...p, amount: undefined })); }}
              className={`text-2xl font-display h-14 bg-secondary border-border ${errors.amount ? "border-destructive" : ""}`}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            {baseNum > 0 && !errors.amount && (
              <div className="text-xs text-muted-foreground">{wholeLabel} {wholeVal}</div>
            )}
          </div>

          {/* Memo */}
          <div className="space-y-2">
            <Label>Memo</Label>
            <Input
              placeholder="Payment for..."
              value={memo}
              onChange={(e) => { setMemo(e.target.value); if (errors.memo) setErrors((p) => ({ ...p, memo: undefined })); }}
              className={`bg-secondary border-border ${errors.memo ? "border-destructive" : ""}`}
              maxLength={200}
            />
            {errors.memo && <p className="text-xs text-destructive">{errors.memo}</p>}
            <p className="text-xs text-muted-foreground text-right">{memo.length}/200</p>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label>Reference ID (optional)</Label>
            <Input
              placeholder="ORD-12345"
              value={reference}
              onChange={(e) => { setReference(e.target.value); if (errors.reference) setErrors((p) => ({ ...p, reference: undefined })); }}
              className={`bg-secondary border-border ${errors.reference ? "border-destructive" : ""}`}
              maxLength={50}
            />
            {errors.reference && <p className="text-xs text-destructive">{errors.reference}</p>}
            <p className="text-xs text-muted-foreground">Used as an idempotency key: one invoice per reference.</p>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Allow partial payments</Label>
              <Switch checked={allowPartial} onCheckedChange={setAllowPartial} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Allow overpayment</Label>
              <Switch checked={allowOverpayment} onCheckedChange={setAllowOverpayment} />
            </div>
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <Label>Expiry Duration</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((o) => (
                  <SelectItem key={o.blocks} value={String(o.blocks)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="flex-1 gradient-bitcoin text-primary-foreground"
              onClick={handleCreate}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : !isConnected ? "Connect Wallet" : "Create Invoice"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
