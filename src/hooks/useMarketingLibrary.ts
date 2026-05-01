import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const CACHE_MAX_AGE_MS = 45 * 60 * 1000;
const PRELOAD_LIMIT = 40;

function asImageThumbUrl(url: string, width: number) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace('/storage/v1/object/sign/', '/storage/v1/render/image/sign/');
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('quality', '72');
    return parsed.toString();
  } catch {
    return url;
  }
}

function warmImageCache(urls: string[]) {
  if (typeof window === 'undefined') return;
  urls.filter(Boolean).slice(0, PRELOAD_LIMIT).forEach((url) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  });
}

async function signedBatch(paths: string[], bucket: string, thumbWidth: number) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  const signedByPath: Record<string, string> = {};
  if (!uniquePaths.length) return signedByPath;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS);
  if (!error && data) {
    data.forEach((item: any, index) => {
      const path = item.path ?? uniquePaths[index];
      signedByPath[path] = asImageThumbUrl(item.signedUrl ?? '', thumbWidth);
    });
    return signedByPath;
  }

  await Promise.all(
    uniquePaths.map(async (path) => {
      signedByPath[path] = await signed(path, bucket, thumbWidth);
    }),
  );
  return signedByPath;
}

export interface DBAvatar {
  id: string;
  name: string;
  gender: string | null;
  storage_path: string | null;
  public_url: string | null;
  is_builtin: boolean;
  user_id: string | null;
  created_at: string;
  thumb: string; // resolved url
}

export interface DBProduct {
  id: string;
  name: string;
  source_url: string | null;
  brand_color: string | null;
  description: string | null;
  status: string;
  error: string | null;
  created_at: string;
  primary_thumb: string | null;
  images: { id: string; storage_path: string; signed_url: string; is_primary: boolean }[];
}

async function signed(path: string, bucket: string, thumbWidth = 360) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return asImageThumbUrl(data?.signedUrl ?? '', thumbWidth);
}

// Module-level cache so reopening the avatar picker shows results instantly.
let _avatarsCache: DBAvatar[] | null = null;
let _avatarsLoadedAt = 0;

export function useAvatars() {
  const [avatars, setAvatars] = useState<DBAvatar[]>(() => _avatarsCache ?? []);
  const [loading, setLoading] = useState(_avatarsCache === null);

  const refresh = useCallback(async (options: { force?: boolean } = {}) => {
    const cacheIsFresh = _avatarsCache && Date.now() - _avatarsLoadedAt < CACHE_MAX_AGE_MS;
    if (!options.force && cacheIsFresh) {
      setAvatars(_avatarsCache);
      setLoading(false);
      warmImageCache(_avatarsCache.map((avatar) => avatar.thumb));
      return;
    }

    if (_avatarsCache === null) setLoading(true);
    const { data, error } = await supabase
      .from('ms_avatars')
      .select('*')
      // user-created avatars first, newest at the top, then builtins
      .order('is_builtin', { ascending: true })
      .order('created_at', { ascending: false });
    if (error || !data) {
      setAvatars([]);
      setLoading(false);
      return;
    }
    const signedByPath = await signedBatch(
      data.map((a: any) => (!a.public_url && a.storage_path ? a.storage_path : '')).filter(Boolean),
      'ms-avatars',
      320,
    );
    const resolved: DBAvatar[] = data.map((a: any) => ({
      ...a,
      thumb: a.public_url || (a.storage_path ? signedByPath[a.storage_path] : '') || '',
    }));
    _avatarsCache = resolved;
    _avatarsLoadedAt = Date.now();
    setAvatars(resolved);
    warmImageCache(resolved.map((avatar) => avatar.thumb));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadAvatar = useCallback(
    async (file: File, name: string, gender: 'male' | 'female' | 'other' = 'female') => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      const folder = uid ?? 'anon';
      const ext = file.name.split('.').pop() || 'png';
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('ms-avatars').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: created, error: insErr } = await supabase
        .from('ms_avatars')
        .insert({ name, gender, storage_path: path, user_id: uid, is_builtin: false })
        .select('*')
        .single();
      if (insErr) throw insErr;

      const resolvedCreated: DBAvatar = {
        ...created,
        thumb: created.public_url || (created.storage_path ? await signed(created.storage_path, 'ms-avatars', 320) : ''),
      } as DBAvatar;

      setAvatars((current) => [resolvedCreated, ...current.filter((avatar) => avatar.id !== resolvedCreated.id)]);
      await refresh({ force: true });

      // Fire-and-forget: generate the ElevenLabs voice sample so Seedance has
      // a per-avatar reference voice instead of falling back to whatever the
      // last-cached voice was. We don't await — modal closes immediately and
      // the clip lands by the time the user queues a generation.
      supabase.functions
        .invoke('marketing-generate-voice-sample', { body: { avatarId: created.id } })
        .then(({ error }) => {
          if (error) console.warn('[avatar] voice sample generation failed', error);
          else refresh({ force: true });
        })
        .catch((err) => console.warn('[avatar] voice sample invoke failed', err));

      return resolvedCreated;
    },
    [refresh],
  );

  return { avatars, loading, refresh, uploadAvatar };
}

