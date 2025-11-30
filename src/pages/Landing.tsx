import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Zap, Shield, Users, ArrowRight, Sparkles, Brain, Cpu, Eye } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
    <div className="min-h-screen bg-background">
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
            <span className="text-xl font-semibold text-foreground">Consensus</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link to={`/${lang || 'en'}/pricing`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('pricing.title')}
            </Link>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Demo
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to={`/${lang || 'en'}/auth`}>
              <Button variant="outline" className="rounded-full border-border hover:border-foreground transition-colors">
                {t('auth.signIn')}
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-[#111111] tracking-tight leading-[1.05] mb-8 bg-gradient-to-b from-[#111111] to-[#666666] bg-clip-text text-transparent">
            {t('landing.hero')}
          </h1>
          <p className="text-xl md:text-2xl text-[#86868B] max-w-3xl mx-auto mb-12 leading-[1.6]">
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
                View Pricing
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Interactive Demo Section - The Centerpiece */}
      <section id="demo" className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          {currentExample ? (
            /* Real Audit Demo - Click to View Full Result */
            <div 
              className="relative bg-white border border-[#E5E5EA] rounded-3xl shadow-2xl overflow-hidden cursor-pointer transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:scale-[1.01]"
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
                  Live Example • Click to view full analysis
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
                      <p className="text-xs text-muted-foreground">Drafter A</p>
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
                      <p className="text-xs text-muted-foreground">Drafter B</p>
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
                        <p className="text-sm font-semibold text-foreground">The Synthesis</p>
                        <p className="text-xs text-muted-foreground">Final Answer</p>
                      </div>
                    </div>
                    {currentExample.confidence && (
                      <div className="px-3 py-1 bg-success/10 rounded-full">
                        <span className="text-xs font-semibold text-success">
                          {Math.round(currentExample.confidence)}% Confidence
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
            <div className="relative bg-white border border-[#E5E5EA] rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-background to-secondary/20 px-8 py-6 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF605C]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD44]" />
                    <div className="w-3 h-3 rounded-full bg-[#00CA4E]" />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  consensus.ai/demo
                </div>
              </div>

              <div className="px-8 py-6 bg-secondary/10">
                <div className="inline-block bg-primary/10 px-4 py-2 rounded-full">
                  <p className="text-sm font-medium text-foreground">
                    "What are the key benefits of renewable energy?"
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
                      <p className="text-xs text-muted-foreground">The Chairman</p>
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
                      <p className="text-xs text-muted-foreground">The Critic</p>
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
                        <p className="text-sm font-semibold text-foreground">The Synthesis</p>
                        <p className="text-xs text-muted-foreground">Final Answer</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-success/10 rounded-full">
                      <span className="text-xs font-semibold text-success">99% Confidence</span>
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
            How It Works
          </h2>
          <p className="text-xl text-[#86868B] max-w-2xl mx-auto">
            A simple, powerful process to get the best answer from multiple AI minds
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
                  Ask Your Question
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Submit any question or upload a document for analysis
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
                  Council Deliberates
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Multiple AI models analyze your question in parallel
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
                  Auditor Reviews
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  An expert model compares all responses for accuracy
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
                  Get Synthesis
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Receive a unified answer with confidence score
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
                  <h4 className="font-semibold text-foreground mb-1">Why Consensus?</h4>
                  <p className="text-sm text-muted-foreground">
                    Single AI models can be wrong. Multiple models reaching consensus are far more reliable.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">99%</div>
                  <div className="text-xs text-muted-foreground">Avg. Confidence</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">&lt;2s</div>
                  <div className="text-xs text-muted-foreground">Response Time</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">5+</div>
                  <div className="text-xs text-muted-foreground">AI Models</div>
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
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-[#86868B] max-w-2xl mx-auto">
            Everything you need to know about Consensus
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
                Which AI models are included?
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                By default, your council includes GPT-4o (The Chairman), Claude 3.5 Sonnet (The Critic), Qwen 2.5 Coder (The Architect), Grok 2 (The Reporter), and Llama 3.3 (The Speedster). You can customize this lineup by selecting from 330+ models including Gemini, Mistral, DeepSeek, and more.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                How accurate is the consensus?
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                Our multi-model consensus approach achieves 99% average confidence scores. By running multiple AI systems in parallel and having an auditor review their responses, we eliminate single-model hallucinations and biases. The synthesis only presents findings where models agree, ensuring high reliability.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                Can I customize my council?
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                Yes! Navigate to Settings → Council to customize all five council slots. Choose from 330+ models based on your needs—whether you prioritize speed, creativity, coding ability, or cost efficiency. You can even swap models mid-conversation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                What's the difference between Free and Pro plans?
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                Free Observer accounts get 3 audits per month to try the system. Pro Professional ($29/mo) unlocks 200 audits and 50 file uploads monthly. Max Power User ($99/mo) includes 800 audits, unlimited files, and 2M token context windows for large document analysis.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                Can I upload documents for analysis?
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                Absolutely. Upload PDFs, images, or documents directly in the chat interface. The Librarian (Gemini) will analyze your file and create context that persists across the entire conversation. All council members will reference this context when answering your questions.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-[#E5E5EA] rounded-2xl px-6 bg-white shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold text-[#111111] hover:no-underline py-6">
                How fast are the responses?
              </AccordionTrigger>
              <AccordionContent className="text-[#86868B] leading-relaxed pb-6">
                Most audits complete in under 2 seconds. Because all models run in parallel rather than sequentially, you get the benefit of multiple AI perspectives without the wait. Response times vary based on which models you've selected—faster models like Llama deliver near-instant results.
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
            Everything you need
          </h2>
          <p className="text-xl text-[#86868B] max-w-2xl mx-auto">
            Powerful features to help you make better decisions with AI
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: "Multi-Model Consensus",
              description: "Run GPT-4o, Claude, Llama, and more in parallel. Get synthesized insights from multiple AI perspectives.",
              delay: 0
            },
            {
              icon: Shield,
              title: "Confidence Scoring",
              description: "Every response includes a confidence score, showing you how aligned the AI models are on the answer.",
              delay: 0.1
            },
            {
              icon: Users,
              title: "Customizable Council",
              description: "Choose which AI models to include in your council. Tailor the consensus to your specific needs.",
              delay: 0.2
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: feature.delay }}
              className="apple-card p-8 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3 text-left">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-left">
                {feature.description}
              </p>
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
            Ready to get started?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users leveraging multi-model AI consensus for better decisions.
          </p>
          <Link to={`/${lang || 'en'}/auth`}>
            <Button 
              size="lg" 
              className="rounded-full h-14 px-10 text-base shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              Start Free Trial
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
              <span className="text-sm text-muted-foreground">© 2025 Consensus. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to={`/${lang || 'en'}/pricing`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </a>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
