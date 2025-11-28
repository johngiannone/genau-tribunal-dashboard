import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { PricingSection } from "./PricingSection";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-3xl font-mono font-bold text-center gradient-text">
            The Council Awaits
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Choose your path to unlimited consensus
          </DialogDescription>
        </DialogHeader>
        
        <PricingSection />
      </DialogContent>
    </Dialog>
  );
};
