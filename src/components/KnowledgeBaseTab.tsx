import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Upload, FileText, Trash2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsPro } from "@/hooks/useIsPro";
import { UpgradeModal } from "./UpgradeModal";

interface BrandDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
  is_active: boolean;
}

export const KnowledgeBaseTab = () => {
  const [document, setDocument] = useState<BrandDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPro, isLoading } = useIsPro();
  const { toast } = useToast();

  useEffect(() => {
    if (isPro) {
      fetchDocument();
    }
  }, [isPro]);

  const fetchDocument = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from('brand_documents')
      .select('*')
      .eq('user_id', session.session.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching brand document:", error);
      return;
    }

    setDocument(data);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      // First, deactivate any existing documents
      if (document) {
        await supabase
          .from('brand_documents')
          .update({ is_active: false })
          .eq('id', document.id);
      }

      // Upload file to storage
      const filePath = `${session.session.user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('knowledge-base')
        .getPublicUrl(filePath);

      // Create database record
      const { data: newDoc, error: dbError } = await supabase
        .from('brand_documents')
        .insert({
          user_id: session.session.user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          is_active: true,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setDocument(newDoc);
      toast({
        title: "Document uploaded",
        description: "Your brand guidelines have been saved. The Council will reference this for all audits.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!document) return;

    const confirmed = window.confirm("Remove this brand document? The Council will no longer reference it.");
    if (!confirmed) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('brand_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      // Delete from storage
      const filePath = document.file_url.split('/knowledge-base/')[1];
      if (filePath) {
        await supabase.storage
          .from('knowledge-base')
          .remove([filePath]);
      }

      setDocument(null);
      toast({
        title: "Document removed",
        description: "Brand guidelines have been removed",
      });
    } catch (error) {
      console.error("Remove error:", error);
      toast({
        title: "Failed to remove document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <>
        <Card className="border-[#E5E5EA]">
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                  <Lock className="w-8 h-8 text-[#86868B]" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111111] mb-2">Pro Feature</h3>
                <p className="text-[#86868B] max-w-md mx-auto">
                  Upload brand guidelines to ensure the Council's analysis aligns with your company's tone and standards.
                </p>
              </div>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-[#0071E3] text-white hover:bg-[#0071E3]/90"
              >
                Upgrade to Pro
              </Button>
            </div>
          </CardContent>
        </Card>
        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
      </>
    );
  }

  return (
    <>
      <Card className="border-[#E5E5EA]">
        <CardContent className="pt-6">
          {!document ? (
            <div className="space-y-4">
              <label
                htmlFor="brand-doc-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#E5E5EA] rounded-2xl cursor-pointer bg-[#F5F5F7]/30 hover:bg-[#F5F5F7]/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Upload className="w-8 h-8 text-[#0071E3]" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-[#111111]">Upload Brand Guidelines</p>
                    <p className="text-sm text-[#86868B] mt-1">
                      Drop your PDF here or click to upload
                    </p>
                    <p className="text-xs text-[#86868B] mt-2">
                      PDF only • Max 10MB
                    </p>
                  </div>
                </div>
                <input
                  id="brand-doc-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              <div className="flex items-start gap-3 p-4 bg-[#0071E3]/5 border border-[#0071E3]/20 rounded-xl">
                <FileText className="w-5 h-5 text-[#0071E3] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#111111]/70 leading-relaxed">
                  The Council will reference this document for all future audits to ensure alignment with your brand's tone, style, and guidelines.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-white border border-[#E5E5EA] rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0071E3]/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#0071E3]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#111111]">{document.file_name}</p>
                    <p className="text-sm text-[#86868B]">
                      Uploaded: {formatDate(document.created_at)} • {formatFileSize(document.file_size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemove}
                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-900 leading-relaxed">
                  ✓ Active - The Council is now consulting your brand guidelines for all audits.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </>
  );
};
