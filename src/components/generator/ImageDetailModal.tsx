import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useGeneratorStore, MODELS } from '@/store/generatorStore';
import { Heart, Share2, Download, MoreHorizontal, Link2, ExternalLink, Send, Box, Sparkles, Sun, Paintbrush, Layers } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ImageDetailModal() {
  const { images, selectedImageId, setSelectedImageId, useAsReference } = useGeneratorStore();
  const image = images.find((i) => i.id === selectedImageId);
  const [activeTab, setActiveTab] = useState('overview');

  if (!image || image.status !== 'complete') {
    if (selectedImageId) setSelectedImageId(null);
    return null;
  }

  const open = !!selectedImageId;
  const onOpenChange = (v: boolean) => {
    if (!v) setSelectedImageId(null);
  };

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
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1200px,96vw)] w-[96vw] h-[92vh] md:h-[88vh] bg-ms-surface/80 backdrop-blur-2xl border-ms-border p-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          {/* Media */}
          <div className="relative flex items-center justify-center min-h-0 overflow-hidden">
            {image.imageUrl && (
              <img
                src={image.imageUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50 pointer-events-none"
              />
            )}
            {image.imageUrl ? (
              <img
                src={image.imageUrl}
                alt=""
                className="relative max-w-full max-h-full w-auto h-auto object-contain z-10"
              />
            ) : (
              <div className="text-muted-foreground text-sm">No preview available</div>
            )}

            {/* Bottom tab bar overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-ms-surface/90 backdrop-blur-xl border border-ms-border rounded-full px-2 py-1.5 shadow-2xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                    activeTab === tab.id
                      ? 'bg-ms-surface-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col bg-ms-surface border-t md:border-t-0 md:border-l border-ms-border min-h-0">
            <div className="p-4 border-b border-ms-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ms-cta to-ms-cta-2" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">korsola_user</div>
                <div className="text-xs text-muted-foreground">Author</div>
              </div>
            </div>

            <div className="flex border-b border-ms-border">
              <button className="flex-1 h-10 text-xs font-medium text-foreground bg-ms-surface-2">Details</button>
              <button className="flex-1 h-10 text-xs font-medium text-muted-foreground hover:text-foreground">Comments</button>
            </div>

            <div className="flex-1 overflow-y-auto ms-scroll p-4 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prompt</div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(image.prompt || '');
                      toast.success('Prompt copied');
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Copy
                  </button>
                </div>

                {image.referenceImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {image.referenceImages.map((ref, i) => (
                      <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-ms-border bg-ms-surface-2">
                        <img src={ref} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-sm text-foreground/90 leading-relaxed bg-ms-surface-2 rounded-lg p-3">
                  {image.prompt}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Information
                </div>
                <div className="rounded-lg bg-ms-surface-2 divide-y divide-ms-border">
                  <Row label="Model" value={modelInfo?.name || image.model} />
                  <Row label="Quality" value={image.quality} />
                  <Row
                    label="Size"
                    value={image.width && image.height ? `${image.width}x${image.height}` : 'N/A'}
                  />
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-ms-border space-y-2">
              <button className="ms-cta w-full h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2">
                <Box className="w-4 h-4" /> Animate
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="h-10 rounded-xl bg-ms-surface-2 hover:bg-ms-border text-sm text-foreground flex items-center justify-center gap-2">
                  <Send className="w-3.5 h-3.5" /> Publish
                </button>
                <button
                  onClick={() => image.imageUrl && useAsReference(image.imageUrl)}
                  className="h-10 rounded-xl bg-ms-surface-2 hover:bg-ms-border text-sm text-foreground flex items-center justify-center gap-2"
                >
                  <Link2 className="w-3.5 h-3.5" /> Reference
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 h-10 rounded-xl bg-ms-surface-2 hover:bg-ms-border text-sm text-foreground flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => image.imageUrl && window.open(image.imageUrl, '_blank')}
                  className="grid place-items-center w-10 h-10 rounded-xl bg-ms-surface-2 hover:bg-ms-border text-foreground"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button className="grid place-items-center w-10 h-10 rounded-xl bg-ms-surface-2 hover:bg-ms-border text-foreground">
                  <Heart className="w-4 h-4" />
                </button>
                <button className="grid place-items-center w-10 h-10 rounded-xl bg-ms-surface-2 hover:bg-ms-border text-foreground">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="grid place-items-center w-10 h-10 rounded-xl bg-ms-surface-2 hover:bg-ms-border text-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 h-10 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
