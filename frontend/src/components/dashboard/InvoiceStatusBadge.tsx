import type { InvoiceStatus } from "@/data/mockDashboard";

const statusConfig: Record<InvoiceStatus, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  pending: { label: "Pending", dotClass: "bg-primary", bgClass: "bg-primary/10", textClass: "text-primary" },
  partial: { label: "Partial", dotClass: "bg-warning", bgClass: "bg-warning/10", textClass: "text-warning" },
  paid: { label: "Paid", dotClass: "bg-success", bgClass: "bg-success/10", textClass: "text-success" },
  expired: { label: "Expired", dotClass: "bg-muted-foreground", bgClass: "bg-muted", textClass: "text-muted-foreground" },
  cancelled: { label: "Cancelled", dotClass: "bg-destructive", bgClass: "bg-destructive/10", textClass: "text-destructive" },
  refunded: { label: "Refunded", dotClass: "bg-info", bgClass: "bg-info/10", textClass: "text-info" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bgClass} ${cfg.textClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
}
