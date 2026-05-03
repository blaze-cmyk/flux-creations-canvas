// Streams a remote video URL through this edge function so the browser can
// play / download it without being blocked by the upstream CDN's CORS or
// content-disposition behavior. Supports HTTP Range requests for video seeking.
import { assertUrlIsPublic } from '../_shared/ssrf.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, range, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
};

// Allowlist of CDN/storage hostnames we proxy media from.
const ALLOWED_HOST_SUFFIXES = [
  '.fal.media',
  '.fal.ai',
  '.runware.ai',
  '.klingai.com',
  '.kling.ai',
  '.atlascloud.ai',
  '.apiyi.com',
  '.evolink.ai',
  '.supabase.co',
  '.supabase.in',
  '.lovable.app',
  '.lovable.dev',
  '.cloudfront.net',
  '.amazonaws.com',
  '.googleusercontent.com',
  '.googleapis.com',
  '.r2.dev',
  '.r2.cloudflarestorage.com',
  '.bytedanceapi.com',
  '.bytedance.com',
  '.volccdn.com',
  '.byteimg.com',
];

const ALLOWED_CONTENT_TYPE_PREFIXES = ['video/', 'audio/', 'image/', 'application/octet-stream'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const u = new URL(req.url);
    const target = u.searchParams.get('url');
    const download = u.searchParams.get('download'); // optional filename
    if (!target) {
      return new Response('missing url', { status: 400, headers: corsHeaders });
    }
    let parsed: URL;
    try { parsed = new URL(target); } catch {
      return new Response('invalid url', { status: 400, headers: corsHeaders });
    }
    const ssrfErr = await assertUrlIsPublic(parsed, { allowedHostSuffixes: ALLOWED_HOST_SUFFIXES });
    if (ssrfErr) {
      console.warn(`Blocked proxy fetch: ${ssrfErr} (${parsed.hostname})`);
      return new Response('forbidden', { status: 403, headers: corsHeaders });
    }

    const upstreamHeaders: HeadersInit = {};
    const range = req.headers.get('range');
    if (range) (upstreamHeaders as any).Range = range;

    const upstream = await fetch(target, { headers: upstreamHeaders });
    const upstreamCT = (upstream.headers.get('content-type') || '').toLowerCase();
    const ctOk = ALLOWED_CONTENT_TYPE_PREFIXES.some((p) => upstreamCT.startsWith(p));
    if (!ctOk && upstream.status < 400) {
      console.warn(`Rejected upstream content-type: ${upstreamCT}`);
      return new Response('unsupported content-type', { status: 415, headers: corsHeaders });
    }
    const headers = new Headers(corsHeaders);
    const passthrough = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'last-modified', 'etag'];
    for (const h of passthrough) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.get('content-type')) headers.set('content-type', 'video/mp4');
    if (download) {
      headers.set('content-disposition', `attachment; filename="${download.replace(/[^a-z0-9._-]/gi, '_')}"`);
    } else {
      headers.set('content-disposition', 'inline');
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    return new Response(`proxy error: ${e instanceof Error ? e.message : 'unknown'}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
