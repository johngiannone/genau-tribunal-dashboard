import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  DollarSign,
  Shield,
  TrendingUp,
  CreditCard,
  MapPin,
  Clock,
  Monitor,
  Ban,
  RefreshCw,
  UserCog,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LoginMapWidget } from "@/components/LoginMapWidget";

interface AdminUserDetailProps {
  userId: string | null;
  userEmail: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StripeCustomer {
  hasStripeCustomer: boolean;
  stripeCustomerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: any;
  lifetimeValue?: number;
  currentPlan?: {
    id: string;
    status: string;
    amount: number;
    interval: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  };
  paymentMethod?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  totalInvoices?: number;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
}

interface IPLocation {
  city: string;
  country: string;
  countryCode: string | null;
  lat?: number;
  lon?: number;
}

interface UsageData {
  date: string;
  audits: number;
}

export function AdminUserDetail({ userId, userEmail, open, onOpenChange }: AdminUserDetailProps) {
  const [loading, setLoading] = useState(false);
  const [stripeData, setStripeData] = useState<StripeCustomer | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [userUsage, setUserUsage] = useState<any>(null);
  const [riskScore, setRiskScore] = useState(0);
  const [ipLocations, setIpLocations] = useState<Map<string, IPLocation>>(new Map());
  const [anomalousLogins, setAnomalousLogins] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    }
  }, [open, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch Stripe customer data
      const { data: stripeResponse, error: stripeError } = await supabase.functions.invoke(
        'get-stripe-customer',
        { body: { userId } }
      );

      if (stripeError) {
        console.error('Error fetching Stripe data:', stripeError);
      } else {
        setStripeData(stripeResponse);
      }

      // Fetch activity logs
      const { data: logs, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) {
        console.error('Error fetching activity logs:', logsError);
      } else {
        setActivityLogs(logs || []);
        
        // Calculate risk score based on failed logins and unauthorized access
        const failedLogins = logs?.filter(log => 
          log.description?.toLowerCase().includes('failed') || 
          log.activity_type === 'unauthorized_access'
        ).length || 0;
        
        setRiskScore(Math.min(failedLogins * 10, 100));

        // Fetch IP geolocation for unique IPs
        const uniqueIps = [...new Set(logs?.map(log => log.ip_address).filter(Boolean) as string[])];
        const locationPromises = uniqueIps.map(async (ip) => {
          try {
            const { data, error } = await supabase.functions.invoke('get-ip-location', {
              body: { ip }
            });
            if (!error && data) {
              return { ip, location: data };
            }
          } catch (err) {
            console.error(`Failed to fetch location for ${ip}:`, err);
          }
          return { ip, location: { city: 'Unknown', country: 'Unknown', countryCode: null } };
        });

        const locations = await Promise.all(locationPromises);
        const locationsMap = new Map(locations.map(({ ip, location }) => [ip, location]));
        setIpLocations(locationsMap);

        // Detect anomalous logins based on typical patterns
        detectAnomalousLogins(logs || [], locationsMap);
      }

      // Fetch user usage data
      const { data: usage, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (usageError) {
        console.error('Error fetching user usage:', usageError);
      } else {
        setUserUsage(usage);
      }

      // Fetch usage chart data (last 30 days from training_dataset)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: auditData, error: auditError } = await supabase
        .from('training_dataset')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (auditError) {
        console.error('Error fetching audit data:', auditError);
      } else {
        // Group audits by date
        const groupedData: { [key: string]: number } = {};
        auditData?.forEach(audit => {
          const date = new Date(audit.created_at).toLocaleDateString();
          groupedData[date] = (groupedData[date] || 0) + 1;
        });

        const chartData = Object.entries(groupedData).map(([date, audits]) => ({
          date,
          audits,
        }));

        setUsageData(chartData);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('user_usage')
        .update({ is_banned: true, banned_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('User banned successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const getRiskBadgeColor = () => {
    if (riskScore < 30) return 'bg-green-500';
    if (riskScore < 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLoginHistory = () => {
    return activityLogs
      .filter(log => log.activity_type === 'login')
      .slice(0, 5);
  };

  const detectAnomalousLogins = (logs: ActivityLog[], locations: Map<string, IPLocation>) => {
    const loginLogs = logs.filter(log => log.activity_type === 'login' && log.ip_address);
    
    if (loginLogs.length < 3) {
      // Not enough data to establish patterns
      return;
    }

    // Count frequency of each country
    const countryFrequency: Map<string, number> = new Map();
    loginLogs.forEach(log => {
      const location = locations.get(log.ip_address!);
      if (location && location.country !== 'Unknown') {
        const count = countryFrequency.get(location.country) || 0;
        countryFrequency.set(location.country, count + 1);
      }
    });

    // Find the most common country (user's typical location)
    let maxCount = 0;
    let typicalCountry = '';
    countryFrequency.forEach((count, country) => {
      if (count > maxCount) {
        maxCount = count;
        typicalCountry = country;
      }
    });

    // Mark logins from different countries as anomalous if they're infrequent
    const anomalies = new Set<string>();
    loginLogs.forEach(log => {
      const location = locations.get(log.ip_address!);
      if (location && location.country !== 'Unknown') {
        const frequency = countryFrequency.get(location.country) || 0;
        // Consider anomalous if: different country AND less than 20% of total logins
        if (location.country !== typicalCountry && frequency < loginLogs.length * 0.2) {
          anomalies.add(log.id);
        }
      }
    });

    setAnomalousLogins(anomalies);
  };

  const parseUserAgent = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';
    
    // Simple parsing - you could use a library for more accurate results
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other Browser';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl">{userEmail || 'User Details'}</SheetTitle>
              <SheetDescription>Comprehensive customer profile and insights</SheetDescription>
            </div>
            <Badge className={`${getRiskBadgeColor()} text-white`}>
              Risk Score: {riskScore}
            </Badge>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Identity Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Identity Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{stripeData?.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{userEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{stripeData?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {activityLogs[0]?.ip_address ? (
                        <>
                          {ipLocations.get(activityLogs[0].ip_address)?.city || 'Unknown'}, {ipLocations.get(activityLogs[0].ip_address)?.country || 'Unknown'}
                        </>
                      ) : 'Unknown'}
                    </p>
                  </div>
                </div>
                {stripeData?.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Address</p>
                    <p className="font-medium">
                      {[
                        stripeData.address.line1,
                        stripeData.address.city,
                        stripeData.address.state,
                        stripeData.address.postal_code,
                        stripeData.address.country,
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stripeData?.hasStripeCustomer ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <p className="font-medium">
                          {stripeData.currentPlan 
                            ? `$${stripeData.currentPlan.amount}/${stripeData.currentPlan.interval}`
                            : userUsage?.subscription_tier || 'Free'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lifetime Value</p>
                        <p className="font-medium text-green-600">
                          ${stripeData.lifetimeValue?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                    
                    {stripeData.currentPlan && (
                      <div>
                        <p className="text-sm text-muted-foreground">Next Billing Date</p>
                        <p className="font-medium">
                          {new Date(stripeData.currentPlan.currentPeriodEnd * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {stripeData.paymentMethod && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <CreditCard className="w-5 h-5" />
                        <div>
                          <p className="font-medium">
                            {stripeData.paymentMethod.brand.toUpperCase()} •••• {stripeData.paymentMethod.last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {stripeData.paymentMethod.exp_month}/{stripeData.paymentMethod.exp_year}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground">Total Invoices</p>
                      <p className="font-medium">{stripeData.totalInvoices || 0}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No Stripe customer found</p>
                )}
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Login Location Map */}
                <div>
                  <p className="font-medium mb-2">Login Locations</p>
                  <LoginMapWidget 
                    locations={getLoginHistory()
                      .filter(log => log.ip_address && ipLocations.has(log.ip_address))
                      .map(log => {
                        const location = ipLocations.get(log.ip_address!)!;
                        return {
                          lat: location.lat || 0,
                          lon: location.lon || 0,
                          city: location.city,
                          country: location.country,
                          ip: log.ip_address!,
                          timestamp: log.created_at,
                          isAnomalous: anomalousLogins.has(log.id),
                        };
                      })
                      .filter(loc => loc.lat !== 0 && loc.lon !== 0)
                    }
                  />
                </div>

                <Separator />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Last Login
                    </p>
                    <p className="font-medium">
                      {activityLogs[0]?.created_at 
                        ? new Date(activityLogs[0].created_at).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Monitor className="w-4 h-4" />
                      Device
                    </p>
                    <p className="font-medium">
                      {parseUserAgent(activityLogs[0]?.user_agent || null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Anomalies
                    </p>
                    <p className="font-medium text-orange-600">
                      {anomalousLogins.size} unusual {anomalousLogins.size === 1 ? 'login' : 'logins'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="font-medium mb-2">Login History</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getLoginHistory().map((log) => {
                        const location = log.ip_address ? ipLocations.get(log.ip_address) : null;
                        const isAnomalous = anomalousLogins.has(log.id);
                        return (
                          <TableRow key={log.id} className={isAnomalous ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
                            <TableCell className="text-sm">
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {location ? (
                                <span className="flex items-center gap-1">
                                  {location.countryCode && <span>{location.countryCode}</span>}
                                  {location.city !== 'Unknown' && `${location.city}, ${location.country}`}
                                  {location.city === 'Unknown' && location.country}
                                </span>
                              ) : (
                                'Unknown'
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{log.ip_address || 'Unknown'}</TableCell>
                            <TableCell className="text-sm">
                              {parseUserAgent(log.user_agent)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {isAnomalous ? (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Unusual
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                                  Normal
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Usage Graph */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Audit Usage (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={usageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="audits" stroke="#0071E3" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No usage data available</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Audits</p>
                    <p className="font-medium text-2xl">{userUsage?.audit_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="font-medium text-2xl">{userUsage?.audits_this_month || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="destructive" onClick={handleBanUser}>
                  <Ban className="w-4 h-4 mr-2" />
                  Ban User
                </Button>
                <Button variant="outline" disabled>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refund Last Payment
                </Button>
                <Button variant="outline" disabled>
                  <UserCog className="w-4 h-4 mr-2" />
                  Impersonate
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}