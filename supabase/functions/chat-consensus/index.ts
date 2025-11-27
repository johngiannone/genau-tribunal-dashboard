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
    const { prompt, fileContext } = await req.json();

    console.log("Received prompt:", prompt);
    console.log("File context provided:", !!fileContext);

    let draftA: string;
    let draftB: string;
    let librarianContext = "";

    // BRANCHING LOGIC: If fileContext is provided, use Gemini as "The Librarian" first
    if (fileContext) {
      console.log("File context provided - activating Librarian mode");
      
      // Step 1: The Librarian (Gemini) analyzes the document
      const librarianResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-pro-1.5",
          messages: [
            {
              role: "system",
              content: "You are The Librarian. Analyze the provided text. Extract every relevant fact, date, and clause. Summarize it for the other agents."
            },
            {
              role: "user",
              content: `Context: ${fileContext}\n\nUser Question: ${prompt}`
            }
          ],
        }),
      });

      if (!librarianResponse.ok) {
        const errorText = await librarianResponse.text();
        console.error("Error from Librarian:", errorText);
        throw new Error(`Librarian request failed: ${librarianResponse.status}`);
      }

      const librarianData = await librarianResponse.json();
      librarianContext = librarianData.choices[0].message.content;
      console.log("Librarian analysis complete");

      // Step 2: Pass Librarian's analysis to Draft models
      const fetchModelWithContext = async (model: string, label: string) => {
        console.log(`Fetching ${label} with Librarian context...`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: `The Librarian has analyzed the document. Use this context:\n\n${librarianContext}`
              },
              {
                role: "user",
                content: prompt
              }
            ],
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

      [draftA, draftB] = await Promise.all([
        fetchModelWithContext("meta-llama/llama-3-70b-instruct", "Llama 3"),
        fetchModelWithContext("anthropic/claude-3.5-sonnet", "Claude 3.5"),
      ]);
    } else {
      // Standard flow without file context
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

      console.log("Starting parallel requests for Draft A and Draft B...");
      [draftA, draftB] = await Promise.all([
        fetchModel("meta-llama/llama-3-70b-instruct", "Llama 3"),
        fetchModel("anthropic/claude-3.5-sonnet", "Claude 3.5"),
      ]);
    }

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
