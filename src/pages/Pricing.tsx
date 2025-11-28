import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PricingSection } from "@/components/PricingSection";
import { ArrowLeft, Brain } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();

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
            onClick={() => navigate("/auth")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Button>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/30">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-mono font-bold text-foreground">
              Consensus Engine
            </span>
          </div>

          <div className="w-[100px]" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 text-center py-12 px-4">
        <h1 className="text-5xl font-mono font-bold gradient-text mb-4">
          The Council Awaits
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose your path to unlimited consensus. Get precision AI audits from multiple models working in parallel.
        </p>
      </div>

      {/* Pricing Section */}
      <div className="relative z-10">
        <PricingSection mode="public" />
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 text-center py-12 px-4">
        <p className="text-muted-foreground mb-4">
          Ready to get started?
        </p>
        <Button
          size="lg"
          onClick={() => navigate("/auth")}
          className="gap-2"
        >
          Create Free Account
        </Button>
      </div>
    </div>
  );
};

export default Pricing;
