import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserTier = 'free' | 'pro' | 'max' | 'team' | 'agency' | null;

export const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tier, setTier] = useState<UserTier>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setTier(null);
          setLoading(false);
          return;
        }

        // Check admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        setIsAdmin(!!roleData);

        // Check subscription tier
        const { data: usageData } = await supabase
          .from('user_usage')
          .select('subscription_tier')
          .eq('user_id', user.id)
          .single();

        setTier((usageData?.subscription_tier as UserTier) || 'free');
      } catch (error) {
        console.error('Error checking user role:', error);
        setIsAdmin(false);
        setTier('free');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, []);

  const canAccessBilling = isAdmin || tier === 'team' || tier === 'agency';
  const canAccessAdmin = isAdmin;

  return { isAdmin, tier, loading, canAccessBilling, canAccessAdmin };
};
