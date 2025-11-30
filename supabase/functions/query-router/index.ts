import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueryPlan {
  intent: string
  requiresSearch: boolean
  requiresCode: boolean
  requiresAnalysis: boolean
  requiresCreative: boolean
  agentsNeeded: string[]
  priority: 'high' | 'medium' | 'low'
  estimatedComplexity: 'simple' | 'moderate' | 'complex'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured")
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("Analyzing query intent:", prompt.substring(0, 100))

    // Use fast groq model for query routing
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "groq/llama-3-8b-8192",
        messages: [
          {
            role: "system",
            content: `You are a query routing system. Analyze the user's query and return a JSON object defining execution requirements.

Output strict JSON with this structure:
{
  "intent": "brief description of what user wants",
  "requiresSearch": boolean (true if needs web search or current info),
  "requiresCode": boolean (true if involves programming/technical implementation),
  "requiresAnalysis": boolean (true if needs data analysis or comparison),
  "requiresCreative": boolean (true if needs creative writing or ideation),
  "agentsNeeded": ["architect", "critic", "speedster"] (select relevant agents),
  "priority": "high|medium|low" (based on complexity),
  "estimatedComplexity": "simple|moderate|complex"
}

Rules:
- requiresSearch: true for "latest", "current", "recent", "today", "news", factual lookups
- requiresCode: true for "implement", "code", "function", "API", "debug", technical tasks
- requiresAnalysis: true for "compare", "analyze", "evaluate", "pros/cons"
- requiresCreative: true for "write", "create story", "brainstorm", "generate ideas"
- agentsNeeded: ["chairman", "critic", "architect", "reporter", "speedster"] - pick 2-5 based on query type
- priority: high for urgent/time-sensitive, medium for standard, low for exploratory
- estimatedComplexity: simple (straightforward answer), moderate (requires reasoning), complex (multi-step/deep analysis)

Return ONLY valid JSON, no markdown, no explanation.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 300
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenRouter error (${response.status}):`, errorText)
      return new Response(
        JSON.stringify({ error: `Query routing failed: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const routingPlan = JSON.parse(data.choices[0].message.content) as QueryPlan

    console.log("Query routing plan:", JSON.stringify(routingPlan, null, 2))

    return new Response(
      JSON.stringify({ plan: routingPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Query router error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
