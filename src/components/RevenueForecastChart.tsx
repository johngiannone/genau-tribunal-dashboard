import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, subDays, addDays, startOfDay, differenceInDays } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  created_at: string;
  transaction_type: string;
}

interface ChartDataPoint {
  date: string;
  actual?: number;
  forecast?: number;
  type: 'historical' | 'forecast';
}

export const RevenueForecastChart = () => {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['revenue-forecast-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_transactions')
        .select('id, amount, created_at, transaction_type')
        .gte('created_at', subDays(new Date(), 90).toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const calculateForecast = () => {
    if (!transactions || transactions.length === 0) return { chartData: [], metrics: null };

    // Filter credit transactions only (revenue)
    const creditTransactions = transactions.filter(t => t.amount > 0);

    // Group transactions by day
    const dailyRevenue = new Map<string, number>();
    creditTransactions.forEach(t => {
      const dateKey = format(startOfDay(new Date(t.created_at)), 'yyyy-MM-dd');
      dailyRevenue.set(dateKey, (dailyRevenue.get(dateKey) || 0) + t.amount);
    });

    // Get last 60 days of historical data
    const historicalDays = 60;
    const forecastDays = 30;
    const startDate = subDays(new Date(), historicalDays);
    
    // Build historical data points
    const chartData: ChartDataPoint[] = [];
    let totalHistoricalRevenue = 0;
    
    for (let i = 0; i < historicalDays; i++) {
      const date = addDays(startDate, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const revenue = dailyRevenue.get(dateKey) || 0;
      totalHistoricalRevenue += revenue;
      
      chartData.push({
        date: format(date, 'MMM d'),
        actual: revenue,
        type: 'historical'
      });
    }

    // Calculate growth rate (comparing last 30 days vs previous 30 days)
    const recentPeriodRevenue = Array.from(dailyRevenue.entries())
      .filter(([date]) => differenceInDays(new Date(), new Date(date)) <= 30)
      .reduce((sum, [_, amount]) => sum + amount, 0);
    
    const previousPeriodRevenue = Array.from(dailyRevenue.entries())
      .filter(([date]) => {
        const diff = differenceInDays(new Date(), new Date(date));
        return diff > 30 && diff <= 60;
      })
      .reduce((sum, [_, amount]) => sum + amount, 0);

    const growthRate = previousPeriodRevenue > 0 
      ? (recentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue 
      : 0.1; // Default 10% growth if no previous data

    // Calculate average daily revenue for recent period
    const avgDailyRevenue = recentPeriodRevenue / 30;

    // Generate forecast using compound growth
    let forecastedRevenue = avgDailyRevenue;
    const dailyGrowthRate = Math.pow(1 + growthRate, 1 / 30); // Convert monthly growth to daily

    for (let i = 1; i <= forecastDays; i++) {
      const date = addDays(new Date(), i);
      forecastedRevenue *= dailyGrowthRate;
      
      chartData.push({
        date: format(date, 'MMM d'),
        forecast: forecastedRevenue,
        type: 'forecast'
      });
    }

    const totalForecastedRevenue = forecastDays * forecastedRevenue * (dailyGrowthRate - 1) / Math.log(dailyGrowthRate);
    
    return {
      chartData,
      metrics: {
        avgDailyRevenue,
        growthRate: growthRate * 100,
        projectedMonthlyRevenue: totalForecastedRevenue,
        historicalRevenue: totalHistoricalRevenue
      }
    };
  };

  const { chartData, metrics } = calculateForecast();

  if (isLoading) {
    return (
      <Card className="border-[#E5E5EA]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#111111]">Revenue Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[#86868B]">Loading forecast...</div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || chartData.length === 0) {
    return (
      <Card className="border-[#E5E5EA]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#111111]">Revenue Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[#86868B]">Not enough data for forecasting</div>
        </CardContent>
      </Card>
    );
  }

  const isGrowthPositive = metrics.growthRate > 0;

  return (
    <Card className="border-[#E5E5EA]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#111111]">
              Revenue Forecast (Next 30 Days)
            </CardTitle>
            <CardDescription>
              Predictive analytics based on last 60 days of transaction history
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isGrowthPositive ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${isGrowthPositive ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.growthRate.toFixed(1)}% {isGrowthPositive ? 'Growth' : 'Decline'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-[#E5E5EA]">
            <p className="text-xs text-[#86868B] font-medium">Avg Daily Revenue</p>
            <p className="text-2xl font-bold text-[#111111]">${metrics.avgDailyRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-[#E5E5EA]">
            <p className="text-xs text-[#86868B] font-medium">Historical (60d)</p>
            <p className="text-2xl font-bold text-[#111111]">${metrics.historicalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 font-medium">Projected (30d)</p>
            <p className="text-2xl font-bold text-blue-600">${metrics.projectedMonthlyRevenue.toFixed(2)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
            <XAxis 
              dataKey="date" 
              stroke="#86868B"
              tick={{ fontSize: 11 }}
              interval={9}
            />
            <YAxis 
              stroke="#86868B"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #E5E5EA',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
              labelStyle={{ color: '#111111', fontWeight: 600 }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            <ReferenceLine 
              x={chartData.find(d => d.type === 'forecast')?.date} 
              stroke="#0071E3" 
              strokeDasharray="3 3"
              label={{ value: 'Today', position: 'top', fill: '#0071E3', fontSize: 12 }}
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#111111" 
              strokeWidth={2}
              dot={false}
              name="Actual Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="forecast" 
              stroke="#0071E3" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Forecasted Revenue"
            />
          </LineChart>
        </ResponsiveContainer>

        <p className="text-xs text-[#86868B] mt-4 text-center">
          Forecast uses compound growth rate calculated from recent transaction trends. 
          Actual results may vary based on market conditions and user behavior.
        </p>
      </CardContent>
    </Card>
  );
};
