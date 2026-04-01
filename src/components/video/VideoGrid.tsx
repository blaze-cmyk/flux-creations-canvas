import { useVideoStore, VIDEO_MODELS, GeneratedVideo } from '@/store/videoStore';
import { AlertCircle, RefreshCw, Trash2, Loader2, Download, Play, Copy, Clock, Diamond, Maximize2 } from 'lucide-react';
import { useState } from 'react';

export function VideoGrid() {
  const { videos } = useVideoStore();

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <p className="text-lg">Create your first video</p>
          <p className="text-xs text-muted-foreground/60">Choose a mode, type a prompt, and click Generate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
      <div className="flex flex-col gap-4">
        {videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: GeneratedVideo }) {
  const { setSelectedVideoId, retryVideo, deleteVideo } = useVideoStore();
  const [hovered, setHovered] = useState(false);

  const modelInfo = VIDEO_MODELS.find(m => m.id === video.model);
  const modelName = modelInfo?.name || video.model;
  const modeLabel = video.mode === 'motion-control' ? 'Motion Control' : video.mode === 'image-to-video' ? 'Img2Vid' : 'Txt2Vid';
  const dateStr = new Date(video.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!video.videoUrl) return;
    try {
      const res = await fetch(video.videoUrl);
      const blob = await res.blob();
      const slug = video.prompt.slice(0, 40).replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'video'}-${video.id.slice(0, 8)}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(video.videoUrl, '_blank');
    }
  };

  const refs = video.referenceImages.filter(Boolean);

  // Details panel (right side) — shared across states
  const DetailsPanel = () => (
    <div className="flex flex-col justify-between h-full p-4 min-w-[220px]">
      <div className="space-y-3">
        {/* Model + Mode badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 bg-muted/80 text-foreground text-xs px-2.5 py-1 rounded-full">
            ⚙ {modelName}
          </span>
          {video.mode !== 'text-to-video' && (
            <span className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
              {modeLabel}
            </span>
          )}
        </div>

        {/* Prompt */}
        {video.prompt && (
          <p className="text-sm text-muted-foreground leading-relaxed">{video.prompt}</p>
        )}

        {/* Reference thumbnails */}
        {refs.length > 0 && (
          <div className="flex gap-2">
            {refs.map((img, i) => (
              <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-border">
                {img.startsWith('data:video') ? (
                  <video src={img} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quality + Duration tags */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            <Diamond className="w-3 h-3" /> 1080p
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> {video.duration}s
          </span>
        </div>
      </div>

      {/* Date at bottom */}
      <p className="text-[10px] text-muted-foreground/50 mt-4">{dateStr}</p>
    </div>
  );

  // Generating
  if (video.status === 'generating') {
    return (
      <div className="flex border border-border rounded-2xl overflow-hidden bg-card min-h-[320px]">
        {/* Left: generating area */}
        <div className="flex-1 bg-background flex items-center justify-center relative">
          <span className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            <Loader2 className="w-3 h-3 animate-spin" /> Generating
          </span>
        </div>
        {/* Right: details */}
        <div className="w-[280px] border-l border-border shrink-0">
          <DetailsPanel />
        </div>
      </div>
    );
  }

  // Failed
  if (video.status === 'failed' || video.status === 'nsfw') {
    const isProviderError = video.error?.includes('provider') || video.error?.includes('10MB') || video.error?.includes('file_too_large') || video.error?.includes('Upload failed');
    const errorTitle = video.status === 'nsfw' ? 'Content Filtered' : isProviderError ? 'Upload Issue' : 'Generation Failed';

    return (
      <div className="flex border border-border rounded-2xl overflow-hidden bg-card min-h-[320px]">
        {/* Left: error area */}
        <div className="flex-1 bg-background flex flex-col items-center justify-center gap-3 px-6">
          <span className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-medium ${
            video.status === 'nsfw' ? 'bg-amber-500/20 text-amber-400' : isProviderError ? 'bg-amber-500/20 text-amber-400' : 'bg-destructive/20 text-destructive'
          }`}>
            <AlertCircle className="w-3 h-3" /> {errorTitle}
          </span>
          <p className="text-xs text-muted-foreground text-center max-w-sm leading-relaxed">{video.error || 'Generation failed'}</p>
          {isProviderError && (
            <p className="text-[10px] text-muted-foreground/50 text-center max-w-xs">
              Tip: Use smaller reference images or try a different model
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => retryVideo(video.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/60 px-3 py-1.5 rounded-lg transition-colors">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
            <button onClick={() => deleteVideo(video.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive bg-muted/60 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
        {/* Right: details */}
        <div className="w-[280px] border-l border-border shrink-0">
          <DetailsPanel />
        </div>
      </div>
    );
  }

  // Complete
  return (
    <div className="flex border border-border rounded-2xl overflow-hidden bg-card min-h-[320px]">
      {/* Left: video */}
      <div
        className="flex-1 bg-black relative cursor-pointer"
        onClick={() => setSelectedVideoId(video.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <video
          src={video.videoUrl}
          className="w-full h-full object-contain"
          muted
          loop
          playsInline
          onMouseEnter={e => (e.target as HTMLVideoElement).play()}
          onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
        />
        {!hovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-6 h-6 text-white ml-0.5" />
            </div>
          </div>
        )}
        {/* Expand icon */}
        <button className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center text-white/80 hover:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: details */}
      <div className="w-[280px] border-l border-border shrink-0 flex flex-col">
        <div className="flex-1">
          <DetailsPanel />
        </div>
        {/* Footer actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button onClick={() => retryVideo(video.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Rerun
          </button>
          <div className="flex items-center gap-1">
            <button onClick={handleDownload} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Download">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Copy">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={e => { e.stopPropagation(); deleteVideo(video.id); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
