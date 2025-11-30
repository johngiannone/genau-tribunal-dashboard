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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Subtle Background Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-50/30 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 border-b border-[#E5E5EA] bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${lang || 'en'}/auth`)}
            className="gap-2 text-gray-500 hover:text-[#111111]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('pricing.backToLogin')}
          </Button>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0071E3]/10">
              <Brain className="w-4 h-4 text-[#0071E3]" />
            </div>
            <span className="font-bold text-[#111111] tracking-tight">
              Consensus
            </span>
          </div>

          <LanguageSwitcher />
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 text-center py-16 px-6">
        <h1 className="text-5xl md:text-6xl font-bold text-[#111111] tracking-tight mb-4">
          {t('pricing.title')}
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Pricing Section */}
      <div className="relative z-10">
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
  );
};

export default Pricing;
