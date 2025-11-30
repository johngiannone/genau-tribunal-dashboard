import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { PricingSection } from "./PricingSection";
import { getCurrencyForLocale } from "@/lib/intl-formatting";
import { useTranslation } from "react-i18next";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const { i18n } = useTranslation();
  const currency = getCurrencyForLocale(i18n.language) as 'USD' | 'GBP' | 'EUR';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-3xl font-mono font-bold text-center gradient-text">
            The Council Awaits
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Choose your path to unlimited audits
          </DialogDescription>
        </DialogHeader>
        
        <PricingSection currency={currency} />
      </DialogContent>
    </Dialog>
  );
};
