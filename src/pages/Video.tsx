import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, PanelBottomOpen, PanelLeftOpen } from 'lucide-react';
import { VideoPromptBar } from '@/components/video/VideoPromptBar';
import { VideoSidebar } from '@/components/video/VideoSidebar';
import { VideoGrid } from '@/components/video/VideoGrid';
import { VideoDetailModal } from '@/components/video/VideoDetailModal';
import { useVideoStore } from '@/store/videoStore';

export default function Video() {
  const selectedVideoId = useVideoStore(s => s.selectedVideoId);
  const [layout, setLayout] = useState<'sidebar' | 'bottom'>('sidebar');

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
          {/* Layout toggle */}
          <button
            onClick={() => setLayout(layout === 'sidebar' ? 'bottom' : 'sidebar')}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={layout === 'sidebar' ? 'Switch to bottom bar' : 'Switch to sidebar'}
          >
            {layout === 'sidebar' ? (
              <PanelBottomOpen className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30" />
        </div>
      </header>

      {/* Main content */}
      {layout === 'sidebar' ? (
        <div className="flex-1 flex overflow-hidden">
          <VideoSidebar />
          <div className="flex-1 overflow-y-auto">
            <VideoGrid />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <VideoGrid />
          </div>
          <VideoPromptBar />
        </>
      )}

      {/* Detail modal */}
      {selectedVideoId && <VideoDetailModal />}
    </div>
  );
}