// Module-level cache so reopening the product picker shows results
// instantly instead of flashing "Loading…" while we re-query.
let _productsCache: DBProduct[] | null = null;
let _productsLoadedAt = 0;

export function useProducts() {
  const [products, setProducts] = useState<DBProduct[]>(() => _productsCache ?? []);
  const [loading, setLoading] = useState(_productsCache === null);

  const refresh = useCallback(async (options: { force?: boolean } = {}) => {
    const cacheIsFresh = _productsCache && Date.now() - _productsLoadedAt < CACHE_MAX_AGE_MS;
    if (!options.force && cacheIsFresh) {
      setProducts(_productsCache);
      setLoading(false);
      warmImageCache(_productsCache.map((product) => product.primary_thumb || ''));
      return;
    }

    if (_productsCache === null) setLoading(true);
    const { data: prods } = await supabase
      .from('ms_products')
      .select('*')
      .order('created_at', { ascending: false });
    const productList = prods ?? [];

    // Fetch ALL images in one query, group client-side — avoids N round trips.
    const productIds = productList.map((p: any) => p.id);
    const imagesByProduct: Record<string, any[]> = {};
    if (productIds.length > 0) {
      const { data: allImgs } = await supabase
        .from('ms_product_images')
        .select('*')
        .in('product_id', productIds);
      for (const img of allImgs ?? []) {
        (imagesByProduct[img.product_id] ||= []).push(img);
      }
    }

    // The picker only needs the visible primary thumbnail, so sign one image
    // per product in a single batch and request a small rendered thumbnail URL.
    const primaryRows = Object.values(imagesByProduct).map((imgs) => imgs.find((img) => img.is_primary) || imgs[0]).filter(Boolean);
    const signedByPath = await signedBatch(primaryRows.map((img) => img.storage_path), 'ms-products', 360);

    const list: DBProduct[] = productList.map((p: any) => {
      const imgs = imagesByProduct[p.id] ?? [];
      const resolved = imgs.map((i: any) => ({
        id: i.id,
        storage_path: i.storage_path,
        is_primary: i.is_primary,
        signed_url: signedByPath[i.storage_path] ?? '',
      }));
      const primary = resolved.find((r) => r.is_primary) || resolved[0];
      return { ...p, images: resolved, primary_thumb: primary?.signed_url ?? null };
    });
    _productsCache = list;
    _productsLoadedAt = Date.now();
    setProducts(list);
    warmImageCache(list.map((product) => product.primary_thumb || ''));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadProductImages = useCallback(
    async (files: File[], name: string, description?: string) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      const folder = uid ?? 'anon';
      const { data: prod, error: pErr } = await supabase
        .from('ms_products')
        .insert({ user_id: uid, name, description: description ?? null, status: 'ready' })
        .select()
        .single();
      if (pErr || !prod) throw pErr || new Error('Failed to create product');
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split('.').pop() || 'png';
        const path = `${folder}/${prod.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('ms-products').upload(path, f);
        if (upErr) throw upErr;
        await supabase
          .from('ms_product_images')
          .insert({ product_id: prod.id, user_id: uid, storage_path: path, is_primary: i === 0 });
      }
      await refresh({ force: true });
      return prod.id as string;
    },
    [refresh],
  );

  const createFromUrl = useCallback(
    async (url: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-url-to-brief', {
        body: { url },
      });
      if (error) throw error;
      await refresh({ force: true });
      return data?.product_id as string | undefined;
    },
    [refresh],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      // best-effort: remove image rows + product row (storage objects left to lifecycle)
      await supabase.from('ms_product_images').delete().eq('product_id', id);
      await supabase.from('ms_products').delete().eq('id', id);
      setProducts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        _productsCache = next;
        return next;
      });
    },
    [],
  );

  return { products, loading, refresh, uploadProductImages, createFromUrl, deleteProduct };
}
