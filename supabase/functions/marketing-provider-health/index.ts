// AtlasCloud health probe for Marketing Studio video generation.
// GET → returns cached status (≤ 60s) for AtlasCloud Seedance.
// POST { force: true } → bypass cache.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ATLAS_KEY = Deno.env.get('ATLASCLOUD_API_KEY') ?? '';

type ProviderStatus = 'ok' | 'balance_error' | 'down' | 'unconfigured';
interface ProbeResult { status: ProviderStatus; message: string; latencyMs: number; }
interface CachedHealth { checkedAt: number; atlas: ProbeResult; blockGeneration: boolean; }

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
    const res = await fetch('https://api.atlascloud.ai/api/v1/model/generateVideo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ATLAS_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'bytedance/seedance-2.0/text-to-video',
        prompt: 'health check',
        duration: 5,
        resolution: '720p',
        ratio: 'adaptive',
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
      return { status: 'balance_error', message: parsed?.message || parsed?.msg || `balance error (${code})`, latencyMs };
    }
    return { status: 'down', message: parsed?.message || parsed?.msg || `http ${res.status}`, latencyMs };
  } catch (e) {
    return { status: 'down', message: e instanceof Error ? e.message : 'network error', latencyMs: Date.now() - started };
  }
}

async function runProbes(): Promise<CachedHealth> {
  const atlas = await probeAtlas();
  return { checkedAt: Date.now(), atlas, blockGeneration: atlas.status !== 'ok' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  let force = false;
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      force = !!body?.force;
    } catch { /* ignore */ }
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
