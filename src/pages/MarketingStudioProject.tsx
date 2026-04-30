import { useParams, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { MarketingStudioLayout } from '@/components/marketingstudio/MarketingStudioLayout';
import { PromptBar } from '@/components/marketingstudio/PromptBar';
import { useMarketingStudioStore, MSGeneration } from '@/store/marketingStudioStore';
import { Heart, Maximize2, Play, Loader2, AlertCircle } from 'lucide-react';
import { VideoDetailModal } from '@/components/marketingstudio/VideoDetailModal';
import { supabase } from '@/integrations/supabase/client';

export default function MarketingStudioProject() {
  const { slug } = useParams();
  const project = useMarketingStudioStore((s) => s.getProjectBySlug(slug || ''));
  const toggleLike = useMarketingStudioStore((s) => s.toggleLike);
  const updateGeneration = useMarketingStudioStore((s) => s.updateGeneration);
  const [tab, setTab] = useState<'all' | 'liked'>('all');
  const [selected, setSelected] = useState<MSGeneration | null>(null);
  const polled = useRef<Set<string>>(new Set());

  // Poll active generations every 4s
  useEffect(() => {
    if (!project) return;
    const interval = setInterval(async () => {
      const active = project.generations.filter(
        (g) => (g.status === 'queued' || g.status === 'running') && /^[0-9a-f-]{36}$/i.test(g.id),
      );
      for (const g of active) {
        try {
          const { data } = await supabase.functions.invoke('marketing-generate-video', {
            body: { poll: g.id },
          });
          if (!data) continue;
          if (data.status === 'done') {
            updateGeneration(project.id, g.id, {
              status: 'done',
              videoUrl: data.video_url,
              thumbUrl: data.thumb_url || g.thumbUrl,
            });
          } else if (data.status === 'failed') {
            updateGeneration(project.id, g.id, { status: 'failed', error: data.error });
          }
        } catch (_) {}
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [project, updateGeneration]);

  if (!project) return <Navigate to="/marketingstudio" replace />;

  const items = tab === 'all' ? project.generations : project.generations.filter((g) => g.liked);

  const tabsRight = (
    <div className="flex items-center gap-1 p-1 rounded-full bg-ms-surface-2 border border-ms-border">
      <button
        onClick={() => setTab('all')}
        className={`px-3 h-7 rounded-full text-xs font-medium ${
          tab === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        All
      </button>
      <button
        onClick={() => setTab('liked')}
        className={`flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium ${
          tab === 'liked' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Heart className="w-3 h-3" /> Liked
      </button>
      <button className="grid place-items-center w-7 h-7 rounded-full text-muted-foreground hover:text-foreground">
        <Maximize2 className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <MarketingStudioLayout showBack title={project.name} rightSlot={tabsRight}>
      <div className="px-3 md:px-5 pb-44">
        {items.length === 0 ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ms-cta to-ms-cta-2 grid place-items-center mb-4 shadow-[0_10px_30px_-10px_hsl(var(--ms-cta)/0.6)]">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="text-lg font-semibold text-foreground">No generations yet</div>
            <div className="text-sm text-muted-foreground mt-1">Describe your ad below to get started.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {items.map((g) => {
              const isPending = g.status === 'queued' || g.status === 'running';
              const isFailed = g.status === 'failed';
              return (
                <button
                  key={g.id}
                  onClick={() => !isPending && !isFailed && setSelected(g)}
                  className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-ms-surface-2 ring-1 ring-ms-border hover:ring-foreground/30 transition-all text-left"
                >
                  {g.thumbUrl ? (
                    <img
                      src={g.thumbUrl}
                      alt=""
                      className={`w-full h-full object-cover ${isPending ? 'opacity-30 blur-sm' : ''}`}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-ms-surface-2 to-ms-surface" />
                  )}

                  {isPending && (
                    <>
                      <div className="absolute inset-0 ms-shimmer" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-foreground/90">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <div className="text-[11px] font-medium tracking-wide uppercase">
                          {g.status === 'queued' ? 'Queued' : 'Rendering…'}
                        </div>
                        <div className="px-3 text-[10px] text-muted-foreground line-clamp-2 text-center">
                          {g.prompt}
                        </div>
                      </div>
                    </>
                  )}

                  {isFailed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-foreground/90 px-3 text-center">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                      <div className="text-[11px] font-semibold">Generation failed</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-3">
                        {g.error || 'Try again'}
                      </div>
                    </div>
                  )}

                  {!isPending && !isFailed && (
                    <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                      <div className="grid place-items-center w-12 h-12 rounded-full bg-white/90">
                        <Play className="w-5 h-5 text-black fill-black" />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(project.id, g.id);
                    }}
                    className="absolute bottom-2 right-2 grid place-items-center w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60"
                  >
                    <Heart className={`w-3.5 h-3.5 ${g.liked ? 'fill-ms-cta text-ms-cta' : ''}`} />
                  </button>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating prompt bar */}
      <div className="fixed bottom-4 left-0 md:left-64 right-0 px-3 md:px-6 z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <PromptBar projectId={project.id} projectName={project.name} />
        </div>
      </div>

      <VideoDetailModal
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        generation={selected}
        projectId={project.id}
      />
    </MarketingStudioLayout>
  );
}
