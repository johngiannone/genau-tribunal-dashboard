import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
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
    console.log("=== Chat Consensus Request Started ===")

    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error("Auth failed:", userError?.message)
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("User authenticated:", user.id)

    // Create admin client for database operations
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Check usage limits
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (usageError) {
      console.error("Usage check error:", usageError)
      return new Response(
        JSON.stringify({ error: 'Failed to check usage limits' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create usage record if it doesn't exist
    let userUsage = usage
    if (!userUsage) {
      console.log("Creating usage record for new user")
      const { data: newUsage, error: createError } = await supabase
        .from('user_usage')
        .insert({ 
          user_id: user.id, 
          audit_count: 0, 
          is_premium: false,
          audits_this_month: 0,
          files_this_month: 0,
          subscription_tier: 'free'
        })
        .select()
        .single()
      
      if (createError) {
        console.error("Failed to create usage record:", createError)
        return new Response(
          JSON.stringify({ error: 'Failed to initialize usage tracking' }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      userUsage = newUsage
    }

    // Check limits based on subscription tier
    const getMonthlyLimit = (tier: string | null) => {
      if (tier === 'pro') return 200;
      if (tier === 'max') return 800;
      if (tier === 'team') return 1500;
      if (tier === 'agency') return 5000;
      return 3; // Free tier
    };

    const monthlyLimit = getMonthlyLimit(userUsage.subscription_tier);
    const auditsUsed = userUsage.audits_this_month || 0;

    if (!userUsage.is_premium && auditsUsed >= monthlyLimit) {
      return new Response(
        JSON.stringify({ 
          error: 'Usage limit reached',
          limitReached: true,
          message: `You have reached your monthly limit of ${monthlyLimit} audits.`
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Parse request
    const { prompt, fileUrl, conversationId, councilConfig } = await req.json()
    console.log("Prompt:", prompt?.substring(0, 100))
    console.log("File URL provided:", !!fileUrl)
    console.log("Conversation ID:", conversationId)
    console.log("Council Config:", councilConfig ? "Custom" : "Default")

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!OPENROUTER_API_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY")
    }

    // Dynamically extract drafter and auditor slots from council config
    const defaultConfig = {
      slot_1: { id: "meta-llama/llama-3-70b-instruct", name: "Llama 3", role: "The Speedster" },
      slot_2: { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5", role: "The Critic" },
      slot_5: { id: "deepseek/deepseek-r1", name: "DeepSeek R1", role: "The Auditor" }
    }
    
    const config = councilConfig || defaultConfig
    
    // Separate drafters from auditor
    const allSlots = Object.entries(config).map(([key, value]) => {
      if (typeof value === 'string') {
        return {
          slotKey: key,
          id: value,
          name: value,
          role: 'Drafter'
        }
      } else {
        const slot = value as { id: string; name: string; role: string }
        return {
          slotKey: key,
          id: slot.id,
          name: slot.name,
          role: slot.role
        }
      }
    })
    
    // Find auditor (last slot OR role contains "Audit" or "Synth")
    const auditorSlot = allSlots.find(slot => 
      slot.role?.toLowerCase().includes('audit') || 
      slot.role?.toLowerCase().includes('synth')
    ) || allSlots[allSlots.length - 1] // Default to last slot
    
    // All other slots are drafters
    const drafterSlots = allSlots.filter(slot => slot.slotKey !== auditorSlot.slotKey)
    
    console.log(`Council: ${drafterSlots.length} drafters + 1 auditor`)
    console.log("Drafters:", drafterSlots.map(s => s.name).join(", "))
    console.log("Auditor:", auditorSlot.name)

    let context = ""
    let librarianAnalysis = ""

    // 4a. Check if conversation has existing context
    if (conversationId && !fileUrl) {
      console.log("Fetching persisted context from database...")
      const { data: conversation, error: convError } = await adminSupabase
        .from('conversations')
        .select('context')
        .eq('id', conversationId)
        .single()
      
      if (conversation?.context) {
        context = `\n\nDOCUMENT CONTEXT:\n${conversation.context}`
        console.log("Using persisted context")
      }
    }

    // 4b. THE LIBRARIAN (Gemini) - Only runs if file exists
    if (fileUrl) {
      console.log("File detected, waking up The Librarian...")
      try {
        const geminiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-pro-1.5",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "Analyze this document deeply. Extract key facts, dates, and sums. " + prompt },
                  { type: "image_url", image_url: { url: fileUrl } }
                ]
              }
            ]
          })
        })
        
        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text()
          console.error("Gemini error:", geminiResponse.status, errorText)
          throw new Error(`Gemini processing failed: ${errorText}`)
        }
        
        const geminiData = await geminiResponse.json()
        librarianAnalysis = geminiData.choices?.[0]?.message?.content || "Could not read file."
        context = `\n\nDOCUMENT CONTEXT:\n${librarianAnalysis}`
        console.log("Document processed successfully")
      } catch (fileError) {
        console.error("File processing failed:", fileError)
        console.log("Continuing with text-only analysis")
      }
    }

    // 5. THE COUNCIL - Run all drafters in parallel
    console.log(`Fetching drafts from ${drafterSlots.length} drafters...`)
    
    const drafterPromises = drafterSlots.map(async (drafter, index) => {
      const startTime = Date.now()
      
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({
            model: drafter.id,
            messages: [{ role: "user", content: prompt + context }]
          })
        })
        
        if (!response.ok) {
          throw new Error(`${drafter.name} failed: ${response.status}`)
        }
        
        const data = await response.json()
        const latency = Date.now() - startTime
        
        return {
          agent: drafter.role,
          name: drafter.name,
          modelId: drafter.id,
          slotKey: drafter.slotKey,
          response: data.choices[0].message.content,
          latency
        }
      } catch (err) {
        console.error(`Drafter ${drafter.name} failed:`, err)
        return {
          agent: drafter.role,
          name: drafter.name,
          modelId: drafter.id,
          slotKey: drafter.slotKey,
          response: `[${drafter.name} failed to respond]`,
          latency: Date.now() - startTime
        }
      }
    })
    
    const drafts = await Promise.all(drafterPromises)
    console.log(`All ${drafts.length} drafts received`)

    // 6. THE AUDITOR - Synthesize all drafts
    console.log(`Sending ${drafts.length} drafts to auditor: ${auditorSlot.name}`)
    const startTimeVerdict = Date.now()
    
    const draftsText = drafts.map((d, i) => 
      `Draft ${i + 1} (${d.name}):\n${d.response}`
    ).join('\n\n')
    
    const verdictReq = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: auditorSlot.id,
        messages: [{
          role: "system",
          content: `You are ${auditorSlot.role}. Compare all drafts from the Council. Identify errors, conflicts, and strengths. Provide a final synthesized verdict that combines the best insights.`
        }, {
          role: "user",
          content: `User Query: ${prompt}\n${context}\n\n${draftsText}`
        }]
      })
    })

    if (!verdictReq.ok) {
      const errorText = await verdictReq.text()
      throw new Error(`Auditor ${auditorSlot.name} failed: ${errorText}`)
    }

    const verdictData = await verdictReq.json()
    const verdictLatency = Date.now() - startTimeVerdict
    console.log("Synthesis complete")

    // 7. Update usage count
    await supabase
      .from('user_usage')
      .update({ 
        audit_count: userUsage.audit_count + 1,
        audits_this_month: (userUsage.audits_this_month || 0) + 1
      })
      .eq('user_id', user.id)

    // 8. Log analytics for all models
    const analyticsEvents = [
      ...drafts.map((draft, index) => ({
        user_id: user.id,
        conversation_id: conversationId || null,
        model_id: draft.modelId,
        model_name: draft.name,
        model_role: draft.agent,
        slot_position: parseInt(draft.slotKey.replace('slot_', '')),
        latency_ms: draft.latency
      })),
      {
        user_id: user.id,
        conversation_id: conversationId || null,
        model_id: auditorSlot.id,
        model_name: auditorSlot.name,
        model_role: auditorSlot.role,
        slot_position: parseInt(auditorSlot.slotKey.replace('slot_', '')),
        latency_ms: verdictLatency
      }
    ]

    const { error: analyticsError } = await adminSupabase
      .from('analytics_events')
      .insert(analyticsEvents)
    
    if (analyticsError) {
      console.error("Failed to log analytics:", analyticsError)
    } else {
      console.log(`Analytics logged for ${analyticsEvents.length} models`)
    }

    // 9. Save to training dataset
    let trainingDatasetId = null
    try {
      const { data: trainingData, error: trainingError } = await adminSupabase
        .from('training_dataset')
        .insert({
          user_id: user.id,
          prompt,
          chosen_response: verdictData.choices[0].message.content,
          rejected_response_a: drafts[0]?.response || '',
          rejected_response_b: drafts[1]?.response || '',
          model_config: councilConfig
        })
        .select()
        .single()

      if (!trainingError) {
        trainingDatasetId = trainingData.id
        console.log('Training data saved')
      }
    } catch (err) {
      console.error('Training data error:', err)
    }

    console.log("=== Request completed successfully ===")

    // 10. Log activity in background (don't block response)
    const logActivity = async () => {
      try {
        const ipAddress = req.headers.get('x-forwarded-for') || 
                         req.headers.get('x-real-ip') || 
                         'unknown'
        const userAgent = req.headers.get('user-agent') || null
        
        const { error: activityError } = await adminSupabase
          .from('activity_logs')
          .insert({
            user_id: user.id,
            activity_type: 'audit_completed',
            description: `Completed audit: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: {
              conversation_id: conversationId,
              council_config: councilConfig ? 'custom' : 'default',
              drafter_count: drafts.length,
              had_file: !!fileUrl,
              training_dataset_id: trainingDatasetId
            }
          })
        
        if (activityError) {
          console.error('Failed to log activity:', activityError)
        } else {
          console.log('Activity logged successfully')
        }
      } catch (err) {
        console.error('Activity logging error:', err)
      }
    }

    // Run activity logging without blocking response
    logActivity().catch(err => console.error('Background activity log error:', err))

    // 11. Return results with dynamic drafts array
    return new Response(
      JSON.stringify({
        drafts: drafts.map(d => ({
          agent: d.agent,
          name: d.name,
          response: d.response
        })),
        verdict: verdictData.choices[0].message.content,
        librarianAnalysis: librarianAnalysis || null,
        remainingAudits: userUsage.is_premium ? -1 : Math.max(0, monthlyLimit - (userUsage.audits_this_month || 0) - 1),
        trainingDatasetId: trainingDatasetId,
        // Legacy fields for backward compatibility
        draftA: drafts[0]?.response || '',
        draftB: drafts[1]?.response || '',
        agentNameA: drafts[0]?.agent || null,
        agentNameB: drafts[1]?.agent || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("=== FATAL ERROR ===")
    console.error(error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({ error: `Backend failed: ${errorMessage}` }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        }
      }
    )
  }
})
