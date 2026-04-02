import { useCanvasStore } from '@/store/canvasStore';
import {
  Search, LayoutGrid, Shapes, ImageIcon, VideoIcon, Music, FileText, Type, Sparkles,
  Upload, FolderOpen, Bot, ZoomIn, List, StickyNote, Sticker, Group,
  Wand2, Layers, ArrowUpCircle, Mic, AudioLines, Music2,
  Image, Video, Brush, Grid3X3
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
      { title: 'REFERENCES', items: referenceItems },
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
  const [highlightIndex, setHighlightIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (paletteOpen) {
      setActiveTab('all');
      setSearch('');
      setHighlightIndex(0);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [paletteOpen]);

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

  const allItems = useMemo(() => filtered.flatMap((s) => s.items), [filtered]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allItems[highlightIndex]) {
      addNode(allItems[highlightIndex].type);
      setPaletteOpen(false);
    } else if (e.key === 'Escape') {
      setPaletteOpen(false);
    }
  };

  let itemIdx = -1;

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setPaletteOpen(false)}
          onContextMenu={(e) => { e.preventDefault(); setPaletteOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className="relative w-[300px] max-h-[520px] bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Search */}
            <div className="p-3 pb-2">
              <div className="flex items-center gap-2 bg-background/80 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setHighlightIndex(0); }}
                  placeholder={searchPlaceholders[activeTab]}
                  className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 flex-1 border-0 focus:outline-none"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 px-3 pb-2">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSearch(''); setHighlightIndex(0); }}
                  className={`p-1.5 rounded-md transition-colors relative ${
                    activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={tab.label}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="palette-tab-bg"
                      className="absolute inset-0 bg-muted rounded-md"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span className="relative z-10">{tab.icon}</span>
                </motion.button>
              ))}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-muted">
              {filtered.map((section, si) => (
                <div key={si}>
                  {section.title && (
                    <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1 mt-3 first:mt-1 px-1">
                      {section.title}
                    </div>
                  )}
                  {section.items.map((item) => {
                    itemIdx++;
                    const idx = itemIdx;
                    const isHighlighted = idx === highlightIndex;
                    return (
                      <motion.button
                        key={item.label + (item.subtitle || '')}
                        onClick={() => { addNode(item.type); setPaletteOpen(false); }}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className={`flex items-center gap-3 w-full px-2 py-1.5 rounded-lg text-sm transition-colors ${
                          isHighlighted ? 'bg-muted/70 text-foreground' : 'text-foreground hover:bg-muted/40'
                        }`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.2 }}
                      >
                        <div className={`w-6 h-6 rounded bg-muted/60 flex items-center justify-center shrink-0 ${item.color || 'text-muted-foreground'}`}>
                          {item.icon}
                        </div>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="truncate text-[13px]">{item.label}</span>
                          {item.subtitle && (
                            <span className="text-[10px] text-muted-foreground/70 leading-tight">{item.subtitle}</span>
                          )}
                        </div>
                        {item.isNew && (
                          <span className="ml-auto text-[9px] font-semibold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                            New
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Bottom shortcuts */}
            <div className="px-3 py-2 border-t border-border/50 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span><kbd className="bg-muted/60 px-1 rounded text-[9px]">N</kbd> Open</span>
              <span><kbd className="bg-muted/60 px-1 rounded text-[9px]">↑↓</kbd> Navigate</span>
              <span><kbd className="bg-muted/60 px-1 rounded text-[9px]">⏎</kbd> Insert</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
