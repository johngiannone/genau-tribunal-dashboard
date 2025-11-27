import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    console.log("Received prompt:", prompt);

    // 1. Define the "Worker" requests (Llama 3 & Claude)
    // We use OpenRouter to call both with one key for simplicity
    const fetchModel = async (model: string, label: string) => {
      console.log(`Fetching ${label}...`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from ${label}:`, errorText);
        throw new Error(`${label} request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`${label} response received`);
      return data.choices[0].message.content;
    };

    // 2. Run them in PARALLEL (This makes it fast)
    console.log("Starting parallel requests for Draft A and Draft B...");
    const [draftA, draftB] = await Promise.all([
      fetchModel("meta-llama/llama-3-70b-instruct", "Llama 3"), // The Speedster
      fetchModel("anthropic/claude-3.5-sonnet", "Claude 3.5"),  // The Critic
    ]);

    // 3. The Auditor (DeepSeek R1) - The "Judge"
    // It reads the previous two drafts and synthesizes them.
    console.log("Starting Auditor (DeepSeek R1) request...");
    const auditResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1", 
        messages: [
          {
            role: "system",
            content: "You are an Auditor. Compare Draft A and Draft B. Identify errors. Write a final, corrected verdict."
          },
          {
            role: "user",
            content: `User Query: ${prompt}\n\nDraft A: ${draftA}\n\nDraft B: ${draftB}`
          }
        ],
      }),
    });

    if (!auditResponse.ok) {
      const errorText = await auditResponse.text();
      console.error("Error from Auditor:", errorText);
      throw new Error(`Auditor request failed: ${auditResponse.status}`);
    }

    const auditData = await auditResponse.json();
    const verdict = auditData.choices[0].message.content;
    
    console.log("All requests completed successfully");

    // 4. Return everything to the Frontend
    return new Response(
      JSON.stringify({ draftA, draftB, verdict }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      },
    );
  } catch (error) {
    console.error("Error in chat-consensus function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  }
});
