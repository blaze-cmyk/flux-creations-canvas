import { useGeneratorStore, MODELS } from '@/store/generatorStore';
import { X, Copy, Download, ExternalLink, Link2, Heart, Pin, MoreHorizontal, Layers, Sparkles, Sun, Paintbrush, Box, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function ImageDetailModal() {
  const { images, selectedImageId, setSelectedImageId, useAsReference } = useGeneratorStore();
  const image = images.find((i) => i.id === selectedImageId);
  const [activeTab, setActiveTab] = useState('overview');

  if (!image || image.status !== 'complete') {
    setSelectedImageId(null);
    return null;
  }

  const modelInfo = MODELS.find((m) => m.id === image.model);

  const handleDownload = async () => {
    if (!image.imageUrl) return;
    try {
      const res = await fetch(image.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generation-${image.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(image.imageUrl, '_blank');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'upscale', label: 'Upscale', icon: Sparkles },
    { id: 'enhancer', label: 'Enhancer', icon: Sparkles },
    { id: 'relight', label: 'Relight', icon: Sun },
    { id: 'inpaint', label: 'Inpaint', icon: Paintbrush },
    { id: 'angles', label: 'Angles', icon: Box },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedImageId(null)} />

      {/* Content */}
      <div className="relative flex flex-1 items-center justify-center p-8">
        {/* Main image with blurred bg */}
        <div className="relative flex-1 h-full flex items-center justify-center max-w-4xl">
          {/* Blurred background */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <img src={image.imageUrl} alt="" className="w-full h-full object-cover blur-3xl opacity-30 scale-110" />
          </div>
          <img src={image.imageUrl} alt="" className="relative max-h-full max-w-full object-contain rounded-lg" />
        </div>

        {/* Right detail panel */}
        <div className="relative w-80 h-full bg-popover border-l border-border flex flex-col ml-4 rounded-r-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30" />
              <div>
                <p className="text-sm text-foreground font-medium">You</p>
                <p className="text-[10px] text-muted-foreground">Author</p>
              </div>
            </div>
            <button onClick={() => setSelectedImageId(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs: Details / Comments */}
          <div className="flex border-b border-border">
            <button className="flex-1 text-sm text-foreground py-2 border-b-2 border-primary">Details</button>
            <button className="flex-1 text-sm text-muted-foreground py-2 hover:text-foreground transition-colors">Comments</button>
          </div>

          {/* Prompt */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> PROMPT
              </span>
              <button className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors">Copy</button>
            </div>

            {/* Reference image thumbnails */}
            {image.referenceImages.length > 0 && (
              <div className="flex gap-1.5">
                {image.referenceImages.map((ref, i) => (
                  <img key={i} src={ref} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">{image.prompt}</p>
          </div>

          {/* Information */}
          <div className="px-4 py-3 border-t border-border space-y-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground font-medium">INFORMATION</span>
            </div>
            <InfoRow label="Model" value={modelInfo?.name || image.model} />
            <InfoRow label="Quality" value={image.quality} />
            <InfoRow label="Size" value={image.width && image.height ? `${image.width}x${image.height}` : 'N/A'} />
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1">
              See all <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="px-4 py-3 border-t border-border space-y-2">
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                <Box className="w-4 h-4" />
                Animate
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 bg-card text-foreground text-sm font-medium py-2.5 rounded-xl border border-border hover:bg-muted transition-colors">
                <ExternalLink className="w-4 h-4" />
                Publish
              </button>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 text-muted-foreground text-xs py-2 rounded-lg hover:bg-muted hover:text-foreground transition-colors">
                <Layers className="w-3.5 h-3.5" />
                Open in
              </button>
              <button
                onClick={() => { if (image.imageUrl) useAsReference(image.imageUrl); }}
                className="flex-1 flex items-center justify-center gap-1.5 text-muted-foreground text-xs py-2 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Reference
              </button>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={handleDownload} className="flex items-center gap-1.5 text-muted-foreground text-xs py-2 px-3 rounded-lg hover:bg-muted hover:text-foreground transition-colors">
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Pin className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tabs bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-popover border border-border rounded-full px-2 py-1.5 shadow-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${activeTab === tab.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-medium">{value}</span>
    </div>
  );
}
