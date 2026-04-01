import { useCanvasStore } from '@/store/canvasStore';
import { Share2, User } from 'lucide-react';

export function TopBar() {
  const projectName = useCanvasStore((s) => s.projectName);

  return (
    <div className="fixed top-0 left-10 right-0 h-10 bg-toolbar/80 backdrop-blur border-b border-border z-40 flex items-center justify-between px-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Personal project</span>
        <span>/</span>
        <span>Spaces</span>
        <span>/</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted" />
          <span className="text-foreground">{projectName}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 px-3 py-1.5 rounded-lg transition-colors">
          <Share2 className="w-3 h-3" />
          Share
        </button>
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-accent-foreground" />
        </div>
      </div>
    </div>
  );
}
