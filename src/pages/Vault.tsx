import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Database, Download, Trash2, Calendar, ArrowLeft, TrendingUp, Award, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ABTestingAnalytics } from "@/components/ABTestingAnalytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface TrainingData {
  id: string;
  prompt: string;
  draft_a_model: string;
  draft_a_response: string;
  draft_b_model: string;
  draft_b_response: string;
  verdict_model: string;
  verdict_response: string;
  model_config: any;
  human_rating: number;
  verdict_rating: number;
  created_at: string;
  council_source: string | null;
}

interface ModelComboStats {
  combination: string;
  draftA: string;
  draftB: string;
  count: number;
  avgRating: number;
  goodCount: number;
  badCount: number;
}

export default function Vault() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showABTesting, setShowABTesting] = useState(false);

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
          completion: item.verdict_response,
          rejected: [item.draft_a_response, item.draft_b_response],
          models: {
            draft_a: item.draft_a_model,
            draft_b: item.draft_b_model,
            verdict: item.verdict_model,
          },
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

  const getVerdictRatingBadge = (rating: number) => {
    if (rating === 1) return <Badge className="bg-emerald-500">👍</Badge>;
    if (rating === -1) return <Badge variant="destructive">👎</Badge>;
    return <Badge variant="outline">—</Badge>;
  };

  const getModelShortName = (modelId: string) => {
    if (!modelId) return "Unknown";
    const parts = modelId.split("/");
    return parts[parts.length - 1].replace(/-/g, " ").substring(0, 20);
  };

  const calculateModelCombinations = (): ModelComboStats[] => {
    const comboMap = new Map<string, { count: number; ratings: number[]; draftA: string; draftB: string }>();

    trainingData.forEach((item) => {
      const key = `${item.draft_a_model}|${item.draft_b_model}`;
      if (!comboMap.has(key)) {
        comboMap.set(key, { count: 0, ratings: [], draftA: item.draft_a_model, draftB: item.draft_b_model });
      }
      const combo = comboMap.get(key)!;
      combo.count++;
      combo.ratings.push(item.human_rating);
    });

    return Array.from(comboMap.entries())
      .map(([key, data]) => {
        const avgRating = data.ratings.length > 0 
          ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length 
          : 0;
        return {
          combination: `${getModelShortName(data.draftA)} + ${getModelShortName(data.draftB)}`,
          draftA: data.draftA,
          draftB: data.draftB,
          count: data.count,
          avgRating: Math.round(avgRating * 100) / 100,
          goodCount: data.ratings.filter(r => r === 1).length,
          badCount: data.ratings.filter(r => r === -1).length,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5);
  };

  const getRatingDistribution = () => {
    const good = trainingData.filter(d => d.human_rating === 1).length;
    const bad = trainingData.filter(d => d.human_rating === -1).length;
    const unrated = trainingData.filter(d => d.human_rating === 0).length;

    return [
      { name: "Good", value: good, color: "#0071E3" },
      { name: "Bad", value: bad, color: "#FF3B30" },
      { name: "Unrated", value: unrated, color: "#8E8E93" },
    ].filter(item => item.value > 0);
  };

  const COLORS = ["#0071E3", "#FF3B30", "#8E8E93"];

  if (!session) return null;

  const modelCombinations = calculateModelCombinations();
  const ratingDistribution = getRatingDistribution();

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
            <div className="flex items-center gap-2">
              <Button
                variant={showABTesting ? "secondary" : "outline"}
                onClick={() => setShowABTesting(!showABTesting)}
                className="gap-2"
              >
                <FlaskConical className="h-4 w-4" />
                {showABTesting ? "Hide A/B Testing" : "A/B Testing"}
              </Button>
              <Button
                variant={showAnalytics ? "secondary" : "outline"}
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                {showAnalytics ? "Hide Analytics" : "Show Analytics"}
              </Button>
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
        </div>

        {/* Content */}
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
            <div className="space-y-6">
              {/* A/B Testing Section */}
              {showABTesting && (
                <div className="mb-6">
                  <ABTestingAnalytics trainingData={trainingData} />
                </div>
              )}

              {/* Analytics Section */}
              {showAnalytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Top Model Combinations */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[#111111]">
                        <Award className="w-5 h-5 text-[#0071E3]" />
                        Top Model Combinations
                      </CardTitle>
                      <CardDescription className="text-[#86868B]">
                        Highest-rated model pairs based on user feedback
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {modelCombinations.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={modelCombinations} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                            <XAxis type="number" domain={[-1, 1]} stroke="#86868B" />
                            <YAxis dataKey="combination" type="category" width={150} stroke="#86868B" style={{ fontSize: '12px' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E5EA', borderRadius: '8px' }}
                              formatter={(value: any) => [`${value} avg rating`, 'Rating']}
                            />
                            <Bar dataKey="avgRating" fill="#0071E3" radius={[0, 8, 8, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-[#86868B] py-12">
                          No rated combinations yet
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Rating Distribution */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[#111111]">
                        <TrendingUp className="w-5 h-5 text-[#0071E3]" />
                        Rating Distribution
                      </CardTitle>
                      <CardDescription className="text-[#86868B]">
                        Overall verdict quality feedback
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {ratingDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={ratingDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {ratingDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E5EA', borderRadius: '8px' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-[#86868B] py-12">
                          No ratings yet
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Model Combination Details Table */}
                  <Card className="bg-white border-gray-200 lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-[#111111]">Model Combination Performance</CardTitle>
                      <CardDescription className="text-[#86868B]">
                        Detailed breakdown of each model pair's performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {modelCombinations.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-[#111111]">Model Combination</th>
                                <th className="text-center py-3 px-4 font-semibold text-[#111111]">Audits</th>
                                <th className="text-center py-3 px-4 font-semibold text-[#111111]">Avg Rating</th>
                                <th className="text-center py-3 px-4 font-semibold text-[#111111]">👍 Good</th>
                                <th className="text-center py-3 px-4 font-semibold text-[#111111]">👎 Bad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modelCombinations.map((combo, idx) => (
                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 font-mono text-xs text-[#111111]">{combo.combination}</td>
                                  <td className="text-center py-3 px-4 text-[#86868B]">{combo.count}</td>
                                  <td className="text-center py-3 px-4">
                                    <Badge 
                                      className={combo.avgRating > 0 ? "bg-[#0071E3]" : combo.avgRating < 0 ? "bg-[#FF3B30]" : "bg-[#8E8E93]"}
                                    >
                                      {combo.avgRating.toFixed(2)}
                                    </Badge>
                                  </td>
                                  <td className="text-center py-3 px-4 text-[#0071E3] font-semibold">{combo.goodCount}</td>
                                  <td className="text-center py-3 px-4 text-[#FF3B30] font-semibold">{combo.badCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center text-[#86868B] py-12">
                          No model combinations found
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Training Data Table */}
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Prompt</TableHead>
                      <TableHead className="w-[15%]">Models</TableHead>
                      <TableHead className="w-[12%]">Human Rating</TableHead>
                      <TableHead className="w-[12%]">Verdict Rating</TableHead>
                      <TableHead className="w-[18%]">Date</TableHead>
                      <TableHead className="w-[8%]"></TableHead>
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
                          {item.draft_a_model?.split("/")[1] || item.draft_a_model || "Unknown"}
                        </TableCell>
                        <TableCell>{getRatingBadge(item.human_rating)}</TableCell>
                        <TableCell>{getVerdictRatingBadge(item.verdict_rating)}</TableCell>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
