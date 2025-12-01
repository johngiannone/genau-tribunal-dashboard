import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Zap, Shield, Users, ArrowRight, Sparkles, Brain, Cpu, Eye, AlertTriangle, ShieldCheck, MessageSquare, Network, TrendingUp } from "lucide-react";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Animated Counter Component
const AnimatedCounter = ({ target, suffix = "", duration = 2 }: { target: number; suffix?: string; duration?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      motionValue.set(target);
    }
  }, [isInView, motionValue, target]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return unsubscribe;
  }, [springValue]);

  return (
    <span ref={ref}>
      {displayValue}
      {suffix}
    </span>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { lang } = useParams();
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const { scrollY } = useScroll();
  
  // Fetch real shared audit results
  const { data: sharedAudits = [] } = useQuery({
    queryKey: ['landing-examples'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_shares')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });
  
  // Auto-rotate through examples every 6 seconds
  useEffect(() => {
    if (sharedAudits.length > 1) {
      const interval = setInterval(() => {
        setCurrentExampleIndex((prev) => (prev + 1) % sharedAudits.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [sharedAudits.length]);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const currentExample = sharedAudits[currentExampleIndex];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Radial Gradient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Sticky Header with Glassmorphism */}
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm" 
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-black tracking-tight text-foreground">Genau</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link to={`/${lang || 'en'}/pricing`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('pricing.title')}
            </Link>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.features')}
            </a>
            <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.demo')}
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to={`/${lang || 'en'}/auth`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('auth.signIn')}
            </Link>
            <Link to={`/${lang || 'en'}/auth`}>
              <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                {t('pricing.getStarted')}
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-48 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-4">
            <span className="text-[#111111]">{t('landing.hero')} </span>
            <span className="bg-gradient-to-b from-[#111111] to-[#666666] bg-clip-text text-transparent">
              {t('landing.heroAccent')}
            </span>
          </h1>
          <p className="text-xl text-[#86868B] max-w-[600px] mx-auto mb-12 leading-[1.6]">
            {t('landing.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={`/${lang || 'en'}/auth`}>
              <Button 
                size="lg" 
                className="rounded-full h-14 px-10 text-base shadow-lg hover:shadow-primary/20 transition-all duration-300"
              >
                {t('pricing.getStarted')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to={`/${lang || 'en'}/pricing`}>
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-full h-14 px-10 text-base border-border hover:border-foreground transition-colors"
              >
                {t('landing.viewPricing')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* The Single-Model Trap Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 -mt-24 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white border border-[#E5E5EA] rounded-3xl shadow-lg p-12"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#111111] mb-4 tracking-tight">
              Don't Let AI Hallucinations Cost You.
            </h2>
            <p className="text-lg text-[#86868B] max-w-3xl mx-auto leading-relaxed">
              Consumer reports warn that chatbots like ChatGPT and Gemini can give risky, incomplete advice on critical issues. One model isn't enough.
            </p>
          </div>

          {/* Animated Statistics */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Consensus Accuracy */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-50 to-green-100/30 border-2 border-green-200 rounded-2xl p-8 text-center relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="mb-3">
                <div className="text-6xl md:text-7xl font-black text-green-600 mb-2">
                  <AnimatedCounter target={92} suffix="%" duration={2.5} />
                </div>
                <div className="text-sm font-semibold text-[#111111] uppercase tracking-wider">
                  Consensus Accuracy
                </div>
              </div>
              <p className="text-sm text-[#86868B]">
                Multiple AI models cross-verify every answer
              </p>
            </motion.div>

            {/* Single Model Accuracy */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-red-50 to-red-100/30 border-2 border-red-200 rounded-2xl p-8 text-center relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="mb-3">
                <div className="text-6xl md:text-7xl font-black text-red-600 mb-2">
                  <AnimatedCounter target={64} suffix="%" duration={2.5} />
                </div>
                <div className="text-sm font-semibold text-[#111111] uppercase tracking-wider">
                  Single-Model Accuracy
                </div>
              </div>
              <p className="text-sm text-[#86868B]">
                One perspective means higher error rates
              </p>
            </motion.div>
          </div>

          {/* Improvement Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold text-lg">
                <AnimatedCounter target={28} suffix="%" duration={2} /> more accurate
              </span>
            </div>
          </motion.div>

          {/* Comparison Visual */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Left Side - The Risk */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200 rounded-2xl p-8 text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-red-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#111111] mb-2">Single Point of Failure</h3>
              <p className="text-sm text-[#86868B]">
                One model means one perspective—and one chance to get it wrong. No checks, no balance.
              </p>
            </motion.div>

            {/* Right Side - The Solution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-green-50 to-green-100/50 border-2 border-green-200 rounded-2xl p-8 text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center">
                    <Network className="w-10 h-10 text-green-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#111111] mb-2">Consensus & Audit</h3>
              <p className="text-sm text-[#86868B]">
                Multiple models cross-check each other. Every answer is verified, audited, and scored for confidence.
              </p>
            </motion.div>
          </div>

          {/* Source Citation */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-full">
              <Shield className="w-4 h-4 text-[#86868B]" />
              <p className="text-xs text-[#86868B] font-medium">
                Based on 2025 research from Which? Consumer Insight
              </p>
            </div>
          </div>
        </motion.div>

        {/* Trust Badge Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16"
        >
          <p className="text-center text-sm text-[#86868B] mb-8 font-medium">
            Research cited by leading consumer protection and academic institutions
          </p>
          
          {/* Infinite Scroll Carousel */}
          <div className="relative overflow-hidden">
            <div className="flex gap-12 animate-scroll">
              {/* First set of badges */}
              <div className="flex gap-12 shrink-0">
                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-2xl font-black text-[#111111] mb-1">Which?</div>
                    <div className="text-xs text-[#86868B]">Consumer Insight</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">Consumer Reports</div>
                    <div className="text-xs text-[#86868B]">AI Safety Research</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">MIT CSAIL</div>
                    <div className="text-xs text-[#86868B]">AI Reliability Lab</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">Stanford HAI</div>
                    <div className="text-xs text-[#86868B]">Human-Centered AI</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">Oxford FHI</div>
                    <div className="text-xs text-[#86868B]">Future of Humanity</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">Berkeley CHAI</div>
                    <div className="text-xs text-[#86868B]">AI Alignment</div>
                  </div>
                </div>
              </div>

              {/* Duplicate set for seamless loop */}
              <div className="flex gap-12 shrink-0" aria-hidden="true">
                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-2xl font-black text-[#111111] mb-1">Which?</div>
                    <div className="text-xs text-[#86868B]">Consumer Insight</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">Consumer Reports</div>
                    <div className="text-xs text-[#86868B]">AI Safety Research</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">MIT CSAIL</div>
                    <div className="text-xs text-[#86868B]">AI Reliability Lab</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">Stanford HAI</div>
                    <div className="text-xs text-[#86868B]">Human-Centered AI</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">Oxford FHI</div>
                    <div className="text-xs text-[#86868B]">Future of Humanity</div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-8 py-4 bg-white border border-[#E5E5EA] rounded-2xl min-w-[180px]">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#111111] mb-1">Berkeley CHAI</div>
                    <div className="text-xs text-[#86868B]">AI Alignment</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Interactive Demo Section - Floating Glassmorphism Card */}
      <section id="demo" className="max-w-6xl mx-auto px-6 -mt-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ 
            opacity: 1, 
            y: [0, -10, 0],
          }}
          transition={{ 
            opacity: { duration: 0.7 },
            y: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="relative"
        >
          {currentExample ? (
            /* Real Audit Demo - Click to View Full Result */
            <div 
              className="relative bg-white/80 backdrop-blur-xl border border-[#E5E5EA] rounded-3xl shadow-2xl overflow-hidden cursor-pointer transition-all hover:shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:scale-[1.01]"
              onClick={() => navigate(`/share/${currentExample.share_slug}`)}
            >
              {/* Demo Header */}
              <div className="bg-gradient-to-r from-background to-secondary/20 px-8 py-6 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FF605C]" />
                      <div className="w-3 h-3 rounded-full bg-[#FFBD44]" />
                      <div className="w-3 h-3 rounded-full bg-[#00CA4E]" />
                    </div>
                  </div>
                  {sharedAudits.length > 1 && (
                    <div className="flex gap-1">
                      {sharedAudits.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-all ${
                            idx === currentExampleIndex
                              ? "w-6 bg-primary"
                              : "w-1.5 bg-border"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {t('landing.liveExample')}
                </div>
              </div>

              {/* User Prompt */}
              <div className="px-8 py-6 bg-secondary/10">
                <div className="inline-block bg-primary/10 px-4 py-2 rounded-full">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    "{currentExample.user_prompt}"
                  </p>
                </div>
              </div>

              {/* Model Outputs Grid */}
              <div className="grid md:grid-cols-2 gap-6 p-8 bg-background">
                {/* Model A Output */}
                <motion.div
                  key={`model-a-${currentExampleIndex}`}
                  className="border border-border rounded-2xl p-6 bg-card relative overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{currentExample.model_a_name}</p>
                      <p className="text-xs text-muted-foreground">{t('landing.drafterA')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {currentExample.model_a_response}
                  </p>
                </motion.div>

                {/* Model B Output */}
                <motion.div
                  key={`model-b-${currentExampleIndex}`}
                  className="border border-border rounded-2xl p-6 bg-card relative overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{currentExample.model_b_name}</p>
                      <p className="text-xs text-muted-foreground">{t('landing.drafterB')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {currentExample.model_b_response}
                  </p>
                </motion.div>
              </div>

              {/* Synthesis Output */}
              <div className="px-8 pb-8">
                <motion.div
                  key={`synthesis-${currentExampleIndex}`}
                  className="border-2 border-primary/20 rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-primary/10"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('landing.synthesis')}</p>
                        <p className="text-xs text-muted-foreground">{t('landing.finalAnswer')}</p>
                      </div>
                    </div>
                    {currentExample.confidence && (
                      <div className="px-3 py-1 bg-success/10 rounded-full">
                        <span className="text-xs font-semibold text-success">
                          {Math.round(currentExample.confidence)}% {t('landing.confidence')}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                    {currentExample.synthesis}
                  </p>
                </motion.div>
              </div>
            </div>
          ) : (
            /* Fallback Static Demo */
            <div className="relative bg-white/80 backdrop-blur-xl border border-[#E5E5EA] rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-background to-secondary/20 px-8 py-6 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF605C]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD44]" />
                    <div className="w-3 h-3 rounded-full bg-[#00CA4E]" />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {t('landing.demoUrl')}
                </div>
              </div>

              <div className="px-8 py-6 bg-secondary/10">
                <div className="inline-block bg-primary/10 px-4 py-2 rounded-full">
                  <p className="text-sm font-medium text-foreground">
                    "{t('landing.exampleQuestion')}"
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 p-8 bg-background">
                <div className="border border-border rounded-2xl p-6 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">GPT-4o</p>
                      <p className="text-xs text-muted-foreground">{t('landing.theChairman')}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="h-2 bg-secondary rounded w-full" />
                    <div className="h-2 bg-secondary rounded w-5/6" />
                    <div className="h-2 bg-secondary rounded w-4/6" />
                  </div>
                </div>

                <div className="border border-border rounded-2xl p-6 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Claude 3.5</p>
                      <p className="text-xs text-muted-foreground">{t('landing.theCritic')}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="h-2 bg-secondary rounded w-full" />
                    <div className="h-2 bg-secondary rounded w-4/6" />
                    <div className="h-2 bg-secondary rounded w-5/6" />
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8">
                <div className="border-2 border-primary/20 rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('landing.synthesis')}</p>
                        <p className="text-xs text-muted-foreground">{t('landing.finalAnswer')}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-success/10 rounded-full">
                      <span className="text-xs font-semibold text-success">99% {t('landing.confidence')}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="h-2 bg-primary/20 rounded w-full" />
                    <div className="h-2 bg-primary/20 rounded w-11/12" />
                    <div className="h-2 bg-primary/20 rounded w-4/5" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-6 py-32 bg-gradient-to-b from-background to-secondary/10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[#111111] mb-4 tracking-tight">
            {t('landing.howItWorks')}
          </h2>
          <p className="text-xl text-[#86868B] max-w-2xl mx-auto">
            {t('landing.howItWorksSubtitle')}
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connection Lines */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2" />
          
          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Step 1: Ask */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6 relative z-10 bg-background">
                  <div className="text-3xl">💬</div>
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold z-20">
                  1
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('landing.step1Title')}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('landing.step1Description')}
                </p>
              </div>
            </motion.div>

            {/* Step 2: Analyze */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border-2 border-purple-500/20 flex items-center justify-center mb-6 relative z-10 bg-background">
                  <div className="text-3xl">🤖</div>
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold z-20">
                  2
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('landing.step2Title')}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('landing.step2Description')}
                </p>
              </div>
            </motion.div>

            {/* Step 3: Compare */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center mb-6 relative z-10 bg-background">
                  <div className="text-3xl">⚖️</div>
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold z-20">
                  3
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('landing.step3Title')}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('landing.step3Description')}
                </p>
              </div>
            </motion.div>

            {/* Step 4: Synthesis */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-success/10 border-2 border-success/20 flex items-center justify-center mb-6 relative z-10 bg-background">
                  <div className="text-3xl">✨</div>
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-success text-white flex items-center justify-center text-sm font-bold z-20">
                  4
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('landing.step4Title')}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('landing.step4Description')}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Process Flow Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-20 apple-card p-8 bg-gradient-to-br from-secondary/50 to-secondary/20"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-foreground mb-1">{t('landing.whyConsensus')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('landing.whyConsensusText')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">99%</div>
                  <div className="text-xs text-muted-foreground">{t('landing.avgConfidence')}</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">&lt;2s</div>
                  <div className="text-xs text-muted-foreground">{t('landing.responseTime')}</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">5+</div>
                  <div className="text-xs text-muted-foreground">{t('landing.aiModels')}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[#111111] mb-4 tracking-tight">
            {t('landing.faqTitle')}
          </h2>
          <p className="text-xl text-[#86868B] max-w-2xl mx-auto">
            {t('landing.faqSubtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                {t('landing.faq1Question')}
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                {t('landing.faq1Answer')}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                {t('landing.faq2Question')}
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                {t('landing.faq2Answer')}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                {t('landing.faq3Question')}
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                {t('landing.faq3Answer')}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                {t('landing.faq4Question')}
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                {t('landing.faq4Answer')}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                {t('landing.faq5Question')}
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                {t('landing.faq5Answer')}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                {t('landing.faq6Question')}
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                {t('landing.faq6Answer')}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[#111111] mb-4 tracking-tight">
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-xl text-[#86868B] max-w-2xl mx-auto">
            {t('landing.featuresSubtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: t('landing.feature1Title'),
              description: t('landing.feature1Description'),
              delay: 0
            },
            {
              icon: Shield,
              title: t('landing.feature2Title'),
              description: t('landing.feature2Description'),
              delay: 0.1
            },
            {
              icon: Users,
              title: t('landing.feature3Title'),
              description: t('landing.feature3Description'),
              delay: 0.2
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ 
                scale: 1.03,
                y: -8,
                transition: { duration: 0.3, ease: "easeOut" }
              }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: feature.delay }}
              className="group apple-card p-8 hover:shadow-2xl hover:border-primary/20 transition-all duration-300 cursor-pointer"
            >
              <motion.div 
                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300"
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <feature.icon className="w-8 h-8 text-primary group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground mb-3 text-left group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-left group-hover:text-foreground transition-colors duration-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 bg-gradient-to-b from-secondary/5 to-background">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#111111] mb-4 tracking-tight">
            {t('landing.useCaseTitle')}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: t('landing.useCase1Title'),
              description: t('landing.useCase1Description'),
              delay: 0
            },
            {
              title: t('landing.useCase2Title'),
              description: t('landing.useCase2Description'),
              delay: 0.1
            },
            {
              title: t('landing.useCase3Title'),
              description: t('landing.useCase3Description'),
              delay: 0.2
            }
          ].map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: useCase.delay }}
              className="bg-white border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {useCase.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[#111111] mb-4 tracking-tight">
            {t('landing.testimonialsTitle')}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              quote: t('landing.testimonial1Quote'),
              author: t('landing.testimonial1Author'),
              role: t('landing.testimonial1Role'),
              company: t('landing.testimonial1Company'),
              delay: 0
            },
            {
              quote: t('landing.testimonial2Quote'),
              author: t('landing.testimonial2Author'),
              role: t('landing.testimonial2Role'),
              company: t('landing.testimonial2Company'),
              delay: 0.15
            },
            {
              quote: t('landing.testimonial3Quote'),
              author: t('landing.testimonial3Author'),
              role: t('landing.testimonial3Role'),
              company: t('landing.testimonial3Company'),
              delay: 0.3
            }
          ].map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: testimonial.delay }}
              className="apple-card p-8 bg-gradient-to-br from-background to-secondary/10"
            >
              <div className="mb-6">
                <svg className="w-10 h-10 text-primary/20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="border-t border-border pt-4">
                <p className="font-semibold text-foreground">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                <p className="text-xs text-muted-foreground mt-1">{testimonial.company}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="apple-card p-12 md:p-16 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/10"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('landing.ctaSubtitle')}
          </p>
          <Link to={`/${lang || 'en'}/auth`}>
            <Button 
              size="lg" 
              className="rounded-full h-14 px-10 text-base shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              {t('landing.startFreeTrial')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">{t('landing.copyright')}</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to={`/${lang || 'en'}/pricing`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('pricing.title')}
              </Link>
              <a href="https://docs.genau.io" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('landing.documentation')}
              </a>
              <Link to={`/${lang || 'en'}/support`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Help Center
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
