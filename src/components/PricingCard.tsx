import { Button } from "./ui/button";
import { Check, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PricingCardProps {
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  stripeLink: string;
  isPrimary?: boolean;
  mode?: "public" | "authenticated";
  pricePrefix?: string;
}

export const PricingCard = ({ 
  name, 
  price, 
  description, 
  features, 
  isPopular = false,
  stripeLink,
  isPrimary = false,
  mode = "authenticated",
  pricePrefix = "$"
}: PricingCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { lang } = useParams();

  const handleClick = () => {
    if (mode === "public") {
      // Redirect to auth with plan name as query param
      const planSlug = name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/${lang || 'en'}/auth?plan=${planSlug}`);
    } else {
      // Check if it's a placeholder link
      if (stripeLink.startsWith("https://stripe.com/") || stripeLink === "#") {
        toast.error("Stripe checkout not configured yet. Please contact support to upgrade.");
        return;
      }
      // Open Stripe link for authenticated users
      window.open(stripeLink, "_blank");
    }
  };
  return (
    <div 
      className={`relative rounded-2xl border p-8 transition-all ${
        isPopular 
          ? 'border-yellow-400 bg-yellow-50/30 shadow-md hover:shadow-xl' 
          : 'border-[#E5E5EA] bg-white hover:shadow-xl'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-yellow-400 to-amber-400 text-[#111111] text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
            MOST POPULAR
          </span>
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-[#111111]">{name}</h3>
          <p className="text-sm text-gray-500 mt-2">{description}</p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-[#111111]">{pricePrefix}{price}</span>
          <span className="text-gray-500">{t('pricing.perMonth')}</span>
        </div>

        <ul className="space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3 text-sm">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0071E3]/10 flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-[#0071E3]" />
              </div>
              <span className="text-[#111111] flex items-center gap-1.5 leading-relaxed">
                {feature}
                {feature.toLowerCase().includes('unlimited') && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Fair Use Policy applies</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </span>
            </li>
          ))}
        </ul>

        <Button
          onClick={handleClick}
          className={`w-full h-12 rounded-full text-base font-semibold transition-all shadow-sm hover:shadow-lg ${
            isPrimary 
              ? 'bg-[#111111] text-white hover:bg-[#000000]' 
              : 'bg-white text-[#111111] border-2 border-[#111111] hover:bg-[#F5F5F7]'
          }`}
        >
          {price === 0 ? (mode === "public" ? t('pricing.getStarted') : 'Current Plan') : t('pricing.getStarted')}
        </Button>
      </div>
    </div>
  );
};
