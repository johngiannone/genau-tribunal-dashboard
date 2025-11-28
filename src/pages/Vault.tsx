import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Database, Download, Trash2, Calendar, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TrainingData {
  id: string;
  prompt: string;
  chosen_response: string;
  rejected_response_a: string;
  rejected_response_b: string;
  model_config: any;
  human_rating: number;
  created_at: string;
}

export default function Vault() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        fetchTrainingData();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchTrainingData = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("training_dataset")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching training data:", error);
      toast({
        title: "Failed to load vault data",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTrainingData(data || []);
    }
    setIsLoading(false);
  };

  const exportToJsonL = () => {
    setIsExporting(true);
    try {
      // Convert to JSONL format (one JSON object per line)
      const jsonLines = trainingData.map((item) => {
        return JSON.stringify({
          prompt: item.prompt,
          completion: item.chosen_response,
          rejected: [item.rejected_response_a, item.rejected_response_b],
          model_config: item.model_config,
          rating: item.human_rating,
          timestamp: item.created_at,
        });
      });

      const jsonlContent = jsonLines.join("\n");
      const blob = new Blob([jsonlContent], { type: "application/jsonl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `training-dataset-${new Date().toISOString().split("T")[0]}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Downloaded ${trainingData.length} training examples as JSONL`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export training data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("training_dataset").delete().eq("id", id);

    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Entry deleted" });
      fetchTrainingData();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRatingBadge = (rating: number) => {
    if (rating === 1) return <Badge className="bg-primary">Good</Badge>;
    if (rating === -1) return <Badge variant="destructive">Bad</Badge>;
    return <Badge variant="secondary">Unrated</Badge>;
  };

  if (!session) return null;

  return (
    <div className="flex h-screen bg-background">
      {/* Simplified Header with Back Button */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/app")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">The Vault</h1>
                  <p className="text-sm text-muted-foreground">
                    {trainingData.length} audit results collected for AI training
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={exportToJsonL}
              disabled={trainingData.length === 0 || isExporting}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export for Fine-Tuning"}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-8 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground font-mono animate-pulse">Loading vault...</div>
            </div>
          ) : trainingData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Database className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Vault is Empty</h2>
              <p className="text-muted-foreground max-w-md">
                Run audits to automatically collect training data. Each audit result is saved here
                for future AI fine-tuning.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Prompt</TableHead>
                    <TableHead className="w-[20%]">Models</TableHead>
                    <TableHead className="w-[15%]">Rating</TableHead>
                    <TableHead className="w-[20%]">Date</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.prompt.length > 100
                          ? item.prompt.substring(0, 100) + "..."
                          : item.prompt}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.model_config?.slot_1?.id?.split("/")[1] || "Unknown"}
                      </TableCell>
                      <TableCell>{getRatingBadge(item.human_rating)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEntry(item.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
