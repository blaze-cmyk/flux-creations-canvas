// Compose a single reference keyframe (avatar + product, in-scene) for Seedance.
// POST { generationId } -> reads script + product + avatar from ms_generations,
//                          generates one composed image via Nano Banana 2 (Gemini 3.1 Flash Image),
//                          uploads it to ms-products bucket (subpath /keyframes/), and writes
//                          keyframe_url + keyframe_path back onto the generation row.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APIYI_API_KEY = Deno.env.get('APIYI_API_KEY');
const APIYI_BASE = 'https://api.apiyi.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function fetchAsInline(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const mimeType = r.headers.get('content-type') || 'image/jpeg';
    const buf = new Uint8Array(await r.arrayBuffer());
    // base64-encode without spreading (avoids stack overflow on large buffers)
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    return { mimeType, data: btoa(binary) };
  } catch (_e) {
    return null;
  }
}

function aspectFromGen(aspect: string | null): string {
  if (!aspect || aspect === 'Auto') return '9:16';
  return aspect;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (!APIYI_API_KEY) {
      return new Response(JSON.stringify({ error: 'APIYI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { generationId, productId, avatarId, prompt, aspect, format } = await req.json();

    // Resolve product/avatar/prompt — either from the generation row, or directly from args
    let resolved = { productId, avatarId, prompt, aspect, format } as {
      productId?: string; avatarId?: string; prompt?: string; aspect?: string; format?: string;
    };
    if (generationId) {
      const { data: gen } = await admin.from('ms_generations').select('*').eq('id', generationId).maybeSingle();
      if (gen) {
        resolved = {
          productId: gen.product_id ?? productId,
          avatarId: gen.avatar_id ?? avatarId,
          prompt: gen.script_text ?? gen.prompt ?? prompt,
          aspect: gen.aspect ?? aspect,
          format: gen.format ?? format,
        };
        await admin.from('ms_generations').update({ stage: 'keyframing' }).eq('id', generationId);
      }
    }

    // Pull product context + image
    const referenceParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
    let productCtx = '';
    if (resolved.productId) {
      const { data: p } = await admin.from('ms_products').select('*').eq('id', resolved.productId).maybeSingle();
      if (p) productCtx = `${p.name}${p.description ? ` — ${p.description}` : ''}${p.brand_color ? ` (color: ${p.brand_color})` : ''}`;
      const { data: imgs } = await admin
        .from('ms_product_images')
        .select('*')
        .eq('product_id', resolved.productId)
        .order('is_primary', { ascending: false })
        .limit(2);
      for (const img of imgs ?? []) {
        const { data: signed } = await admin.storage.from('ms-products').createSignedUrl(img.storage_path, 60 * 60);
        if (signed?.signedUrl) {
          const inline = await fetchAsInline(signed.signedUrl);
          if (inline) referenceParts.push({ inlineData: inline });
        }
      }
    }

    // Pull avatar context + image
    let avatarCtx = '';
    if (resolved.avatarId) {
      const { data: a } = await admin.from('ms_avatars').select('*').eq('id', resolved.avatarId).maybeSingle();
      if (a) {
        avatarCtx = `${a.name}${a.gender ? `, ${a.gender}` : ''}${(a as any).description ? `, ${(a as any).description}` : ''}`;
        let avatarUrl: string | null = null;
        if (a.public_url) {
          avatarUrl = a.public_url.startsWith('http')
            ? a.public_url
            : `${new URL(req.url).origin}${a.public_url}`;
        } else if (a.storage_path) {
          const { data: signed } = await admin.storage.from('ms-avatars').createSignedUrl(a.storage_path, 60 * 60);
          avatarUrl = signed?.signedUrl ?? null;
        }
        if (avatarUrl) {
          const inline = await fetchAsInline(avatarUrl);
          if (inline) referenceParts.push({ inlineData: inline });
        }
      }
    }

    // Build the keyframe prompt — concrete, single-frame, photoreal
    const keyframePrompt =
      `Photorealistic single still frame from a ${resolved.format ?? 'UGC'} short-form vertical ad. ` +
      (avatarCtx ? `The person in the image is ${avatarCtx}. Match their face, hair, skin tone, and overall look exactly from the reference. ` : '') +
      (productCtx ? `They are holding or using ${productCtx}. The product must look exactly like the reference image — same color, same shape, same materials, same logos, same proportions. ` : '') +
      `Composition: vertical 9:16 frame, shot on iPhone, natural daylight or warm indoor light, real skin tones, no filter, no color grading, slight handheld feel, shallow but realistic depth of field. ` +
      `The avatar and the product are both clearly visible together in the same frame, in a believable real-world setting that matches the ad's vibe. ` +
      `Photoreal, not stylized, not illustrated, not 3D-rendered. ` +
      (resolved.prompt ? `\n\nScene context from the script: ${resolved.prompt.slice(0, 1200)}` : '');

    const parts: any[] = [...referenceParts, { text: keyframePrompt }];
    const endpoint = `${APIYI_BASE}/v1beta/models/gemini-3-pro-image-preview:generateContent`;

    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${APIYI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: aspectFromGen(resolved.aspect ?? null), imageSize: '2K' },
        },
      }),
    });

    if (!aiRes.ok) {
      const errTxt = await aiRes.text();
      console.error('keyframe gemini error', aiRes.status, errTxt);
      // Try the flash image preview as fallback
      const fbRes = await fetch(
        `${APIYI_BASE}/v1beta/models/gemini-3.1-flash-image-preview:generateContent`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${APIYI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ['IMAGE'],
              imageConfig: { aspectRatio: aspectFromGen(resolved.aspect ?? null), imageSize: '2K' },
            },
          }),
        },
      );
      if (!fbRes.ok) {
        const fbErr = await fbRes.text();
        if (generationId) {
          await admin.from('ms_generations').update({ stage: 'keyframe_failed', error: `keyframe: ${fbErr.slice(0, 200)}` }).eq('id', generationId);
        }
        return new Response(JSON.stringify({ error: 'keyframe generation failed', details: fbErr }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const fbJson = await fbRes.json();
      const fbPart = fbJson?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (!fbPart) {
        return new Response(JSON.stringify({ error: 'keyframe model returned no image' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return await persistKeyframe(admin, fbPart.inlineData, generationId);
    }

    const data = await aiRes.json();
    const imgPart = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (!imgPart) {
      return new Response(JSON.stringify({ error: 'no image returned', raw: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return await persistKeyframe(admin, imgPart.inlineData, generationId);
  } catch (e) {
    console.error('generate-keyframe error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function persistKeyframe(
  admin: ReturnType<typeof createClient>,
  inline: { mimeType: string; data: string },
  generationId?: string,
) {
  const ext = inline.mimeType.includes('png') ? 'png' : 'jpg';
  const path = `keyframes/${generationId ?? crypto.randomUUID()}.${ext}`;
  const bytes = Uint8Array.from(atob(inline.data), (c) => c.charCodeAt(0));
  const { error: upErr } = await admin.storage
    .from('ms-products')
    .upload(path, bytes, { contentType: inline.mimeType, upsert: true });
  if (upErr) throw new Error(`keyframe upload failed: ${upErr.message}`);
  const { data: signed, error: signErr } = await admin.storage
    .from('ms-products')
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr || !signed?.signedUrl) throw new Error(`sign failed: ${signErr?.message ?? 'no url'}`);

  if (generationId) {
    await admin
      .from('ms_generations')
      .update({ keyframe_url: signed.signedUrl, keyframe_path: path, stage: 'keyframe_ready' })
      .eq('id', generationId);
  }
  return new Response(JSON.stringify({ ok: true, keyframeUrl: signed.signedUrl, path }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
