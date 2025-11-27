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
  console.log("Processing started...");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log payload size
    const contentLength = req.headers.get('content-length');
    console.log("Payload size:", contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : "unknown");
    
    // Check payload size limit (6MB)
    if (contentLength && parseInt(contentLength) > 6 * 1024 * 1024) {
      console.error("Payload too large:", contentLength);
      return new Response(
        JSON.stringify({ error: 'File too large. Please upload a smaller document.' }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get auth token from request header
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header present:", !!authHeader);
    
    // Create Supabase client
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
          message: 'You have reached your daily limit of 5 free audits.'
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, image_data, document_text } = await req.json();

    console.log("Received prompt:", prompt);
    console.log("Image data provided:", !!image_data);
    console.log("Document text provided:", !!document_text);
    if (image_data) {
      console.log("Image data size:", (image_data.length * 0.75 / 1024 / 1024).toFixed(2), "MB (estimated)");
    }
    if (document_text) {
      console.log("Document text size:", (document_text.length / 1024).toFixed(2), "KB");
    }

    let draftA: string;
    let draftB: string;
    let contextForModels = prompt;

    // If document_text provided (from chunked processing), use it directly
    if (document_text) {
      console.log("Using pre-extracted document text");
      contextForModels = `${prompt}\n\nDocument Content:\n${document_text}`;
    }
    // If image_data provided, send to Gemini Flash 1.5 first
    else if (image_data) {
      console.log("Vision Mode activated");
      console.log("Processing image with Gemini Flash 1.5");
      
      const visionResponse = await fetchWithTimeoutAndRetry(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-flash-1.5",
            messages: [
              {
                role: "system",
                content: "Analyze this image of a document. Transcribe and summarize it."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${image_data}`
                    }
                  }
                ]
              }
            ],
          }),
        },
        "Gemini Flash Vision"
      );

      const visionData = await visionResponse.json();
      contextForModels = `${prompt}\n\nDocument Analysis:\n${visionData.choices[0].message.content}`;
      console.log("Vision analysis complete");
    }

    // Fetch drafts from models with appropriate context
    if (document_text || image_data) {
      // Send with context
      const fetchModelWithContext = async (model: string, label: string) => {
        console.log(`Fetching ${label} with context...`);
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
        fetchModelWithContext("meta-llama/llama-3-70b-instruct", "Llama 3"),
        fetchModelWithContext("anthropic/claude-3.5-sonnet", "Claude 3.5"),
      ]);
    } else {
      // Standard flow without image
      console.log("Text Mode activated");
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
        return data.choices[0].message.content;
      };

      [draftA, draftB] = await Promise.all([
        fetchModel("meta-llama/llama-3-70b-instruct", "Llama 3"),
        fetchModel("anthropic/claude-3.5-sonnet", "Claude 3.5"),
      ]);
    }

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
