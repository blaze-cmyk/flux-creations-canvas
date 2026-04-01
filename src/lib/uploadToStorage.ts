import { supabase } from '@/integrations/supabase/client';

/**
 * If the input is a base64 data URI, upload it to the video-inputs storage bucket
 * and return the public URL. If it's already a URL, return it as-is.
 */
export async function resolveToUrl(dataOrUrl: string): Promise<string> {
  if (!dataOrUrl.startsWith('data:')) return dataOrUrl;

  const match = dataOrUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return dataOrUrl;

  const contentType = match[1];
  const base64Data = match[2];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const ext = contentType.includes('png') ? 'png'
    : contentType.includes('webp') ? 'webp'
    : contentType.includes('mp4') ? 'mp4'
    : contentType.includes('video') ? 'mp4'
    : 'jpg';

  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('video-inputs').upload(path, bytes, {
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('video-inputs').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Resolve an array of references (base64 or URLs) to all URLs.
 */
export async function resolveAllToUrls(refs: string[]): Promise<string[]> {
  return Promise.all(refs.filter(r => r.length > 0).map(resolveToUrl));
}
