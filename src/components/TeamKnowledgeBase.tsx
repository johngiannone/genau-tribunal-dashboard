import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileText, Trash2, BookOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface KnowledgeDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  document_type: string | null;
  uploaded_by: string;
  uploaded_at: string;
  description: string | null;
  is_active: boolean;
}

interface TeamKnowledgeBaseProps {
  organizationId: string;
  onDocumentsChange?: () => void;
}

export default function TeamKnowledgeBase({ organizationId, onDocumentsChange }: TeamKnowledgeBaseProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("other");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [organizationId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_knowledge_base")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${organizationId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("knowledge-base")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("knowledge-base")
        .getPublicUrl(filePath);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from("organization_knowledge_base")
        .insert({
          organization_id: organizationId,
          file_name: selectedFile.name,
          file_url: publicUrl,
          file_size: selectedFile.size,
          document_type: documentType,
          uploaded_by: user.id,
          description: description || null,
          is_active: true,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDescription("");
      setDocumentType("other");
      await fetchDocuments();
      onDocumentsChange?.(); // Notify parent component
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split("/knowledge-base/");
      const filePath = urlParts[1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("knowledge-base")
        .remove([filePath]);

      if (storageError) console.error("Storage delete error:", storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from("organization_knowledge_base")
        .delete()
        .eq("id", docId);

      if (dbError) throw dbError;

      toast.success("Document deleted");
      await fetchDocuments();
      onDocumentsChange?.(); // Notify parent component
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDocumentTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      legal_precedent: "Legal Precedent",
      medical_guideline: "Medical Guideline",
      technical_spec: "Technical Spec",
      compliance_doc: "Compliance",
      other: "Other",
    };
    return types[type || "other"] || "Other";
  };

  return (
    <Card className="border-[#E5E5EA]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0071E3]" />
            <CardTitle className="text-xl text-[#111111]">Knowledge Base</CardTitle>
          </div>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-[#0071E3] hover:bg-[#0077ED] text-white gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </div>
        <CardDescription>
          Industry-specific documents for context-aware audits
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-[#86868B]">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-center py-8 text-[#86868B]">
            No documents yet. Upload legal precedents, medical guidelines, or technical specs.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="font-semibold text-[#111111]">Document</TableHead>
                <TableHead className="font-semibold text-[#111111]">Type</TableHead>
                <TableHead className="font-semibold text-[#111111]">Size</TableHead>
                <TableHead className="font-semibold text-[#111111]">Uploaded</TableHead>
                <TableHead className="font-semibold text-[#111111]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0071E3]" />
                      <div>
                        <p className="font-medium text-[#111111]">{doc.file_name}</p>
                        {doc.description && (
                          <p className="text-xs text-[#86868B]">{doc.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getDocumentTypeLabel(doc.document_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[#86868B]">
                    {formatFileSize(doc.file_size)}
                  </TableCell>
                  <TableCell className="text-sm text-[#86868B]">
                    {formatDate(doc.uploaded_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id, doc.file_url)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Knowledge Document</DialogTitle>
            <DialogDescription>
              Add industry-specific documents to enhance audit context
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">PDF Document</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="mt-2"
              />
              {selectedFile && (
                <p className="text-sm text-[#86868B] mt-1">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="type">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legal_precedent">Legal Precedent</SelectItem>
                  <SelectItem value="medical_guideline">Medical Guideline</SelectItem>
                  <SelectItem value="technical_spec">Technical Specification</SelectItem>
                  <SelectItem value="compliance_doc">Compliance Document</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document's purpose..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
