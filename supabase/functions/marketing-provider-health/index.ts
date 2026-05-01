// Periodic provider health probe for the video generation chain.
// GET  → returns cached status (fresh ≤ 60s) for AtlasCloud + fal.ai
// POST { force: true } → bypass cache and re-probe immediately
//
// Status values per provider:
//   "ok"            – key present, smoke test passed
//   "balance_error" – provider rejected with 401/402/locked balance
//   "down"          – non-balance failure (5xx, network, model 404)
//   "unconfigured"  – key missing
//
// Response shape:
//   {
//     checkedAt: number,
//     atlas:  { status, message, latencyMs },
//     fal:    { status, message, latencyMs },
//     blockGeneration: boolean   // true when both providers are unusable
//   }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ATLAS_KEY = Deno.env.get('ATLASCLOUD_API_KEY') ?? '';
const FAL_KEY = Deno.env.get('FAL_KEY') ?? '';

type ProviderStatus = 'ok' | 'balance_error' | 'down' | 'unconfigured';
interface ProbeResult {
  status: ProviderStatus;
  message: string;
  latencyMs: number;
}

interface CachedHealth {
  checkedAt: number;
  atlas: ProbeResult;
  fal: ProbeResult;
  blockGeneration: boolean;
}

let cache: CachedHealth | null = null;
const CACHE_TTL_MS = 60_000;

function isBalanceError(status: number, body: string) {
  if (status === 401 || status === 402) return true;
  return /balance|exhausted|locked|insufficient|top.?up/i.test(body);
}

async function probeAtlas(): Promise<ProbeResult> {
  if (!ATLAS_KEY) return { status: 'unconfigured', message: 'ATLASCLOUD_API_KEY not set', latencyMs: 0 };
  const started = Date.now();
  try {
    // Cheapest reliable signal: submit a tiny text-to-video, then immediately ignore the id.
    // Atlas does not bill until inference starts and we never poll.
    const res = await fetch('https://api.atlascloud.ai/api/v1/model/generateVideo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ATLAS_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'bytedance/seedance-2.0/text-to-video',
        prompt: 'health check',
        ratio: '16:9',
        duration: 5,
        resolution: '720p',
        generate_audio: false,
        watermark: false,
      }),
    });
    const text = await res.text();
    const latencyMs = Date.now() - started;
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    const code = parsed?.code ?? res.status;
    if (res.ok && (code === 200 || parsed?.data?.id)) {
      return { status: 'ok', message: 'accepted', latencyMs };
    }
    if (isBalanceError(code, text)) {
      return { status: 'balance_error', message: parsed?.msg || `balance error (${code})`, latencyMs };
    }
    return { status: 'down', message: parsed?.msg || `http ${res.status}`, latencyMs };
  } catch (e) {
    return {
      status: 'down',
      message: e instanceof Error ? e.message : 'network error',
      latencyMs: Date.now() - started,
    };
  }
}

async function probeFal(): Promise<ProbeResult> {
  if (!FAL_KEY) return { status: 'unconfigured', message: 'FAL_KEY not set', latencyMs: 0 };
  const started = Date.now();
  try {
    // Submit to the queue (free until inference). If the account is locked
    // fal returns 403 with "User is locked" in the body.
    const res = await fetch('https://queue.fal.run/bytedance/seedance-2.0/text-to-video', {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'health check',
        aspect_ratio: '16:9',
        duration: '5',
        resolution: '720p',
        generate_audio: false,
      }),
    });
    const text = await res.text();
    const latencyMs = Date.now() - started;
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    if (res.ok && parsed?.request_id) {
      return { status: 'ok', message: 'queued', latencyMs };
    }
    if (isBalanceError(res.status, text)) {
      const msg = parsed?.detail || parsed?.message || 'account locked / balance exhausted';
      return { status: 'balance_error', message: typeof msg === 'string' ? msg : JSON.stringify(msg), latencyMs };
    }
    return { status: 'down', message: parsed?.detail || `http ${res.status}`, latencyMs };
  } catch (e) {
    return {
      status: 'down',
      message: e instanceof Error ? e.message : 'network error',
      latencyMs: Date.now() - started,
    };
  }
}

async function runProbes(): Promise<CachedHealth> {
  const [atlas, fal] = await Promise.all([probeAtlas(), probeFal()]);
  const usableAtlas = atlas.status === 'ok';
  const usableFal = fal.status === 'ok';
  return {
    checkedAt: Date.now(),
    atlas,
    fal,
    blockGeneration: !usableAtlas && !usableFal,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  let force = false;
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      force = !!body?.force;
    } catch { /* ignore empty body */ }
  }

  if (!force && cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
    return new Response(JSON.stringify({ ...cache, cached: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  cache = await runProbes();
  return new Response(JSON.stringify({ ...cache, cached: false }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
