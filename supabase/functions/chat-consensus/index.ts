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
        .insert({ user_id: user.id, audit_count: 0, is_premium: false })
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

    // Check limits
    if (!userUsage.is_premium && userUsage.audit_count >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Usage limit reached',
          limitReached: true,
          message: 'You have reached your daily limit of 5 free audits.'
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

    // Get models from council config or use defaults
    const slot1 = councilConfig?.slot_1 || { id: "meta-llama/llama-3-70b-instruct", name: "Llama 3", role: "The Speedster" }
    const slot2 = councilConfig?.slot_2 || { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5", role: "The Critic" }
    const slot5 = councilConfig?.slot_5 || { id: "deepseek/deepseek-r1", name: "DeepSeek R1", role: "The Synthesizer" }
    
    const modelA = typeof slot1 === 'string' ? slot1 : slot1.id
    const modelB = typeof slot2 === 'string' ? slot2 : slot2.id
    const synthModel = typeof slot5 === 'string' ? slot5 : slot5.id
    
    console.log("Using models:", { modelA, modelB, synthModel })

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

    // 5. THE COUNCIL (Parallel Processing) - Track timing
    console.log("Fetching drafts from models...")
    
    const startTimeA = Date.now()
    const startTimeB = Date.now()
    
    const [draftA, draftB] = await Promise.all([
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          model: modelA,
          messages: [{ role: "user", content: prompt + context }]
        })
      }).then(r => r.json()).then(data => ({ data, latency: Date.now() - startTimeA })),
      
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          model: modelB,
          messages: [{ role: "user", content: prompt + context }]
        })
      }).then(r => r.json()).then(data => ({ data, latency: Date.now() - startTimeB }))
    ])

    console.log("Drafts received, generating synthesis...")

    // 6. THE VERDICT (DeepSeek or custom synthesis model) - Track timing
    const startTimeVerdict = Date.now()
    const verdictReq = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: synthModel,
        messages: [{
          role: "system",
          content: "You are an Auditor. Compare Draft A and Draft B. Identify errors. Write a final, corrected verdict."
        }, {
          role: "user",
          content: `User Query: ${prompt}\n${context}\n\nDraft A: ${draftA.data.choices[0].message.content}\n\nDraft B: ${draftB.data.choices[0].message.content}`
        }]
      })
    })

    if (!verdictReq.ok) {
      const errorText = await verdictReq.text()
      throw new Error(`DeepSeek audit failed: ${errorText}`)
    }

    const verdictData = await verdictReq.json()
    const verdictLatency = Date.now() - startTimeVerdict
    console.log("Synthesis complete")

    // 7. Update usage count
    await supabase
      .from('user_usage')
      .update({ audit_count: userUsage.audit_count + 1 })
      .eq('user_id', user.id)

    // 8. Log analytics events
    const analyticsEvents = [
      {
        user_id: user.id,
        conversation_id: conversationId || null,
        model_id: modelA,
        model_name: typeof slot1 === 'object' ? slot1.name : modelA,
        model_role: typeof slot1 === 'object' ? slot1.role : null,
        slot_position: 1,
        latency_ms: draftA.latency
      },
      {
        user_id: user.id,
        conversation_id: conversationId || null,
        model_id: modelB,
        model_name: typeof slot2 === 'object' ? slot2.name : modelB,
        model_role: typeof slot2 === 'object' ? slot2.role : null,
        slot_position: 2,
        latency_ms: draftB.latency
      },
      {
        user_id: user.id,
        conversation_id: conversationId || null,
        model_id: synthModel,
        model_name: typeof slot5 === 'object' ? slot5.name : synthModel,
        model_role: typeof slot5 === 'object' ? slot5.role : null,
        slot_position: 5,
        latency_ms: verdictLatency
      }
    ]

    const { error: analyticsError } = await adminSupabase
      .from('analytics_events')
      .insert(analyticsEvents)
    
    if (analyticsError) {
      console.error("Failed to log analytics:", analyticsError)
    } else {
      console.log("Analytics events logged successfully")
    }

    console.log("=== Request completed successfully ===")

    // 9. Save to training dataset automatically
    let trainingDatasetId = null;
    try {
      const { data: trainingData, error: trainingError } = await adminSupabase
        .from('training_dataset')
        .insert({
          user_id: user.id,
          prompt,
          chosen_response: verdictData.choices[0].message.content,
          rejected_response_a: draftA.data.choices[0].message.content,
          rejected_response_b: draftB.data.choices[0].message.content,
          model_config: councilConfig
        })
        .select()
        .single();

      if (trainingError) {
        console.error('Failed to save training data:', trainingError);
        // Don't fail the request if training save fails
      } else {
        console.log('Training data saved successfully');
        trainingDatasetId = trainingData.id;
      }
    } catch (err) {
      console.error('Training data insert error:', err);
    }

    // 10. Return results
    return new Response(
      JSON.stringify({
        draftA: draftA.data.choices[0].message.content,
        draftB: draftB.data.choices[0].message.content,
        verdict: verdictData.choices[0].message.content,
        librarianAnalysis: librarianAnalysis || null,
        remainingAudits: userUsage.is_premium ? -1 : Math.max(0, 5 - userUsage.audit_count - 1),
        trainingDatasetId: trainingDatasetId
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
