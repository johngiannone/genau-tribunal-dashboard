import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  lastUpdated: string;
}

interface ExchangeRatesResponse {
  rates: ExchangeRates;
  cached: boolean;
  fallback?: boolean;
  lastUpdated: string;
}

export const useExchangeRates = () => {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<ExchangeRatesResponse>('get-exchange-rates');

      if (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Return fallback rates if edge function fails
        return {
          USD: 1,
          EUR: 0.92,
          GBP: 0.79,
          lastUpdated: new Date().toISOString(),
        };
      }

      return data?.rates || {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        lastUpdated: new Date().toISOString(),
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours (previously cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
