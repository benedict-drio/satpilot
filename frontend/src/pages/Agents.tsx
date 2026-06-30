import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Vault, ShieldCheck, ArrowDownToLine, ArrowUpFromLine, Ban, Send, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useWallet, truncate } from "@/contexts/WalletContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  useVaultBalance,
  useMandateRemaining,
  useVaultDeposit,
  useVaultWithdraw,
  useGrantMandate,
  useRevokeMandate,
  usePayInvoiceAsAgent,
} from "@/hooks/useContract";
import { ASSET, ASSET_NAMES, toBaseUnits, fromBaseUnits } from "@/lib/contract";

type Asset = 0 | 1; // 0 = sBTC, 1 = STX

function AssetToggle({ value, onChange }: { value: Asset; onChange: (a: Asset) => void }) {
  return (
    <Tabs value={String(value)} onValueChange={(v) => onChange(Number(v) as Asset)}>
      <TabsList className="grid grid-cols-2">
        <TabsTrigger value="0">sBTC</TabsTrigger>
        <TabsTrigger value="1">STX</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

/** Vault funding card — deposit/withdraw escrowed funds the agent will spend. */
function VaultCard({ owner }: { owner: string }) {
  const [asset, setAsset] = useState<Asset>(ASSET.STX as Asset);
  const [amount, setAmount] = useState("");
  const { data: balance = 0 } = useVaultBalance(owner, asset);
  const deposit = useVaultDeposit(owner);
  const withdraw = useVaultWithdraw(owner);
  const busy = deposit.isPending || deposit.isWaiting || withdraw.isPending || withdraw.isWaiting;

  const submit = (kind: "deposit" | "withdraw") => {
    const human = Number(amount);
    if (!human || human <= 0) return toast.error("Enter an amount greater than zero.");
    const base = toBaseUnits(human, asset);
    const mutation = kind === "deposit" ? deposit : withdraw;
    mutation.mutate(
      { asset, amount: base },
      {
        onSuccess: (res: { status: string }) => {
          if (res.status === "success") {
            toast.success(`Vault ${kind} confirmed`, { description: `${human} ${ASSET_NAMES[asset]}` });
            setAmount("");
          } else {
            toast.error(`Vault ${kind} failed`, { description: "Transaction was not successful." });
          }
        },
        onError: (e: Error) => toast.error(`Vault ${kind} failed`, { description: e.message }),
      },
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Vault className="w-5 h-5 text-primary" /> Vault
        </CardTitle>
        <CardDescription>Escrow funds your agents can spend. Withdraw the unspent balance anytime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AssetToggle value={asset} onChange={setAsset} />
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">Escrowed balance</p>
          <p className="text-2xl font-display font-bold text-foreground">
            {fromBaseUnits(balance, asset)} <span className="text-base text-muted-foreground">{ASSET_NAMES[asset]}</span>
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vault-amount">Amount ({ASSET_NAMES[asset]})</Label>
          <Input id="vault-amount" type="number" min="0" step="any" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => submit("deposit")} disabled={busy}>
            <ArrowDownToLine className="w-4 h-4 mr-1.5" /> {deposit.isWaiting ? "Confirming…" : "Deposit"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => submit("withdraw")} disabled={busy}>
            <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> {withdraw.isWaiting ? "Confirming…" : "Withdraw"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Grant a mandate, then watch its live spendable meter and revoke if needed. */
function MandateCard({ owner }: { owner: string }) {
  const [asset, setAsset] = useState<Asset>(ASSET.STX as Asset);
  const [agent, setAgent] = useState("");
  const [perTx, setPerTx] = useState("");
  const [windowCap, setWindowCap] = useState("");
  const [windowBlocks, setWindowBlocks] = useState("144");
  const [duration, setDuration] = useState("4320");
  const [allowed, setAllowed] = useState("");
  const [monitorAgent, setMonitorAgent] = useState("");

  const grant = useGrantMandate(owner);
  const revoke = useRevokeMandate(owner);
  const { data: mandate } = useMandateRemaining(owner, monitorAgent || null);

  const submitGrant = () => {
    if (!agent.startsWith("S")) return toast.error("Enter a valid agent Stacks address.");
    const perTxBase = toBaseUnits(Number(perTx), asset);
    const capBase = toBaseUnits(Number(windowCap), asset);
    if (!perTxBase || !capBase) return toast.error("Per-tx limit and window cap must be greater than zero.");
    if (perTxBase > capBase) return toast.error("Per-tx limit cannot exceed the window cap.");
    const allowedMerchants = allowed
      .split(/[\s,]+/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    if (allowedMerchants.some((a) => !a.startsWith("S"))) {
      return toast.error("Allowlist must contain valid Stacks addresses (or leave it empty).");
    }
    if (allowedMerchants.length > 20) {
      return toast.error("Allowlist supports at most 20 merchants.");
    }
    grant.mutate(
      {
        agent,
        asset,
        perTxLimit: perTxBase,
        windowCap: capBase,
        windowBlocks: Number(windowBlocks) || 0,
        durationBlocks: Number(duration) || 0,
        allowedMerchants,
      },
      {
        onSuccess: (res: { status: string }) => {
          if (res.status === "success") {
            toast.success("Mandate granted", { description: truncate(agent) });
            setMonitorAgent(agent);
          } else {
            toast.error("Grant failed", { description: "Transaction was not successful." });
          }
        },
        onError: (e: Error) => toast.error("Grant failed", { description: e.message }),
      },
    );
  };

  const submitRevoke = (a: string) =>
    revoke.mutate(
      { agent: a },
      {
        onSuccess: (res: { status: string }) =>
          res.status === "success"
            ? toast.success("Mandate revoked", { description: truncate(a) })
            : toast.error("Revoke failed"),
        onError: (e: Error) => toast.error("Revoke failed", { description: e.message }),
      },
    );

  const usedPct = useMemo(() => {
    if (!mandate || mandate.windowCap === 0) return 0;
    return Math.min(100, Math.round((mandate.windowSpent / mandate.windowCap) * 100));
  }, [mandate]);

  // The monitored mandate's asset isn't returned by the read-only; infer display unit
  // from the grant form's selection (both default to STX), which is correct for the
  // common single-asset demo flow.
  const monAsset = asset;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-primary" /> Mandates
        </CardTitle>
        <CardDescription>Authorize an agent to spend from your vault, capped per payment and per rolling window.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AssetToggle value={asset} onChange={setAsset} />
        <div className="space-y-2">
          <Label htmlFor="agent-addr">Agent address</Label>
          <Input id="agent-addr" placeholder="ST… / SP…" value={agent} onChange={(e) => setAgent(e.target.value)} className="font-mono text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="per-tx">Per-payment limit ({ASSET_NAMES[asset]})</Label>
            <Input id="per-tx" type="number" min="0" step="any" placeholder="0.0" value={perTx} onChange={(e) => setPerTx(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="window-cap">Window cap ({ASSET_NAMES[asset]})</Label>
            <Input id="window-cap" type="number" min="0" step="any" placeholder="0.0" value={windowCap} onChange={(e) => setWindowCap(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="window-blocks">Window (burn blocks)</Label>
            <Input id="window-blocks" type="number" min="1" value={windowBlocks} onChange={(e) => setWindowBlocks(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Expires in (burn blocks)</Label>
            <Input id="duration" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="allowed">Restrict to merchants (optional)</Label>
          <Input id="allowed" placeholder="ST… , ST… — leave empty to allow any payee" value={allowed} onChange={(e) => setAllowed(e.target.value)} className="font-mono text-sm" />
          <p className="text-xs text-muted-foreground">
            Comma- or space-separated merchant addresses (max 20). When set, the agent can <span className="font-medium text-foreground">only</span> pay these payees — it can't redirect your funds elsewhere or to itself.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">~144 burn blocks ≈ 1 day. Window cap refreshes each window; the mandate dies at expiry or on revoke.</p>
        <Button className="w-full" onClick={submitGrant} disabled={grant.isPending || grant.isWaiting}>
          {grant.isWaiting ? "Confirming…" : "Grant mandate"}
        </Button>

        <Separator />

        {/* Live mandate monitor */}
        <div className="space-y-3">
          <Label htmlFor="monitor-addr" className="flex items-center gap-1.5"><Gauge className="w-4 h-4" /> Monitor a mandate</Label>
          <Input id="monitor-addr" placeholder="Agent address" value={monitorAgent} onChange={(e) => setMonitorAgent(e.target.value)} className="font-mono text-sm" />
          {monitorAgent && !mandate && <p className="text-sm text-muted-foreground">No mandate found for this agent.</p>}
          {mandate && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                {mandate.active && !mandate.expired ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15">Active</Badge>
                ) : (
                  <Badge variant="secondary">{mandate.expired ? "Expired" : "Revoked"}</Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">Spendable now: <span className="font-mono text-foreground">{fromBaseUnits(mandate.spendableNow, monAsset)} {ASSET_NAMES[monAsset]}</span></span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Window used</span>
                  <span className="font-mono">{fromBaseUnits(mandate.windowSpent, monAsset)} / {fromBaseUnits(mandate.windowCap, monAsset)} {ASSET_NAMES[monAsset]}</span>
                </div>
                <Progress value={usedPct} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Per-payment limit</span><p className="font-mono text-foreground">{fromBaseUnits(mandate.perTxLimit, monAsset)} {ASSET_NAMES[monAsset]}</p></div>
                <div><span className="text-muted-foreground">Vault balance</span><p className="font-mono text-foreground">{fromBaseUnits(mandate.vaultBalance, monAsset)} {ASSET_NAMES[monAsset]}</p></div>
              </div>
              <Button variant="destructive" size="sm" className="w-full" onClick={() => submitRevoke(monitorAgent)} disabled={revoke.isPending || revoke.isWaiting || !mandate.active}>
                <Ban className="w-4 h-4 mr-1.5" /> {revoke.isWaiting ? "Revoking…" : "Revoke mandate"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Act as an agent: settle an invoice from an owner's vault, within your mandate. */
function AgentConsoleCard() {
  const [asset, setAsset] = useState<Asset>(ASSET.STX as Asset);
  const [owner, setOwner] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const pay = usePayInvoiceAsAgent();

  const submit = () => {
    if (!owner.startsWith("S")) return toast.error("Enter the owner's Stacks address.");
    const id = Number(invoiceId);
    const base = toBaseUnits(Number(amount), asset);
    if (!id || !base) return toast.error("Enter a valid invoice id and amount.");
    pay.mutate(
      { owner, invoiceId: id, amount: base, asset },
      {
        onSuccess: (res: { status: string; result?: string }) =>
          res.status === "success"
            ? toast.success("Invoice settled from vault", { description: `Invoice #${id}` })
            : toast.error("Payment declined", { description: res.result || "Mandate or vault check failed." }),
        onError: (e: Error) => toast.error("Payment failed", { description: e.message }),
      },
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-primary" /> Agent console
        </CardTitle>
        <CardDescription>Connected as an agent? Settle an owner's invoice from their vault — the contract enforces the mandate.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AssetToggle value={asset} onChange={setAsset} />
        <div className="space-y-2">
          <Label htmlFor="owner-addr">Owner address</Label>
          <Input id="owner-addr" placeholder="ST… / SP…" value={owner} onChange={(e) => setOwner(e.target.value)} className="font-mono text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="invoice-id">Invoice ID</Label>
            <Input id="invoice-id" type="number" min="1" placeholder="1" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Amount ({ASSET_NAMES[asset]})</Label>
            <Input id="pay-amount" type="number" min="0" step="any" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <Button className="w-full" onClick={submit} disabled={pay.isPending || pay.isWaiting}>
          <Send className="w-4 h-4 mr-1.5" /> {pay.isWaiting ? "Settling…" : "Pay as agent"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Agents() {
  useDocumentTitle("Agents");
  const { address } = useWallet();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Agentic Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fund a vault, delegate a capped spending mandate, and let an agent settle invoices on your behalf — never beyond the limits you set.
        </p>
      </motion.div>

      {!address ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-muted-foreground">Connect your wallet to manage vaults and mandates.</CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <VaultCard owner={address} />
          <MandateCard owner={address} />
          <div className="lg:col-span-2">
            <AgentConsoleCard />
          </div>
        </motion.div>
      )}
    </div>
  );
}
