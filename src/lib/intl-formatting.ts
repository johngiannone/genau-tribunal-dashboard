import i18n from '@/i18n/config';

/**
 * Get the current locale from i18next
 */
const getCurrentLocale = (): string => {
  const locale = i18n.language || 'en';
  // Map language codes to proper locale codes
  if (locale === 'en-gb') return 'en-GB';
  if (locale === 'de') return 'de-DE';
  if (locale === 'fr') return 'fr-FR';
  if (locale === 'it') return 'it-IT';
  return 'en-US';
};

/**
 * Get currency based on locale
 */
export const getCurrencyForLocale = (locale?: string): string => {
  const currentLocale = locale || getCurrentLocale();
  if (currentLocale.startsWith('de') || currentLocale.startsWith('fr') || currentLocale.startsWith('it')) return 'EUR';
  if (currentLocale === 'en-GB') return 'GBP';
  return 'USD';
};

/**
 * Format currency with proper symbol and locale
 */
export const formatCurrency = (
  amount: number,
  options?: {
    locale?: string;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string => {
  const locale = options?.locale || getCurrentLocale();
  const currency = options?.currency || getCurrencyForLocale(locale);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
};

/**
 * Format number with proper thousands separator and decimal
 */
export const formatNumber = (
  value: number,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  }
): string => {
  const locale = options?.locale || getCurrentLocale();

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: options?.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits,
    notation: options?.notation,
  }).format(value);
};

/**
 * Format percentage
 */
export const formatPercent = (
  value: number,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string => {
  const locale = options?.locale || getCurrentLocale();

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  }).format(value / 100);
};

/**
 * Format date - Full date with time
 */
export const formatDateTime = (
  date: Date | string | number,
  options?: {
    locale?: string;
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
): string => {
  const locale = options?.locale || getCurrentLocale();
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: options?.dateStyle || 'medium',
    timeStyle: options?.timeStyle || 'short',
  }).format(dateObj);
};

/**
 * Format date only (no time)
 */
export const formatDate = (
  date: Date | string | number,
  options?: {
    locale?: string;
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
  }
): string => {
  const locale = options?.locale || getCurrentLocale();
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: options?.dateStyle || 'medium',
  }).format(dateObj);
};

/**
 * Format time only (no date)
 */
export const formatTime = (
  date: Date | string | number,
  options?: {
    locale?: string;
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
): string => {
  const locale = options?.locale || getCurrentLocale();
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    timeStyle: options?.timeStyle || 'short',
  }).format(dateObj);
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (
  date: Date | string | number,
  options?: {
    locale?: string;
    style?: 'long' | 'short' | 'narrow';
  }
): string => {
  const locale = options?.locale || getCurrentLocale();
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((dateObj.getTime() - now.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
    style: options?.style || 'long',
  });

  const absDiff = Math.abs(diffInSeconds);

  // Seconds
  if (absDiff < 60) {
    return rtf.format(Math.round(diffInSeconds), 'second');
  }
  // Minutes
  if (absDiff < 3600) {
    return rtf.format(Math.round(diffInSeconds / 60), 'minute');
  }
  // Hours
  if (absDiff < 86400) {
    return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
  }
  // Days
  if (absDiff < 604800) {
    return rtf.format(Math.round(diffInSeconds / 86400), 'day');
  }
  // Weeks
  if (absDiff < 2592000) {
    return rtf.format(Math.round(diffInSeconds / 604800), 'week');
  }
  // Months
  if (absDiff < 31536000) {
    return rtf.format(Math.round(diffInSeconds / 2592000), 'month');
  }
  // Years
  return rtf.format(Math.round(diffInSeconds / 31536000), 'year');
};

/**
 * Format file size
 */
export const formatFileSize = (
  bytes: number,
  options?: {
    locale?: string;
    notation?: 'standard' | 'compact';
  }
): string => {
  const locale = options?.locale || getCurrentLocale();
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: unitIndex === 0 ? 0 : 1,
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
    notation: options?.notation || 'standard',
  }).format(size);

  return `${formattedNumber} ${units[unitIndex]}`;
};

/**
 * Format list of items (e.g., "item1, item2, and item3")
 */
export const formatList = (
  items: string[],
  options?: {
    locale?: string;
    type?: 'conjunction' | 'disjunction' | 'unit';
    style?: 'long' | 'short' | 'narrow';
  }
): string => {
  const locale = options?.locale || getCurrentLocale();

  // Check if Intl.ListFormat is available
  if ('ListFormat' in Intl) {
    return new (Intl as any).ListFormat(locale, {
      type: options?.type || 'conjunction',
      style: options?.style || 'long',
    }).format(items);
  }

  // Fallback for browsers without ListFormat support
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) {
    const connector = options?.type === 'disjunction' ? 'or' : 'and';
    return `${items[0]} ${connector} ${items[1]}`;
  }
  
  const last = items[items.length - 1];
  const rest = items.slice(0, -1);
  const connector = options?.type === 'disjunction' ? 'or' : 'and';
  return `${rest.join(', ')}, ${connector} ${last}`;
};

/**
 * Format duration in seconds to human-readable format
 */
export const formatDuration = (
  seconds: number,
  options?: {
    locale?: string;
    style?: 'long' | 'short' | 'narrow';
  }
): string => {
  const locale = options?.locale || getCurrentLocale();
  const style = options?.style || 'short';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(style === 'narrow' ? `${hours}h` : `${hours} hr${hours > 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(style === 'narrow' ? `${minutes}m` : `${minutes} min${minutes > 1 ? 's' : ''}`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(style === 'narrow' ? `${secs}s` : `${secs} sec${secs !== 1 ? 's' : ''}`);
  }

  return parts.join(' ');
};

/**
 * Get locale-specific date format pattern
 */
export const getDateFormatPattern = (locale?: string): string => {
  const currentLocale = locale || getCurrentLocale();
  
  // Common patterns by locale
  const patterns: Record<string, string> = {
    'en-US': 'MM/DD/YYYY',
    'en-GB': 'DD/MM/YYYY',
    'de-DE': 'DD.MM.YYYY',
  };

  return patterns[currentLocale] || 'MM/DD/YYYY';
};

/**
 * Parse currency string back to number
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = currencyString.replace(/[^\d.,-]/g, '');
  // Handle European format with comma as decimal separator
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
};
