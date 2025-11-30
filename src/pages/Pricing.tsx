import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PricingSection } from "@/components/PricingSection";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ArrowLeft, Brain, ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";

type Currency = 'USD' | 'GBP' | 'EUR';

const Pricing = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Determine currency based on language/region
  const currency: Currency = 
    lang === 'en-gb' ? 'GBP' :
    (lang === 'de' || lang === 'fr' || lang === 'it' || lang === 'es') ? 'EUR' : 
    'USD';

  // Show scroll-to-top button after scrolling 400px
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Subtle Background Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-50/30 via-transparent to-transparent pointer-events-none" />

      {/* Back to Login - Top Left Absolute */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/${lang || 'en'}/auth`)}
          className="gap-2 text-gray-500 hover:text-[#111111]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('pricing.backToLogin')}
        </Button>
      </div>

      {/* Main Content - Vertically Centered */}
      <div className="min-h-screen flex items-center justify-center pb-32 pt-20 px-6">
        <div className="w-full max-w-7xl">
          {/* Hero Section - Centered */}
          <div id="pricing-hero" className="relative z-10 text-center mb-16 animate-fadeIn">
            <h1 className="text-6xl md:text-7xl font-black text-[#111111] tracking-tight leading-[1.05] mb-6">
              {t('pricing.title')}
            </h1>
            <p className="text-xl text-gray-500 max-w-[600px] mx-auto leading-relaxed">
              {t('pricing.subtitle')}
            </p>
          </div>

          {/* Pricing Section */}
          <div id="pricing-cards" className="relative z-10 scroll-mt-20">
            <PricingSection mode="public" currency={currency} />
          </div>

          {/* Footer CTA */}
          <div id="pricing-cta" className="relative z-10 text-center pt-16 animate-fadeIn">
            <p className="text-gray-500 mb-6 text-lg">
              {t('pricing.ready')}
            </p>
            <Button
              size="lg"
              onClick={() => {
                // Smooth scroll to top before navigation
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => navigate(`/${lang || 'en'}/auth`), 300);
              }}
              className="h-14 px-10 rounded-full bg-[#111111] text-white hover:bg-[#000000] shadow-lg hover:shadow-xl transition-all"
            >
              {t('pricing.createAccount')}
            </Button>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar - Logo & Language Selector */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo Left */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0071E3]/10">
              <Brain className="w-4 h-4 text-[#0071E3]" />
            </div>
            <span className="font-bold text-[#111111] tracking-tight">
              Consensus
            </span>
          </div>
          
          {/* Language Selector Right */}
          <LanguageSwitcher />
        </div>
      </div>

      {/* Floating Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-[#111111] text-white shadow-lg hover:shadow-xl hover:bg-[#000000] transition-all duration-300 flex items-center justify-center ${
          showScrollTop 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pricing;
