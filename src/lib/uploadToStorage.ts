import { supabase } from '@/integrations/supabase/client';

const PROVIDER_IMAGE_LIMIT_BYTES = 9_500_000;
const MAX_PROVIDER_DIMENSION = 3500;
const MIN_IMAGE_DIMENSION = 300;
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

export type CompressionResult = {
  file: File;
  wasCompressed: boolean;
  originalSize: number;
  finalSize: number;
};

async function compressImageToLimit(file: File, maxBytes = PROVIDER_IMAGE_LIMIT_BYTES): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!file.type.startsWith('image/')) {
    return { file, wasCompressed: false, originalSize, finalSize: file.size };
  }

  const bitmap = await createImageBitmap(file);
  const needsOptimization =
    file.size > maxBytes ||
    bitmap.width > MAX_PROVIDER_DIMENSION ||
    bitmap.height > MAX_PROVIDER_DIMENSION;

  if (!needsOptimization) {
    bitmap.close();
    return { file, wasCompressed: false, originalSize, finalSize: file.size };
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close();
    throw new Error('This browser could not process the reference image.');
  }

  const initialScale = Math.min(1, MAX_PROVIDER_DIMENSION / bitmap.width, MAX_PROVIDER_DIMENSION / bitmap.height);
  let width = Math.max(MIN_IMAGE_DIMENSION, Math.round(bitmap.width * initialScale));
  let height = Math.max(MIN_IMAGE_DIMENSION, Math.round(bitmap.height * initialScale));
  let quality = INITIAL_JPEG_QUALITY;
  let output: Blob | null = null;

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      canvas.width = width;
      canvas.height = height;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      output = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });

      if (!output) {
        throw new Error('Failed to optimize the reference image.');
      }

      if (output.size <= maxBytes && canvas.width <= MAX_PROVIDER_DIMENSION && canvas.height <= MAX_PROVIDER_DIMENSION) {
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
    throw new Error('Failed to optimize the reference image.');
  }

  if (output.size > maxBytes || width > MAX_PROVIDER_DIMENSION || height > MAX_PROVIDER_DIMENSION) {
    throw new Error('Reference image still exceeds provider limits after optimization. Please upload a smaller image.');
  }

  const optimizedFile = new File([output], replaceExtension(file.name || 'reference', 'jpg'), {
    type: 'image/jpeg',
  });

  return {
    file: optimizedFile,
    wasCompressed: true,
    originalSize,
    finalSize: optimizedFile.size,
  };
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

export type ResolveResult = {
  url: string;
  wasCompressed: boolean;
  originalSize: number;
  finalSize: number;
};

export async function resolveToUrl(dataOrUrl: string): Promise<string> {
  const result = await resolveToUrlWithMeta(dataOrUrl);
  return result.url;
}

export async function resolveToUrlWithMeta(dataOrUrl: string): Promise<ResolveResult> {
  if (!dataOrUrl.startsWith('data:')) {
    return { url: dataOrUrl, wasCompressed: false, originalSize: 0, finalSize: 0 };
  }

  let file = await dataUriToFile(dataOrUrl);
  let wasCompressed = false;
  let originalSize = file.size;
  let finalSize = file.size;

  if (file.type.startsWith('image/')) {
    const result = await compressImageToLimit(file);
    file = result.file;
    wasCompressed = result.wasCompressed;
    originalSize = result.originalSize;
    finalSize = result.finalSize;
  }

  const url = await uploadFile(file);
  return { url, wasCompressed, originalSize, finalSize };
}

export async function resolveAllToUrls(
  refs: string[],
  onCompressed?: (index: number, originalSize: number, finalSize: number) => void,
): Promise<string[]> {
  const filtered = refs.filter((ref) => ref.length > 0);
  const results = await Promise.all(filtered.map((ref) => resolveToUrlWithMeta(ref)));

  results.forEach((result, index) => {
    if (result.wasCompressed && onCompressed) {
      onCompressed(index, result.originalSize, result.finalSize);
    }
  });

  return results.map((result) => result.url);
}
