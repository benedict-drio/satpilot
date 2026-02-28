import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, MoreHorizontal, Eye, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { invoices, formatSats } from "@/data/mockDashboard";
import { InvoiceStatusBadge } from "@/components/dashboard/InvoiceStatusBadge";
import { CreateInvoiceSheet } from "@/components/dashboard/CreateInvoiceSheet";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { TableEmptyState } from "@/components/dashboard/TableEmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 10;

export default function Invoices() {
  const navigate = useNavigate();
  useDocumentTitle("Invoices");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const pageInvoices = invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">{invoices.length} total invoices</p>
        </div>
        <Button className="gradient-bitcoin text-primary-foreground gap-2" onClick={() => setSheetOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead className="hidden md:table-cell">Customer / Memo</TableHead>
              <TableHead>Amount (sats)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <TableEmptyState variant="invoices" title="No invoices found" description="Create your first invoice to get started." />
                </TableCell>
              </TableRow>
            ) : pageInvoices.map((inv) => (
              <TableRow
                key={inv.id}
                tabIndex={0}
                role="link"
                aria-label={`Invoice ${inv.id} — ${formatSats(inv.amountSats)} sats — ${inv.status}`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/dashboard/invoices/${inv.id}`); } }}
              >
                <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-sm">{inv.customer}</div>
                  <div className="text-xs text-muted-foreground">{inv.memo}</div>
                </TableCell>
                <TableCell className="font-mono">{formatSats(inv.amountSats)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={inv.status} />
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for invoice ${inv.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(`https://satsterminal.app/pay/${inv.id}`);
                          toast.success("Link copied");
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      {inv.status === "paid" && (
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Refund
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            )
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      <CreateInvoiceSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
