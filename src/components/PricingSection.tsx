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

const personalPlans = [
  {
    name: "The Observer",
    price: 0,
    description: "For curious individuals",
    features: ["3 Audits per day", "Basic Council Access", "Standard Support"],
    stripeLink: "#",
    isPrimary: false,
  },
  {
    name: "The Professional",
    price: 29,
    description: "For researchers & coders",
    features: ["200 Audits per month", "50 File Uploads/mo", "Full Council Access", "Priority Processing"],
    stripeLink: "https://stripe.com/pro",
    isPopular: true,
    isPrimary: true,
  },
  {
    name: "The Power User",
    price: 99,
    description: "For power users",
    features: ["800 Audits per month", "Unlimited File Uploads", "2M Context Window", "Large PDF Support", "Dedicated Support"],
    stripeLink: "https://stripe.com/max",
    isPrimary: false,
  },
];

const businessPlans = [
  {
    name: "Team",
    price: 149,
    description: "For growing teams",
    features: ["5 Team Seats", "1,500 Shared Audits/mo", "Shared Audit History", "Collaborative Workspace", "Team Analytics"],
    stripeLink: "https://stripe.com/team",
    isPrimary: false,
  },
  {
    name: "Agency",
    price: 499,
    description: "For agencies & studios",
    features: ["20 Team Seats", "5,000 Shared Audits/mo", "Whitelabeled Reports", "Custom Branding", "Priority Support"],
    stripeLink: "https://stripe.com/agency",
    isPopular: true,
    isPrimary: true,
  },
];

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
          <span>Live exchange rates updated hourly</span>
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
