import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useIsPro = () => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tier, setTier] = useState<string | null>(null);
  
  useEffect(() => {
    const checkTier = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setIsLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_usage')
        .select('subscription_tier, is_premium')
        .eq('user_id', session.session.user.id)
        .single();
      
      const proTiers = ['pro', 'max', 'team', 'agency'];
      const userTier = data?.subscription_tier || 'free';
      const isProUser = data?.is_premium || proTiers.includes(userTier);
      
      setTier(userTier);
      setIsPro(isProUser);
      setIsLoading(false);
    };
    
    checkTier();
  }, []);
  
  return { isPro, isLoading, tier };
};
