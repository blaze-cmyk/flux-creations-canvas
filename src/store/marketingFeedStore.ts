import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { MSGeneration, MSStage, MSGenStatus } from '@/store/marketingStudioStore';

const SIGNED_URL_MAX_AGE_MS = 50 * 60 * 1000;

function signedUrlExpired(url: string | null | undefined): boolean {
  if (!url || !url.includes('/storage/v1/object/sign/')) return false;
  try {
    const token = new URL(url).searchParams.get('token');
    if (!token) return true;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

function cacheBustSignedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('v', String(Math.floor(Date.now() / SIGNED_URL_MAX_AGE_MS)));
    return parsed.toString();
  } catch {
    return url;
  }
}

type State = {
  byProject: Record<string, MSGeneration[]>;
  loading: boolean;
  startPolling: (createProjectId: string) => void;
  stopPolling: () => void;
  toggleLike: (createProjectId: string, genId: string) => Promise<void>;
  removeGeneration: (createProjectId: string, genId: string) => void;
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let activeProject: string | null = null;

const mapRow = (row: any): MSGeneration => ({
  id: row.id,
  thumbUrl: cacheBustSignedUrl(row.thumb_url ?? row.keyframe_url ?? ''),
  videoUrl: row.video_url ?? undefined,
  prompt: row.prompt ?? '',
  mode: (row.format ?? 'UGC') as MSGeneration['mode'],
  surface: (row.surface ?? 'Product') as MSGeneration['surface'],
  aspect: (row.aspect ?? '9:16') as MSGeneration['aspect'],
  resolution: (row.resolution ?? '720p') as MSGeneration['resolution'],
  duration: `${row.duration_seconds ?? 8}s`,
  productId: row.product_id ?? undefined,
  avatarId: row.avatar_id ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
  submittedAt: new Date(row.updated_at ?? row.created_at).getTime(),
  status: row.status as MSGenStatus,
  stage: row.stage as MSStage,
  falRequestId: row.fal_request_id ?? undefined,
  error: row.error ?? undefined,
  liked: !!row.liked,
});

export const useMarketingFeedStore = create<State>((set, get) => ({
  byProject: {},
  loading: false,

  startPolling: (createProjectId: string) => {
    if (activeProject === createProjectId && (pollTimer || realtimeChannel)) return;
    if (pollTimer) clearInterval(pollTimer);
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    activeProject = createProjectId;

    const upsertOne = (row: any) => {
      const item = mapRow(row);
      set((s) => {
        const list = s.byProject[createProjectId] || [];
        const idx = list.findIndex((g) => g.id === item.id);
        const next = idx >= 0
          ? list.map((g) => (g.id === item.id ? { ...g, ...item } : g))
          : [item, ...list];
        return { byProject: { ...s.byProject, [createProjectId]: next } };
      });
    };

    const initialLoad = async () => {
      const { data, error } = await (supabase
        .from('ms_generations' as any)
        .select(
          'id, status, stage, video_url, thumb_url, error, fal_request_id, prompt, format, surface, aspect, resolution, duration_seconds, product_id, avatar_id, created_at, updated_at, keyframe_url, liked',
        )
        .or(`create_project_id.eq.${createProjectId},project_id.eq.${createProjectId}`)
        .order('created_at', { ascending: false })
        .limit(100) as any);
      if (error || !data) return;
      const items = (data as any[]).map(mapRow);
      set((s) => ({ byProject: { ...s.byProject, [createProjectId]: items } }));
      refreshExpiredThumbs(data as any[]);
    };

    const refreshExpiredThumbs = async (rows: any[]) => {
      const expired = rows.filter((row) => signedUrlExpired(row.thumb_url) || signedUrlExpired(row.keyframe_url));
      if (!expired.length) return;
      const productIds = Array.from(new Set(expired.map((row) => row.product_id).filter(Boolean)));
      if (!productIds.length) return;
      const { data: images } = await supabase
        .from('ms_product_images' as any)
        .select('product_id, storage_path, is_primary, created_at')
        .in('product_id', productIds)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });
      const primaryByProduct = new Map<string, string>();
      (images || []).forEach((img: any) => {
        if (!primaryByProduct.has(img.product_id)) primaryByProduct.set(img.product_id, img.storage_path);
      });
      await Promise.all(expired.map(async (row) => {
        const path = primaryByProduct.get(row.product_id);
        if (!path) return;
        const { data: signed } = await supabase.storage.from('ms-products').createSignedUrl(path, 60 * 60);
        if (!signed?.signedUrl) return;
        await supabase.from('ms_generations').update({ thumb_url: signed.signedUrl } as any).eq('id', row.id);
        upsertOne({ ...row, thumb_url: signed.signedUrl });
      }));
    };

    const kickProviderPoll = async () => {
      const list = get().byProject[createProjectId] || [];
      const inflight = list.filter(
        (g) => g.falRequestId && (g.status === 'queued' || (g.status as string) === 'processing' || g.status === 'running'),
      );
      await Promise.all(
        inflight.map((g) =>
          supabase.functions
            .invoke('marketing-generate-video', { body: { poll: g.id } })
            .catch(() => {}),
        ),
      );
    };

    initialLoad().then(() => kickProviderPoll());

    // Realtime: instant UI updates with auto-reconnect on socket errors.
    // We can't filter by an OR across two columns, so subscribe broadly and
    // filter client-side to rows tied to this create/legacy project.
    let attempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const subscribe = () => {
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      realtimeChannel = supabase
        .channel(`ms_feed:${createProjectId}`)
        .on(
          // @ts-ignore — runtime supports this event
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ms_generations' },
          (payload: any) => {
            const row = (payload.new ?? payload.old) as any;
            if (!row?.id) return;
            if (
              row.create_project_id !== createProjectId &&
              row.project_id !== createProjectId
            )
              return;
            if (payload.eventType === 'DELETE') {
              set((s) => ({
                byProject: {
                  ...s.byProject,
                  [createProjectId]: (s.byProject[createProjectId] || []).filter((g) => g.id !== row.id),
                },
              }));
              return;
            }
            upsertOne(row);
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            attempts = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (activeProject !== createProjectId) return; // stopped
            const delay = Math.min(15000, 1000 * Math.pow(2, Math.min(attempts, 4)));
            attempts += 1;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(subscribe, delay);
          }
        });
    };
    subscribe();

    // Provider-side polling (fal/Atlas are pull-only). Realtime handles UI;
    // this loop just nudges the edge function to check the provider. Slowed
    // from 4s → 15s now that the UI no longer depends on it for freshness.
    pollTimer = setInterval(kickProviderPoll, 15000);
  },

  stopPolling: () => {
    if (pollTimer) clearInterval(pollTimer);
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    pollTimer = null;
    realtimeChannel = null;
    activeProject = null;
  },

  toggleLike: async (createProjectId, genId) => {
    const list = get().byProject[createProjectId] || [];
    const target = list.find((g) => g.id === genId);
    if (!target) return;
    const next = !target.liked;
    set((s) => ({
      byProject: {
        ...s.byProject,
        [createProjectId]: list.map((g) => (g.id === genId ? { ...g, liked: next } : g)),
      },
    }));
    await supabase.from('ms_generations').update({ liked: next } as any).eq('id', genId);
  },

  removeGeneration: (createProjectId, genId) => {
    set((s) => ({
      byProject: {
        ...s.byProject,
        [createProjectId]: (s.byProject[createProjectId] || []).filter((g) => g.id !== genId),
      },
    }));
  },
}));
