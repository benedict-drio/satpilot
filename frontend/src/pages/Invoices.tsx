import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, MoreHorizontal, Eye, Copy, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatSats } from "@/data/mockDashboard";
import type { InvoiceStatus } from "@/data/mockDashboard";
import { InvoiceStatusBadge } from "@/components/dashboard/InvoiceStatusBadge";
import { CreateInvoiceSheet } from "@/components/dashboard/CreateInvoiceSheet";
import { MerchantRegisterDialog } from "@/components/dashboard/MerchantRegisterDialog";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { TableEmptyState } from "@/components/dashboard/TableEmptyState";
import { useWallet, truncate } from "@/contexts/WalletContext";
import { useMerchantInvoices, useMerchant } from "@/hooks/useContract";
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
  const [registerOpen, setRegisterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { address, isConnected, connect } = useWallet();
  const { data: invoices = [], isLoading } = useMerchantInvoices(address);
  const { data: merchant } = useMerchant(address);
  const isRegistered = !!merchant;

  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const pageInvoices = invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleCreateClick = () => {
    if (!isConnected) { connect(); return; }
    if (!isRegistered) { setRegisterOpen(true); return; }
    setSheetOpen(true);
  };

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
        <Button className="gradient-bitcoin text-primary-foreground gap-2" onClick={handleCreateClick}>
          <Plus className="w-4 h-4" />
          {isConnected && !isRegistered ? "Register to Start" : "Create Invoice"}
        </Button>
      </motion.div>

      {isConnected && !isRegistered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-4 flex items-center justify-between gap-4 border-primary/20"
        >
          <p className="text-sm text-muted-foreground">
            You're not registered as a merchant yet. Register once on-chain to start creating invoices.
          </p>
          <Button size="sm" variant="outline" onClick={() => setRegisterOpen(true)}>Register</Button>
        </motion.div>
      )}

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
              <TableHead className="hidden md:table-cell">Payer / Memo</TableHead>
              <TableHead>Amount (sats)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isConnected ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <p className="text-sm text-muted-foreground">Connect your wallet to view your invoices.</p>
                    <Button onClick={connect}>Connect Wallet</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading invoices from chain…
                  </div>
                </TableCell>
              </TableRow>
            ) : pageInvoices.length === 0 ? (
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
                aria-label={`Invoice ${inv.id} — ${formatSats(inv.amount)} sats — ${inv.statusName}`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/dashboard/invoices/${inv.id}`); } }}
              >
                <TableCell className="font-mono text-sm">#{inv.id}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-sm font-mono">{inv.paidBy ? truncate(inv.paidBy) : "—"}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[240px]">{inv.memo}</div>
                </TableCell>
                <TableCell className="font-mono">{formatSats(inv.amount)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={inv.statusName as InvoiceStatus} />
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  Block #{inv.createdAt}
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
                          navigator.clipboard.writeText(`https://satpilot.xyz/pay/${inv.id}`);
                          toast.success("Link copied");
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      {inv.statusName === "paid" && (
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
      <MerchantRegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />
    </div>
  );
}
