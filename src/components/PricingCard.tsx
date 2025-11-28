import { Button } from "./ui/button";
import { Check, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
}

export const PricingCard = ({ 
  name, 
  price, 
  description, 
  features, 
  isPopular = false,
  stripeLink,
  isPrimary = false,
  mode = "authenticated"
}: PricingCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (mode === "public") {
      // Redirect to auth with plan name as query param
      const planSlug = name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/auth?plan=${planSlug}`);
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
      className={`relative rounded-xl border bg-card p-6 transition-all hover:border-primary/50 ${
        isPopular ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/50'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-mono px-3 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-mono font-bold text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">${price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>

        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground flex items-center gap-1">
                {feature}
                {feature.toLowerCase().includes('unlimited') && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
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
          className={`w-full ${
            isPrimary 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          {price === 0 ? (mode === "public" ? 'Sign Up Free' : 'Current Plan') : 'Get Started'}
        </Button>
      </div>
    </div>
  );
};
