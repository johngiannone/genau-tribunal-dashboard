import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useFingerprint } from "./hooks/useFingerprint";
import { useBiometrics } from "./hooks/useBiometrics";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import CouncilSettings from "./pages/CouncilSettings";
import Pricing from "./pages/Pricing";
import Analytics from "./pages/Analytics";
import Vault from "./pages/Vault";
import Admin from "./pages/Admin";
import AdminUserDetail from "./pages/AdminUserDetail";
import Intelligence from "./pages/Intelligence";
import Share from "./pages/Share";
import Billing from "./pages/Billing";
import SetupTeam from "./pages/SetupTeam";
import Team from "./pages/Team";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Geo-routing wrapper component
const GeoRouter = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  useEffect(() => {
    const handleGeoRouting = async () => {
      // Skip if already has language prefix
      const pathSegments = location.pathname.split('/').filter(Boolean);
      if (['en', 'en-gb', 'de', 'fr', 'it', 'es'].includes(pathSegments[0])) {
        i18n.changeLanguage(pathSegments[0]);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('geo-route', {
          body: { currentPath: location.pathname }
        });

        if (!error && data?.redirect) {
          console.log('Geo-routing redirect:', data);
          navigate(data.redirect, { replace: true });
        } else if (!error && data?.locale) {
          i18n.changeLanguage(data.locale);
        }
      } catch (err) {
        console.error('Geo-routing error:', err);
      }
    };

    handleGeoRouting();
  }, [location.pathname, navigate, i18n]);

  return <>{children}</>;
};

const AppContent = () => {
  // Collect browser fingerprint on app load
  useFingerprint();
  
  // Track behavioral biometrics
  useBiometrics();
  
  return (
    <BrowserRouter>
      <GeoRouter>
        <Routes>
          {/* Root redirects */}
          <Route path="/" element={<Navigate to="/en" replace />} />
          
          {/* Language-prefixed routes */}
          <Route path="/:lang" element={<Landing />} />
          <Route path="/:lang/app" element={<Index />} />
          <Route path="/:lang/auth" element={<Auth />} />
          <Route path="/:lang/settings" element={<Settings />} />
          <Route path="/:lang/settings/council" element={<CouncilSettings />} />
          <Route path="/:lang/pricing" element={<Pricing />} />
          <Route path="/:lang/analytics" element={<Analytics />} />
          <Route path="/:lang/vault" element={<Vault />} />
          <Route path="/:lang/setup-team" element={<SetupTeam />} />
          <Route path="/:lang/team" element={<Team />} />
          <Route path="/:lang/share/:slug" element={<Share />} />
          <Route 
            path="/:lang/admin" 
            element={
              <ProtectedRoute requireAdmin>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/:lang/admin/user/:userId" 
            element={
              <ProtectedRoute requireAdmin>
                <AdminUserDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/:lang/admin/intelligence" 
            element={
              <ProtectedRoute requireAdmin>
                <Intelligence />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/:lang/settings/billing" 
            element={
              <ProtectedRoute requireBilling>
                <Billing />
              </ProtectedRoute>
            } 
          />
          
          {/* Legacy routes without language prefix - redirect to /en */}
          <Route path="/app" element={<Navigate to="/en/app" replace />} />
          <Route path="/auth" element={<Navigate to="/en/auth" replace />} />
          <Route path="/pricing" element={<Navigate to="/en/pricing" replace />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </GeoRouter>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
