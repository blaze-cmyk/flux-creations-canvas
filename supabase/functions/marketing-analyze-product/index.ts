// Analyze a product image with Lovable AI vision and return { name, description }.
// POST { image_url } OR { image_base64, mime_type } -> { name, description }
// Used by Add Product modal to auto-learn what the product is right after upload.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM = `You are a product cataloguer for a short-form video ad platform.
Look at the product in the image and return:
- name: 3–8 word commercial product name (Title Case). If a brand name or model is visible on the product or packaging, USE IT VERBATIM. Otherwise infer a plausible product name from category + key visual features (color, material). Never include the word "Product".
- description: ONE concise sentence (max 30 words) describing what the product physically IS — category, color, material, finish, distinctive features, any visible text/logos. Written so a downstream image-generation model can re-render it accurately. No marketing fluff, no benefits, no adjectives like "premium" or "elegant".`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { image_url, image_base64, mime_type } = await req.json();
    if (!image_url && !image_base64) {
      return new Response(JSON.stringify({ error: 'image_url or image_base64 required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageContent = image_url
      ? { type: 'image_url', image_url: { url: image_url } }
      : { type: 'image_url', image_url: { url: `data:${mime_type || 'image/jpeg'};base64,${image_base64}` } };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: [imageContent, { type: 'text', text: 'Analyse this product. Return name + description via the tool.' }] },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'product_meta',
            description: 'Return product name and physical description.',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '3–8 word commercial product name in Title Case.' },
                description: { type: 'string', description: 'One concise physical description sentence, max 30 words.' },
              },
              required: ['name', 'description'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'product_meta' } },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const json = await aiRes.json();
    const argStr = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argStr) {
      return new Response(JSON.stringify({ error: 'no tool call returned', raw: json }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(argStr);
    return new Response(JSON.stringify({ name: parsed.name, description: parsed.description }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
