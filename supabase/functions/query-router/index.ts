import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueryPlan {
  primary_intent: string
  required_agents: string[]
  search_queries: string[]
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
            content: `You are a query router. Your goal is to convert user text into a JSON command.
Do not output any conversational text. Only output valid JSON.

Schema:
{
  "primary_intent": string,
  "required_agents": ["chairman" | "critic" | "architect" | "reporter"],
  "search_queries": string[]
}

Rules:
- primary_intent: One sentence describing what the user wants
- required_agents: Select 2-4 agents from: "chairman", "critic", "architect", "reporter", "speedster"
  * chairman: General reasoning and synthesis
  * critic: Evaluation and quality assessment
  * architect: Technical implementation and code
  * reporter: Research and factual information
  * speedster: Quick responses and simple queries
- search_queries: Array of search terms if the query needs external information (empty array if not)

Return ONLY valid JSON matching the schema above.`
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
