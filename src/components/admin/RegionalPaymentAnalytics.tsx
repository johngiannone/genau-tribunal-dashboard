import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, Globe, TrendingUp, Users, Download, FileText } from 'lucide-react';
import { exportRegionalDataToCSV, exportRegionalDataToPDF } from '@/lib/regionalAnalyticsExport';
import { toast } from 'sonner';

interface RegionalData {
  country: string;
  currency: string;
  totalRevenue: number;
  transactionCount: number;
  userCount: number;
}

interface CurrencyData {
  currency: string;
  amount: number;
  count: number;
}

const COLORS = ['#0071E3', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#AF52DE'];
const FLAG_EMOJIS: Record<string, string> = {
  'US': '🇺🇸',
  'GB': '🇬🇧',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'IT': '🇮🇹',
  'ES': '🇪🇸',
  'CA': '🇨🇦',
  'AU': '🇦🇺',
  'NL': '🇳🇱',
  'BE': '🇧🇪',
  'CH': '🇨🇭',
  'AT': '🇦🇹',
  'SE': '🇸🇪',
  'NO': '🇳🇴',
  'DK': '🇩🇰',
  'FI': '🇫🇮',
  'IE': '🇮🇪',
  'PT': '🇵🇹',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
};

export default function RegionalPaymentAnalytics() {
  const [loading, setLoading] = useState(true);
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [exporting, setExporting] = useState(false);
  
  const currencyChartRef = useRef<HTMLDivElement>(null);
  const countryChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRegionalAnalytics();
  }, []);

  const fetchRegionalAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all billing transactions with metadata containing country
      const { data: transactions, error: transactionsError } = await supabase
        .from('billing_transactions')
        .select('user_id, amount, metadata, created_at')
        .eq('transaction_type', 'credit_added')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch activity logs to get country data for users
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('user_id, metadata')
        .not('metadata->country', 'is', null)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Create a map of user_id to country (most recent)
      const userCountryMap = new Map<string, string>();
      activities?.forEach(activity => {
        const metadata = activity.metadata as any;
        const country = metadata?.country;
        if (country && !userCountryMap.has(activity.user_id)) {
          userCountryMap.set(activity.user_id, country);
        }
      });

      // Aggregate transactions by country
      const countryMap = new Map<string, { revenue: number; count: number; currency: string; users: Set<string> }>();
      const currencyMap = new Map<string, { amount: number; count: number }>();
      let totalRev = 0;

      transactions?.forEach(transaction => {
        const metadata = transaction.metadata as any;
        const country = metadata?.country || userCountryMap.get(transaction.user_id) || 'Unknown';
        const currency = (metadata?.currency as string)?.toUpperCase() || 'USD';
        const amount = transaction.amount;

        totalRev += amount;

        // Aggregate by country
        if (!countryMap.has(country)) {
          countryMap.set(country, { revenue: 0, count: 0, currency, users: new Set() });
        }
        const countryStats = countryMap.get(country)!;
        countryStats.revenue += amount;
        countryStats.count += 1;
        countryStats.users.add(transaction.user_id);

        // Aggregate by currency
        if (!currencyMap.has(currency)) {
          currencyMap.set(currency, { amount: 0, count: 0 });
        }
        const currencyStats = currencyMap.get(currency)!;
        currencyStats.amount += amount;
        currencyStats.count += 1;
      });

      // Convert maps to arrays
      const regional: RegionalData[] = Array.from(countryMap.entries())
        .map(([country, stats]) => ({
          country,
          currency: stats.currency,
          totalRevenue: stats.revenue,
          transactionCount: stats.count,
          userCount: stats.users.size,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10); // Top 10 countries

      const currencies: CurrencyData[] = Array.from(currencyMap.entries())
        .map(([currency, stats]) => ({
          currency,
          amount: stats.amount,
          count: stats.count,
        }))
        .sort((a, b) => b.amount - a.amount);

      setRegionalData(regional);
      setCurrencyData(currencies);
      setTotalRevenue(totalRev);
      setTotalTransactions(transactions?.length || 0);

    } catch (error) {
      console.error('Error fetching regional analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const calculateConversionRate = (transactionCount: number, userCount: number) => {
    if (userCount === 0) return 0;
    return ((transactionCount / userCount) * 100).toFixed(1);
  };

  const handleExportCSV = () => {
    try {
      exportRegionalDataToCSV(regionalData, currencyData, totalRevenue, totalTransactions);
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      toast.info('Generating PDF report...');
      await exportRegionalDataToPDF(
        regionalData,
        currencyData,
        totalRevenue,
        totalTransactions,
        currencyChartRef.current,
        countryChartRef.current
      );
      toast.success('PDF report generated successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with export buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Regional Payment Analytics</h2>
          <p className="text-muted-foreground">Transaction breakdown by country and currency</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            disabled={loading || regionalData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="default"
            size="sm"
            disabled={loading || regionalData.length === 0 || exporting}
          >
            <FileText className="h-4 w-4 mr-2" />
            {exporting ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All regions combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Credit purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Regions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regionalData.length}</div>
            <p className="text-xs text-muted-foreground">Countries with purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currency Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={currencyChartRef}>
              <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={currencyData}
                  dataKey="amount"
                  nameKey="currency"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.currency}: ${formatCurrency(entry.amount, entry.currency)}`}
                >
                  {currencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Countries Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Countries by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={countryChartRef}>
              <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regionalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="country" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => FLAG_EMOJIS[value] || value}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  labelFormatter={(label) => `${FLAG_EMOJIS[label] || ''} ${label}`}
                />
                <Bar dataKey="totalRevenue" fill="#0071E3" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Country</th>
                  <th className="text-left p-2 font-medium">Currency</th>
                  <th className="text-right p-2 font-medium">Revenue</th>
                  <th className="text-right p-2 font-medium">Transactions</th>
                  <th className="text-right p-2 font-medium">Unique Users</th>
                  <th className="text-right p-2 font-medium">Avg Transaction</th>
                  <th className="text-right p-2 font-medium">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {regionalData.map((region, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <span className="text-lg mr-2">{FLAG_EMOJIS[region.country] || '🌍'}</span>
                      {region.country}
                    </td>
                    <td className="p-2">{region.currency}</td>
                    <td className="text-right p-2 font-mono">
                      {formatCurrency(region.totalRevenue, region.currency)}
                    </td>
                    <td className="text-right p-2">{region.transactionCount}</td>
                    <td className="text-right p-2">{region.userCount}</td>
                    <td className="text-right p-2 font-mono">
                      {formatCurrency(region.totalRevenue / region.transactionCount, region.currency)}
                    </td>
                    <td className="text-right p-2">
                      {calculateConversionRate(region.transactionCount, region.userCount)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
