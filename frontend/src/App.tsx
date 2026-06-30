import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
import { NetworkWarningBanner } from "@/components/wallet/NetworkWarningBanner";
import Index from "./pages/Index";
import { toast } from "@/hooks/use-toast";
import { lazy, Suspense, useEffect } from "react";

// Landing (Index) stays eager — it's the LCP route, so we avoid an extra round-trip.
// Everything else is split out so the marketing entry doesn't ship the dashboard
// (and its recharts dependency) in the initial bundle.
const PaymentDemo = lazy(() => import("./pages/PaymentDemo"));
const PayInvoice = lazy(() => import("./pages/PayInvoice"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DashboardLayout = lazy(() =>
  import("./components/dashboard/DashboardLayout").then((m) => ({ default: m.DashboardLayout })),
);
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Payments = lazy(() => import("./pages/Payments"));
const Refunds = lazy(() => import("./pages/Refunds"));
const Agents = lazy(() => import("./pages/Agents"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading">
      <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected } = useWallet();
  useEffect(() => {
    if (!isConnected) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first." });
    }
  }, [isConnected]);
  if (!isConnected) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <WalletProvider>
    <TooltipProvider>
      <NetworkWarningBanner />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pay" element={<PaymentDemo />} />
            <Route path="/pay/:id" element={<PayInvoice />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="payments" element={<Payments />} />
              <Route path="refunds" element={<Refunds />} />
              <Route path="agents" element={<Agents />} />
              <Route path="settings" element={<Settings />} />
              <Route path="admin" element={<Admin />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
    </WalletProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
