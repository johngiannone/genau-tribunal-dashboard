import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
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
  const { isAdmin, canAccessBilling, loading } = useUserRole();

  useEffect(() => {
    if (loading) return;

    if (requireAdmin && !isAdmin) {
      toast.error("Unauthorized access - Admin only");
      navigate("/app");
      return;
    }

    if (requireBilling && !canAccessBilling) {
      toast.error("Unauthorized access - Team/Agency tier required");
      navigate("/app");
      return;
    }
  }, [loading, isAdmin, canAccessBilling, requireAdmin, requireBilling, navigate]);

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
