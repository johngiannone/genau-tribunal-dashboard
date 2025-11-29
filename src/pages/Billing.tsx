import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, AlertCircle, CreditCard } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

interface BillingData {
  credit_balance: number;
  auto_recharge_enabled: boolean;
  auto_recharge_threshold: number;
  auto_recharge_amount: number;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  balance_after: number;
  model_used: string | null;
  created_at: string;
}

interface DailySpend {
  date: string;
  amount: number;
}

interface AutoRechargeAttempt {
  id: string;
  amount: number;
  status: string;
  triggered_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export default function Billing() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rechargeAttempts, setRechargeAttempts] = useState<AutoRechargeAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [autoRechargeThreshold, setAutoRechargeThreshold] = useState('20');
  const [autoRechargeAmount, setAutoRechargeAmount] = useState('100');

  useEffect(() => {
    fetchBillingData();
    
    // Check for purchase result in URL params
    const params = new URLSearchParams(window.location.search);
    const purchaseStatus = params.get('purchase');
    const amount = params.get('amount');
    
    if (purchaseStatus === 'success' && amount) {
      toast.success(`Successfully added $${amount} in credits!`);
      // Clear URL params
      window.history.replaceState({}, '', '/settings/billing');
      // Refresh billing data
      setTimeout(() => fetchBillingData(), 1000);
    } else if (purchaseStatus === 'cancelled') {
      toast.error('Credit purchase was cancelled');
      window.history.replaceState({}, '', '/settings/billing');
    }
  }, []);

  const fetchBillingData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch billing info
    const { data: billingData, error: billingError } = await supabase
      .from('organization_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (billingError && billingError.code !== 'PGRST116') {
      console.error("Error fetching billing:", billingError);
      toast.error("Failed to load billing data");
    } else if (billingData) {
      setBilling(billingData);
      setAutoRechargeEnabled(billingData.auto_recharge_enabled);
      setAutoRechargeThreshold(billingData.auto_recharge_threshold.toString());
      setAutoRechargeAmount(billingData.auto_recharge_amount.toString());
    }

    // Fetch transactions
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('billing_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
    } else {
      setTransactions(transactionsData || []);
    }

    // Fetch auto-recharge attempts
    const { data: attemptsData, error: attemptsError } = await supabase
      .from('auto_recharge_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('triggered_at', { ascending: false })
      .limit(20);

    if (attemptsError) {
      console.error("Error fetching recharge attempts:", attemptsError);
    } else {
      setRechargeAttempts(attemptsData || []);
    }

    setLoading(false);
  };

  const handleUpdateAutoRecharge = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUpdating(true);
    
    const { error } = await supabase
      .from('organization_billing')
      .update({
        auto_recharge_enabled: autoRechargeEnabled,
        auto_recharge_threshold: parseFloat(autoRechargeThreshold),
        auto_recharge_amount: parseFloat(autoRechargeAmount)
      })
      .eq('user_id', user.id);

    setUpdating(false);

    if (error) {
      toast.error("Failed to update auto-recharge settings");
      console.error(error);
    } else {
      toast.success("Auto-recharge settings updated");
      fetchBillingData();
    }
  };

  const handlePurchaseCredits = async (amount: number) => {
    setCheckoutLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { amount }
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to create checkout session');
        return;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to initiate checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Calculate daily spend for last 30 days
  const dailySpendData: DailySpend[] = React.useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return format(date, 'MMM dd');
    });

    const spendByDate = transactions
      .filter(t => t.transaction_type === 'credit_deducted')
      .reduce((acc, t) => {
        const date = format(new Date(t.created_at), 'MMM dd');
        acc[date] = (acc[date] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return last30Days.map(date => ({
      date,
      amount: spendByDate[date] || 0
    }));
  }, [transactions]);

  // Calculate model breakdown
  const modelBreakdown = React.useMemo(() => {
    const breakdown = transactions
      .filter(t => t.transaction_type === 'credit_deducted' && t.model_used)
      .reduce((acc, t) => {
        const model = t.model_used || 'Unknown';
        acc[model] = (acc[model] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(breakdown)
      .map(([model, amount]) => ({ model, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalSpend = transactions
    .filter(t => t.transaction_type === 'credit_deducted')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Enterprise Billing</h1>
          <p className="text-gray-500 mt-1">Manage your organization's credits and usage.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Credit Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                ${billing?.credit_balance.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-400 mt-1">Available credits</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Spend</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">${totalSpend.toFixed(2)}</div>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Auto-Recharge</CardTitle>
              <AlertCircle className={`h-4 w-4 ${billing?.auto_recharge_enabled ? 'text-green-600' : 'text-gray-400'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {billing?.auto_recharge_enabled ? 'Enabled' : 'Disabled'}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {billing?.auto_recharge_enabled 
                  ? `Add $${billing.auto_recharge_amount} at $${billing.auto_recharge_threshold}`
                  : 'Configure below'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Credits & Auto-Recharge */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Credits */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Add Credits</CardTitle>
              <CardDescription>Purchase credits via Stripe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  onClick={() => handlePurchaseCredits(50)}
                  disabled={checkoutLoading}
                >
                  <span className="text-2xl font-bold">$50</span>
                  <span className="text-xs text-gray-500">50 credits</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  onClick={() => handlePurchaseCredits(100)}
                  disabled={checkoutLoading}
                >
                  <span className="text-2xl font-bold">$100</span>
                  <span className="text-xs text-gray-500">100 credits</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  onClick={() => handlePurchaseCredits(250)}
                  disabled={checkoutLoading}
                >
                  <span className="text-2xl font-bold">$250</span>
                  <span className="text-xs text-gray-500">250 credits</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  onClick={() => handlePurchaseCredits(500)}
                  disabled={checkoutLoading}
                >
                  <span className="text-2xl font-bold">$500</span>
                  <span className="text-xs text-gray-500">500 credits</span>
                </Button>
              </div>
              {checkoutLoading && (
                <p className="text-sm text-gray-500 text-center">Redirecting to Stripe Checkout...</p>
              )}
            </CardContent>
          </Card>

          {/* Auto-Recharge Settings */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Auto-Recharge Settings</CardTitle>
              <CardDescription>Automatically add credits when balance is low</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-recharge" className="text-sm font-medium">
                  Enable Auto-Recharge
                </Label>
                <Switch
                  id="auto-recharge"
                  checked={autoRechargeEnabled}
                  onCheckedChange={setAutoRechargeEnabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="threshold" className="text-sm font-medium">
                  Recharge When Balance Falls Below
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  value={autoRechargeThreshold}
                  onChange={(e) => setAutoRechargeThreshold(e.target.value)}
                  placeholder="20.00"
                  disabled={!autoRechargeEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Recharge Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={autoRechargeAmount}
                  onChange={(e) => setAutoRechargeAmount(e.target.value)}
                  placeholder="100.00"
                  disabled={!autoRechargeEnabled}
                />
              </div>

              <Button 
                onClick={handleUpdateAutoRecharge} 
                disabled={updating}
                className="w-full"
              >
                {updating ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Usage Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Daily Spend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySpendData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }} 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spend']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {dailySpendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Breakdown by Model */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cost Breakdown by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-400 py-8">
                      No usage data yet
                    </TableCell>
                  </TableRow>
                ) : (
                  modelBreakdown.map((item) => (
                    <TableRow key={item.model}>
                      <TableCell className="font-medium">{item.model}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.amount.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {((item.amount / totalSpend) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.slice(0, 20).map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm">
                        {format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          txn.transaction_type === 'credit_added' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {txn.transaction_type.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {txn.description || '-'}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${
                        txn.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount > 0 ? '$' : '-$'}
                        {Math.abs(txn.amount).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-700">
                        ${txn.balance_after.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Auto-Recharge History */}
        {rechargeAttempts.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Auto-Recharge History</CardTitle>
              <CardDescription>Automatic credit top-up attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Triggered</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rechargeAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="text-sm">
                        {format(new Date(attempt.triggered_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-green-600">
                        ${attempt.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          attempt.status === 'completed' 
                            ? 'bg-green-100 text-green-700'
                            : attempt.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {attempt.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {attempt.completed_at 
                          ? format(new Date(attempt.completed_at), 'MMM dd, HH:mm')
                          : attempt.error_message || 'In progress...'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
