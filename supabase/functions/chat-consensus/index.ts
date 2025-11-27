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

      // Log status and check for specific error codes
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

      // Retry on other errors
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

// Helper to process images with Gemini Vision
async function processImagesWithVision(images: string[], fileName: string, prompt: string): Promise<string> {
  console.log(`Processing ${images.length} images with Gemini Vision`);
  
  // Build content array with text prompt and all images
  const content: any[] = [
    {
      type: "text",
      text: `I am providing images of a document (${fileName}). Analyze them thoroughly and extract all key information. User query: ${prompt}`
    }
  ];

  // Add each image
  for (const imageBase64 of images) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`
      }
    });
  }

  const visionResponse = await fetchWithTimeoutAndRetry(
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
            content
          }
        ],
      }),
    },
    "Gemini Vision"
  );

  const visionData = await visionResponse.json();
  return visionData.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request header
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header present:", !!authHeader);
    
    // Create Supabase client (JWT verification is handled by config.toml)
    const supabase = createClient(
      SUPABASE_URL, 
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: authHeader || '' }
        }
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
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

    // VISION-FIRST LOGIC: If fileData with images is provided, use Gemini Vision
    if (fileData?.images && fileData.images.length > 0) {
      console.log(`Processing ${fileData.images.length} document images with Vision Mode`);
      
      // Send images directly to Gemini Vision
      librarianContext = await processImagesWithVision(fileData.images, fileData.name, prompt);
      console.log("Vision analysis complete");

      // Pass Vision analysis to Draft models
      const fetchModelWithContext = async (model: string, label: string) => {
        console.log(`Fetching ${label} with Vision context...`);
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
              messages: [
                {
                  role: "system",
                  content: `Vision analysis of the document:\n\n${librarianContext}`
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
            }),
          },
          label
        );
        
        const data = await response.json();
        console.log(`${label} response received`);
        return data.choices[0].message.content;
      };

      [draftA, draftB] = await Promise.all([
        fetchModelWithContext("meta-llama/llama-3-70b-instruct", "Llama 3"),
        fetchModelWithContext("anthropic/claude-3.5-sonnet", "Claude 3.5"),
      ]);
    } else if (fileData?.base64 && fileData.type.startsWith("text/")) {
      // Handle text files
      console.log("Processing text file:", fileData.name);
      const binaryData = atob(fileData.base64);
      const extractedText = new TextDecoder().decode(new Uint8Array([...binaryData].map(c => c.charCodeAt(0))));
      
      librarianContext = extractedText;
      
      const fetchModelWithContext = async (model: string, label: string) => {
        console.log(`Fetching ${label} with text context...`);
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
              messages: [
                {
                  role: "system",
                  content: `Document content:\n\n${librarianContext}`
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
            }),
          },
          label
        );
        
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
              messages: [{ role: "user", content: prompt }],
            }),
          },
          label
        );
        
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
