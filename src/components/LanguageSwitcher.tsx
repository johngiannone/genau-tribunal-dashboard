import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';

const languages = [
  { code: 'en', label: 'English (US)', flag: '🇺🇸', currency: 'USD' },
  { code: 'en-gb', label: 'English (UK)', flag: '🇬🇧', currency: 'GBP' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', currency: 'EUR' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', currency: 'EUR' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', currency: 'EUR' },
  { code: 'es', label: 'Español', flag: '🇪🇸', currency: 'EUR' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLanguageChange = (langCode: string) => {
    // Set cookie to prevent geo-routing override
    document.cookie = `user_locale=${langCode}; path=/; max-age=31536000`; // 1 year
    
    // Save to localStorage for persistence across sessions
    localStorage.setItem('user_locale', langCode);
    
    i18n.changeLanguage(langCode);
    
    // Update URL path with new language
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentLang = pathSegments[0];
    
    // Remove old language prefix if exists
    if (['en', 'en-gb', 'de', 'fr', 'it', 'es'].includes(currentLang)) {
      pathSegments.shift();
    }
    
    // Add new language prefix
    const newPath = `/${langCode}/${pathSegments.join('/')}`;
    navigate(newPath);
  };

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {languages.map((lang) => {
        const isActive = currentLang.code === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`
              text-sm font-medium transition-all duration-200
              flex items-center gap-2
              ${isActive 
                ? 'bg-blue-600 text-white rounded-full px-4 py-1.5' 
                : 'text-gray-500 hover:text-black'
              }
            `}
          >
            <span className="text-base">{lang.flag}</span>
            <span className="hidden sm:inline">{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
};
