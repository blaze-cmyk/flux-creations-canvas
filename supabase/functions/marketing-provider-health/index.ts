// Non-billing health probe for Marketing Studio video provider (AtlasCloud only).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ATLAS_KEY = Deno.env.get('ATLASCLOUD_API_KEY') ?? '';

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

async function runProbes(): Promise<CachedHealth> {
  const atlas = await probeAtlas();
  // fal is no longer used by the Marketing Studio video pipeline. Keep the
  // shape so the UI doesn't break, but mark it as unconfigured/not used.
  const fal: ProbeResult = { status: 'unconfigured', message: 'not used (AtlasCloud-only pipeline)', latencyMs: 0 };
  return { checkedAt: Date.now(), atlas, fal, blockGeneration: atlas.status !== 'ok' };
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
