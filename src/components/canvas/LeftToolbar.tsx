import { useCanvasStore } from '@/store/canvasStore';
import {
  Plus, Play, Hand, Scissors, Square, MessageSquare,
  Undo2, Redo2, Settings
} from 'lucide-react';

const tools = [
  { icon: Plus, label: 'Add Node', action: 'palette' },
  { icon: Play, label: 'Run', action: 'run' },
  { icon: Hand, label: 'Pan', action: 'pan' },
  { icon: Scissors, label: 'Crop', action: 'crop' },
  { icon: Square, label: 'Frame', action: 'frame' },
  { icon: MessageSquare, label: 'Comment', action: 'comment' },
  { icon: Undo2, label: 'Undo', action: 'undo' },
  { icon: Redo2, label: 'Redo', action: 'redo' },
  { icon: Settings, label: 'Settings', action: 'settings' },
];

export function LeftToolbar() {
  const { setPaletteOpen, paletteOpen } = useCanvasStore();

  const handleClick = (action: string) => {
    if (action === 'palette') {
      setPaletteOpen(!paletteOpen);
    }
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 w-10 bg-toolbar border-r border-border z-50 flex flex-col items-center py-3 gap-1">
      {tools.map((tool) => (
        <button
          key={tool.action}
          onClick={() => handleClick(tool.action)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            tool.action === 'palette' && paletteOpen
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
