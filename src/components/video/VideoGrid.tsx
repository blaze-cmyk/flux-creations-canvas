import { useVideoStore } from '@/store/videoStore';
import { AlertCircle, RefreshCw, Trash2, Loader2, Download, Play, Maximize2 } from 'lucide-react';
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
    <div className="h-full overflow-y-auto p-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        {videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: ReturnType<typeof useVideoStore.getState>['videos'][0] }) {
  const { setSelectedVideoId, retryVideo, deleteVideo } = useVideoStore();
  const [playing, setPlaying] = useState(false);

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
      a.download = `${slug}-${video.id.slice(0, 8)}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(video.videoUrl, '_blank');
    }
  };

  if (video.status === 'generating') {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden bg-card border border-border flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">Generating video...</span>
          <span className="text-[10px] text-muted-foreground/50">This may take 1-3 minutes</span>
        </div>
      </div>
    );
  }

  if (video.status === 'failed' || video.status === 'nsfw') {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden bg-card border border-border flex flex-col items-center justify-center gap-3 p-3">
        <span className="flex items-center gap-1 bg-destructive/80 text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
          <AlertCircle className="w-3 h-3" /> {video.status === 'failed' ? 'Failed' : 'Filtered'}
        </span>
        <p className="text-[11px] text-muted-foreground text-center">{video.error || 'Generation failed'}</p>
        <div className="flex items-center gap-1.5">
          <button onClick={() => retryVideo(video.id)} className="flex items-center gap-1 bg-muted/60 text-foreground text-xs px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
          <button onClick={() => deleteVideo(video.id)} className="flex items-center gap-1 bg-muted/60 text-foreground text-xs px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative aspect-video rounded-xl overflow-hidden bg-card border border-border hover:border-foreground/20 transition-colors cursor-pointer"
      onClick={() => setSelectedVideoId(video.id)}
    >
      <video
        src={video.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        loop
        playsInline
        onMouseEnter={e => { (e.target as HTMLVideoElement).play(); setPlaying(true); }}
        onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; setPlaying(false); }}
      />

      {/* Play indicator */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button onClick={e => { e.stopPropagation(); setSelectedVideoId(video.id); }} className="flex items-center justify-center w-7 h-7 rounded-full bg-black/50 text-white/90 hover:bg-black/70 backdrop-blur-sm transition-colors" title="Open">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleDownload} className="flex items-center justify-center w-7 h-7 rounded-full bg-black/50 text-white/90 hover:bg-black/70 backdrop-blur-sm transition-colors" title="Download">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={e => { e.stopPropagation(); deleteVideo(video.id); }} className="flex items-center justify-center w-7 h-7 rounded-full bg-black/50 text-white/90 hover:bg-red-600/80 backdrop-blur-sm transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-2 left-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-[10px] text-white/70 truncate">{video.prompt}</p>
        <p className="text-[9px] text-white/50">{video.duration}s • {video.aspectRatio} • {video.model}</p>
      </div>
    </div>
  );
}
