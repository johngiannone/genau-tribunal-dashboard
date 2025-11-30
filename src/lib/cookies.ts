/**
 * Cookie utility functions for managing user preferences
 */

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

export const getUserCountry = (): string | null => {
  return getCookie('user_country');
};

export const getUserLocale = (): string | null => {
  return getCookie('user_locale');
};
