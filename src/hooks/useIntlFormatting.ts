import { useTranslation } from 'react-i18next';
import * as intl from '@/lib/intl-formatting';

/**
 * Custom hook that provides Intl formatting functions
 * synchronized with the current i18n locale
 */
export const useIntlFormatting = () => {
  const { i18n } = useTranslation();
  
  // Get current locale in the format expected by Intl API
  const locale = i18n.language === 'en-gb' ? 'en-GB' : 
                 i18n.language === 'de' ? 'de-DE' : 'en-US';

  return {
    formatCurrency: (amount: number, options?: Parameters<typeof intl.formatCurrency>[1]) => 
      intl.formatCurrency(amount, { ...options, locale }),
    
    formatNumber: (value: number, options?: Parameters<typeof intl.formatNumber>[1]) => 
      intl.formatNumber(value, { ...options, locale }),
    
    formatPercent: (value: number, options?: Parameters<typeof intl.formatPercent>[1]) => 
      intl.formatPercent(value, { ...options, locale }),
    
    formatDateTime: (date: Date | string | number, options?: Parameters<typeof intl.formatDateTime>[1]) => 
      intl.formatDateTime(date, { ...options, locale }),
    
    formatDate: (date: Date | string | number, options?: Parameters<typeof intl.formatDate>[1]) => 
      intl.formatDate(date, { ...options, locale }),
    
    formatTime: (date: Date | string | number, options?: Parameters<typeof intl.formatTime>[1]) => 
      intl.formatTime(date, { ...options, locale }),
    
    formatRelativeTime: (date: Date | string | number, options?: Parameters<typeof intl.formatRelativeTime>[1]) => 
      intl.formatRelativeTime(date, { ...options, locale }),
    
    formatFileSize: (bytes: number, options?: Parameters<typeof intl.formatFileSize>[1]) => 
      intl.formatFileSize(bytes, { ...options, locale }),
    
    formatList: (items: string[], options?: Parameters<typeof intl.formatList>[1]) => 
      intl.formatList(items, { ...options, locale }),
    
    formatDuration: (seconds: number, options?: Parameters<typeof intl.formatDuration>[1]) => 
      intl.formatDuration(seconds, { ...options, locale }),
    
    getDateFormatPattern: () => 
      intl.getDateFormatPattern(locale),
    
    getCurrencyForLocale: () => 
      intl.getCurrencyForLocale(locale),
    
    parseCurrency: intl.parseCurrency,
    
    locale,
  };
};
