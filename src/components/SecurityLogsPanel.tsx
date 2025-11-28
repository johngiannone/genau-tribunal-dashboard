import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type SecurityLog = Tables<"security_logs">;

export const SecurityLogsPanel = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityLogs();
  }, []);

  const fetchSecurityLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("security_logs")
      .select("*")
      .order("flagged_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch security logs:", error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const getCategoryBadgeColor = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("violence") || lowerCategory.includes("hate")) {
      return "destructive";
    }
    if (lowerCategory.includes("sexual")) {
      return "secondary";
    }
    return "default";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Violations
          </CardTitle>
          <CardDescription>Loading security logs...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Violations
        </CardTitle>
        <CardDescription>
          Content flagged by OpenAI moderation. {logs.length} violations detected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No security violations detected</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Flagged Categories</TableHead>
                  <TableHead>Prompt Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {formatDistanceToNow(new Date(log.flagged_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {log.flag_category.split(", ").map((cat) => (
                          <Badge
                            key={cat}
                            variant={getCategoryBadgeColor(cat) as any}
                            className="text-xs"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm truncate text-muted-foreground">
                        {log.prompt.substring(0, 100)}
                        {log.prompt.length > 100 && "..."}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
