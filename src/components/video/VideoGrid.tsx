import { useVideoStore, VIDEO_MODELS, GeneratedVideo } from '@/store/videoStore';
import { AlertCircle, RefreshCw, Trash2, Loader2, Download, Play, Copy, MoreHorizontal, Clock, Diamond } from 'lucide-react';
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
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
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

  // Generating state
  if (video.status === 'generating') {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-muted/80 text-foreground text-xs px-2.5 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" /> {modelName}
            </span>
            {video.mode !== 'text-to-video' && (
              <span className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{modeLabel}</span>
            )}
          </div>

          {/* Prompt */}
          {video.prompt && (
            <p className="text-sm text-muted-foreground leading-relaxed">{video.prompt}</p>
          )}

          {/* Reference thumbnails */}
          {video.referenceImages.filter(Boolean).length > 0 && (
            <div className="flex gap-2">
              {video.referenceImages.filter(Boolean).map((img, i) => (
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

          {/* Tags */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              <Diamond className="w-3 h-3" /> 1080p
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> {video.duration}s
            </span>
          </div>
        </div>

        {/* Generating area */}
        <div className="aspect-video bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Generating video...</span>
            <span className="text-[10px] text-muted-foreground/50">This may take 1-3 minutes</span>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (video.status === 'failed' || video.status === 'nsfw') {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-muted/80 text-foreground text-xs px-2.5 py-1 rounded-full">
              {modelName}
            </span>
            {video.mode !== 'text-to-video' && (
              <span className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{modeLabel}</span>
            )}
          </div>

          {video.prompt && (
            <p className="text-sm text-muted-foreground leading-relaxed">{video.prompt}</p>
          )}

          {video.referenceImages.filter(Boolean).length > 0 && (
            <div className="flex gap-2">
              {video.referenceImages.filter(Boolean).map((img, i) => (
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

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              <Diamond className="w-3 h-3" /> 1080p
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> {video.duration}s
            </span>
          </div>
        </div>

        {/* Error area */}
        <div className="aspect-video bg-background flex flex-col items-center justify-center gap-3 px-4">
          <span className="flex items-center gap-1 bg-destructive/80 text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
            <AlertCircle className="w-3 h-3" /> {video.status === 'failed' ? 'Failed' : 'Filtered'}
          </span>
          <p className="text-xs text-muted-foreground text-center max-w-md">{video.error || 'Generation failed'}</p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button onClick={() => retryVideo(video.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Rerun
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => deleteVideo(video.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete state
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-muted/80 text-foreground text-xs px-2.5 py-1 rounded-full">
            {modelName}
          </span>
          {video.mode !== 'text-to-video' && (
            <span className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{modeLabel}</span>
          )}
        </div>

        {/* Prompt */}
        {video.prompt && (
          <p className="text-sm text-muted-foreground leading-relaxed">{video.prompt}</p>
        )}

        {/* Reference thumbnails */}
        {video.referenceImages.filter(Boolean).length > 0 && (
          <div className="flex gap-2">
            {video.referenceImages.filter(Boolean).map((img, i) => (
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

        {/* Tags */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            <Diamond className="w-3 h-3" /> 1080p
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> {video.duration}s
          </span>
        </div>
      </div>

      {/* Video */}
      <div
        className="relative cursor-pointer"
        onClick={() => setSelectedVideoId(video.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <video
          src={video.videoUrl}
          className="w-full aspect-video object-cover"
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
  );
}
