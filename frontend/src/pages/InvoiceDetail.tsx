import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, RotateCcw } from "lucide-react";
import { useState } from "react";
import { invoices, formatSats, satsToBtc } from "@/data/mockDashboard";
import { InvoiceStatusBadge } from "@/components/dashboard/InvoiceStatusBadge";
import { RefundDialog } from "@/components/dashboard/RefundDialog";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [refundOpen, setRefundOpen] = useState(false);

  const invoice = invoices.find((inv) => inv.id === id);
  useDocumentTitle(invoice ? `Invoice ${invoice.id}` : "Invoice Not Found");

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/dashboard/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const paidPercent = invoice.amountSats > 0 ? (invoice.amountPaidSats / invoice.amountSats) * 100 : 0;
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (paidPercent / 100) * circumference;

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/invoices">Invoices</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{invoice.id}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold text-foreground">
              {formatSats(invoice.amountSats)} <span className="text-lg text-muted-foreground">sats</span>
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">₿ {satsToBtc(invoice.amountSats)}</p>
        </div>
        {invoice.status === "paid" && (
          <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setRefundOpen(true)}>
            <RotateCcw className="w-4 h-4" />
            Issue Refund
          </Button>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Info Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 space-y-4"
        >
          <h3 className="font-display font-semibold text-foreground">Invoice Details</h3>
          {[
            ["Invoice ID", invoice.id],
            ["Merchant", "CryptoMerch"],
            ["Customer", invoice.customer],
            ["Memo", invoice.memo],
            ["Reference", invoice.reference],
            ["Created", new Date(invoice.createdAt).toLocaleString()],
            ["Expires", new Date(invoice.expiresAt).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-mono text-right max-w-[200px] truncate">{value}</span>
            </div>
          ))}
          {invoice.txHash && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tx Hash</span>
              <a href="#" className="text-primary flex items-center gap-1 hover:underline">
                {invoice.txHash} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </motion.div>

        {/* Payment Progress + Timeline */}
        <div className="space-y-6">
          {/* Progress Ring */}
          {(invoice.status === "partial" || invoice.status === "paid") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 flex flex-col items-center"
            >
              <h3 className="font-display font-semibold text-foreground mb-4">Payment Progress</h3>
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-display font-bold text-foreground">
                  {Math.round(paidPercent)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {formatSats(invoice.amountPaidSats)} / {formatSats(invoice.amountSats)} sats
              </p>
            </motion.div>
          )}

          {/* Payment Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="font-display font-semibold text-foreground mb-4">Payment Timeline</h3>
            <div className="space-y-0">
              {invoice.events.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary/30 mt-1" />
                    {i < invoice.events.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-foreground">{event.label}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <RefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        invoiceId={invoice.id}
        amountSats={invoice.amountSats}
      />
    </div>
  );
}
