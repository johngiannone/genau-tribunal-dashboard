import { useState } from "react";
import { useTranslation } from "react-i18next";
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
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold text-[#111111] tracking-tight">
          {t('pricing.title')}
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Exchange Rate Info */}
      {exchangeRates && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <RefreshCw className="w-3 h-3" />
          <span>{t('pricing.liveRates')}</span>
        </div>
      )}
      
      {/* iOS-Style Segmented Control */}
      <div className="flex items-center justify-center">
        <div className="relative inline-flex items-center bg-[#F5F5F7] rounded-full p-1">
          <button
            onClick={() => setIsBusiness(false)}
            className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              !isBusiness 
                ? 'text-[#111111]' 
                : 'text-gray-500'
            }`}
          >
            {t('pricing.personal')}
          </button>
          <button
            onClick={() => setIsBusiness(true)}
            className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              isBusiness 
                ? 'text-[#111111]' 
                : 'text-gray-500'
            }`}
          >
            {t('pricing.business')}
          </button>
          {/* Sliding Background */}
          <div 
            className={`absolute top-1 bottom-1 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out ${
              isBusiness ? 'left-[calc(50%-4px)] right-1' : 'left-1 right-[calc(50%-4px)]'
            }`}
          />
        </div>
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
          <div 
            key={index}
            className="animate-slideUp opacity-0"
            style={{ 
              animationDelay: `${index * 0.1}s`,
              animationFillMode: 'forwards'
            }}
          >
            <PricingCard {...plan} mode={mode} />
          </div>
        ))}
      </div>

      {/* Pricing Example Note */}
      <div className="text-center text-sm text-gray-500 px-4">
        <p>{t('pricing.pricingExample')}</p>
        <p className="mt-2 text-[#0071E3] font-medium">{t('pricing.savingsNote')}</p>
      </div>

      {/* Enterprise Banner */}
      <div className="relative rounded-2xl border border-[#E5E5EA] bg-white p-8 text-center mx-4 shadow-sm">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-[#111111]">{t('pricing.enterprise')}</h3>
          <p className="text-gray-500">
            {t('pricing.enterpriseDescription')}
          </p>
          <a
            href="mailto:sales@genau.io"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0071E3] text-white rounded-full hover:bg-[#0077ED] transition-all shadow-lg hover:shadow-xl font-medium"
          >
            <Mail className="w-4 h-4" />
            {t('pricing.contactSales')}
          </a>
        </div>
      </div>
    </div>
  );
};