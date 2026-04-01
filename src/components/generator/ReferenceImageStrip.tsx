import { useMemo } from 'react';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImagePlus, X } from 'lucide-react';

type ReferenceImageStripProps = {
  images: string[];
  maxImages?: number;
  onAdd: () => void;
  onPreview: (image: string) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

type SortableReferenceImage = {
  id: string;
  src: string;
  index: number;
};

export function ReferenceImageStrip({
  images,
  maxImages = 5,
  onAdd,
  onPreview,
  onRemove,
  onReorder,
}: ReferenceImageStripProps) {
  const sortableImages = useMemo<SortableReferenceImage[]>(() => {
    const seen = new Map<string, number>();

    return images.map((src, index) => {
      const occurrence = seen.get(src) ?? 0;
      seen.set(src, occurrence + 1);

      return {
        id: `${src}::${occurrence}`,
        src,
        index,
      };
    });
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const fromIndex = sortableImages.findIndex((image) => image.id === active.id);
    const toIndex = sortableImages.findIndex((image) => image.id === over.id);

    if (fromIndex === -1 || toIndex === -1) return;

    onReorder(fromIndex, toIndex);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={sortableImages.map((image) => image.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="mb-2 flex items-center gap-3 overflow-x-auto pb-1">
          {sortableImages.map((image) => (
            <SortableThumbnail
              key={image.id}
              id={image.id}
              src={image.src}
              index={image.index}
              onPreview={() => onPreview(image.src)}
              onRemove={() => onRemove(image.index)}
            />
          ))}

          {images.length < maxImages && (
            <button
              type="button"
              onClick={onAdd}
              title="Upload image"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/15 text-muted-foreground transition-all hover:border-foreground/20 hover:bg-muted/30 hover:text-foreground/70"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}


type SortableThumbnailProps = {
  id: string;
  src: string;
  index: number;
  onPreview: () => void;
  onRemove: () => void;
};

function SortableThumbnail({ id, src, index, onPreview, onRemove }: SortableThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative shrink-0 ${isDragging ? 'z-20' : ''}`}
    >
      <button
        type="button"
        onClick={onPreview}
        className={`relative block h-10 w-10 cursor-grab overflow-hidden rounded-lg border border-border/80 bg-muted/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg active:cursor-grabbing focus:outline-none ${isDragging ? 'scale-105 shadow-xl' : ''}`}
        {...attributes}
        {...listeners}
      >
        <img src={src} alt="" className="h-full w-full select-none object-cover" draggable={false} />
        <span className="absolute bottom-0.5 left-0.5 flex h-4 w-4 items-center justify-center rounded bg-black/60 text-[9px] font-bold text-white backdrop-blur-sm">
          {index + 1}
        </span>
      </button>

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-border/50 bg-background/80 text-foreground/75 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:text-foreground"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
