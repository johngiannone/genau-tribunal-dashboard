import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to fetch with timeout and retry
async function fetchWithTimeoutAndRetry(url: string, options: RequestInit, label: string, retries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`${label} - Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${label} - Error (${response.status}):`, errorText);
        
        if (response.status === 402) {
          throw new Error("PAYMENT_REQUIRED");
        }
        
        throw new Error(`${label} failed with status ${response.status}: ${errorText}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`${label} - Request timeout after 60 seconds`);
          if (attempt < retries) {
            console.log(`${label} - Retrying after 1 second...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw new Error("The Council is taking too long to deliberate. Please try again.");
        }
        
        if (error.message === "PAYMENT_REQUIRED") {
          throw new Error("System out of credits.");
        }
      }

      if (attempt < retries) {
        console.log(`${label} - Retrying after 1 second... (Attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      throw error;
    }
  }

  throw new Error(`${label} failed after all retries`);
}

// Helper to process file URL with Gemini Pro 1.5
async function processFileWithGemini(fileUrl: string, prompt: string): Promise<string> {
  console.log("Processing file URL with Gemini Pro 1.5:", fileUrl);
  
  try {
    // Try passing URL directly to Gemini Pro 1.5
    console.log("Attempting direct URL processing...");
    const directResponse = await fetchWithTimeoutAndRetry(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
                {
                  type: "text",
                  text: `${prompt}\n\nAnalyze this document and extract all relevant information.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: fileUrl
                  }
                }
              ]
            }
          ],
        }),
      },
      "Gemini Pro 1.5 (Direct URL)",
      0 // No retry for direct attempt
    );
    
    const directData = await directResponse.json();
    return directData.choices[0].message.content;
  } catch (error) {
    // Fallback: Download and convert to base64
    console.log("Direct URL failed, falling back to base64 conversion...");
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    console.log("File content type:", contentType);
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    // Determine data URL prefix
    let dataUrlPrefix = 'data:image/jpeg;base64,';
    if (contentType.includes('application/pdf')) {
      dataUrlPrefix = 'data:application/pdf;base64,';
    } else if (contentType.includes('image/png')) {
      dataUrlPrefix = 'data:image/png;base64,';
    }
    
    console.log("Processing with base64 fallback...");
    const fallbackResponse = await fetchWithTimeoutAndRetry(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
                {
                  type: "text",
                  text: `${prompt}\n\nAnalyze this document and extract all relevant information.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `${dataUrlPrefix}${base64}`
                  }
                }
              ]
            }
          ],
        }),
      },
      "Gemini Pro 1.5 (Base64 Fallback)"
    );
    
    const fallbackData = await fallbackResponse.json();
    return fallbackData.choices[0].message.content;
  }
}

serve(async (req) => {
  console.log("Processing started...");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(
      SUPABASE_URL, 
      SUPABASE_ANON_KEY
    );

    // Verify the JWT token by passing it explicitly
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (!usage.is_premium && usage.audit_count >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Usage limit reached',
          limitReached: true,
          message: 'You have reached your daily limit of 5 free audits.'
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, file_url } = await req.json();

    console.log("Received prompt:", prompt);
    console.log("File URL provided:", !!file_url);

    let draftA: string;
    let draftB: string;
    let contextForModels = prompt;

    // If file_url provided, process it with Gemini Pro 1.5
    if (file_url) {
      console.log("File processing mode activated");
      
      const documentAnalysis = await processFileWithGemini(file_url, prompt);
      contextForModels = `${prompt}\n\nDocument Analysis:\n${documentAnalysis}`;
      console.log("Document analysis complete");
    } else {
      console.log("Text Mode activated");
    }

    // Fetch drafts from models
    console.log("Fetching drafts from Llama 3 and Claude 3.5...");
    
    const fetchModel = async (model: string, label: string) => {
      console.log(`Fetching ${label}...`);
      const response = await fetchWithTimeoutAndRetry(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: contextForModels }],
          }),
        },
        label
      );
      
      const data = await response.json();
      return data.choices[0].message.content;
    };

    [draftA, draftB] = await Promise.all([
      fetchModel("meta-llama/llama-3-70b-instruct", "Llama 3"),
      fetchModel("anthropic/claude-3.5-sonnet", "Claude 3.5"),
    ]);

    // The Auditor (DeepSeek R1)
    console.log("Starting Auditor (DeepSeek R1) request...");
    const auditResponse = await fetchWithTimeoutAndRetry(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
      },
      "Auditor (DeepSeek R1)"
    );

    const auditData = await auditResponse.json();
    const verdict = auditData.choices[0].message.content;

    // Increment usage count
    await supabase
      .from('user_usage')
      .update({ audit_count: usage.audit_count + 1 })
      .eq('user_id', user.id);

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
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
