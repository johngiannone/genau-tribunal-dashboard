import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ConsensusMessage } from "@/components/ConsensusMessage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface SharedAudit {
  user_prompt: string;
  model_a_name: string;
  model_a_response: string;
  model_b_name: string;
  model_b_response: string;
  synthesis: string;
  confidence: number | null;
  created_at: string;
}

const Share = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<SharedAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    fetchSharedAudit();
  }, [slug]);

  const fetchSharedAudit = async () => {
    if (!slug) return;

    const { data, error } = await supabase
      .from('public_shares')
      .select('*')
      .eq('share_slug', slug)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching shared audit:", error);
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Increment view count
    await supabase
      .from('public_shares')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('share_slug', slug);

    setAudit({
      user_prompt: data.user_prompt,
      model_a_name: data.model_a_name,
      model_a_response: data.model_a_response,
      model_b_name: data.model_b_name,
      model_b_response: data.model_b_response,
      synthesis: data.synthesis,
      confidence: data.confidence,
      created_at: data.created_at,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Loading shared audit...</p>
        </div>
      </div>
    );
  }

  if (notFound || !audit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
          <p className="text-muted-foreground mb-6">
            This shared audit doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground font-mono">
                GENAU
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Shared Consensus Audit
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/", "_blank")}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Try GENAU
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 text-xs text-muted-foreground font-mono">
          Shared on {new Date(audit.created_at).toLocaleDateString()}
        </div>
        
        <ConsensusMessage
          userPrompt={audit.user_prompt}
          modelAResponse={audit.model_a_response}
          modelBResponse={audit.model_b_response}
          synthesisResponse={audit.synthesis}
          confidenceScore={audit.confidence || 99}
          modelAName={audit.model_a_name}
          modelBName={audit.model_b_name}
          isLoading={false}
        />
        
        <div className="mt-12 text-center">
          <div className="inline-block bg-card border border-border rounded-lg px-6 py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Want to run your own consensus audits?
            </p>
            <Button onClick={() => navigate("/")} size="lg">
              Get Started with GENAU
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Share;
