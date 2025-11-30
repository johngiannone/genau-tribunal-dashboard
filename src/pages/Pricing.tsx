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
    (lang === 'de' || lang === 'fr' || lang === 'it' || lang === 'es') ? 'EUR' : 
    lang === 'en-gb' ? 'GBP' : 
    'USD';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background patterns */}
      <div className="geometric-grid" />
      <div className="geometric-mesh" />

      {/* Header */}
      <div className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${lang || 'en'}/auth`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('pricing.backToLogin')}
          </Button>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/30">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-mono font-bold text-foreground">
              Consensus Engine
            </span>
          </div>

          <LanguageSwitcher />
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 text-center py-12 px-4">
        <h1 className="text-5xl font-mono font-bold gradient-text mb-4">
          {t('pricing.title')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Pricing Section */}
      <div className="relative z-10">
        <PricingSection mode="public" currency={currency} />
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 text-center py-12 px-4">
        <p className="text-muted-foreground mb-4">
          {t('pricing.ready')}
        </p>
        <Button
          size="lg"
          onClick={() => navigate(`/${lang || 'en'}/auth`)}
          className="gap-2"
        >
          {t('pricing.createAccount')}
        </Button>
      </div>
    </div>
  );
};

export default Pricing;
