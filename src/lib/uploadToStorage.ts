import { supabase } from '@/integrations/supabase/client';

const PROVIDER_IMAGE_LIMIT_BYTES = 9_500_000;
const MIN_IMAGE_DIMENSION = 512;
const INITIAL_JPEG_QUALITY = 0.86;
const MIN_JPEG_QUALITY = 0.5;

function getExtension(contentType: string) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('webm')) return 'webm';
  if (contentType.includes('mov') || contentType.includes('quicktime') || contentType.includes('video')) return 'mp4';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'bin';
}

function replaceExtension(fileName: string, nextExt: string) {
  return `${fileName.replace(/\.[^/.]+$/, '')}.${nextExt}`;
}

async function dataUriToFile(dataUri: string) {
  const response = await fetch(dataUri);
  const blob = await response.blob();
  const contentType = blob.type || 'application/octet-stream';

  return new File([blob], `upload.${getExtension(contentType)}`, {
    type: contentType,
  });
}

async function compressImageToLimit(file: File, maxBytes = PROVIDER_IMAGE_LIMIT_BYTES): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close();
    throw new Error('This browser could not process the reference image.');
  }

  let width = bitmap.width;
  let height = bitmap.height;
  let quality = INITIAL_JPEG_QUALITY;
  let output: Blob | null = null;

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      canvas.width = Math.max(MIN_IMAGE_DIMENSION, Math.round(width));
      canvas.height = Math.max(MIN_IMAGE_DIMENSION, Math.round(height));

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      output = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });

      if (!output) {
        throw new Error('Failed to compress the reference image.');
      }

      if (output.size <= maxBytes) {
        break;
      }

      width = Math.max(MIN_IMAGE_DIMENSION, Math.round(canvas.width * 0.88));
      height = Math.max(MIN_IMAGE_DIMENSION, Math.round(canvas.height * 0.88));
      quality = Math.max(MIN_JPEG_QUALITY, quality - 0.08);
    }
  } finally {
    bitmap.close();
  }

  if (!output) {
    throw new Error('Failed to compress the reference image.');
  }

  if (output.size > maxBytes) {
    throw new Error('Reference image is still above the provider size limit after compression. Please upload a smaller image.');
  }

  return new File([output], replaceExtension(file.name || 'reference', 'jpg'), {
    type: 'image/jpeg',
  });
}

async function uploadFile(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}.${getExtension(file.type)}`;

  const { error } = await supabase.storage.from('video-inputs').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from('video-inputs').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * If the input is a base64 data URI, upload it to the video-inputs storage bucket
 * and return the public URL. If it's already a URL, return it as-is.
 */
export async function resolveToUrl(dataOrUrl: string): Promise<string> {
  if (!dataOrUrl.startsWith('data:')) return dataOrUrl;

  let file = await dataUriToFile(dataOrUrl);

  if (file.type.startsWith('image/')) {
    file = await compressImageToLimit(file);
  }

  return uploadFile(file);
}

/**
 * Resolve an array of references (base64 or URLs) to all URLs.
 */
export async function resolveAllToUrls(refs: string[]): Promise<string[]> {
  return Promise.all(refs.filter((ref) => ref.length > 0).map(resolveToUrl));
}
