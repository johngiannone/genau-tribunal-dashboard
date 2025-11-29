import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Brain, MessageCircle, Code } from "lucide-react";

interface ModelRecommendation {
  type: string;
  confidence: string;
  recommendations: {
    drafters: Array<{ id: string; role: string; name: string }>;
    auditor: { id: string; role: string; name: string };
  };
  reason: string;
}

interface ModelRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: ModelRecommendation | null;
  onAccept: () => void;
  onDecline: () => void;
  isLoading: boolean;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'technical':
      return <Code className="w-5 h-5" />;
    case 'creative':
      return <Sparkles className="w-5 h-5" />;
    case 'analytical':
      return <Brain className="w-5 h-5" />;
    case 'conversational':
      return <MessageCircle className="w-5 h-5" />;
    default:
      return <Zap className="w-5 h-5" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'technical':
      return 'bg-blue-500';
    case 'creative':
      return 'bg-purple-500';
    case 'analytical':
      return 'bg-green-500';
    case 'conversational':
      return 'bg-amber-500';
    default:
      return 'bg-gray-500';
  }
};

export function ModelRecommendationModal({
  isOpen,
  onClose,
  recommendation,
  onAccept,
  onDecline,
  isLoading,
}: ModelRecommendationModalProps) {
  if (!recommendation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl text-[#111111]">
            <div className={`w-10 h-10 rounded-xl ${getTypeColor(recommendation.type)} flex items-center justify-center text-white`}>
              {getTypeIcon(recommendation.type)}
            </div>
            <div>
              <div>Optimal Model Recommendation</div>
              <div className="text-sm font-normal text-[#86868B] mt-1">
                Detected prompt type: <Badge className={getTypeColor(recommendation.type)}>{recommendation.type}</Badge>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-[#86868B] mt-4">
            {recommendation.reason}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Drafters Section */}
          <div>
            <h3 className="text-sm font-semibold text-[#111111] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0071E3]" />
              Recommended Council Members
            </h3>
            <div className="space-y-2">
              {recommendation.recommendations.drafters.map((drafter, idx) => (
                <div key={idx} className="bg-[#F5F5F7] rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#111111]">{drafter.role}</div>
                    <div className="text-xs text-[#86868B] font-mono">{drafter.name}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{drafter.id.split('/')[0]}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Auditor Section */}
          <div>
            <h3 className="text-sm font-semibold text-[#111111] mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#0071E3]" />
              Synthesis Model
            </h3>
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#111111]">{recommendation.recommendations.auditor.role}</div>
                <div className="text-xs text-[#86868B] font-mono">{recommendation.recommendations.auditor.name}</div>
              </div>
              <Badge className="bg-amber-500 text-xs">{recommendation.recommendations.auditor.id.split('/')[0]}</Badge>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              💡 <strong>Tip:</strong> These models are optimized for your prompt type. You can still customize your council in Settings if needed.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onDecline}
            disabled={isLoading}
            className="border-gray-200"
          >
            Use My Current Council
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading}
            className="bg-[#0071E3] hover:bg-[#0077ED] text-white"
          >
            {isLoading ? "Applying..." : "Use Recommended Council"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}