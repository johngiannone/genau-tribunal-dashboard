import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PricingSection } from "@/components/PricingSection";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ArrowLeft, Brain } from "lucide-react";

type Currency = 'USD' | 'GBP' | 'EUR';

const Pricing = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  
  // Determine currency based on language/region
  const currency: Currency = 
    lang === 'en-gb' ? 'GBP' :
    (lang === 'de' || lang === 'fr' || lang === 'it' || lang === 'es') ? 'EUR' : 
    'USD';

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col">
      {/* Subtle Background Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-50/30 via-transparent to-transparent pointer-events-none" />

      {/* Back to Login - Top Left Absolute */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/${lang || 'en'}/auth`)}
          className="gap-2 text-gray-500 hover:text-[#111111]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('pricing.backToLogin')}
        </Button>
      </div>

      {/* Language Switcher - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-start pt-24 pb-32">
        {/* Hero Section - Centered */}
        <div className="relative z-10 text-center px-6 mb-16">
          <h1 className="text-6xl md:text-7xl font-black text-[#111111] tracking-tight leading-[1.05] mb-6">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-500 max-w-[600px] mx-auto leading-relaxed">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Pricing Section */}
        <div className="relative z-10 w-full">
          <PricingSection mode="public" currency={currency} />
        </div>

        {/* Footer CTA */}
        <div className="relative z-10 text-center py-16 px-6">
          <p className="text-gray-500 mb-6 text-lg">
            {t('pricing.ready')}
          </p>
          <Button
            size="lg"
            onClick={() => navigate(`/${lang || 'en'}/auth`)}
            className="h-14 px-10 rounded-full bg-[#111111] text-white hover:bg-[#000000] shadow-lg hover:shadow-xl transition-all"
          >
            {t('pricing.createAccount')}
          </Button>
        </div>
      </div>

      {/* Fixed Bottom Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0071E3]/10">
              <Brain className="w-4 h-4 text-[#0071E3]" />
            </div>
            <span className="font-bold text-[#111111] tracking-tight">
              Consensus
            </span>
          </div>
          <p className="text-sm text-gray-400 hidden sm:block">
            © 2025 Consensus. {t('landing.copyright').replace('© 2025 Consensus. ', '')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
