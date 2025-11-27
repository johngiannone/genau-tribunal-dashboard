import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface ChatInputProps {
  onSend: (message: string, imageData?: string, fileImages?: string[]) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileImages, setFileImages] = useState<string[]>([]);
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
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Extract ALL pages from PDF as images
  const extractPdfPages = async (file: File): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const images: string[] = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error("Failed to get canvas context");
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      // Convert to Base64 data URL
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      images.push(base64);
    }
    
    return images;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size before processing (6MB limit)
    const maxSize = 6 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File too large. Please upload a smaller document (max 6MB).",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsUploading(true);
    setUploadStatus("Processing file...");
    
    try {
      // Check file type
      if (file.type === "application/pdf") {
        setUploadStatus("Extracting PDF pages...");
        const pageImages = await extractPdfPages(file);
        setFileImages(pageImages);
        setImageData(null);
        setSelectedFile(file);
        setUploadStatus(`PDF ready (${pageImages.length} pages)`);
        
        toast({
          title: "PDF Ready",
          description: `${pageImages.length} pages extracted and ready for analysis.`,
        });
      } else if (file.type.startsWith("image/")) {
        setUploadStatus("Resizing image...");
        const resized = await resizeImage(file);
        setImageData(resized);
        setFileImages([]);
        setSelectedFile(file);
        setUploadStatus("Image ready");
        
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
      
      setSelectedFile(null);
      setImageData(null);
      setFileImages([]);
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
    setImageData(null);
    setFileImages([]);
    setUploadStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim(), imageData || undefined, fileImages.length > 0 ? fileImages : undefined);
      setMessage("");
      handleRemoveFile();
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
            {fileImages.length > 0 && ` (${fileImages.length} pages)`}
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
