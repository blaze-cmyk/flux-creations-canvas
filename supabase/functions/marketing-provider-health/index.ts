// Non-billing health probe for Marketing Studio providers.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ATLAS_KEY = Deno.env.get('ATLASCLOUD_API_KEY') ?? '';
const FAL_KEY = Deno.env.get('FAL_KEY') ?? '';

type ProviderStatus = 'ok' | 'balance_error' | 'down' | 'unconfigured';
interface ProbeResult { status: ProviderStatus; message: string; latencyMs: number; }
interface CachedHealth { checkedAt: number; atlas: ProbeResult; fal: ProbeResult; blockGeneration: boolean; }

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
    const res = await fetch('https://api.atlascloud.ai/api/v1/model/prediction/health-check', {
      headers: { Authorization: `Bearer ${ATLAS_KEY}` },
    });
    const text = await res.text();
    const latencyMs = Date.now() - started;
    if (res.status === 401 || res.status === 403) return { status: 'down', message: 'auth rejected', latencyMs };
    if (isBalanceError(res.status, text)) return { status: 'balance_error', message: 'balance/auth issue', latencyMs };
    return { status: 'ok', message: 'configured', latencyMs };
  } catch (e) {
    return { status: 'down', message: e instanceof Error ? e.message : 'network error', latencyMs: Date.now() - started };
  }
}

async function probeFal(): Promise<ProbeResult> {
  if (!FAL_KEY) return { status: 'unconfigured', message: 'FAL_KEY not set', latencyMs: 0 };
  const started = Date.now();
  try {
    const res = await fetch('https://queue.fal.run/bytedance/seedance-2.0/reference-to-video/requests/health-check/status', {
      headers: { Authorization: `Key ${FAL_KEY}`, Accept: 'application/json' },
    });
    const text = await res.text();
    const latencyMs = Date.now() - started;
    if (res.status === 401 || res.status === 403) return { status: 'down', message: 'auth rejected', latencyMs };
    if (isBalanceError(res.status, text)) return { status: 'balance_error', message: 'balance/auth issue', latencyMs };
    return { status: 'ok', message: 'configured', latencyMs };
  } catch (e) {
    return { status: 'down', message: e instanceof Error ? e.message : 'network error', latencyMs: Date.now() - started };
  }
}

async function runProbes(): Promise<CachedHealth> {
  const [atlas, fal] = await Promise.all([probeAtlas(), probeFal()]);
  return { checkedAt: Date.now(), atlas, fal, blockGeneration: atlas.status !== 'ok' && fal.status !== 'ok' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  let force = false;
  if (req.method === 'POST') {
    try { force = !!(await req.json())?.force; } catch { /* ignore */ }
  }
  if (!force && cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
    return new Response(JSON.stringify({ ...cache, cached: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  cache = await runProbes();
  return new Response(JSON.stringify({ ...cache, cached: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
