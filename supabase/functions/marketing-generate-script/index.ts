// Generate a Seedance-ready prompt + script from product + avatar + format preset.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FORMAT_SYSTEM_PROMPTS: Record<string, string> = {
  UGC: `You write ultra-real UGC ad scripts for Seedance 2.0 video generation. Style: vertical 9:16 selfie-style, shot on iPhone front+back camera, natural lighting, real skin tones, no filters. Casual "showing my friend" energy. Include camera switches, micro-actions, 2-4 short spoken lines (under 10 words each), and natural pauses. NEVER write sales copy or AI slop. Sound like a real 20-something on TikTok.`,
  'UGC Virtual Try On': `You write UGC try-on ad scripts. The avatar puts on / wears the product. Vertical 9:16, iPhone front cam, fashion vlog energy. Show outfit fully, include playful interruptions, real reactions, 2-3 spoken lines.`,
  'Pro Virtual Try On': `You write polished editorial try-on scripts. Street-style energy, fashion-photographer aesthetic, slow camera pushes, light natural dialog or beat-cut silence.`,
  Unboxing: `You write satisfying ASMR unboxing scripts. Top-down or chest-cam, hands-only or face+hands. Beat-by-beat: open box, peel, reveal, rotate, final beauty shot. Crisp ASMR sound cues. Minimal or no dialog. Slow deliberate motion.`,
  Tutorial: `You write step-by-step tutorial scripts. Clear beats: hook (0-2s problem/surprise), demo (steps with hands), result (glow / before-after), CTA. Warm friendly voice, 2-4 short lines.`,
  'Hyper Motion': `You write CGI / hyper-motion product scripts. NO avatar dialog. Pure cinematic: liquid, particles, macro, 360 orbits, speed ramps, packshot. Studio background, hyper-real, 8k aesthetic.`,
  'Product Review': `You write hands-on product review scripts. Avatar holds, demonstrates, gives an honest 10-second take. Natural skepticism then convinced.`,
  'TV Spot': `You write 15s cinematic TV spot scripts. 3-act narrative, voiceover (not on-camera dialog), beautiful camera work, brand moment at the end.`,
  'Wild Card': `You write surreal, scroll-stopping ad scripts that break expectations. Surprising beat, unexpected setting, memorable single line.`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { productId, avatarId, format, surface, aspect, duration, userPrompt, exactVoiceover } = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let productCtx = '';
    const refUrls: string[] = [];
    if (productId) {
      const { data: p } = await admin.from('ms_products').select('*').eq('id', productId).maybeSingle();
      if (p) productCtx = `Product: ${p.name}\nDescription: ${p.description ?? ''}\nBrand color: ${p.brand_color ?? 'n/a'}`;
      const { data: imgs } = await admin
        .from('ms_product_images')
        .select('*')
        .eq('product_id', productId)
        .order('is_primary', { ascending: false });
      for (const img of imgs ?? []) {
        const { data: signed } = await admin.storage.from('ms-products').createSignedUrl(img.storage_path, 60 * 60);
        if (signed?.signedUrl) refUrls.push(signed.signedUrl);
      }
    }
    let avatarCtx = '';
    if (avatarId) {
      const { data: a } = await admin.from('ms_avatars').select('*').eq('id', avatarId).maybeSingle();
      if (a) {
        avatarCtx = `Avatar: ${a.name}${a.gender ? ` (${a.gender})` : ''}`;
        if (a.public_url) {
          // make absolute against site
          const url = a.public_url.startsWith('http') ? a.public_url : `${new URL(req.url).origin}${a.public_url}`;
          refUrls.push(url);
        } else if (a.storage_path) {
          const { data: signed } = await admin.storage.from('ms-avatars').createSignedUrl(a.storage_path, 60 * 60);
          if (signed?.signedUrl) refUrls.push(signed.signedUrl);
        }
      }
    }

    // If exactVoiceover, skip LLM — use the user's prompt verbatim
    if (exactVoiceover && userPrompt) {
      return new Response(
        JSON.stringify({
          prompt: userPrompt,
          script: { voiceover: userPrompt, exact: true },
          reference_urls: refUrls,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sys = FORMAT_SYSTEM_PROMPTS[format] || FORMAT_SYSTEM_PROMPTS.UGC;
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: sys },
          {
            role: 'user',
            content: `${productCtx}\n${avatarCtx}\nSurface: ${surface}\nAspect: ${aspect}\nDuration: ${duration}s\n${
              userPrompt ? `User direction: ${userPrompt}` : ''
            }\n\nReturn a single Seedance 2.0 video prompt that combines a vivid scene description, the avatar's spoken lines (in quotes), camera notes, and ambient sound. No headings, one continuous paragraph (200-400 words).`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'video_prompt',
              parameters: {
                type: 'object',
                properties: {
                  scene_description: { type: 'string' },
                  voiceover_script: { type: 'string' },
                  camera_notes: { type: 'string' },
                  on_screen_beats: { type: 'array', items: { type: 'string' } },
                  final_prompt: { type: 'string', description: 'The full single-paragraph Seedance prompt.' },
                },
                required: ['final_prompt', 'voiceover_script', 'scene_description'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'video_prompt' } },
      }),
    });
    if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const aiJson = await aiRes.json();
    const argStr = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const script = argStr ? JSON.parse(argStr) : { final_prompt: userPrompt || '' };

    return new Response(
      JSON.stringify({
        prompt: script.final_prompt || userPrompt || '',
        script,
        reference_urls: refUrls,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('generate-script error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
