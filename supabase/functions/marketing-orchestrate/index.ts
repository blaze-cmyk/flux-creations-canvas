// Orchestrate the marketing-video pipeline as one call.
// 1) Create ms_generations row (stage=scripting)
// 2) Call marketing-generate-script -> save script_text + final prompt (stage=videoing)
// 3) Call marketing-generate-video directly with raw avatar+product refs.
//    Keyframe step is intentionally skipped — Seedance handles identity from refs (faster + cleaner).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

function aspectToRatio(a: string) {
  if (!a || a === 'Auto') return '9:16';
  return a;
}

function isValidHttpUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function uniqueValidUrls(urls: unknown[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    if (!isValidHttpUrl(raw)) continue;
    const url = String(raw).trim();
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

async function invokeFn(name: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, json, text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const {
      productId,
      avatarId,
      format,
      surface,
      aspect = '9:16',
      duration_seconds = 8,
      resolution = '720p',
      userPrompt = '',
      exactVoiceover = false,
      projectId,
    } = await req.json();

    const ratio = aspectToRatio(aspect);

    // 1) Create the row up front
    const { data: row, error: insErr } = await admin
      .from('ms_generations')
      .insert({
        user_id: null,
        project_id: projectId ?? null,
        product_id: productId ?? null,
        avatar_id: avatarId ?? null,
        format,
        surface,
        aspect: ratio,
        duration_seconds,
        resolution,
        prompt: userPrompt || '(pending script)',
        status: 'queued',
        stage: 'scripting',
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const generationId = row.id;

    // Respond immediately with the id so the client can start polling stage.
    // Continue the pipeline in the background using EdgeRuntime.waitUntil.
    const runPipeline = async () => {
      try {
        // 2) Script
        const scriptRes = await invokeFn('marketing-generate-script', {
          productId, avatarId, format, surface, aspect: ratio,
          duration: duration_seconds, userPrompt, exactVoiceover,
        });
        if (!scriptRes.ok || !scriptRes.json?.prompt) {
          throw new Error(`script failed: ${scriptRes.text.slice(0, 300)}`);
        }
        const finalPrompt: string = scriptRes.json.prompt;
        const refUrls = uniqueValidUrls(scriptRes.json.reference_urls || []);

        // Use the first product/avatar image as a placeholder thumb until the video is ready.
        const placeholderThumb = refUrls[0] ?? null;
        await admin
          .from('ms_generations')
          .update({
            prompt: finalPrompt,
            script_text: finalPrompt,
            reference_paths: refUrls,
            stage: 'videoing',
            thumb_url: placeholderThumb,
          })
          .eq('id', generationId);

        // 3) Keyframe step DISABLED — go straight to Seedance using raw product + avatar refs.
        //    This is faster, cheaper, and avoids Nano Banana Pro identity drift.
        const videoRefs = uniqueValidUrls(refUrls);

        // 4) Video submit (reuse this row)
        const vidRes = await invokeFn('marketing-generate-video', {
          reuseGenerationId: generationId,
          prompt: finalPrompt,
          image_urls: videoRefs,
          aspect: ratio,
          duration_seconds,
          resolution,
          productId,
          avatarId,
          format,
          surface,
          projectId,
          script_text: finalPrompt,
        });
        if (!vidRes.ok) {
          throw new Error(`video submit failed: ${vidRes.text.slice(0, 300)}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await admin
          .from('ms_generations')
          .update({ status: 'failed', stage: 'failed', error: msg.slice(0, 500) })
          .eq('id', generationId);
      }
    };

    // Fire-and-forget: keep the request short.
    // @ts-ignore - EdgeRuntime is available in Supabase Deno runtime
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runPipeline());
    } else {
      runPipeline();
    }

    return new Response(
      JSON.stringify({ id: generationId, stage: 'scripting', status: 'queued' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
