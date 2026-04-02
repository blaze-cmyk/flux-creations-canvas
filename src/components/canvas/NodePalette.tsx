import { useCanvasStore } from '@/store/canvasStore';
import {
  Search, LayoutGrid, Shapes, ImageIcon, VideoIcon, Music, FileText, Type, Sparkles,
  Upload, FolderOpen, Bot, ZoomIn, List, StickyNote, Sticker, Group,
  Play, Wand2, Layers, Scissors, ArrowUpCircle, Mic, AudioLines, Music2,
  Image, Video, Brush, Grid3X3
} from 'lucide-react';
import { useState, useMemo } from 'react';

type TabKey = 'all' | 'basics' | 'media' | 'image' | 'video' | 'audio' | 'text' | 'utilities';

type PaletteItem = {
  label: string;
  subtitle?: string;
  type: 'creation' | 'image-generator' | 'video-generator' | 'text' | 'assistant' | 'upscaler';
  icon: React.ReactNode;
  isNew?: boolean;
  color?: string;
};

const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: 'all', icon: <LayoutGrid className="w-4 h-4" />, label: 'All' },
  { key: 'basics', icon: <Shapes className="w-4 h-4" />, label: 'Basics' },
  { key: 'media', icon: <FolderOpen className="w-4 h-4" />, label: 'Media' },
  { key: 'image', icon: <ImageIcon className="w-4 h-4" />, label: 'Image' },
  { key: 'video', icon: <VideoIcon className="w-4 h-4" />, label: 'Video' },
  { key: 'audio', icon: <Music className="w-4 h-4" />, label: 'Audio' },
  { key: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
  { key: 'utilities', icon: <Sparkles className="w-4 h-4" />, label: 'Utilities' },
];

const basicItems: PaletteItem[] = [
  { label: 'Text', type: 'text', icon: <Type className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'Image Generator', type: 'image-generator', icon: <Image className="w-4 h-4" />, color: 'text-indigo-400' },
  { label: 'Video Generator', type: 'video-generator', icon: <Video className="w-4 h-4" />, color: 'text-purple-400' },
  { label: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'Image Upscaler', type: 'upscaler', icon: <ZoomIn className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'List', type: 'text', icon: <List className="w-4 h-4" />, color: 'text-muted-foreground' },
];

const mediaItems: PaletteItem[] = [
  { label: 'Upload', type: 'creation', icon: <Upload className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Assets', type: 'creation', icon: <FolderOpen className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Stock', type: 'creation', icon: <Search className="w-4 h-4" />, color: 'text-muted-foreground' },
];

const referenceItems: PaletteItem[] = [
  { label: 'Add Reference', type: 'creation', icon: <Upload className="w-4 h-4" />, color: 'text-muted-foreground' },
];

