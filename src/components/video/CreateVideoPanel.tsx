import { useState, RefObject } from 'react';
import { ImagePlus, Sparkles, Volume2, Film } from 'lucide-react';

interface CreateVideoPanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  referenceImages: string[];
  addReferenceImage: (url: string) => void;
  removeReferenceImage: (index: number) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  selectedModel?: { name: string; id: string };
  enhance: boolean;
  setEnhance: (v: boolean) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
}

export function CreateVideoPanel({
  prompt, setPrompt, referenceImages, addReferenceImage, removeReferenceImage,
  fileInputRef, selectedModel, enhance, setEnhance, sound, setSound,
}: CreateVideoPanelProps) {
  const [multiShot, setMultiShot] = useState(false);

  const uploadEndFrame = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) {
        const reader = new FileReader();
        reader.onload = () => addReferenceImage(reader.result as string);
        reader.readAsDataURL(f);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-3">
      {/* Hero banner */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-emerald-900/40 to-card h-28 flex flex-col justify-between p-3">
        <div className="flex justify-end">
          <span className="text-[9px] bg-muted/60 backdrop-blur px-2 py-0.5 rounded-md text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            ✎ Change
          </span>
        </div>
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-wider">GENERAL</p>
          <p className="text-[10px] text-muted-foreground">{selectedModel?.name || 'Kling 3.0'}</p>
        </div>
      </div>

      {/* Start / End frame */}
      <div className="flex gap-2">
        <FrameUpload
          label="Start frame"
          image={referenceImages[0]}
          onUpload={() => fileInputRef.current?.click()}
          onRemove={() => removeReferenceImage(0)}
        />
        <FrameUpload
          label="End frame"
          image={referenceImages[1]}
          onUpload={uploadEndFrame}
          onRemove={() => removeReferenceImage(1)}
        />
      </div>

      {/* Multi-shot toggle */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-1">
          <span className="text-xs text-foreground">Multi-shot</span>
          <span className="text-[10px] text-muted-foreground">ⓘ</span>
        </div>
        <button
          onClick={() => setMultiShot(!multiShot)}
          className={`w-9 h-5 rounded-full transition-colors relative ${multiShot ? 'bg-primary' : 'bg-muted'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${multiShot ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Prompt */}
      <div className="space-y-1.5">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder='Describe your video, like "A woman walking through a neon-lit city". Add elements using @'
          rows={3}
          className="w-full bg-card rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/40 resize-none border-0 focus:outline-none leading-relaxed"
          style={{ scrollbarWidth: 'none' }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEnhance(!enhance)}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition-colors ${enhance ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          >
            <Sparkles className="w-3 h-3" /> Enhance {enhance ? 'on' : 'off'}
          </button>
          <button
            onClick={() => setSound(!sound)}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition-colors ${sound ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          >
            <Volume2 className="w-3 h-3" /> {sound ? 'On' : 'Off'}
          </button>
          <button className="text-[10px] text-muted-foreground flex items-center gap-1 px-1">
            <span className="text-primary">@</span> Elements
          </button>
        </div>
      </div>
    </div>
  );
}

function FrameUpload({ label, image, onUpload, onRemove }: { label: string; image?: string; onUpload: () => void; onRemove: () => void }) {
  return (
    <div className="flex-1">
      {image ? (
        <div className="relative rounded-xl overflow-hidden border border-border aspect-video">
          <img src={image} alt="" className="w-full h-full object-cover" />
          <button onClick={onRemove} className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center">×</button>
        </div>
      ) : (
        <button
          onClick={onUpload}
          className="w-full aspect-video border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-foreground/30 transition-colors relative"
        >
          <span className="absolute top-1 right-1.5 text-[8px] text-muted-foreground/50">Optional</span>
          <ImagePlus className="w-4 h-4" />
          <span className="text-[10px]">{label}</span>
        </button>
      )}
    </div>
  );
}
