import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { InvoiceStatusBadge } from "@/components/dashboard/InvoiceStatusBadge";
import { invoices, formatSats } from "@/data/mockDashboard";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const recentInvoices = invoices.slice(0, 5);

export default function Dashboard() {
  const navigate = useNavigate();
  useDocumentTitle("Dashboard");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Welcome back, <span className="text-gradient-bitcoin">CryptoMerch</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's your dashboard overview.</p>
      </motion.div>

      <StatsCards />
      <RevenueChart />

      {/* Recent Invoices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold text-foreground">Recent Invoices</h3>
          <button
            onClick={() => navigate("/dashboard/invoices")}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead className="hidden sm:table-cell">Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentInvoices.map((inv) => (
              <TableRow
                key={inv.id}
                className="cursor-pointer"
                onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}
                tabIndex={0}
                role="link"
                aria-label={`Invoice ${inv.id} — ${formatSats(inv.amountSats)} sats — ${inv.status}`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/dashboard/invoices/${inv.id}`); } }}
              >
                <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{inv.customer}</TableCell>
                <TableCell className="font-mono">{formatSats(inv.amountSats)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={inv.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
