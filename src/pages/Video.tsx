import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { VideoPromptBar } from '@/components/video/VideoPromptBar';
import { VideoGrid } from '@/components/video/VideoGrid';
import { VideoDetailModal } from '@/components/video/VideoDetailModal';
import { useVideoStore } from '@/store/videoStore';

export default function Video() {
  const selectedVideoId = useVideoStore(s => s.selectedVideoId);

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Top nav */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="w-4 h-4" />
            Spaces
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <Link to="/generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Images
          </Link>
          <span className="text-sm text-foreground font-medium">Videos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30" />
        </div>
      </header>

      {/* Video grid area */}
      <div className="flex-1 overflow-y-auto">
        <VideoGrid />
      </div>

      {/* Bottom prompt bar */}
      <VideoPromptBar />

      {/* Detail modal */}
      {selectedVideoId && <VideoDetailModal />}
    </div>
  );
}
