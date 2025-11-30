import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { PricingCard } from "./PricingCard";
import { Mail, RefreshCw } from "lucide-react";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { Skeleton } from "./ui/skeleton";

type Currency = 'USD' | 'GBP' | 'EUR';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
};

// Fallback rates if API fails
const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
};

interface PricingSectionProps {
  mode?: "public" | "authenticated";
  currency?: Currency;
}

export const PricingSection = ({ mode = "authenticated", currency = "USD" }: PricingSectionProps) => {
  const { t, i18n } = useTranslation();
  const [isBusiness, setIsBusiness] = useState(false);
  const { data: exchangeRates, isLoading, error } = useExchangeRates();
  
  // Use real exchange rates or fallback
  const rates = exchangeRates || FALLBACK_RATES;
  
  // Convert prices to selected currency
  const convertPrice = (priceUSD: number) => {
    return Math.round(priceUSD * rates[currency]);
  };
  
  const personalPlans = [
    {
      name: t('pricing.observerName'),
      price: 0,
      description: t('pricing.observerDescription'),
      features: [
        t('pricing.observerFeature1'),
        t('pricing.observerFeature2'),
        t('pricing.observerFeature3')
      ],
      stripeLink: "#",
      isPrimary: false,
    },
    {
      name: t('pricing.professionalName'),
      price: 29,
      description: t('pricing.professionalDescription'),
      features: [
        t('pricing.professionalFeature1'),
        t('pricing.professionalFeature2'),
        t('pricing.professionalFeature3'),
        t('pricing.professionalFeature4')
      ],
      stripeLink: "https://stripe.com/pro",
      isPopular: true,
      isPrimary: true,
    },
    {
      name: t('pricing.powerUserName'),
      price: 99,
      description: t('pricing.powerUserDescription'),
      features: [
        t('pricing.powerUserFeature1'),
        t('pricing.powerUserFeature2'),
        t('pricing.powerUserFeature3'),
        t('pricing.powerUserFeature4'),
        t('pricing.powerUserFeature5')
      ],
      stripeLink: "https://stripe.com/max",
      isPrimary: false,
    },
  ];

  const businessPlans = [
    {
      name: t('pricing.teamName'),
      price: 149,
      description: t('pricing.teamDescription'),
      features: [
        t('pricing.teamFeature1'),
        t('pricing.teamFeature2'),
        t('pricing.teamFeature3'),
        t('pricing.teamFeature4'),
        t('pricing.teamFeature5')
      ],
      stripeLink: "https://stripe.com/team",
      isPrimary: false,
    },
    {
      name: t('pricing.agencyName'),
      price: 499,
      description: t('pricing.agencyDescription'),
      features: [
        t('pricing.agencyFeature1'),
        t('pricing.agencyFeature2'),
        t('pricing.agencyFeature3'),
        t('pricing.agencyFeature4'),
        t('pricing.agencyFeature5')
      ],
      stripeLink: "https://stripe.com/agency",
      isPopular: true,
      isPrimary: true,
    },
  ];
  
  // Add currency symbol and format plans
  const formatPlans = (plans: typeof personalPlans) => {
    return plans.map(plan => ({
      ...plan,
      price: convertPrice(plan.price),
      pricePrefix: CURRENCY_SYMBOLS[currency],
    }));
  };
  
  const plans = isBusiness ? formatPlans(businessPlans) : formatPlans(personalPlans);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-8 py-8">
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 py-8">
      {/* Exchange Rate Info */}
      {exchangeRates && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3" />
          <span>{t('pricing.liveRates')}</span>
        </div>
      )}
      
      {/* Toggle Switch */}
      <div className="flex items-center justify-center gap-4">
        <Label 
          htmlFor="plan-toggle" 
          className={`font-mono text-sm cursor-pointer ${!isBusiness ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {t('pricing.personal')}
        </Label>
        <Switch
          id="plan-toggle"
          checked={isBusiness}
          onCheckedChange={setIsBusiness}
        />
        <Label 
          htmlFor="plan-toggle" 
          className={`font-mono text-sm cursor-pointer ${isBusiness ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {t('pricing.business')}
        </Label>
      </div>
      
      {/* VAT Notice for EU */}
      {currency === 'EUR' && (
        <p className="text-center text-sm text-muted-foreground">
          {t('pricing.vatIncluded')}
        </p>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        {plans.map((plan, index) => (
          <PricingCard key={index} {...plan} mode={mode} />
        ))}
      </div>

      {/* Pricing Example Note */}
      <div className="text-center text-sm text-muted-foreground px-4">
        <p>{t('pricing.pricingExample')}</p>
        <p className="mt-2 text-primary font-medium">{t('pricing.savingsNote')}</p>
      </div>

      {/* Enterprise Banner */}
      <div className="relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 text-center mx-4">
        <div className="space-y-4">
          <h3 className="text-2xl font-mono font-bold text-foreground">{t('pricing.enterprise')}</h3>
          <p className="text-muted-foreground">
            {t('pricing.enterpriseDescription')}
          </p>
          <a
            href="mailto:sales@genau.io"
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-mono"
          >
            <Mail className="w-4 h-4" />
            {t('pricing.contactSales')}
          </a>
        </div>
      </div>
    </div>
  );
};