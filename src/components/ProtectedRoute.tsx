import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireBilling?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  requireBilling = false 
}: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, canAccessBilling, tier, loading } = useUserRole();

  const logUnauthorizedAccess = async (attemptedRoute: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.functions.invoke('log-activity', {
        body: {
          user_id: user.id,
          activity_type: 'unauthorized_access',
          description: `Unauthorized access attempt to ${attemptedRoute}`,
          metadata: {
            attempted_route: attemptedRoute,
            reason: reason,
            user_tier: tier,
            is_admin: isAdmin,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to log unauthorized access:', error);
    }
  };

  useEffect(() => {
    if (loading) return;

    if (requireAdmin && !isAdmin) {
      logUnauthorizedAccess(location.pathname, 'Admin role required');
      toast.error("Unauthorized access - Admin only");
      navigate("/app");
      return;
    }

    if (requireBilling && !canAccessBilling) {
      logUnauthorizedAccess(location.pathname, 'Team/Agency tier required');
      toast.error("Unauthorized access - Team/Agency tier required");
      navigate("/app");
      return;
    }
  }, [loading, isAdmin, canAccessBilling, tier, requireAdmin, requireBilling, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (requireBilling && !canAccessBilling) {
    return null;
  }

  return <>{children}</>;
};
