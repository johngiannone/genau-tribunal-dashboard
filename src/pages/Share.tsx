import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ConsensusMessage } from "@/components/ConsensusMessage";
import { Button } from "@/components/ui/button";
import { Twitter, Linkedin, MessageCircle } from "lucide-react";

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

  // Update meta tags for social sharing
  useEffect(() => {
    if (audit) {
      const ogTitle = `Genau Audit: ${audit.user_prompt.substring(0, 50)}${audit.user_prompt.length > 50 ? '...' : ''}`;
      const ogDescription = `Verdict: ${audit.synthesis.substring(0, 150)}${audit.synthesis.length > 150 ? '...' : ''} | ${audit.confidence}% Confidence`;
      
      document.title = ogTitle;
      
      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.content = content;
      };
      
      updateMetaTag('og:title', ogTitle);
      updateMetaTag('og:description', ogDescription);
      updateMetaTag('twitter:title', ogTitle);
      updateMetaTag('twitter:description', ogDescription);
    }
  }, [audit]);

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

  const handleSocialShare = (platform: 'twitter' | 'linkedin' | 'whatsapp') => {
    if (!audit) return;

    const shareUrl = window.location.href;
    const shareText = `Check out this AI consensus audit: "${audit.user_prompt.substring(0, 100)}${audit.user_prompt.length > 100 ? '...' : ''}" - ${audit.confidence}% confidence score via @GenauAI`;
    
    let url = '';
    
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
        break;
    }
    
    window.open(url, '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#86868B] font-mono text-sm">Loading shared audit...</p>
        </div>
      </div>
    );
  }

  if (notFound || !audit) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-[#111111] mb-4">404</h1>
          <p className="text-[#86868B] mb-6">
            This shared audit doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/auth")} className="bg-[#0071E3] hover:bg-[#0077ED] text-white">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-black text-lg">G</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#111111]">GENAU</h1>
              <p className="text-xs text-[#86868B] font-mono">Audit Report #{slug}</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/auth")}
            className="bg-[#0071E3] hover:bg-[#0077ED] text-white"
          >
            Run Your Own Audit
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 pb-32">
        {/* Question Audited Section */}
        <div className="bg-[#F5F5F7] rounded-2xl p-6 mb-8 shadow-sm">
          <p className="text-xs text-[#86868B] uppercase tracking-wide mb-2 font-semibold">Question Audited</p>
          <h2 className="text-xl font-semibold text-[#111111] leading-relaxed">{audit.user_prompt}</h2>
        </div>

        {/* Social Sharing Buttons */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs text-[#86868B] font-mono">
            Shared on {new Date(audit.created_at).toLocaleDateString()}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#86868B] mr-2 font-medium">Share:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialShare('twitter')}
              className="bg-white border-gray-200 hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-all"
            >
              <Twitter className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialShare('linkedin')}
              className="bg-white border-gray-200 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-all"
            >
              <Linkedin className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialShare('whatsapp')}
              className="bg-white border-gray-200 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
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
      </main>

      {/* Sticky Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111111]">Generated by Genau</p>
              <p className="text-xs text-[#86868B]">The AI Consensus Engine</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/auth")} 
            size="lg" 
            className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
          >
            Run Your Own Audit →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Share;
