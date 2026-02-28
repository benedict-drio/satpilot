import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
import Index from "./pages/Index";
import PaymentDemo from "./pages/PaymentDemo";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Payments from "./pages/Payments";
import Refunds from "./pages/Refunds";
import Settings from "./pages/Settings";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

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
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pay" element={<PaymentDemo />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="payments" element={<Payments />} />
            <Route path="refunds" element={<Refunds />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </WalletProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
