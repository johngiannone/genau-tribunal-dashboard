import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, DollarSign, RefreshCw, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ForecastData {
  userId: string;
  currentSpend: number;
  dailyAverage: number;
  projectedMonthlySpend: number;
  budgetLimit: number;
  percentOfBudget: number;
  remainingBudget: number;
  daysRemaining: number;
  trend: number;
  auditCount: number;
}

export const CostForecastPanel = () => {
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    calculateForecasts();
  }, []);

  const calculateForecasts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-forecast');

      if (error) throw error;

      const forecastData = data.forecasts || [];
      setForecasts(forecastData);

      // Generate chart data for visualization
      if (forecastData.length > 0) {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();

        const points = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const totalProjected = forecastData.reduce((sum, f) => {
            if (day <= currentDay) {
              // Actual data (proportional)
              return sum + (f.currentSpend * (day / currentDay));
            } else {
              // Projected data
              const projectedDaily = f.dailyAverage;
              const actualSoFar = f.currentSpend;
              const projectedRemaining = projectedDaily * (day - currentDay);
              return sum + actualSoFar + projectedRemaining;
            }
          }, 0);

          const totalBudget = forecastData.reduce((sum, f) => sum + f.budgetLimit, 0);

          points.push({
            day,
            actual: day <= currentDay ? totalProjected : null,
            projected: day > currentDay ? totalProjected : null,
            budget: totalBudget,
            isToday: day === currentDay
          });
        }

        setChartData(points);
      }

      if (data.alertsCreated > 0) {
        toast.warning(`${data.alertsCreated} budget forecast alert(s) created`);
      }
    } catch (error) {
      console.error('Error calculating forecasts:', error);
      toast.error("Failed to calculate cost forecasts");
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return "text-red-600";
    if (trend < -5) return "text-green-600";
    return "text-gray-600";
  };

  const getStatusColor = (percent: number) => {
    if (percent >= 100) return "text-red-600";
    if (percent >= 80) return "text-orange-600";
    return "text-green-600";
  };

  const totalCurrentSpend = forecasts.reduce((sum, f) => sum + f.currentSpend, 0);
  const totalProjected = forecasts.reduce((sum, f) => sum + f.projectedMonthlySpend, 0);
  const totalBudget = forecasts.reduce((sum, f) => sum + f.budgetLimit, 0);
  const overallPercent = totalBudget > 0 ? (totalProjected / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-[#0071E3]" />
              <div>
                <CardTitle>Cost Forecast</CardTitle>
                <CardDescription>
                  Monthly spending projections based on current usage patterns
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={calculateForecasts}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Spend</p>
              <p className="text-2xl font-bold">${totalCurrentSpend.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Projected Total</p>
              <p className={`text-2xl font-bold ${getStatusColor(overallPercent)}`}>
                ${totalProjected.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Budget Limit</p>
              <p className="text-2xl font-bold">${totalBudget.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Budget Usage</p>
              <p className={`text-2xl font-bold ${getStatusColor(overallPercent)}`}>
                {overallPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={Math.min(overallPercent, 100)} className="h-3" />
            {overallPercent >= 80 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {overallPercent >= 100 
                    ? 'Projected to exceed budget'
                    : 'Approaching budget limit'}
                </span>
              </div>
            )}
          </div>

          {/* Forecast Chart */}
          {chartData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => `$${value.toFixed(4)}`}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#0071E3" 
                    fill="#0071E3" 
                    fillOpacity={0.6}
                    name="Actual"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#86868B" 
                    fill="#86868B" 
                    fillOpacity={0.3}
                    strokeDasharray="5 5"
                    name="Projected"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="budget" 
                    stroke="#dc2626" 
                    fill="none" 
                    strokeDasharray="3 3"
                    name="Budget Limit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-User Forecasts */}
      <Card>
        <CardHeader>
          <CardTitle>User Forecasts</CardTitle>
          <CardDescription>
            Individual spending projections and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forecasts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users with budget limits configured
            </div>
          ) : (
            <div className="space-y-4">
              {forecasts.map((forecast) => (
                <div
                  key={forecast.userId}
                  className="flex items-center gap-4 p-4 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">
                        {forecast.userId.slice(0, 8)}...
                      </span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(forecast.trend)}
                        <span className={`text-sm font-semibold ${getTrendColor(forecast.trend)}`}>
                          {forecast.trend > 0 ? '+' : ''}{forecast.trend.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current:</span>{' '}
                        <span className="font-semibold">${forecast.currentSpend.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Daily Avg:</span>{' '}
                        <span className="font-semibold">${forecast.dailyAverage.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Projected:</span>{' '}
                        <span className={`font-semibold ${getStatusColor(forecast.percentOfBudget)}`}>
                          ${forecast.projectedMonthlySpend.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget:</span>{' '}
                        <span className="font-semibold">${forecast.budgetLimit.toFixed(2)}</span>
                      </div>
                      <div>
                        <Badge variant={forecast.percentOfBudget >= 100 ? "destructive" : forecast.percentOfBudget >= 80 ? "default" : "secondary"}>
                          {forecast.percentOfBudget.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>

                    <Progress 
                      value={Math.min(forecast.percentOfBudget, 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};