import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Mail, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { isDisposableEmail } from "@/lib/disposableEmailDomains";

interface BlockedAttempt {
  email: string;
  timestamp: string;
  count: number;
}

export function DisposableEmailStatsPanel() {
  const [blockedAttempts, setBlockedAttempts] = useState<BlockedAttempt[]>([]);
  const [totalBlocked, setTotalBlocked] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisposableEmailStats();
  }, []);

  const fetchDisposableEmailStats = async () => {
    try {
      setLoading(true);

      // Since we don't log disposable email blocks to activity_logs yet,
      // we'll show a placeholder message
      // In the future, we can add logging when email validation fails
      
      setBlockedAttempts([]);
      setTotalBlocked(0);

    } catch (error) {
      console.error('Error fetching disposable email stats:', error);
      toast.error('Failed to load disposable email statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading disposable email statistics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#0071E3]" />
              Disposable Email Protection
            </CardTitle>
            <CardDescription>
              Disposable email protection is active - signup attempts from temporary email providers are automatically blocked
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {totalBlocked} Blocked
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {blockedAttempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-green-600 mb-4" />
            <p className="text-lg font-medium text-green-800">
              ✓ Disposable Email Protection Active
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Over 1,000 temporary email domains are blocked from signup
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Protected domains include: temp-mail.org, guerrillamail.com, mailinator.com, and many more
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-[#E5E5EA]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Protected Domains
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#1D1D1F]">
                    1,000+
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E5E5EA]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Common Blocked Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs">
                    <div>• temp-mail.org</div>
                    <div>• guerrillamail.com</div>
                    <div>• mailinator.com</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info Panel */}
            <Card className="border-[#E5E5EA] bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">How It Works</h4>
                    <p className="text-sm text-blue-800">
                      When users attempt to sign up, their email domain is checked against a curated list of over 1,000 known disposable email services. 
                      If a match is found, the signup is blocked client-side before any account is created.
                    </p>
                    <p className="text-sm text-blue-800 mt-2">
                      This prevents spam accounts, protects your user base quality, and reduces abuse from temporary email services.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
