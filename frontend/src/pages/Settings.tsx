import { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Settings as SettingsIcon, Key, Webhook, Palette, Bell, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

function generateKey(prefix: string) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${prefix}_••••••••••••${suffix}`;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`${label} copied to clipboard`);
  });
}

// ─── API Keys Tab ────────────────────────────────────────────────
function ApiKeysTab() {
  const [liveKey, setLiveKey] = useState("sk_live_••••••••••••a1b2");
  const [testKey, setTestKey] = useState("sk_test_••••••••••••c3d4");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" /> API Keys
        </CardTitle>
        <CardDescription>Manage your live and test API keys for integration.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {[
          { label: "Live API Key", value: liveKey, set: setLiveKey, prefix: "sk_live" },
          { label: "Test API Key", value: testKey, set: setTestKey, prefix: "sk_test" },
        ].map(({ label, value, set, prefix }) => (
          <div key={label} className="space-y-2">
            <Label>{label}</Label>
            <div className="flex gap-2">
              <Input readOnly value={value} className="font-mono text-sm bg-muted" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(value, label)}>
                <Copy className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" size="icon">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate {label}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will invalidate the current key. Any integrations using it will stop working immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        set(generateKey(prefix));
                        toast.success(`${label} regenerated`);
                      }}
                    >
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
        <Separator />
        <p className="text-xs text-muted-foreground">
          Keep your API keys secret. Never expose them in client-side code.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Webhooks Tab ────────────────────────────────────────────────
const WEBHOOK_EVENTS = [
  "payment.received",
  "payment.confirmed",
  "invoice.created",
  "invoice.expired",
  "refund.issued",
] as const;

function WebhooksTab() {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<Set<string>>(new Set());
  const webhookSecret = "whsec_••••••••••••x9y8";

  const toggleEvent = (ev: string) => {
    setEvents((prev) => {
      const next = new Set(prev);
      next.has(ev) ? next.delete(ev) : next.add(ev);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Webhook className="w-5 h-5 text-primary" /> Webhooks
        </CardTitle>
        <CardDescription>Configure endpoints to receive real-time event notifications.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            placeholder="https://yoursite.com/api/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <Label>Events to listen for</Label>
          {WEBHOOK_EVENTS.map((ev) => (
            <div key={ev} className="flex items-center gap-2">
              <Checkbox
                id={ev}
                checked={events.has(ev)}
                onCheckedChange={() => toggleEvent(ev)}
              />
              <Label htmlFor={ev} className="font-mono text-sm cursor-pointer">
                {ev}
              </Label>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Webhook Secret</Label>
          <div className="flex gap-2">
            <Input readOnly value={webhookSecret} className="font-mono text-sm bg-muted" />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookSecret, "Webhook secret")}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button onClick={() => toast.success("Webhook settings saved")}>Save Webhook</Button>
      </CardContent>
    </Card>
  );
}

// ─── Branding Tab ────────────────────────────────────────────────
function BrandingTab() {
  const { theme, setTheme } = useTheme();
  const [storeName, setStoreName] = useState("Demo Store");
  const [primaryColor, setPrimaryColor] = useState("#F97316");
  const [logoUrl, setLogoUrl] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" /> Branding
        </CardTitle>
        <CardDescription>Customize how your store appears to customers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="store-name">Store Name</Label>
          <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary-color">Primary Color</Label>
          <div className="flex items-center gap-3">
            <input
              id="primary-color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 rounded-md border border-input cursor-pointer bg-transparent"
            />
            <span className="text-sm font-mono text-muted-foreground">{primaryColor}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Theme</Label>
          <RadioGroup value={theme} onValueChange={setTheme} className="flex gap-4">
            {["system", "light", "dark"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <RadioGroupItem value={t} id={`theme-${t}`} />
                <Label htmlFor={`theme-${t}`} className="cursor-pointer capitalize">
                  {t}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo-url">Logo URL</Label>
          <Input
            id="logo-url"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          {logoUrl && (
            <div className="mt-2 w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
              <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            </div>
          )}
        </div>

        <Button onClick={() => toast.success("Branding settings saved")}>Save Branding</Button>
      </CardContent>
    </Card>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────
const NOTIFICATION_PREFS = [
  { key: "payment_received", label: "Payment Received", desc: "When a new payment is detected on-chain", default: true },
  { key: "payment_confirmed", label: "Payment Confirmed", desc: "When a payment reaches the required confirmations", default: true },
  { key: "invoice_created", label: "Invoice Created", desc: "When a new invoice is generated", default: false },
  { key: "invoice_expired", label: "Invoice Expired", desc: "When an invoice passes its expiration window", default: true },
  { key: "refund_issued", label: "Refund Issued", desc: "When a refund is successfully processed", default: true },
  { key: "system_alerts", label: "System Alerts", desc: "Important system and security notifications", default: true },
] as const;

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.key, p.default]))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notifications
        </CardTitle>
        <CardDescription>Choose which events trigger notifications.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {NOTIFICATION_PREFS.map((pref, i) => (
          <div key={pref.key}>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.desc}</p>
              </div>
              <Switch
                checked={prefs[pref.key]}
                onCheckedChange={(val) => setPrefs((prev) => ({ ...prev, [pref.key]: val }))}
              />
            </div>
            {i < NOTIFICATION_PREFS.length - 1 && <Separator />}
          </div>
        ))}
        <div className="pt-4">
          <Button onClick={() => toast.success("Notification preferences saved")}>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Settings Page ───────────────────────────────────────────────
export default function Settings() {
  useDocumentTitle("Settings");
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account, integrations, and preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="api-keys" className="gap-1.5"><Key className="w-4 h-4" /> API Keys</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="w-4 h-4" /> Webhooks</TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5"><Palette className="w-4 h-4" /> Branding</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="api-keys"><ApiKeysTab /></TabsContent>
        <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
        <TabsContent value="branding"><BrandingTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
