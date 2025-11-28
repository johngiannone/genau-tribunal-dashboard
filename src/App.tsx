import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import CouncilSettings from "./pages/CouncilSettings";
import Pricing from "./pages/Pricing";
import Analytics from "./pages/Analytics";
import Vault from "./pages/Vault";
import Admin from "./pages/Admin";
import Share from "./pages/Share";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/council" element={<CouncilSettings />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/share/:slug" element={<Share />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
