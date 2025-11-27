import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex gap-3 items-end bg-card border border-border rounded-2xl p-3 shadow-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your audit request..."
              disabled={disabled}
              className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
              rows={1}
            />
            <Button
              type="submit"
              disabled={disabled || !message.trim()}
              size="icon"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-10 w-10 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
};
