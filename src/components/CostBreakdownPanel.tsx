import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ModelCost {
  model_name: string;
  total_cost: number;
  total_calls: number;
  avg_cost: number;
}

interface UserCost {
  user_id: string;
  total_cost: number;
  total_audits: number;
  avg_cost: number;
}

interface ConversationCost {
  conversation_id: string;
  total_cost: number;
  model_count: number;
  created_at: string;
}

export function CostBreakdownPanel() {
  const [modelCosts, setModelCosts] = useState<ModelCost[]>([]);
  const [userCosts, setUserCosts] = useState<UserCost[]>([]);
  const [conversationCosts, setConversationCosts] = useState<ConversationCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostBreakdown();
  }, []);

  const fetchCostBreakdown = async () => {
    setLoading(true);
    try {
      // Per-model costs
      const { data: modelData, error: modelError } = await supabase
        .from("analytics_events")
        .select("model_name, cost");

      if (modelError) throw modelError;

      const modelMap = new Map<string, { total: number; count: number }>();
      modelData?.forEach((event) => {
        const current = modelMap.get(event.model_name) || { total: 0, count: 0 };
        modelMap.set(event.model_name, {
          total: current.total + (event.cost || 0),
          count: current.count + 1,
        });
      });

      const models = Array.from(modelMap.entries()).map(([name, data]) => ({
        model_name: name,
        total_cost: data.total,
        total_calls: data.count,
        avg_cost: data.total / data.count,
      }));

      setModelCosts(models.sort((a, b) => b.total_cost - a.total_cost));

      // Per-user costs
      const { data: userData, error: userError } = await supabase
        .from("analytics_events")
        .select("user_id, cost, conversation_id");

      if (userError) throw userError;

      const userMap = new Map<string, { total: number; audits: Set<string> }>();
      userData?.forEach((event) => {
        const current = userMap.get(event.user_id) || { total: 0, audits: new Set() };
        userMap.set(event.user_id, {
          total: current.total + (event.cost || 0),
          audits: event.conversation_id ? current.audits.add(event.conversation_id) : current.audits,
        });
      });

      const users = Array.from(userMap.entries()).map(([id, data]) => ({
        user_id: id,
        total_cost: data.total,
        total_audits: data.audits.size,
        avg_cost: data.total / (data.audits.size || 1),
      }));

      setUserCosts(users.sort((a, b) => b.total_cost - a.total_cost));

      // Per-conversation costs
      const { data: convData, error: convError } = await supabase
        .from("analytics_events")
        .select("conversation_id, cost, created_at")
        .not("conversation_id", "is", null);

      if (convError) throw convError;

      const convMap = new Map<string, { total: number; count: number; date: string }>();
      convData?.forEach((event) => {
        const current = convMap.get(event.conversation_id!) || { total: 0, count: 0, date: event.created_at };
        convMap.set(event.conversation_id!, {
          total: current.total + (event.cost || 0),
          count: current.count + 1,
          date: current.date,
        });
      });

      const conversations = Array.from(convMap.entries()).map(([id, data]) => ({
        conversation_id: id,
        total_cost: data.total,
        model_count: data.count,
        created_at: data.date,
      }));

      setConversationCosts(conversations.sort((a, b) => b.total_cost - a.total_cost).slice(0, 50));
    } catch (error) {
      console.error("Failed to fetch cost breakdown:", error);
      toast.error("Failed to load cost data");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let csv = "COST BREAKDOWN REPORT\n\n";
    
    csv += "PER-MODEL COSTS\n";
    csv += "Model Name,Total Cost,Total Calls,Avg Cost\n";
    modelCosts.forEach(m => {
      csv += `${m.model_name},${m.total_cost.toFixed(6)},${m.total_calls},${m.avg_cost.toFixed(6)}\n`;
    });
    
    csv += "\n\nPER-USER COSTS\n";
    csv += "User ID,Total Cost,Total Audits,Avg Cost\n";
    userCosts.forEach(u => {
      csv += `${u.user_id},${u.total_cost.toFixed(6)},${u.total_audits},${u.avg_cost.toFixed(6)}\n`;
    });
    
    csv += "\n\nPER-CONVERSATION COSTS\n";
    csv += "Conversation ID,Total Cost,Model Count,Date\n";
    conversationCosts.forEach(c => {
      csv += `${c.conversation_id},${c.total_cost.toFixed(6)},${c.model_count},${new Date(c.created_at).toLocaleDateString()}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-breakdown-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Cost Breakdown Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Per-Model Costs
    doc.setFontSize(14);
    doc.text("Per-Model Costs", 14, 40);
    (doc as any).autoTable({
      startY: 45,
      head: [["Model Name", "Total Cost", "Total Calls", "Avg Cost"]],
      body: modelCosts.map(m => [
        m.model_name,
        `$${m.total_cost.toFixed(6)}`,
        m.total_calls.toString(),
        `$${m.avg_cost.toFixed(6)}`
      ]),
    });

    // Per-User Costs
    const finalY1 = (doc as any).lastAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.text("Per-User Costs", 14, finalY1 + 15);
    (doc as any).autoTable({
      startY: finalY1 + 20,
      head: [["User ID", "Total Cost", "Total Audits", "Avg Cost"]],
      body: userCosts.slice(0, 20).map(u => [
        u.user_id.substring(0, 8) + "...",
        `$${u.total_cost.toFixed(6)}`,
        u.total_audits.toString(),
        `$${u.avg_cost.toFixed(6)}`
      ]),
    });

    // Per-Conversation Costs
    const finalY2 = (doc as any).lastAutoTable.finalY || 45;
    if (finalY2 < 250) {
      doc.setFontSize(14);
      doc.text("Per-Conversation Costs (Top 20)", 14, finalY2 + 15);
      (doc as any).autoTable({
        startY: finalY2 + 20,
        head: [["Conversation ID", "Total Cost", "Models", "Date"]],
        body: conversationCosts.slice(0, 20).map(c => [
          c.conversation_id.substring(0, 8) + "...",
          `$${c.total_cost.toFixed(6)}`,
          c.model_count.toString(),
          new Date(c.created_at).toLocaleDateString()
        ]),
      });
    }

    doc.save(`cost-breakdown-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        <Button onClick={exportToPDF} variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-Model Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model Name</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Total Calls</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelCosts.map((model) => (
                <TableRow key={model.model_name}>
                  <TableCell className="font-mono text-sm">{model.model_name}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${model.total_cost.toFixed(6)}
                  </TableCell>
                  <TableCell className="text-right">{model.total_calls}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ${model.avg_cost.toFixed(6)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-User Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Total Audits</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userCosts.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-mono text-xs">{user.user_id}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${user.total_cost.toFixed(6)}
                  </TableCell>
                  <TableCell className="text-right">{user.total_audits}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ${user.avg_cost.toFixed(6)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-Conversation Costs (Top 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conversation ID</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Models Used</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversationCosts.map((conv) => (
                <TableRow key={conv.conversation_id}>
                  <TableCell className="font-mono text-xs">{conv.conversation_id}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${conv.total_cost.toFixed(6)}
                  </TableCell>
                  <TableCell className="text-right">{conv.model_count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}