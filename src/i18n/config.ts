import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import es from './locales/es.json';
import enGb from './locales/en-gb.json';

// Load saved locale from localStorage if available
const savedLocale = localStorage.getItem('user_locale');

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
      es: { translation: es },
      'en-gb': { translation: enGb },
    },
    lng: savedLocale || undefined, // Use saved locale if available
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'path', 'cookie', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage', 'cookie'],
      cookieMinutes: 10080, // 1 week
    },
  });

export default i18n;
