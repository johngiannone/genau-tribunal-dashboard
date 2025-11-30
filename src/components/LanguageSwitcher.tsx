import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸', currency: 'USD' },
  { code: 'en-gb', label: 'English (UK)', flag: '🇬🇧', currency: 'GBP' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', currency: 'EUR' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLanguageChange = (langCode: string) => {
    // Set cookie to prevent geo-routing override
    document.cookie = `user_locale=${langCode}; path=/; max-age=31536000`; // 1 year
    
    i18n.changeLanguage(langCode);
    
    // Update URL path with new language
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentLang = pathSegments[0];
    
    // Remove old language prefix if exists
    if (['en', 'en-gb', 'de'].includes(currentLang)) {
      pathSegments.shift();
    }
    
    // Add new language prefix
    const newPath = `/${langCode}/${pathSegments.join('/')}`;
    navigate(newPath);
  };

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={currentLang.code === lang.code ? "default" : "ghost"}
          size="sm"
          onClick={() => handleLanguageChange(lang.code)}
          className="gap-2"
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="hidden sm:inline">{lang.label}</span>
        </Button>
      ))}
    </div>
  );
};
