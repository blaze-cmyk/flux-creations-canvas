// Submit a Seedance 2.0 reference-to-video job on fal.ai and persist result.
// Two routes:
//   POST {prompt, image_urls, aspect, duration_seconds, resolution, productId, avatarId, format, surface}
//        -> creates ms_generations row + queues fal job, returns {id, fal_request_id, status}
//   POST {poll: id} -> checks fal status, updates row, returns row
//   POST {retry: id} -> re-submits a failed/timeout job using stored params
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
  if (!a || a === 'Auto') return '9:16';
  return a;
}

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', msg: string, ctx: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level, msg, ...ctx, ts: new Date().toISOString() }));
}

async function submitToFal(payload: Record<string, unknown>, hasRefs: boolean) {
  const endpoint = hasRefs
    ? 'https://queue.fal.run/bytedance/seedance-2.0/reference-to-video'
    : 'https://queue.fal.run/bytedance/seedance-2.0/text-to-video';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return { ok: res.ok, json };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();

    // ---- POLL branch ----
    if (body.poll) {
      log('DEBUG', 'poll lookup', { jobId: body.poll });
      const { data: row } = await admin
        .from('ms_generations')
        .select('*')
        .eq('id', body.poll)
        .maybeSingle();

      if (!row) {
        log('WARN', 'poll: row not found, treating as queued_pending_persist', { jobId: body.poll });
        return new Response(
          JSON.stringify({ status: 'queued_pending_persist' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (row.status === 'done' || row.status === 'failed') {
        return new Response(JSON.stringify(row), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!row.fal_request_id) {
        log('WARN', 'poll: row exists but fal_request_id is null', { jobId: row.id });
        return new Response(
          JSON.stringify({ ...row, status: 'queued_pending_persist' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
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
          .update({
            status: videoUrl ? 'done' : 'failed',
            video_url: videoUrl,
            error: videoUrl ? null : 'No video returned',
          })
          .eq('id', row.id)
          .select()
          .single();
        log('INFO', 'poll: completed', { jobId: row.id, hasVideo: !!videoUrl });
        return new Response(JSON.stringify(updated), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (status.status === 'IN_PROGRESS' || status.status === 'IN_QUEUE') {
        await admin.from('ms_generations').update({ status: 'running' }).eq('id', row.id);
      }
      return new Response(JSON.stringify({ ...row, status: 'running' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- RETRY branch ----
    if (body.retry) {
      log('INFO', 'retry requested', { jobId: body.retry });
      const { data: row } = await admin
        .from('ms_generations')
        .select('*')
        .eq('id', body.retry)
        .maybeSingle();
      if (!row) {
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const refs = row.reference_paths || [];
      const payload: Record<string, unknown> = {
        prompt: row.prompt,
        aspect_ratio: aspectToRatio(row.aspect),
        duration: row.duration_seconds || 8,
        resolution: row.resolution === '1080p' ? '1080p' : '720p',
      };
      if (refs.length > 0) payload.reference_image_urls = refs.slice(0, 9);
      const { ok, json } = await submitToFal(payload, refs.length > 0);
      if (!ok) {
        log('ERROR', 'retry: fal submit failed', { jobId: row.id, json });
        await admin
          .from('ms_generations')
          .update({ status: 'failed', error: 'Fal submit failed on retry' })
          .eq('id', row.id);
        return new Response(JSON.stringify({ error: 'fal_error', details: json }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const requestId = json?.request_id;
      const { data: updated } = await admin
        .from('ms_generations')
        .update({ status: 'queued', fal_request_id: requestId, error: null, video_url: null })
        .eq('id', row.id)
        .select()
        .single();
      log('INFO', 'retry: re-submitted to fal', { jobId: row.id, falRequestId: requestId });
      return new Response(JSON.stringify(updated), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- SUBMIT branch ----
    log('INFO', 'submit: received', { hasRefs: (body.image_urls || []).length });
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
      return new Response(JSON.stringify({ error: 'prompt required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Persist row immediately so the client always has a real DB id to poll.
    const { data: row, error: insErr } = await admin
      .from('ms_generations')
      .insert({
        user_id: null,
        product_id: productId ?? null,
        avatar_id: avatarId ?? null,
        format,
        surface,
        aspect: aspectToRatio(aspect),
        duration_seconds: Math.max(3, Math.min(15, Number(duration_seconds) || 8)),
        resolution: resolution === '1080p' ? '1080p' : '720p',
        prompt,
        reference_paths: image_urls,
        status: 'queued',
      })
      .select()
      .single();
    if (insErr) {
      log('ERROR', 'submit: insert failed', { err: insErr.message });
      throw insErr;
    }
    log('INFO', 'submit: row persisted', { jobId: row.id });

    // 2) Submit to fal
    const hasRefs = image_urls.length > 0;
    const payload: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectToRatio(aspect),
      duration: row.duration_seconds,
      resolution: row.resolution,
    };
    if (hasRefs) payload.reference_image_urls = image_urls.slice(0, 9);

    const { ok, json: submitJson } = await submitToFal(payload, hasRefs);
    if (!ok) {
      log('ERROR', 'submit: fal_error', { jobId: row.id, submitJson });
      await admin
        .from('ms_generations')
        .update({ status: 'failed', error: 'Fal submit failed' })
        .eq('id', row.id);
      return new Response(
        JSON.stringify({ id: row.id, error: 'fal_error', details: submitJson }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const requestId = submitJson?.request_id;
    log('INFO', 'submit: fal request created', { jobId: row.id, falRequestId: requestId });

    const { data: updated } = await admin
      .from('ms_generations')
      .update({ fal_request_id: requestId })
      .eq('id', row.id)
      .select()
      .single();

    return new Response(
      JSON.stringify({ id: updated.id, fal_request_id: requestId, status: 'queued' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    log('ERROR', 'unhandled', { err: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
