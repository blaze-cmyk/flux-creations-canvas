import { useCanvasStore } from '@/store/canvasStore';
import {
  Grid3X3, Type, Image, Video, Bot, ZoomIn, List, Upload, FolderOpen, Search,
  LayoutGrid, Shapes, ImageIcon, VideoIcon, Music, FileText, Sparkles
} from 'lucide-react';
import { useState } from 'react';

type NodeItem = {
  label: string;
  type: 'creation' | 'image-generator' | 'video-generator' | 'text' | 'assistant' | 'upscaler';
  icon: React.ReactNode;
  isNew?: boolean;
};

const basics: NodeItem[] = [
  { label: 'Text', type: 'text', icon: <Type className="w-4 h-4" /> },
  { label: 'Image Generator', type: 'image-generator', icon: <Image className="w-4 h-4" /> },
  { label: 'Video Generator', type: 'video-generator', icon: <Video className="w-4 h-4" /> },
  { label: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" /> },
  { label: 'Image Upscaler', type: 'upscaler', icon: <ZoomIn className="w-4 h-4" /> },
  { label: 'List', type: 'text', icon: <List className="w-4 h-4" /> },
];

const media: NodeItem[] = [
  { label: 'Upload', type: 'creation', icon: <Upload className="w-4 h-4" /> },
  { label: 'Assets', type: 'creation', icon: <FolderOpen className="w-4 h-4" /> },
  { label: 'Stock', type: 'creation', icon: <Search className="w-4 h-4" /> },
];

const tabs = [
  { icon: <LayoutGrid className="w-4 h-4" />, label: 'All' },
  { icon: <Shapes className="w-4 h-4" />, label: 'Basics' },
  { icon: <ImageIcon className="w-4 h-4" />, label: 'Image' },
  { icon: <VideoIcon className="w-4 h-4" />, label: 'Video' },
  { icon: <Music className="w-4 h-4" />, label: 'Audio' },
  { icon: <FileText className="w-4 h-4" />, label: 'File' },
  { icon: <Type className="w-4 h-4" />, label: 'Text' },
  { icon: <Sparkles className="w-4 h-4" />, label: 'Effects' },
];

export function NodePalette() {
  const { paletteOpen, setPaletteOpen, addNode } = useCanvasStore();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  if (!paletteOpen) return null;

  const filteredBasics = basics.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMedia = media.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[280px] bg-palette border-l border-border z-50 flex flex-col">
      {/* Search */}
      <div className="p-3">
        <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 flex-1 border-0 focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pb-2">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`p-1.5 rounded transition-colors ${
              activeTab === i ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">Basics</div>
        {filteredBasics.map((item) => (
          <button
            key={item.label}
            onClick={() => addNode(item.type)}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors"
          >
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground">
              {item.icon}
            </div>
            {item.label}
            {item.isNew && (
              <span className="ml-auto text-[10px] font-medium text-badge-text bg-badge-bg px-1.5 py-0.5 rounded">NEW</span>
            )}
          </button>
        ))}

        <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mt-4 mb-2">Media</div>
        {filteredMedia.map((item) => (
          <button
            key={item.label}
            onClick={() => addNode(item.type)}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors"
          >
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground">
              {item.icon}
            </div>
            {item.label}
          </button>
        ))}
      </div>

      {/* Bottom shortcuts */}
      <div className="px-3 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
        <span><kbd className="bg-muted px-1 rounded">N</kbd> Open</span>
        <span><kbd className="bg-muted px-1 rounded">↑↓</kbd> Navigate</span>
        <span><kbd className="bg-muted px-1 rounded">⏎</kbd> Insert</span>
      </div>
    </div>
  );
}
