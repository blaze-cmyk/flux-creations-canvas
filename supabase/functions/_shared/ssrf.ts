// Shared SSRF protection helpers for edge functions that fetch user-supplied URLs.
// Resolves the hostname and rejects private, loopback, link-local, and reserved ranges.

const PRIVATE_V4_RANGES: Array<[number, number, number]> = [
  // [a, b, mask] — match if (ip[0] === a) and (b<0 || ip[1] === b) etc.
];

function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast + reserved
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped
    const v4 = lower.slice(7);
    return isPrivateIPv4(v4);
  }
  return false;
}

const HOSTNAME_BLOCKLIST = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
]);

export interface SsrfCheckOptions {
  /** Optional allowlist of hostname suffixes (e.g. ".fal.media"). If set, only these pass. */
  allowedHostSuffixes?: string[];
}

/**
 * Validates a URL is safe to fetch from server-side. Returns null if safe, or an error string.
 */
export async function assertUrlIsPublic(url: URL, opts: SsrfCheckOptions = {}): Promise<string | null> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'unsupported protocol';
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return 'missing hostname';
  if (HOSTNAME_BLOCKLIST.has(host)) return 'blocked hostname';

  // If host is already a literal IP, check directly.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isPrivateIPv4(host)) return 'private ip address';
  } else if (host.includes(':')) {
    if (isPrivateIPv6(host)) return 'private ip address';
  } else {
    // Resolve via Deno DNS
    try {
      const records = await Promise.allSettled([
        Deno.resolveDns(host, 'A'),
        Deno.resolveDns(host, 'AAAA'),
      ]);
      const ips: string[] = [];
      for (const r of records) {
        if (r.status === 'fulfilled') ips.push(...r.value);
      }
      if (ips.length === 0) return 'dns resolution failed';
      for (const ip of ips) {
        if (ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip)) {
          return 'resolves to private ip';
        }
      }
    } catch {
      return 'dns resolution failed';
    }
  }

  if (opts.allowedHostSuffixes && opts.allowedHostSuffixes.length > 0) {
    const ok = opts.allowedHostSuffixes.some(
      (suf) => host === suf.replace(/^\./, '') || host.endsWith(suf.startsWith('.') ? suf : `.${suf}`),
    );
    if (!ok) return 'host not in allowlist';
  }
  return null;
}

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export function isAllowedImageContentType(ct: string | null): boolean {
  if (!ct) return false;
  const base = ct.split(';')[0].trim().toLowerCase();
  return IMAGE_MIME.has(base);
}
