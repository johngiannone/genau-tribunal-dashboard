import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { originalVerdict, userFeedback, auditorModel } = await req.json()
    
    if (!originalVerdict || !userFeedback || !auditorModel) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!OPENROUTER_API_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY")
    }

    console.log("Refining verdict with auditor:", auditorModel)
    
    // Call auditor model to refine the verdict
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: auditorModel,
        messages: [{
          role: "system",
          content: "You are a professional auditor refining a verdict based on user feedback. Maintain the core insights but adjust tone, length, and structure according to user instructions."
        }, {
          role: "user",
          content: `Original Verdict:\n${originalVerdict}\n\nUser Feedback:\n${userFeedback}\n\nRewrite the verdict according to the user's feedback while preserving key insights.`
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Auditor failed: ${errorText}`)
    }

    const data = await response.json()
    const refinedVerdict = data.choices[0].message.content

    return new Response(
      JSON.stringify({ 
        refinedVerdict,
        success: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Refine verdict error:", error)
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
