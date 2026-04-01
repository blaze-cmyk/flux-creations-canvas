import { useVideoStore } from '@/store/videoStore';
import { X, Download, RefreshCw, Trash2 } from 'lucide-react';

export function VideoDetailModal() {
  const { videos, selectedVideoId, setSelectedVideoId, retryVideo, deleteVideo } = useVideoStore();
  const video = videos.find(v => v.id === selectedVideoId);
  if (!video || !video.videoUrl) return null;

  const handleDownload = async () => {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedVideoId(null)}>
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-popover rounded-2xl border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm text-foreground truncate flex-1 mr-4">{video.prompt}</p>
          <div className="flex items-center gap-1">
            <button onClick={handleDownload} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => { retryVideo(video.id); setSelectedVideoId(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => { deleteVideo(video.id); setSelectedVideoId(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={() => setSelectedVideoId(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="flex-1 flex items-center justify-center p-4 bg-black">
          <video
            src={video.videoUrl}
            controls
            autoPlay
            className="max-w-full max-h-[70vh] rounded-lg"
          />
        </div>

        {/* Info */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>{video.model}</span>
          <span>•</span>
          <span>{video.duration}s</span>
          <span>•</span>
          <span>{video.aspectRatio}</span>
          <span>•</span>
          <span>{video.mode}</span>
        </div>
      </div>
    </div>
  );
}
