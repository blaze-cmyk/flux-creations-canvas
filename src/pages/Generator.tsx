import { useEffect } from 'react';
import { PromptBar } from '@/components/generator/PromptBar';
import { ImageGrid } from '@/components/generator/ImageGrid';
import { ImageDetailModal } from '@/components/generator/ImageDetailModal';
import { useGeneratorStore } from '@/store/generatorStore';
import { Link } from 'react-router-dom';
import { ChevronLeft, Clock, Users } from 'lucide-react';

export default function Generator() {
  const selectedImageId = useGeneratorStore((s) => s.selectedImageId);
  const loadHistory = useGeneratorStore((s) => s.loadHistory);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-sm text-foreground bg-muted/50 px-3 py-1 rounded-full hover:bg-muted transition-colors">
              <Clock className="w-3.5 h-3.5" />
              History
            </button>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1 rounded-full hover:bg-muted transition-colors">
              <Users className="w-3.5 h-3.5" />
              Community
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30" />
        </div>
      </header>

      {/* Image grid area */}
      <div className="flex-1 overflow-y-auto">
        <ImageGrid />
      </div>

      {/* Bottom prompt bar */}
      <PromptBar />

      {/* Detail modal */}
      {selectedImageId && <ImageDetailModal />}
    </div>
  );
}
