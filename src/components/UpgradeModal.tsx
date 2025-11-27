import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Crown, Zap, Shield, TrendingUp } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const handleUpgrade = () => {
    // For now, just open Stripe
    window.open("https://stripe.com", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-primary/30">
        <div className="text-center space-y-6 py-4">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary" />
          </div>

          {/* Headline */}
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center gradient-text">
              The Council has spoken.
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground pt-2">
              You have used your 5 free daily audits. Join the Tribunal to unlock unlimited access.
            </DialogDescription>
          </DialogHeader>

          {/* Features */}
          <div className="space-y-3 text-left py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Unlimited Audits</p>
                <p className="text-xs text-muted-foreground">Run as many consensus checks as you need</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Priority Processing</p>
                <p className="text-xs text-muted-foreground">Get faster responses from all models</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Advanced Features</p>
                <p className="text-xs text-muted-foreground">Access to future premium capabilities</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
          >
            Become a Member · $29/mo
          </Button>

          <p className="text-xs text-muted-foreground">
            Cancel anytime. No questions asked.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
