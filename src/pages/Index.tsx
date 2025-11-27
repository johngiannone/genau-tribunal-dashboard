import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TribunalMessage } from "@/components/TribunalMessage";
import { ChatInput } from "@/components/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scale } from "lucide-react";

interface Message {
  id: number;
  userPrompt: string;
  chairmanResponse?: string;
  criticResponse?: string;
  auditorVerdict?: string;
  isLoading?: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = (userPrompt: string) => {
    const newMessage: Message = {
      id: Date.now(),
      userPrompt,
      isLoading: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsProcessing(true);

    // Simulate AI responses with delays
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                chairmanResponse:
                  "Based on my analysis, the document structure follows standard legal frameworks. Key clauses are properly defined with clear intent and scope. However, I recommend reviewing Section 4.2 for potential ambiguities in liability limitations.",
              }
            : msg
        )
      );
    }, 1500);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                criticResponse:
                  "While the Chairman's assessment covers the basics, there are critical gaps in the force majeure provisions. The indemnification clauses lack specificity regarding third-party claims, and the dispute resolution mechanism needs stronger arbitration language to be enforceable across jurisdictions.",
              }
            : msg
        )
      );
    }, 2500);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                auditorVerdict:
                  "After synthesizing both perspectives, the document demonstrates foundational legal adequacy but requires targeted improvements. Priority actions: (1) Strengthen Section 4.2 with explicit liability caps and exclusions, (2) Expand force majeure definitions to include cyber events and supply chain disruptions, (3) Add multi-tiered dispute resolution with mandatory mediation before arbitration. Overall risk assessment: Medium. Recommended for conditional approval pending these revisions.",
                isLoading: false,
              }
            : msg
        )
      );
      setIsProcessing(false);
    }, 4000);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] text-center">
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 rounded-full mb-6">
                  <Scale className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  Welcome to Genau
                </h2>
                <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
                  Your premium AI auditing platform. Submit documents for
                  tribunal-style analysis by our AI panel: The Chairman, The
                  Critic, and The Auditor.
                </p>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border border-border">
                    <span>🤖</span>
                    <span>Chairman</span>
                  </div>
                  <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border border-border">
                    <span>🐯</span>
                    <span>Critic</span>
                  </div>
                  <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border border-primary">
                    <span>⚖️</span>
                    <span>Auditor</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {messages.map((message) => (
                  <TribunalMessage
                    key={message.id}
                    userPrompt={message.userPrompt}
                    chairmanResponse={message.chairmanResponse}
                    criticResponse={message.criticResponse}
                    auditorVerdict={message.auditorVerdict}
                    isLoading={message.isLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <ChatInput onSend={handleSendMessage} disabled={isProcessing} />
      </div>
    </div>
  );
};

export default Index;
