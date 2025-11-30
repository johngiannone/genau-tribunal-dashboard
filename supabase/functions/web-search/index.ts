import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchResult {
  query: string
  answer: string
  sources?: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { queries } = await req.json()
    
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return new Response(
        JSON.stringify({ error: "Queries array is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!PERPLEXITY_API_KEY) {
      console.error("PERPLEXITY_API_KEY not configured")
      return new Response(
        JSON.stringify({ error: "Search service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("Executing parallel web searches for queries:", queries)

    // Execute all searches in parallel
    const searchPromises = queries.map(async (query: string): Promise<SearchResult> => {
      try {
        console.log(`Searching: "${query}"`)
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-large-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a precise research assistant. Provide factual, up-to-date information with sources when possible. Be concise but comprehensive.'
              },
              {
                role: 'user',
                content: query
              }
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 1000,
            return_images: false,
            return_related_questions: false,
            search_recency_filter: 'month',
            frequency_penalty: 1,
            presence_penalty: 0
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Perplexity API error for "${query}":`, response.status, errorText)
          return {
            query,
            answer: `[Search failed: ${response.status}]`
          }
        }

        const data = await response.json()
        const answer = data.choices?.[0]?.message?.content || '[No results]'
        
        console.log(`✓ Search completed for "${query}"`)
        
        return {
          query,
          answer
        }
      } catch (error) {
        console.error(`Search error for "${query}":`, error)
        return {
          query,
          answer: `[Search error: ${error instanceof Error ? error.message : 'Unknown error'}]`
        }
      }
    })

    // Wait for all searches to complete
    const results = await Promise.all(searchPromises)
    
    console.log(`Completed ${results.length} searches`)

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Web search error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
