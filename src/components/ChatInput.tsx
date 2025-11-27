import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatInputProps {
  onSend: (message: string, fileUrl?: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Resize image helper
  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        const maxWidth = 1500;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to resize image'));
        }, file.type, 0.9);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit before processing)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;
    if (disabled || isUploading) return;

    let fileUrl: string | undefined;

    if (selectedFile) {
      setIsUploading(true);
      setUploadStatus("Uploading to secure storage...");
      
      try {
        let fileToUpload: File | Blob = selectedFile;
        
        // Resize images before upload
        if (selectedFile.type.startsWith("image/")) {
          setUploadStatus("Resizing image...");
          fileToUpload = await resizeImage(selectedFile);
        }
        
        // Get user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Not authenticated");
        }
        
        // Upload to Supabase Storage
        const fileName = `${Date.now()}_${selectedFile.name}`;
        const filePath = `${user.id}/${fileName}`;
        
        setUploadStatus("Uploading file...");
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audits')
          .upload(filePath, fileToUpload);
        
        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('audits')
          .getPublicUrl(uploadData.path);
        
        fileUrl = publicUrl;
        setUploadStatus("File uploaded!");
      } catch (error) {
        console.error("File upload error:", error);
        toast({
          title: "Upload Failed",
          description: error instanceof Error ? error.message : "Failed to upload file",
          variant: "destructive",
        });
        setIsUploading(false);
        setUploadStatus("");
        return;
      }
    }

    // Send message
    onSend(message.trim(), fileUrl);
    setMessage("");
    handleRemoveFile();
    setIsUploading(false);
    setUploadStatus("");
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
            📎 {selectedFile.name}
            <button
              onClick={handleRemoveFile}
              className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        
        {/* Upload Status */}
        {uploadStatus && (
          <div className="mb-2 text-xs text-primary/70 font-mono">{uploadStatus}</div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          {/* Floating Command Bar */}
          <div className="flex gap-2 items-center bg-card/50 backdrop-blur-xl border border-primary/40 rounded-xl px-4 py-2 shadow-lg shadow-primary/5 hover:border-primary/60 focus-within:border-primary transition-all">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
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
              <span className="text-xs text-muted-foreground font-mono">{uploadStatus || "Preparing file..."}</span>
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
                disabled={disabled || isUploading}
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
