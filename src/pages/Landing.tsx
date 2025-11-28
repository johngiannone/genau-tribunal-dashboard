import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, Shield, Users, ArrowRight, Sparkles } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">Consensus</span>
          </div>
          <Link to="/auth">
            <Button variant="outline" className="rounded-full">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl md:text-7xl font-extrabold text-[#111111] tracking-tight leading-[1.1] mb-8">
          Ask once.
          <br />
          Get the consensus.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-[1.6]">
          Running multiple AI models in parallel for precision analysis.
          <br />
          Get synthesized answers from the world's best AI systems.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/auth">
            <Button size="lg" className="rounded-full h-12 px-8 text-base shadow-lg">
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-base">
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="apple-card p-8 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Multi-Model Consensus
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Run GPT-4o, Claude, Llama, and more in parallel. Get synthesized insights from multiple AI perspectives.
            </p>
          </div>

          <div className="apple-card p-8 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Confidence Scoring
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Every response includes a confidence score, showing you how aligned the AI models are on the answer.
            </p>
          </div>

          <div className="apple-card p-8 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Customizable Council
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Choose which AI models to include in your council. Tailor the consensus to your specific needs.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="apple-card p-12 text-center bg-gradient-to-br from-primary/5 to-primary/10">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users leveraging multi-model AI consensus for better decisions.
          </p>
          <Link to="/auth">
            <Button size="lg" className="rounded-full h-12 px-8 text-base shadow-lg">
              Start Free Trial
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">© 2025 Consensus. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
