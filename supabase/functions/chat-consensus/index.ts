import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Chat Consensus Request Started ===");

    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // 2. Check usage limits
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (usageError) {
      console.error("Usage check error:", usageError);
      return new Response(
        JSON.stringify({ error: 'Failed to check usage limits' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create usage record if it doesn't exist
    let userUsage = usage;
    if (!userUsage) {
      console.log("Creating usage record for new user");
      const { data: newUsage, error: createError } = await supabase
        .from('user_usage')
        .insert({ user_id: user.id, audit_count: 0, is_premium: false })
        .select()
        .single();
      
      if (createError) {
        console.error("Failed to create usage record:", createError);
        return new Response(
          JSON.stringify({ error: 'Failed to initialize usage tracking' }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userUsage = newUsage;
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
      );
    }

    // 3. Parse request
    const { prompt, file_url } = await req.json();
    console.log("Prompt:", prompt?.substring(0, 100));
    console.log("File URL provided:", !!file_url);

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let contextForModels = prompt;

    // 4. If file provided, process with Gemini Pro 1.5
    if (file_url) {
      console.log("Processing file with Gemini Pro 1.5...");
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
                  {
                    type: "text",
                    text: `Analyze this document and extract all relevant information related to: ${prompt}`
                  },
                  {
                    type: "image_url",
                    image_url: { url: file_url }
                  }
                ]
              }
            ],
          }),
        });

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini error:", geminiResponse.status, errorText);
          throw new Error(`Gemini processing failed: ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const documentAnalysis = geminiData.choices[0].message.content;
        contextForModels = `${prompt}\n\nDocument Analysis:\n${documentAnalysis}`;
        console.log("Document processed successfully");
      } catch (fileError) {
        console.error("File processing failed:", fileError);
        // Continue without file context rather than failing completely
        console.log("Continuing with text-only analysis");
      }
    }

    // 5. Fetch drafts from Llama 3 and Claude 3.5 in parallel
    console.log("Fetching drafts from models...");

    const fetchModel = async (model: string, label: string) => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: contextForModels }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${label} failed: ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    };

    const [draftA, draftB] = await Promise.all([
      fetchModel("meta-llama/llama-3-70b-instruct", "Llama 3"),
      fetchModel("anthropic/claude-3.5-sonnet", "Claude 3.5"),
    ]);

    console.log("Drafts received, generating synthesis...");

    // 6. Generate synthesis with DeepSeek R1
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
      throw new Error(`DeepSeek audit failed: ${errorText}`);
    }

    const auditData = await auditResponse.json();
    const verdict = auditData.choices[0].message.content;

    console.log("Synthesis complete");

    // 7. Update usage count
    await supabase
      .from('user_usage')
      .update({ audit_count: userUsage.audit_count + 1 })
      .eq('user_id', user.id);

    console.log("=== Request completed successfully ===");

    // 8. Return results
    return new Response(
      JSON.stringify({ 
        draftA, 
        draftB, 
        verdict,
        remainingAudits: userUsage.is_premium ? -1 : Math.max(0, 5 - userUsage.audit_count - 1)
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error("=== FATAL ERROR ===");
    console.error(error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Return 200 with error in JSON so UI can handle it gracefully
    return new Response(
      JSON.stringify({ error: `Backend failed: ${errorMessage}` }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  }
});
