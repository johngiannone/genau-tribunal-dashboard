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
    console.log("Starting multi-provider model price sync...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let totalSynced = 0;
    const allModelData: any[] = [];

    // 1. Fetch from OpenRouter
    try {
      console.log("Fetching from OpenRouter...");
      const orResponse = await fetch("https://openrouter.ai/api/v1/models");
      if (orResponse.ok) {
        const { data: orModels } = await orResponse.json();
        console.log(`Fetched ${orModels?.length || 0} models from OpenRouter`);
        
        if (orModels && orModels.length > 0) {
          const orData = orModels.map((model: any) => ({
            id: model.id,
            name: model.name,
            provider: 'openrouter',
            input_price: parseFloat(model.pricing?.prompt || "0"),
            output_price: parseFloat(model.pricing?.completion || "0"),
            last_updated: new Date().toISOString(),
          }));
          allModelData.push(...orData);
        }
      }
    } catch (err) {
      console.error("OpenRouter sync error:", err);
    }

    // 2. Fetch from Together AI
    try {
      console.log("Fetching from Together AI...");
      const togetherKey = Deno.env.get("TOGETHER_API_KEY");
      if (togetherKey) {
        const togetherResponse = await fetch("https://api.together.xyz/v1/models", {
          headers: { "Authorization": `Bearer ${togetherKey}` }
        });
        if (togetherResponse.ok) {
          const togetherModels = await togetherResponse.json();
          console.log(`Fetched ${togetherModels?.length || 0} models from Together AI`);
          
          if (togetherModels && togetherModels.length > 0) {
            const togetherData = togetherModels.map((model: any) => ({
              id: model.id,
              name: model.display_name || model.id,
              provider: 'together',
              input_price: parseFloat(model.pricing?.input || "0"),
              output_price: parseFloat(model.pricing?.output || "0"),
              last_updated: new Date().toISOString(),
            }));
            allModelData.push(...togetherData);
          }
        }
      }
    } catch (err) {
      console.error("Together AI sync error:", err);
    }

    // 3. Fetch from Basten
    try {
      console.log("Fetching from Basten...");
      const bastenKey = Deno.env.get("BASTEN_API_KEY");
      if (bastenKey) {
        const bastenResponse = await fetch("https://api.basten.ai/v1/models", {
          headers: { "Authorization": `Bearer ${bastenKey}` }
        });
        if (bastenResponse.ok) {
          const bastenModels = await bastenResponse.json();
          console.log(`Fetched ${bastenModels?.data?.length || 0} models from Basten`);
          
          if (bastenModels?.data && bastenModels.data.length > 0) {
            const bastenData = bastenModels.data.map((model: any) => ({
              id: model.id,
              name: model.id,
              provider: 'basten',
              input_price: parseFloat(model.pricing?.prompt || "0"),
              output_price: parseFloat(model.pricing?.completion || "0"),
              last_updated: new Date().toISOString(),
            }));
            allModelData.push(...bastenData);
          }
        }
      }
    } catch (err) {
      console.error("Basten sync error:", err);
    }

    if (allModelData.length === 0) {
      throw new Error("No models synced from any provider");
    }

    console.log(`Upserting ${allModelData.length} total model prices...`);

    // Batch upsert all models (upsert on id + provider combination)
    const { error } = await supabase
      .from("ai_models")
      .upsert(allModelData, { onConflict: "id,provider" });

    if (error) {
      console.error("Database upsert error:", error);
      throw error;
    }

    totalSynced = allModelData.length;
    console.log(`Successfully synced ${totalSynced} model prices across all providers`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        providers: {
          openrouter: allModelData.filter(m => m.provider === 'openrouter').length,
          together: allModelData.filter(m => m.provider === 'together').length,
          basten: allModelData.filter(m => m.provider === 'basten').length,
        },
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
