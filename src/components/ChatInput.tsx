import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (message: string, fileData?: { name: string; base64: string; type: string }) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size limit (6MB)
    const maxSize = 6 * 1024 * 1024; // 6MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File too large for Beta. Please upgrade to Supreme Court tier.",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    console.log("File selected:", file.name, "Type:", file.type, "Size:", file.size);
    setIsUploading(true);
    
    try {
      // Convert file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data (remove data URL prefix)
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      
      setSelectedFile({ 
        name: file.name, 
        base64: base64Data,
        type: file.type 
      });
      
      toast({
        title: "File Ready",
        description: `${file.name} ready to upload to Tribunal Secure Core.`,
      });
    } catch (error) {
      console.error("File read error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to read file.",
        variant: "destructive",
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim(), selectedFile || undefined);
      setMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 pb-6 pointer-events-none">
      <div className="max-w-[700px] mx-auto px-6 pointer-events-auto">
        {/* File Pill */}
        {selectedFile && (
          <div className="mb-2 inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/30 text-primary px-3 py-1.5 rounded-full text-xs font-mono">
            📄 {selectedFile.name} 
            <span className="text-primary/70">(Ready for Upload)</span>
            <button
              onClick={handleRemoveFile}
              className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          {/* Floating Command Bar */}
          <div className="flex gap-2 items-center bg-card/50 backdrop-blur-xl border border-primary/40 rounded-xl px-4 py-2 shadow-lg shadow-primary/5 hover:border-primary/60 focus-within:border-primary transition-all">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isUploading}
            />
            
            {/* Paperclip button */}
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              size="icon"
              variant="ghost"
              className="shrink-0 h-7 w-7 hover:bg-muted transition-colors"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {isUploading && (
              <span className="text-xs text-muted-foreground font-mono">Preparing file...</span>
            )}

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter query..."
              disabled={disabled}
              className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/60 text-sm leading-relaxed"
              rows={1}
            />
            
            {/* Minimal Arrow Icon - only shows when typing */}
            {message.trim() && (
              <button
                type="submit"
                disabled={disabled}
                className="shrink-0 w-7 h-7 rounded-lg bg-primary/90 hover:bg-primary flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50"
              >
                <ArrowUp className="w-4 h-4 text-primary-foreground" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2 font-mono">
            ENTER to send • SHIFT+ENTER for new line
          </p>
        </form>
      </div>
    </div>
  );
};
