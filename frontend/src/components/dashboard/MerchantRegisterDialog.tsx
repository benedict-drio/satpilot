import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRegisterMerchant } from "@/hooks/useContract";
import { useWallet } from "@/contexts/WalletContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MerchantRegisterDialog({ open, onOpenChange }: Props) {
  const { isConnected, connect } = useWallet();
  const register = useRegisterMerchant();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [webhook, setWebhook] = useState("");

  const isPending = register.isPending || register.isWaiting;

  const handleRegister = () => {
    if (!isConnected) { connect(); return; }
    if (!name.trim()) { toast.error("Store name is required"); return; }

    register.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        webhookUrl: webhook.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("You're registered", { description: "Your store is now live on Satpilot." });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error("Registration failed", {
            description: err instanceof Error ? err.message : "Transaction was rejected",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <div className="w-10 h-10 rounded-lg gradient-bitcoin flex items-center justify-center mb-2">
            <Store className="w-5 h-5 text-primary-foreground" />
          </div>
          <DialogTitle className="font-display">Register your store</DialogTitle>
          <DialogDescription>
            Register once on-chain to start accepting sBTC and STX payments. This is a single transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="store-name">Store name</Label>
            <Input
              id="store-name"
              placeholder="Acme Coffee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-desc">Description (optional)</Label>
            <Input
              id="store-desc"
              placeholder="Specialty coffee, shipped worldwide"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={256}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-webhook">Webhook URL (optional)</Label>
            <Input
              id="store-webhook"
              placeholder="https://yourstore.com/webhooks/satpilot"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              maxLength={256}
              className="bg-secondary border-border font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Payment events will be delivered here once webhooks are live.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button className="gradient-bitcoin text-primary-foreground" onClick={handleRegister} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : !isConnected ? "Connect Wallet" : "Register"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
