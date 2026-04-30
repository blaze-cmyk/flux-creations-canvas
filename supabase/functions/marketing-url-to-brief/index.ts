// Scrape a product URL, extract images + copy, generate a structured brief, and store it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function abs(base: string, src: string) {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

function pickImages(html: string, base: string): string[] {
  const urls = new Set<string>();
  const og = [...html.matchAll(/<meta[^>]+property=["']og:image[^"']*["'][^>]+content=["']([^"']+)["']/gi)];
  for (const m of og) {
    const u = abs(base, m[1]);
    if (u) urls.add(u);
  }
  const tw = [...html.matchAll(/<meta[^>]+name=["']twitter:image[^"']*["'][^>]+content=["']([^"']+)["']/gi)];
  for (const m of tw) {
    const u = abs(base, m[1]);
    if (u) urls.add(u);
  }
  // Largest-looking <img> tags
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*>/gi)];
  for (const m of imgs.slice(0, 12)) {
    const u = abs(base, m[1]);
    if (u && !u.includes('logo') && !u.includes('icon')) urls.add(u);
  }
  return [...urls].slice(0, 8);
}

function extractMeta(html: string) {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? '';
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    '';
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? title;
  const themeColor = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
  return { title: ogTitle || title, description: desc, brand_color: themeColor };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'url required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch page
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
    });
    if (!pageRes.ok) {
      return new Response(JSON.stringify({ error: `failed to fetch (${pageRes.status})` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const html = await pageRes.text();
    const meta = extractMeta(html);
    const imageUrls = pickImages(html, url);

    // 2. LLM brief via tool calling
    const briefRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              'You convert a scraped e-commerce / app page into a tight creative brief used to generate a real-feeling video ad. Be concrete and concise. Tone should match the brand voice you infer.',
          },
          {
            role: 'user',
            content: `URL: ${url}\nTitle: ${meta.title}\nDescription: ${meta.description}\nFirst 4000 chars of HTML body text:\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000)}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'product_brief',
              description: 'Structured brief for an ad',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Short product name (max 4 words)' },
                  tagline: { type: 'string' },
                  description: { type: 'string', description: '1-2 sentence summary of the product' },
                  key_features: { type: 'array', items: { type: 'string' }, maxItems: 5 },
                  tone: { type: 'string', description: 'Voice & tone in 3-5 words' },
                  target_audience: { type: 'string' },
                  brand_colors: { type: 'array', items: { type: 'string' }, maxItems: 3 },
                },
                required: ['name', 'description', 'key_features', 'tone', 'target_audience'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'product_brief' } },
      }),
    });
    if (briefRes.status === 429) return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (briefRes.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const briefJson = await briefRes.json();
    const args = briefJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const brief = args ? JSON.parse(args) : { name: meta.title || 'New product', description: meta.description };

    // 3. Insert product + download images
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: prod, error: pErr } = await admin
      .from('ms_products')
      .insert({
        user_id: user.id,
        name: brief.name,
        source_url: url,
        brand_color: brief.brand_colors?.[0] ?? meta.brand_color ?? null,
        description: brief.description ?? meta.description,
        status: imageUrls.length === 0 ? 'failed' : 'ready',
        error: imageUrls.length === 0 ? 'Not enough product data could be found.' : null,
      })
      .select()
      .single();
    if (pErr) throw pErr;

    let savedImages = 0;
    for (let i = 0; i < Math.min(imageUrls.length, 6); i++) {
      try {
        const r = await fetch(imageUrls[i]);
        if (!r.ok) continue;
        const ct = r.headers.get('content-type') || 'image/jpeg';
        const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
        const buf = new Uint8Array(await r.arrayBuffer());
        const path = `${user.id}/${prod.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await admin.storage.from('ms-products').upload(path, buf, { contentType: ct });
        if (upErr) continue;
        await admin.from('ms_product_images').insert({
          product_id: prod.id,
          user_id: user.id,
          storage_path: path,
          is_primary: savedImages === 0,
        });
        savedImages++;
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ product_id: prod.id, brief, images_saved: savedImages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('url-to-brief error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
