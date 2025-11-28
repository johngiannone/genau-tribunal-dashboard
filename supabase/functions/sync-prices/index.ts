import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting model price sync...");

    // Fetch current model prices from OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/models");
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const { data: models } = await response.json();
    console.log(`Fetched ${models?.length || 0} models from OpenRouter`);

    if (!models || models.length === 0) {
      throw new Error("No models returned from OpenRouter API");
    }

    // Initialize Supabase client with service role key for database writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare model data for upsert
    const modelData = models.map((model: any) => ({
      id: model.id,
      name: model.name,
      input_price: parseFloat(model.pricing?.prompt || "0"),
      output_price: parseFloat(model.pricing?.completion || "0"),
      last_updated: new Date().toISOString(),
    }));

    console.log(`Upserting ${modelData.length} model prices...`);

    // Batch upsert all models
    const { data, error } = await supabase
      .from("ai_models")
      .upsert(modelData, { onConflict: "id" });

    if (error) {
      console.error("Database upsert error:", error);
      throw error;
    }

    console.log(`Successfully synced ${modelData.length} model prices`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: modelData.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing model prices:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