const imageItems: PaletteItem[] = [
  { label: 'Image Generator', type: 'image-generator', icon: <Image className="w-4 h-4" />, color: 'text-indigo-400' },
  { label: 'Image Upscaler', type: 'upscaler', icon: <ZoomIn className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Image Editor', type: 'image-generator', icon: <Brush className="w-4 h-4" />, isNew: true, color: 'text-purple-400' },
  { label: 'Variations', type: 'image-generator', icon: <Layers className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Designer', type: 'image-generator', icon: <Wand2 className="w-4 h-4" />, isNew: true, color: 'text-muted-foreground' },
  { label: 'Image to SVG', type: 'image-generator', icon: <Grid3X3 className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'SVG Generator', type: 'image-generator', icon: <Shapes className="w-4 h-4" />, color: 'text-muted-foreground' },
  // Models
  { label: 'Auto', subtitle: 'Image Generator', type: 'image-generator', icon: <Sparkles className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Mystic 2.5 Fluid', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-red-400' },
  { label: 'Flux.1 Fast', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.1', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.1 Realism', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.1.1', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.1 Kontext Pro', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.1 Kontext Max', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.2 Pro', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.2 Flex', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.2 Max', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Flux.2 Klein', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Google Imagen 3', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-blue-400' },
  { label: 'Google Imagen 4 Fast', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-blue-400' },
  { label: 'Google Imagen 4', subtitle: 'Image Generator', type: 'image-generator', icon: <ImageIcon className="w-4 h-4" />, color: 'text-blue-400' },
];

const videoItems: PaletteItem[] = [
  { label: 'Video Generator', type: 'video-generator', icon: <Video className="w-4 h-4" />, color: 'text-purple-400' },
  { label: 'Speak', type: 'video-generator', icon: <Mic className="w-4 h-4" />, isNew: true, color: 'text-muted-foreground' },
  { label: 'Video Combiner', type: 'video-generator', icon: <Layers className="w-4 h-4" />, isNew: true, color: 'text-muted-foreground' },
  { label: 'Video Upscaler', type: 'upscaler', icon: <ArrowUpCircle className="w-4 h-4" />, isNew: true, color: 'text-muted-foreground' },
  { label: 'Topaz', subtitle: 'Video Upscaler', type: 'upscaler', icon: <ArrowUpCircle className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Magnific AI', subtitle: 'Video Upscaler', type: 'upscaler', icon: <ArrowUpCircle className="w-4 h-4" />, isNew: true, color: 'text-muted-foreground' },
  { label: 'Sharpen', subtitle: 'Video Upscaler', type: 'upscaler', icon: <ArrowUpCircle className="w-4 h-4" />, color: 'text-muted-foreground' },
];

const audioItems: PaletteItem[] = [
  { label: 'Voiceover', type: 'creation', icon: <Mic className="w-4 h-4" />, isNew: true, color: 'text-amber-400' },
  { label: 'Sound Effects', type: 'creation', icon: <AudioLines className="w-4 h-4" />, isNew: true, color: 'text-amber-400' },
  { label: 'Music Generator', type: 'creation', icon: <Music2 className="w-4 h-4" />, isNew: true, color: 'text-amber-400' },
  { label: 'ElevenLabs v2', subtitle: 'Voiceover', type: 'creation', icon: <Mic className="w-4 h-4" />, color: 'text-amber-400' },
  { label: 'ElevenLabs v3', subtitle: 'Voiceover', type: 'creation', icon: <Mic className="w-4 h-4" />, color: 'text-amber-400' },
  { label: 'Gemini 2.5 Pro', subtitle: 'Voiceover', type: 'creation', icon: <Mic className="w-4 h-4" />, color: 'text-amber-400' },
  { label: 'Google Lyria', subtitle: 'Music Generator', type: 'creation', icon: <Music2 className="w-4 h-4" />, color: 'text-amber-400' },
  { label: 'ElevenLabs Music', subtitle: 'Music Generator', type: 'creation', icon: <Music2 className="w-4 h-4" />, color: 'text-amber-400' },
];

const textItems: PaletteItem[] = [
  { label: 'Text', type: 'text', icon: <Type className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'GPT-5 Mini', subtitle: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'GPT-4.1 Mini', subtitle: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'GPT-5.2', subtitle: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'Gemini 3.1 Pro', subtitle: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, isNew: true, color: 'text-emerald-400' },
  { label: 'Gemini 3 Flash', subtitle: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'Claude Sonnet 4.5', subtitle: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, color: 'text-emerald-400' },
  { label: 'Claude Opus 4.5', subtitle: 'Assistant', type: 'assistant', icon: <Bot className="w-4 h-4" />, color: 'text-emerald-400' },
];

const utilityItems: PaletteItem[] = [
  { label: 'List', type: 'text', icon: <List className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Sticky note', type: 'text', icon: <StickyNote className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Stickers', type: 'creation', icon: <Sticker className="w-4 h-4" />, color: 'text-muted-foreground' },
  { label: 'Group', type: 'creation', icon: <Group className="w-4 h-4" />, color: 'text-muted-foreground' },
];

const tabContent: Record<TabKey, { sections: { title?: string; items: PaletteItem[] }[] }> = {
  all: {
    sections: [
      { title: 'BASICS', items: basicItems },
      { title: 'MEDIA', items: mediaItems },
    ],
  },
  basics: { sections: [{ items: basicItems }] },
  media: { sections: [{ items: mediaItems }] },
  image: { sections: [{ items: imageItems }] },
  video: { sections: [{ items: videoItems }] },
  audio: { sections: [{ items: audioItems }] },
  text: { sections: [{ items: textItems }] },
  utilities: { sections: [{ items: utilityItems }] },
};

const searchPlaceholders: Record<TabKey, string> = {
  all: 'Search',
  basics: 'Search',
  media: 'Search media',
  image: 'Search image',
  video: 'Search video',
  audio: 'Search audio',
  text: 'Search text',
  utilities: 'Search utilities',
};

export function NodePalette() {
  const { paletteOpen, setPaletteOpen, addNode } = useCanvasStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const content = tabContent[activeTab];
    if (!search) return content.sections;
    const q = search.toLowerCase();
    return content.sections
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(q))
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [activeTab, search]);

  if (!paletteOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[280px] bg-palette border-l border-border z-50 flex flex-col">
      {/* Search */}
      <div className="p-3">
        <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholders[activeTab]}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 flex-1 border-0 focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearch(''); }}
            className={`p-1.5 rounded transition-colors ${
              activeTab === tab.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 scrollbar-thin scrollbar-thumb-muted">
        {filtered.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2 mt-3 first:mt-0">
                {section.title}
              </div>
            )}
            {section.items.map((item) => (
              <button
                key={item.label + (item.subtitle || '')}
                onClick={() => addNode(item.type)}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors group"
              >
                <div className={`w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0 ${item.color || 'text-muted-foreground'}`}>
                  {item.icon}
                </div>
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="truncate">{item.label}</span>
                  {item.subtitle && (
                    <span className="text-[10px] text-muted-foreground leading-tight">{item.subtitle}</span>
                  )}
                </div>
                {item.isNew && (
                  <span className="ml-auto text-[10px] font-medium text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">New</span>
                )}
              </button>
            ))}
          </div>
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
