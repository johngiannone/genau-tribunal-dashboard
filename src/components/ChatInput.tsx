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
      setUploadStatus("Uploading to Secure Vault...");
      
      try {
        let fileToUpload: File | Blob = selectedFile;
        
        // Resize images before upload
        if (selectedFile.type.startsWith("image/")) {
          setUploadStatus("Preparing image...");
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
        
        setUploadStatus("Uploading to Secure Vault...");
        
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
        setUploadStatus("Upload complete!");
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
    <div className="fixed bottom-0 left-0 right-0 pb-12 pointer-events-none z-50">
      <div className="max-w-2xl mx-auto px-6 pointer-events-auto">
        {/* File Attachment Badge */}
        {selectedFile && (
          <div className="mb-4 inline-flex items-center gap-2 bg-secondary text-foreground px-4 py-2.5 rounded-full text-sm shadow-md border border-border">
            <Paperclip className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedFile.name}</span>
            <button
              onClick={handleRemoveFile}
              className="ml-2 hover:bg-muted rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* Upload Status */}
        {uploadStatus && (
          <div className="mb-4 text-sm text-muted-foreground">{uploadStatus}</div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          {/* Apple-style Input Field with stronger presence */}
          <div className="apple-card flex gap-3 items-center bg-card px-6 py-5 shadow-lg border border-border h-16">
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
              className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            {isUploading && (
              <span className="text-sm text-muted-foreground">{uploadStatus || "Preparing file..."}</span>
            )}

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your question..."
              disabled={disabled}
              className="min-h-[44px] max-h-[160px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-base leading-relaxed"
              rows={1}
            />
            
            {/* Submit Button - only shows when typing */}
            {message.trim() && (
              <button
                type="submit"
                disabled={disabled || isUploading}
                className="shrink-0 w-10 h-10 rounded-full bg-primary hover:opacity-90 flex items-center justify-center transition-all disabled:opacity-50 shadow-sm"
              >
                <ArrowUp className="w-5 h-5 text-primary-foreground" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Press Enter to send • Shift + Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
};
