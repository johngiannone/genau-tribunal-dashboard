import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Model recommendations by prompt type
const MODEL_RECOMMENDATIONS = {
  technical: {
    drafters: [
      { id: 'qwen/qwen-2.5-coder-32b-instruct', role: 'The Architect', name: 'Qwen Coder' },
      { id: 'anthropic/claude-3.5-sonnet', role: 'The Analyst', name: 'Claude 3.5' },
      { id: 'meta-llama/llama-3.3-70b-instruct', role: 'The Engineer', name: 'Llama 3.3' },
    ],
    auditor: { id: 'openai/gpt-4o', role: 'The Technical Lead', name: 'GPT-4o' }
  },
  creative: {
    drafters: [
      { id: 'google/gemini-pro-1.5', role: 'The Visionary', name: 'Gemini Pro' },
      { id: 'anthropic/claude-3.5-sonnet', role: 'The Storyteller', name: 'Claude 3.5' },
      { id: 'mistralai/mistral-large', role: 'The Innovator', name: 'Mistral Large' },
    ],
    auditor: { id: 'openai/gpt-4o', role: 'The Creative Director', name: 'GPT-4o' }
  },
  analytical: {
    drafters: [
      { id: 'openai/gpt-4o', role: 'The Strategist', name: 'GPT-4o' },
      { id: 'anthropic/claude-3.5-sonnet', role: 'The Researcher', name: 'Claude 3.5' },
      { id: 'deepseek/deepseek-r1', role: 'The Reasoner', name: 'DeepSeek R1' },
    ],
    auditor: { id: 'google/gemini-pro-1.5', role: 'The Chief Analyst', name: 'Gemini Pro' }
  },
  conversational: {
    drafters: [
      { id: 'meta-llama/llama-3.3-70b-instruct', role: 'The Conversationalist', name: 'Llama 3.3' },
      { id: 'google/gemini-flash-1.5', role: 'The Quick Responder', name: 'Gemini Flash' },
      { id: 'anthropic/claude-3.5-sonnet', role: 'The Communicator', name: 'Claude 3.5' },
    ],
    auditor: { id: 'openai/gpt-4o', role: 'The Mediator', name: 'GPT-4o' }
  },
  general: {
    drafters: [
      { id: 'openai/gpt-4o', role: 'The Chairman', name: 'GPT-4o' },
      { id: 'anthropic/claude-3.5-sonnet', role: 'The Critic', name: 'Claude 3.5' },
      { id: 'meta-llama/llama-3.3-70b-instruct', role: 'The Speedster', name: 'Llama 3.3' },
    ],
    auditor: { id: 'deepseek/deepseek-r1', role: 'The Synthesizer', name: 'DeepSeek R1' }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("=== Model Recommendation Request Started ===")

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { prompt } = await req.json()
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("Analyzing prompt type...")

    // Use fast model to classify prompt type
    const classificationResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5",
        messages: [{
          role: "system",
          content: `Classify the following prompt into ONE of these categories: technical, creative, analytical, conversational, general.

Technical: coding, debugging, system design, architecture, technical documentation
Creative: writing, brainstorming, storytelling, marketing, design concepts
Analytical: data analysis, research, strategy, problem-solving, decision-making
Conversational: casual questions, advice, opinions, general chat
General: everything else that doesn't fit above categories

Respond with ONLY the category name, nothing else.`
        }, {
          role: "user",
          content: prompt
        }]
      })
    })

    if (!classificationResponse.ok) {
      console.error("Classification failed:", classificationResponse.status)
      // Fallback to general if classification fails
      const recommendations = MODEL_RECOMMENDATIONS.general
      return new Response(
        JSON.stringify({ 
          type: 'general',
          confidence: 'low',
          recommendations,
          reason: 'Classification service unavailable. Using general-purpose models.'
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const classificationData = await classificationResponse.json()
    const classifiedType = (classificationData.choices[0].message.content || 'general')
      .toLowerCase()
      .trim() as keyof typeof MODEL_RECOMMENDATIONS

    console.log("Prompt classified as:", classifiedType)

    // Get recommendations for the classified type
    const recommendations = MODEL_RECOMMENDATIONS[classifiedType] || MODEL_RECOMMENDATIONS.general
    
    // Generate reasoning for the recommendation
    const reasonMap = {
      technical: "This prompt requires precise technical knowledge and code expertise. Qwen Coder excels at programming tasks, Claude provides rigorous analysis, and Llama offers balanced engineering insights.",
      creative: "This prompt benefits from imaginative and diverse perspectives. Gemini Pro brings visionary ideas, Claude crafts compelling narratives, and Mistral adds innovative thinking.",
      analytical: "This prompt needs deep reasoning and strategic thinking. GPT-4o provides comprehensive strategy, Claude delivers thorough research, and DeepSeek R1 offers advanced logical reasoning.",
      conversational: "This prompt requires natural, engaging dialogue. Llama excels at conversational flow, Gemini Flash provides quick responses, and Claude ensures clear communication.",
      general: "This prompt has broad requirements. Using a balanced council with GPT-4o's versatility, Claude's critical thinking, and Llama's speed for comprehensive coverage."
    }

    return new Response(
      JSON.stringify({ 
        type: classifiedType,
        confidence: 'high',
        recommendations,
        reason: reasonMap[classifiedType] || reasonMap.general
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Recommendation error:", error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})