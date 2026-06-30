import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWallet, truncate } from "@/contexts/WalletContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  useContractConfig,
  usePendingConfig,
  useStacksBlockHeight,
  useProposeConfigChange,
  useCancelConfigChange,
  useExecuteConfigChange,
} from "@/hooks/useContract";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

export default function Admin() {
  useDocumentTitle("Admin");
  const { address, isConnected, connect } = useWallet();
  const { data: config, isLoading: configLoading } = useContractConfig();
  const { data: pending } = usePendingConfig();
  const { data: height } = useStacksBlockHeight();

  const propose = useProposeConfigChange();
  const cancel = useCancelConfigChange();
  const execute = useExecuteConfigChange();

  const [feePct, setFeePct] = useState("");
  const [recipient, setRecipient] = useState("");

  const isOwner = !!address && !!config && address === config.owner;

  const blocksLeft =
    pending && height ? Math.max(0, pending.executeAfter - height) : null;
  const canExecute = !!pending && blocksLeft === 0;

  const handlePropose = () => {
    const pct = parseFloat(feePct);
    if (Number.isNaN(pct) || pct < 0 || pct > 5) {
      toast.error("Fee must be between 0% and 5%");
      return;
    }
    if (!recipient.trim()) {
      toast.error("Enter a fee-recipient address");
      return;
    }
    propose.mutate(
      { feeBps: Math.round(pct * 100), recipient: recipient.trim() },
      {
        onSuccess: () => toast.success("Change proposed — timelock started"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Proposal failed"),
      }
    );
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldCheck className="w-10 h-10 text-muted-foreground mb-4" />
        <h1 className="text-xl font-display font-bold text-foreground">Admin</h1>
        <p className="text-muted-foreground text-sm mt-1 mb-4">Connect the owner wallet to manage platform settings.</p>
        <Button onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading contract config…
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
        <h1 className="text-xl font-display font-bold text-foreground">Owner only</h1>
        <p className="text-muted-foreground text-sm mt-1">
          This page is restricted to the contract owner
          {config?.owner && <> (<span className="font-mono">{truncate(config.owner)}</span>)</>}.
          You're connected as <span className="font-mono">{address && truncate(address)}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Admin: Platform Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fee changes are timelocked (~{config?.timelockBlocks} blocks) for security.
        </p>
      </motion.div>

      {/* Current config */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Current Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Platform fee" value={`${((config?.feeBps ?? 0) / 100).toFixed(2)}%`} />
          <Row label="Fee recipient" value={config?.feeRecipient ? truncate(config.feeRecipient, 6, 6) : "—"} />
          <Row label="Owner" value={config?.owner ? truncate(config.owner, 6, 6) : "—"} />
          <Row label="Chain height" value={height ?? "…"} />
          <Row label="Paused" value={config?.isPaused ? "Yes" : "No"} />
        </CardContent>
      </Card>

      {/* Pending change */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Change
          </CardTitle>
          <CardDescription>
            {pending ? "A fee-config change is queued behind the timelock." : "No change is currently queued."}
          </CardDescription>
        </CardHeader>
        {pending && (
          <CardContent className="space-y-3">
            <Row label="New fee" value={`${(pending.bps / 100).toFixed(2)}%`} />
            <Row label="New recipient" value={truncate(pending.recipient, 6, 6)} />
            <Row label="Executable at block" value={pending.executeAfter} />
            <Row
              label="Status"
              value={
                blocksLeft === 0 ? (
                  <span className="text-green-500">Ready to execute</span>
                ) : (
                  <span className="text-amber-500">{blocksLeft} blocks remaining</span>
                )
              }
            />
            <Separator />
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  execute.mutate(undefined, {
                    onSuccess: () => toast.success("Change executed — now live"),
                    onError: (e) => toast.error(e instanceof Error ? e.message : "Execute failed"),
                  })
                }
                disabled={!canExecute || execute.isPending}
              >
                {execute.isPending ? "Executing…" : "Execute"}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  cancel.mutate(undefined, {
                    onSuccess: () => toast.success("Pending change cancelled"),
                    onError: (e) => toast.error(e instanceof Error ? e.message : "Cancel failed"),
                  })
                }
                disabled={cancel.isPending}
              >
                {cancel.isPending ? "Cancelling…" : "Cancel"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Propose new change */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Propose Fee / Recipient Change</CardTitle>
          <CardDescription>Queues a change; it can be executed after the timelock elapses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fee">Platform fee (%) — max 5%</Label>
            <Input
              id="fee"
              type="number"
              step="0.01"
              min="0"
              max="5"
              placeholder={((config?.feeBps ?? 0) / 100).toFixed(2)}
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient">Fee recipient (principal)</Label>
            <Input
              id="recipient"
              placeholder={config?.feeRecipient || "SP…"}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono"
            />
          </div>
          <Button onClick={handlePropose} disabled={propose.isPending}>
            {propose.isPending ? "Proposing…" : "Propose Change"}
          </Button>
          {pending && (
            <p className="text-xs text-amber-500">
              A change is already queued; proposing again replaces it and restarts the timelock.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
