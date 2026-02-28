import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, isAfter, isSameDay, parseISO } from "date-fns";
import { CalendarIcon, X, RotateCcw, Hash, TrendingUp, Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { refunds, formatSats, formatBtc, type Refund, type RefundStatus } from "@/data/mockDashboard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { TableEmptyState } from "@/components/dashboard/TableEmptyState";

const ROWS_PER_PAGE = 8;

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = escapeRegex(query);
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const config: Record<RefundStatus, { label: string; dotClass: string; bgClass: string }> = {
    processed: { label: "Processed", dotClass: "bg-emerald-500", bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    pending: { label: "Pending", dotClass: "bg-amber-500", bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    failed: { label: "Failed", dotClass: "bg-destructive", bgClass: "bg-destructive/10 text-destructive" },
  };
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", c.bgClass)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dotClass)} />
      {c.label}
    </span>
  );
}

export default function Refunds() {
  const navigate = useNavigate();
  useDocumentTitle("Refunds");
  const [statusFilter, setStatusFilter] = useState<"all" | RefundStatus>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<"amount" | "date" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let list: Refund[] = [...refunds];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.id.toLowerCase().includes(q) || r.invoiceId.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (dateFrom) {
      list = list.filter((r) => { const d = parseISO(r.createdAt); return isSameDay(d, dateFrom) || isAfter(d, dateFrom); });
    }
    if (dateTo) {
      list = list.filter((r) => { const d = parseISO(r.createdAt); return isSameDay(d, dateTo) || !isAfter(d, dateTo); });
    }
    if (sortKey) {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortKey === "amount") cmp = a.amountSats - b.amountSats;
        else if (sortKey === "date") cmp = a.createdAt.localeCompare(b.createdAt);
        else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [statusFilter, dateFrom, dateTo, search, sortKey, sortDir]);

  const stats = useMemo(() => {
    const total = refunds.reduce((s, r) => s + r.amountSats, 0);
    const count = refunds.length;
    const avg = count > 0 ? Math.round(total / count) : 0;
    return { total, count, avg };
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const handleSort = (key: "amount" | "date" | "status") => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  };

  const SortIcon = ({ column }: { column: "amount" | "date" | "status" }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground" />;
    return sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 ml-1" /> : <ArrowDown className="w-3.5 h-3.5 ml-1" />;
  };

  const clearFilters = () => {
    setStatusFilter("all"); setDateFrom(undefined); setDateTo(undefined);
    setSearch(""); setSortKey(null); setSortDir("asc"); setPage(0);
  };

  const exportCsv = () => {
    const headers = ["Refund ID", "Invoice ID", "Customer", "Amount (sats)", "Reason", "Status", "Date", "Tx Hash"];
    const rows = filtered.map((r) => [r.id, r.invoiceId, r.customer, r.amountSats, r.reason, r.status, format(parseISO(r.createdAt), "yyyy-MM-dd"), r.txHash ?? ""]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `refunds-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported successfully", { description: `${filtered.length} refund${filtered.length === 1 ? "" : "s"} downloaded` });
  };

  const hasFilters = statusFilter !== "all" || dateFrom !== undefined || dateTo !== undefined || search !== "";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Refunds</h1>
        <p className="text-muted-foreground text-sm mt-1">{stats.count} refunds processed</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Refunded", value: formatBtc(stats.total), icon: RotateCcw },
          { label: "Refund Count", value: stats.count.toString(), icon: Hash },
          { label: "Avg. Refund Size", value: `${formatSats(stats.avg)} sats`, icon: TrendingUp },
        ].map((card) => (
          <Card key={card.label} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-lg font-display font-bold text-foreground">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by ID, invoice, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />{dateFrom ? format(dateFrom, "PP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />{dateTo ? format(dateTo, "PP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground"><X className="w-4 h-4 mr-1" /> Clear</Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0} className="ml-auto">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Refund ID</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("amount")}>
                  <span className="inline-flex items-center justify-end w-full">Amount<SortIcon column="amount" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                  <span className="inline-flex items-center">Status<SortIcon column="status" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("date")}>
                  <span className="inline-flex items-center">Date<SortIcon column="date" /></span>
                </TableHead>
                <TableHead className="hidden md:table-cell">Tx Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <TableEmptyState variant="refunds" title="No refunds found" description="Try adjusting your filters or search query." />
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/dashboard/invoices/${r.invoiceId}`)} tabIndex={0} role="link" aria-label={`Refund ${r.id} — ${formatSats(r.amountSats)} sats — ${r.status}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/dashboard/invoices/${r.invoiceId}`); } }}>
                    <TableCell className="font-mono text-sm"><HighlightText text={r.id} query={search} /></TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-primary hover:underline"><HighlightText text={r.invoiceId} query={search} /></span>
                    </TableCell>
                    <TableCell><HighlightText text={r.customer} query={search} /></TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatSats(r.amountSats)}</TableCell>
                    <TableCell><RefundStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(parseISO(r.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">{r.txHash ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
