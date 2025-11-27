import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to decode Base64 and extract text from PDF (simple text extraction)
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    // For simple PDF text extraction, we'll use a basic approach
    // In production, you'd want a more robust PDF parser
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    // Convert to string and try to extract text
    const text = new TextDecoder().decode(bytes);
    
    // Basic PDF text extraction - look for text between stream markers
    const textMatches = text.match(/(?:BT|Td|TJ|Tj)\s+.*?(?:ET|\n)/gs);
    if (textMatches && textMatches.length > 0) {
      return textMatches.join(' ').replace(/[^\x20-\x7E]/g, ' ').trim();
    }
    
    // If no text found, return empty (will trigger Vision Mode)
    return "";
  } catch (error) {
    console.error("PDF text extraction failed:", error);
    return "";
  }
}

// Helper to prepare file content for Vision Mode (Gemini with images)
async function processFileAsVision(fileData: { name: string; base64: string; type: string }): Promise<string> {
  console.log("Processing file in Vision Mode for Gemini");
  
  // Send base64 directly to Gemini with vision capabilities
  // For now, we'll format it as a data URL for Gemini to process
  const dataUrl = `data:${fileData.type};base64,${fileData.base64}`;
  
  const visionResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-pro-1.5-vision",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are The Librarian. Analyze this document image. Extract every relevant fact, date, and clause. Summarize it comprehensively for other AI agents. Document name: ${fileData.name}`
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
    }),
  });

  if (!visionResponse.ok) {
    const errorText = await visionResponse.text();
    console.error("Gemini Vision error:", errorText);
    throw new Error("Failed to process document with Vision Mode");
  }

  const visionData = await visionResponse.json();
  return visionData.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Check usage limits
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (usageError) {
      console.error("Error fetching usage:", usageError);
      return new Response(
        JSON.stringify({ error: 'Failed to check usage limits' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce limits: 5 free audits for non-premium users
    if (!usage.is_premium && usage.audit_count >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Usage limit reached',
          limitReached: true,
          message: 'You have reached your daily limit of 5 free audits. Upgrade to premium for unlimited access.'
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, fileData } = await req.json();

    console.log("Received prompt:", prompt);
    console.log("File data provided:", !!fileData);

    let draftA: string;
    let draftB: string;
    let librarianContext = "";

    // BRANCHING LOGIC: If fileData is provided, process it server-side
    if (fileData) {
      console.log("File uploaded - processing on server:", fileData.name);
      
      let extractedText = "";
      
      // Try text extraction first for PDFs
      if (fileData.type === "application/pdf") {
        extractedText = await extractTextFromPDF(fileData.base64);
        console.log("PDF text extraction result length:", extractedText.length);
      } else if (fileData.type === "text/plain" || fileData.type === "text/markdown" || fileData.type === "text/csv") {
        // For text files, decode directly
        const binaryData = atob(fileData.base64);
        extractedText = new TextDecoder().decode(new Uint8Array([...binaryData].map(c => c.charCodeAt(0))));
      }
      
      // If text extraction failed or returned < 50 chars, use Vision Mode
      if (extractedText.length < 50) {
        console.log("Text extraction insufficient. Switching to Vision Mode.");
        librarianContext = await processFileAsVision(fileData);
      } else {
        // Use standard Librarian flow with extracted text
        console.log("Using text-based Librarian processing");
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
                content: `Context: ${extractedText}\n\nUser Question: ${prompt}`
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
      }
      
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

    // Increment usage count
    const { error: updateError } = await supabase
      .from('user_usage')
      .update({ audit_count: usage.audit_count + 1 })
      .eq('user_id', user.id);

    if (updateError) {
      console.error("Error updating usage:", updateError);
    }

    console.log("Usage incremented to:", usage.audit_count + 1);

    return new Response(
      JSON.stringify({ 
        draftA, 
        draftB, 
        verdict,
        remainingAudits: usage.is_premium ? -1 : Math.max(0, 5 - usage.audit_count - 1)
      }),
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
