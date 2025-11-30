import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { exportVerdictToPDF } from "@/lib/pdfExport";

interface EmailShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPrompt: string;
  verdict: string;
  confidence: number;
  modelAResponse?: string;
  modelBResponse?: string;
  agentNameA?: string;
  agentNameB?: string;
  modelAName?: string;
  modelBName?: string;
}

export const EmailShareModal = ({
  open,
  onOpenChange,
  userPrompt,
  verdict,
  confidence,
  modelAResponse,
  modelBResponse,
  agentNameA,
  agentNameB,
  modelAName,
  modelBName,
}: EmailShareModalProps) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const generatePDFBase64 = (): string => {
    const doc = exportVerdictToPDF({
      userPrompt,
      synthesis: verdict,
      confidenceScore: confidence,
      modelA: modelAName || "Model A",
      modelB: modelBName || "Model B",
      draftA: modelAResponse || "",
      draftB: modelBResponse || "",
    }, true);
    
    return doc || "";
  };

  const handleSend = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const senderName = session.session?.user.email?.split("@")[0] || "A user";

      const pdfBase64 = generatePDFBase64();

      const { data, error } = await supabase.functions.invoke("send-verdict-email", {
        body: {
          recipientEmail,
          recipientName: recipientName || undefined,
          customMessage: customMessage || undefined,
          userPrompt,
          verdict,
          confidence,
          senderName,
          pdfBase64,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: `Verdict report sent to ${recipientEmail}`,
      });

      onOpenChange(false);
      setRecipientEmail("");
      setRecipientName("");
      setCustomMessage("");
    } catch (error: any) {
      console.error("Email send error:", error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Share Verdict via Email
          </DialogTitle>
          <DialogDescription>
            Send this audit report directly to someone's inbox with an optional message and PDF attachment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Recipient Email *</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="colleague@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
            <Input
              id="recipientName"
              type="text"
              placeholder="John Doe"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customMessage">Personal Message (Optional)</Label>
            <Textarea
              id="customMessage"
              placeholder="Add a personal note to the recipient..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-1">📎 PDF Report will be attached</p>
            <p className="text-xs">Includes full verdict, confidence score, and model responses</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !recipientEmail}
          >
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
