import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collectFingerprint, FingerprintData } from '@/lib/fingerprint';

/**
 * Hook to collect and store browser fingerprint
 * Runs automatically on mount and auth state changes
 */
export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<FingerprintData | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  const collectAndStore = async () => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    
    try {
      // Collect fingerprint data
      const fingerprintData = await collectFingerprint();
      setFingerprint(fingerprintData);
      
      // Get current session for user ID
      const { data: { session } } = await supabase.auth.getSession();
      
      // Store fingerprint (works for both authenticated and unauthenticated)
      const { data, error } = await supabase.functions.invoke('store-fingerprint', {
        body: {
          ...fingerprintData,
          sessionId: session?.user?.id || crypto.randomUUID(),
        }
      });
      
      if (error) {
        console.error('Failed to store fingerprint:', error);
      } else if (data?.banEvasionDetected) {
        console.warn('⚠️ Ban evasion detected for this device');
      }
    } catch (error) {
      console.error('Error collecting fingerprint:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  useEffect(() => {
    // Collect fingerprint on mount
    collectAndStore();

    // Re-collect on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        collectAndStore();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    fingerprint,
    isCollecting,
    refresh: collectAndStore,
  };
}
