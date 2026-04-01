import { useState, RefObject } from 'react';
import { Plus, Video, Film } from 'lucide-react';
import { DropZone, readFileAsDataURL } from './DropZone';

interface EditVideoPanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  referenceImages: string[];
  addReferenceImage: (url: string) => void;
  removeReferenceImage: (index: number) => void;
  fileInputRef: RefObject<HTMLInputElement>;
}

export function EditVideoPanel({
  prompt, setPrompt, referenceImages, addReferenceImage, removeReferenceImage, fileInputRef,
}: EditVideoPanelProps) {
  const [autoSettings, setAutoSettings] = useState(true);

  const uploadVideo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) { const url = await readFileAsDataURL(f); addReferenceImage(url); }
    };
    input.click();
  };

  const handleVideoDrop = async (files: File[]) => {
    if (files[0]) { const url = await readFileAsDataURL(files[0]); addReferenceImage(url); }
  };

  const handleImagesDrop = async (files: File[]) => {
    for (const f of files.slice(0, 4 - referenceImages.length)) {
      const url = await readFileAsDataURL(f);
      addReferenceImage(url);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hero banner */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-cyan-900/40 to-card h-28 flex flex-col justify-between p-3">
        <div className="flex justify-end">
          <span className="text-[9px] bg-muted/60 backdrop-blur px-2 py-0.5 rounded-md text-muted-foreground flex items-center gap-1">
            <Film className="w-3 h-3" /> How it works
          </span>
        </div>
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-wider">KLING O1 EDIT</p>
          <p className="text-[10px] text-muted-foreground">Modify, restyle, change angles, transform</p>
        </div>
      </div>

      {/* Upload video - drag & drop */}
      <DropZone onFiles={handleVideoDrop} accept="video/*">
        {referenceImages[0] ? (
          <div className="relative rounded-xl overflow-hidden border border-border aspect-video">
            <img src={referenceImages[0]} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removeReferenceImage(0)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
            >×</button>
          </div>
        ) : (
          <button
            onClick={uploadVideo}
            className="w-full border border-border rounded-xl p-5 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors bg-card"
          >
            <Video className="w-5 h-5" />
            <span className="text-xs font-medium text-foreground">Upload a video to edit</span>
            <span className="text-[10px] text-muted-foreground/60">Duration required: 3~10 secs • Drop or click</span>
          </button>
        )}
      </DropZone>

      {/* Upload images & elements - drag & drop */}
      <DropZone onFiles={handleImagesDrop} accept="image/*">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors relative"
        >
          <span className="absolute top-2 right-2 text-[9px] text-muted-foreground/50">Optional</span>
          <Plus className="w-5 h-5" />
          <span className="text-xs font-medium text-foreground">Upload images & elements</span>
          <span className="text-[10px] text-muted-foreground/60">Up to 4 images or elements • Drop or click</span>
        </button>
      </DropZone>

      {/* Uploaded thumbnails */}
      {referenceImages.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {referenceImages.slice(1).map((img, i) => (
            <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeReferenceImage(i + 1)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[9px] flex items-center justify-center"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Prompt */}
      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground">Prompt</span>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder='Describe the change you want, like "Make it snow". Add elements using —'
          rows={3}
          className="w-full bg-card rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/40 resize-none border-0 focus:outline-none leading-relaxed"
          style={{ scrollbarWidth: 'none' }}
        />
        <button className="text-[10px] text-muted-foreground flex items-center gap-1 px-1">
          <span className="text-primary">@</span> Elements
        </button>
      </div>

      {/* Auto settings */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5">
        <span className="text-xs text-foreground">Auto settings</span>
        <button
          onClick={() => setAutoSettings(!autoSettings)}
          className={`w-9 h-5 rounded-full transition-colors relative ${autoSettings ? 'bg-primary' : 'bg-muted'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${autoSettings ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </div>
  );
}
