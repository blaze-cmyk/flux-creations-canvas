// Submit a Seedance 2.0 reference-to-video job on fal.ai and persist result.
// Two routes:
//   POST {prompt, image_urls, aspect, duration_seconds, resolution, productId, avatarId, format, surface}
//        -> creates ms_generations row + queues fal job, returns {id, status}
//   POST {poll: id} -> checks fal status, updates row, returns row
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FAL_KEY = Deno.env.get('FAL_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function aspectToRatio(a: string) {
  // Seedance accepts strings like "16:9", "9:16", "1:1", "4:3", "3:4", "21:9". Auto -> 9:16 default.
  if (!a || a === 'Auto') return '9:16';
  return a;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();

    // ---- POLL branch ----
    if (body.poll) {
      const { data: row } = await admin.from('ms_generations').select('*').eq('id', body.poll).maybeSingle();
      if (!row) {
        // Row not yet persisted (client-side optimistic id). Treat as still queued.
        return new Response(JSON.stringify({ status: 'queued' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (row.status === 'done' || row.status === 'failed') {
        return new Response(JSON.stringify(row), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // poll fal
      const statusRes = await fetch(
        `https://queue.fal.run/bytedance/seedance-2.0/requests/${row.fal_request_id}/status`,
        { headers: { Authorization: `Key ${FAL_KEY}` } },
      );
      const status = await statusRes.json();
      if (status.status === 'COMPLETED') {
        const respRes = await fetch(
          `https://queue.fal.run/bytedance/seedance-2.0/requests/${row.fal_request_id}`,
          { headers: { Authorization: `Key ${FAL_KEY}` } },
        );
        const resp = await respRes.json();
        const videoUrl = resp?.video?.url || resp?.video_url || resp?.output?.video?.url || null;
        const { data: updated } = await admin
          .from('ms_generations')
          .update({ status: videoUrl ? 'done' : 'failed', video_url: videoUrl, error: videoUrl ? null : 'No video returned' })
          .eq('id', row.id)
          .select()
          .single();
        return new Response(JSON.stringify(updated), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (status.status === 'IN_PROGRESS' || status.status === 'IN_QUEUE') {
        await admin.from('ms_generations').update({ status: 'processing' }).eq('id', row.id);
      }
      return new Response(JSON.stringify({ ...row, status: 'processing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---- SUBMIT branch ----
    const {
      prompt,
      image_urls = [],
      aspect = '9:16',
      duration_seconds = 8,
      resolution = '720p',
      productId,
      avatarId,
      format,
      surface,
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Choose endpoint: reference-to-video when we have refs, otherwise text-to-video.
    const hasRefs = image_urls.length > 0;
    const endpoint = hasRefs
      ? 'https://queue.fal.run/bytedance/seedance-2.0/reference-to-video'
      : 'https://queue.fal.run/bytedance/seedance-2.0/text-to-video';

    const payload: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectToRatio(aspect),
      duration: Math.max(3, Math.min(15, Number(duration_seconds) || 8)),
      resolution: resolution === '1080p' ? '1080p' : '720p',
    };
    if (hasRefs) payload.reference_image_urls = image_urls.slice(0, 9);

    const submitRes = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const submitJson = await submitRes.json();
    if (!submitRes.ok) {
      return new Response(JSON.stringify({ error: 'fal_error', details: submitJson }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const requestId = submitJson?.request_id;

    const { data: row, error: insErr } = await admin
      .from('ms_generations')
      .insert({
        user_id: null,
        product_id: productId ?? null,
        avatar_id: avatarId ?? null,
        format,
        surface,
        aspect: aspectToRatio(aspect),
        duration_seconds: payload.duration,
        resolution: payload.resolution,
        prompt,
        reference_paths: image_urls,
        fal_request_id: requestId,
        status: 'queued',
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ id: row.id, status: 'queued', fal_request_id: requestId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-video error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
