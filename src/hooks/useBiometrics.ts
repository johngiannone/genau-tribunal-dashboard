import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BiometricsTracker } from '@/lib/biometrics';

/**
 * Hook to track behavioral biometrics and send to backend
 */
export function useBiometrics() {
  const trackerRef = useRef<BiometricsTracker | null>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize tracker
    trackerRef.current = new BiometricsTracker();
    trackerRef.current.start();

    // Send data every 30 seconds
    intervalRef.current = setInterval(async () => {
      if (!trackerRef.current) return;

      const biometricsData = trackerRef.current.analyze();
      
      // Only send if we have meaningful data
      if (biometricsData.totalMouseEvents > 5 || biometricsData.totalClickEvents > 1) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          await supabase.functions.invoke('store-biometrics', {
            body: {
              sessionId: sessionIdRef.current,
              userId: session?.user?.id || null,
              ...biometricsData,
            }
          });

          // Log high bot scores for monitoring
          if (biometricsData.botLikelihoodScore >= 70) {
            console.warn('⚠️ High bot likelihood detected:', biometricsData.botLikelihoodScore);
          }
        } catch (error) {
          console.error('Failed to send biometrics data:', error);
        }
      }
    }, 30000); // 30 seconds

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (trackerRef.current) {
        trackerRef.current.stop();
      }
    };
  }, []);

  return {
    sessionId: sessionIdRef.current,
  };
}
