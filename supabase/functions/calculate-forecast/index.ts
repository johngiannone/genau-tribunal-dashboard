import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("=== Cost Forecast Calculation Started ===")
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all users with budget limits
    const { data: users, error: usersError } = await supabase
      .from('user_usage')
      .select('user_id, monthly_budget_limit')
      .not('monthly_budget_limit', 'is', null)

    if (usersError) {
      throw usersError
    }

    console.log(`Checking forecasts for ${users?.length || 0} users with budget limits`)

    const forecasts = []
    const alerts = []

    for (const user of users || []) {
      const budgetLimit = user.monthly_budget_limit
      
      if (!budgetLimit || budgetLimit <= 0) continue

      // Get current month's cost data
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const daysInMonth = monthEnd.getDate()
      const currentDay = now.getDate()
      const remainingDays = daysInMonth - currentDay

      // Fetch this month's activity logs with cost data
      const { data: logs, error: logsError } = await supabase
        .from('activity_logs')
        .select('metadata, created_at')
        .eq('user_id', user.user_id)
        .eq('activity_type', 'audit_completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', now.toISOString())

      if (logsError) {
        console.error(`Error fetching logs for user ${user.user_id}:`, logsError)
        continue
      }

      // Calculate current spending
      const currentSpend = (logs || []).reduce((sum, log) => {
        const cost = (log.metadata as any)?.estimated_cost || 0
        return sum + cost
      }, 0)

      const auditCount = logs?.length || 0
      
      // Calculate daily average and project
      const dailyAverage = auditCount > 0 ? currentSpend / currentDay : 0
      const projectedMonthlySpend = currentSpend + (dailyAverage * remainingDays)
      
      // Calculate trend (comparing to previous days)
      const midMonth = Math.floor(currentDay / 2)
      const recentLogs = (logs || []).filter(log => {
        const logDate = new Date(log.created_at)
        return logDate.getDate() > midMonth
      })
      
      const recentSpend = recentLogs.reduce((sum, log) => {
        const cost = (log.metadata as any)?.estimated_cost || 0
        return sum + cost
      }, 0)
      
      const recentDays = currentDay - midMonth
      const recentDailyAverage = recentDays > 0 ? recentSpend / recentDays : dailyAverage
      const trend = dailyAverage > 0 ? ((recentDailyAverage - dailyAverage) / dailyAverage) * 100 : 0

      const forecast = {
        userId: user.user_id,
        currentSpend,
        dailyAverage,
        projectedMonthlySpend,
        budgetLimit,
        percentOfBudget: (projectedMonthlySpend / budgetLimit) * 100,
        remainingBudget: budgetLimit - projectedMonthlySpend,
        daysRemaining: remainingDays,
        trend,
        auditCount
      }

      forecasts.push(forecast)

      console.log(`User ${user.user_id}: Projected $${projectedMonthlySpend.toFixed(4)} vs Budget $${budgetLimit} (${forecast.percentOfBudget.toFixed(1)}%)`)

      // Create alert if projected spending exceeds 80% of budget
      if (projectedMonthlySpend > budgetLimit * 0.8) {
        // Check if we already alerted this month
        const { data: existingAlert } = await supabase
          .from('cost_alerts')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('alert_type', 'budget_forecast')
          .gte('created_at', monthStart.toISOString())
          .maybeSingle()

        if (!existingAlert) {
          console.log(`Creating budget forecast alert for user ${user.user_id}`)
          
          const { data: newAlert, error: alertError } = await supabase
            .from('cost_alerts')
            .insert({
              user_id: user.user_id,
              alert_type: 'budget_forecast',
              estimated_cost: projectedMonthlySpend,
              threshold: budgetLimit
            })
            .select()
            .single()

          if (alertError) {
            console.error(`Failed to create alert:`, alertError)
          } else {
            alerts.push(newAlert)
            
            // Send email notification
            await supabase.functions.invoke('send-cost-alert', {
              body: {
                userId: user.user_id,
                alertType: 'budget_forecast',
                estimatedCost: projectedMonthlySpend,
                threshold: budgetLimit
              }
            })
          }
        }
      }
    }

    console.log(`=== Forecast Complete: ${forecasts.length} users analyzed, ${alerts.length} new alerts ===`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        forecasts,
        alertsCreated: alerts.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error: any) {
    console.error("Error in calculate-forecast function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    )
  }
})