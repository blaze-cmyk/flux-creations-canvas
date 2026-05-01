import { useRef, useState } from 'react';
import { X, ImagePlus } from 'lucide-react';

export type ExtraRef = {
  id: string;
  url: string;
  name: string; // "Image 1", "Image 2"...
};

interface Props {
  refs: ExtraRef[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onChipClick?: (ref: ExtraRef) => void;
}

export function ExtraRefStrip({ refs, onAdd, onRemove, onReorder, onChipClick }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);

  const handleFiles = (fl: FileList | File[] | null) => {
    if (!fl) return;
    const arr = Array.from(fl).filter((f) => f.type.startsWith('image/'));
    if (arr.length) onAdd(arr);
  };

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDropZoneActive(true);
        }
      }}
      onDragLeave={() => setDropZoneActive(false)}
      onDrop={(e) => {
        if (e.dataTransfer.files?.length) {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }
        setDropZoneActive(false);
      }}
      className={`flex items-center gap-2 flex-wrap transition-all ${
        dropZoneActive ? 'ring-2 ring-primary/50 rounded-xl p-1 -m-1' : ''
      }`}
    >
      {refs.map((r, idx) => {
        const isDragging = draggingIdx === idx;
        const isDropTarget = dragOverIdx === idx && draggingIdx !== null && draggingIdx !== idx;
        return (
          <div
            key={r.id}
            draggable
            onDragStart={(e) => {
              setDraggingIdx(idx);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(idx));
            }}
            onDragEnd={() => {
              setDraggingIdx(null);
              setDragOverIdx(null);
            }}
            onDragOver={(e) => {
              if (draggingIdx === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverIdx(idx);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const from = Number(e.dataTransfer.getData('text/plain'));
              if (!Number.isNaN(from) && from !== idx) onReorder(from, idx);
              setDraggingIdx(null);
              setDragOverIdx(null);
            }}
            onClick={() => onChipClick?.(r)}
            title={`${r.name} — drag to reorder, click to insert @${r.name}`}
            className={`group relative shrink-0 cursor-grab active:cursor-grabbing transition-all ${
              isDragging ? 'opacity-40 scale-95' : ''
            } ${isDropTarget ? 'translate-x-1' : ''}`}
          >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden ring-1 ring-white/10 bg-white/5">
              <img src={r.url} alt={r.name} className="w-full h-full object-cover pointer-events-none" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-1 py-0.5 text-[9px] font-semibold text-white bg-gradient-to-t from-black/80 to-transparent text-center">
                {r.name}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(r.id);
                }}
                aria-label={`Remove ${r.name}`}
                className="absolute -top-1.5 -right-1.5 grid place-items-center w-4 h-4 rounded-full bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity ring-1 ring-white/30"
              >
                <X className="w-2.5 h-2.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="Add reference image (or drop / paste)"
        aria-label="Add reference image"
        className="shrink-0 w-12 h-12 rounded-lg ring-1 ring-white/10 bg-white/[0.04] hover:bg-white/[0.08] grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {refs.length === 0 ? <ImagePlus className="w-4 h-4" /> : <span className="text-lg leading-none">+</span>}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
