import { useState } from "react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { PricingCard } from "./PricingCard";
import { Mail } from "lucide-react";

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
}

export const PricingSection = ({ mode = "authenticated" }: PricingSectionProps) => {
  const [isBusiness, setIsBusiness] = useState(false);
  const plans = isBusiness ? businessPlans : personalPlans;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 py-8">
      {/* Toggle Switch */}
      <div className="flex items-center justify-center gap-4">
        <Label 
          htmlFor="plan-toggle" 
          className={`font-mono text-sm cursor-pointer ${!isBusiness ? 'text-primary' : 'text-muted-foreground'}`}
        >
          Personal
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
          Business
        </Label>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        {plans.map((plan, index) => (
          <PricingCard key={index} {...plan} mode={mode} />
        ))}
      </div>

      {/* Enterprise Banner */}
      <div className="relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 text-center mx-4">
        <div className="space-y-4">
          <h3 className="text-2xl font-mono font-bold text-foreground">Enterprise</h3>
          <p className="text-muted-foreground">
            Need SSO or On-Premise Deployment?
          </p>
          <a
            href="mailto:sales@genau.io"
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-mono"
          >
            <Mail className="w-4 h-4" />
            Contact Sales
          </a>
        </div>
      </div>
    </div>
  );
};
