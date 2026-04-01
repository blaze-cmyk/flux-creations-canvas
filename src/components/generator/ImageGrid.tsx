import { useGeneratorStore } from '@/store/generatorStore';
import { AlertCircle, Eye, RefreshCw, Trash2, Loader2 } from 'lucide-react';

export function ImageGrid() {
  const { images, setSelectedImageId, retryImage, deleteImage } = useGeneratorStore();

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <p className="text-lg">Start creating</p>
          <p className="text-xs text-muted-foreground/60">Type a prompt below and click Generate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5" style={{ columnGap: '12px' }}>
        {images.map((img) => (
          <div key={img.id} className="break-inside-avoid" style={{ marginBottom: '12px' }}>
            <ImageCard
              image={img}
              onView={() => setSelectedImageId(img.id)}
              onRetry={() => retryImage(img.id)}
              onDelete={() => deleteImage(img.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageCard({ image, onView, onRetry, onDelete }: {
  image: ReturnType<typeof useGeneratorStore.getState>['images'][0];
  onView: () => void;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const statusBadge = image.status === 'failed' ? (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1 bg-destructive/80 text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
        <AlertCircle className="w-3 h-3" /> Failed
      </span>
      <span className="flex items-center gap-1 bg-muted/80 text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">
        Credits refunded
      </span>
    </div>
  ) : image.status === 'nsfw' ? (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1 bg-muted/80 text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
        <Eye className="w-3 h-3" /> NSFW
      </span>
      <span className="flex items-center gap-1 bg-muted/80 text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">
        Credits refunded
      </span>
    </div>
  ) : null;

  return (
    <div className="group relative rounded-xl overflow-hidden bg-card border border-border hover:border-foreground/20 transition-colors cursor-pointer">
      {image.status === 'generating' ? (
        <div className="aspect-[9/16] flex items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Generating...</span>
          </div>
        </div>
      ) : image.status === 'complete' && image.imageUrl ? (
        <img
          src={image.imageUrl}
          alt=""
          className="w-full object-cover"
          onClick={onView}
          loading="lazy"
        />
      ) : (
        <div className="aspect-[9/16] bg-muted/10 flex flex-col items-center justify-center gap-3 p-4">
          {statusBadge && <div className="absolute top-2 left-2">{statusBadge}</div>}
          <div className="text-xs text-muted-foreground text-center mt-8 px-2 line-clamp-3">
            {image.status === 'failed' ? 'Please try again, or change your input files or prompt.' : 'Restricted content detected'}
          </div>
          <p className="text-[10px] text-muted-foreground/60 line-clamp-1 px-2">{image.model} model</p>
        </div>
      )}

      {/* Hover overlay with actions */}
      {(image.status === 'failed' || image.status === 'nsfw') && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); onRetry(); }} className="flex items-center gap-1 bg-card/90 text-foreground text-xs px-3 py-1.5 rounded-lg hover:bg-muted transition-colors border border-border">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex items-center gap-1 bg-card/90 text-foreground text-xs px-3 py-1.5 rounded-lg hover:bg-muted transition-colors border border-border">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}

      {/* Hover overlay for completed images */}
      {image.status === 'complete' && (
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors" onClick={onView} />
      )}
    </div>
  );
}
