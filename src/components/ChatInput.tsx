import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (message: string, imageData?: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; imageData: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Resize image to max 800px width
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          if (width > 800) {
            height = (height * 800) / width;
            width = 800;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to Base64 JPEG
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          resolve(base64);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Extract ONLY page 1 from PDF as image using CDN
  const extractPdfPage1 = async (file: File): Promise<string> => {
    // Dynamically load pdfjs from CDN
    // @ts-ignore - Dynamic CDN import
    const pdfJS = await import('https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.mjs');
    pdfJS.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfJS.getDocument({ data: arrayBuffer }).promise;
    
    // Get only page 1
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Failed to get canvas context");
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert to Base64 JPEG
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    return base64;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Processing file...");
    
    try {
      let imageData: string;

      // Check file type
      if (file.type === "application/pdf") {
        setUploadStatus("Extracting Page 1...");
        imageData = await extractPdfPage1(file);
        
        setSelectedFile({ 
          name: `${file.name} (Page 1)`, 
          imageData 
        });
        
        toast({
          title: "PDF Ready",
          description: "Page 1 extracted and ready for analysis.",
        });
      } else if (file.type.startsWith("image/")) {
        setUploadStatus("Resizing image...");
        imageData = await resizeImage(file);
        
        setSelectedFile({ 
          name: file.name, 
          imageData 
        });
        
        toast({
          title: "Image Ready",
          description: "Image resized and ready for analysis.",
        });
      } else {
        throw new Error("Unsupported file type. Please upload an image or PDF.");
      }
    } catch (error) {
      console.error("File processing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process file.";
      
      toast({
        title: "Upload Failed",
        description: `Error: ${errorMessage}`,
        variant: "destructive",
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim(), selectedFile?.imageData);
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
            📸 {selectedFile.name}
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
