import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker dynamically to match installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface ChatInputProps {
  onSend: (message: string, fileContext?: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; context: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isVisionMode, setIsVisionMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const extractCore = async () => {
      console.log("Starting PDF extraction for:", file.name);
      const arrayBuffer = await file.arrayBuffer();
      console.log("ArrayBuffer created, size:", arrayBuffer.byteLength);

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      console.log("PDF loaded, pages:", pdf.numPages);

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Extracting page ${i}/${pdf.numPages}`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n\n";
      }

      const trimmed = fullText.trim();
      console.log("PDF extraction complete, text length:", trimmed.length);

      if (!trimmed.length) {
        console.log("No text extracted - likely scanned image PDF");
        throw new Error(
          "This PDF appears to be a scanned image. Please use a text-selectable PDF or copy-paste the content."
        );
      }

      return trimmed;
    };

    const timeoutMs = 10000;

    try {
      return await Promise.race<string>([
        extractCore(),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT_EXCEEDED")), timeoutMs)
        ),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message === "TIMEOUT_EXCEEDED") {
        console.error("PDF extraction timed out after", timeoutMs, "ms");
        throw new Error("Document is too complex or encrypted.");
      }

      console.error("PDF extraction error:", error);
      if (error instanceof Error) {
        // Propagate user-friendly errors (e.g., scanned PDF message)
        throw error;
      }

      throw new Error("Failed to extract text from PDF.");
    }
  };

  const convertPdfToImages = async (file: File): Promise<string> => {
    console.log("Converting PDF to images for Vision Mode");
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const maxPages = Math.min(5, pdf.numPages);
    const imageDataArray: string[] = [];
    
    for (let i = 1; i <= maxPages; i++) {
      console.log(`Rendering page ${i}/${maxPages} to image`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Failed to get canvas context");
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
      
      const base64Image = canvas.toDataURL("image/png");
      imageDataArray.push(base64Image);
    }
    
    console.log(`Successfully converted ${imageDataArray.length} pages to images`);
    return JSON.stringify({ visionMode: true, images: imageDataArray, fileName: file.name });
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      return extractTextFromPDF(file);
    } else {
      // For .txt, .md, .csv
      return await file.text();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("File selected:", file.name, "Type:", file.type, "Size:", file.size);
    setIsExtracting(true);
    setIsVisionMode(false);
    
    try {
      // Try text extraction first
      const context = await extractTextFromFile(file);
      console.log("Extraction successful, context length:", context.length);
      
      // If text is too short (likely scanned), fall back to Vision Mode
      if (context.trim().length < 50) {
        console.log("Text extraction returned insufficient text. Switching to Vision Mode.");
        setIsVisionMode(true);
        const imageContext = await convertPdfToImages(file);
        setSelectedFile({ name: file.name, context: imageContext });
        
        toast({
          title: "Vision Mode Activated",
          description: `${file.name} is a scanned document. Analyzing images...`,
        });
      } else {
        setSelectedFile({ name: file.name, context });
        toast({
          title: "File Ready",
          description: `${file.name} has been processed successfully.`,
        });
      }
    } catch (error) {
      console.error("Text extraction failed:", error);
      
      // Fall back to Vision Mode on any error
      if (file.type === "application/pdf") {
        try {
          console.log("Text extraction failed/empty. Switching to Vision Mode.");
          setIsVisionMode(true);
          const imageContext = await convertPdfToImages(file);
          setSelectedFile({ name: file.name, context: imageContext });
          
          toast({
            title: "Vision Mode Activated",
            description: `${file.name} is a scanned document. Analyzing images...`,
          });
        } catch (visionError) {
          console.error("Vision Mode also failed:", visionError);
          toast({
            title: "Extraction Failed",
            description: "Unable to process this PDF. Please try a different file.",
            variant: "destructive",
          });
          
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      } else {
        toast({
          title: "Extraction Failed",
          description: error instanceof Error ? error.message : "Failed to extract text from file.",
          variant: "destructive",
        });
        
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setIsVisionMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim(), selectedFile?.context);
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
            {isVisionMode ? "⚠️" : "📄"} {selectedFile.name} 
            <span className="text-primary/70">
              {isVisionMode ? "(Analyzing Images...)" : "(Ready for Audit)"}
            </span>
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
              disabled={disabled || isExtracting}
            />
            
            {/* Paperclip button */}
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isExtracting}
              size="icon"
              variant="ghost"
              className="shrink-0 h-7 w-7 hover:bg-muted transition-colors"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {isExtracting && (
              <span className="text-xs text-muted-foreground font-mono">Extracting text layers...</span>
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
