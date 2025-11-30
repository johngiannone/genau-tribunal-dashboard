import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useIsRoot = () => {
  const [isRoot, setIsRoot] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRootAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsRoot(false);
          setLoading(false);
          return;
        }

        // Fetch email from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();

        setIsRoot(profile?.email === 'test@test.ai');
      } catch (error) {
        console.error('Error checking root access:', error);
        setIsRoot(false);
      } finally {
        setLoading(false);
      }
    };

    checkRootAccess();
  }, []);

  return { isRoot, loading };
};
