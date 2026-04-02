import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { ImageIcon, Upload, Replace } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { resolveToUrl } from '@/lib/uploadToStorage';
import { NodeToolbar } from './NodeToolbar';
import { NodeConnectors } from './NodeConnectors';
import { NODE_INPUTS, NODE_OUTPUTS } from '@/lib/connectionRules';

export function CreationNode({ id, data, selected }: { id: string; data: SpaceNodeData; selected?: boolean }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files).find(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        updateNodeData(id, { imageUrl: dataUrl, label: file.name.length > 35 ? file.name.slice(0, 32) + '...' : file.name });
        try {
          const publicUrl = await resolveToUrl(dataUrl);
          updateNodeData(id, { imageUrl: publicUrl });
        } catch (e) {
          console.error('Upload failed:', e);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  }, [id, updateNodeData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="space-node relative">
      {selected && <NodeToolbar nodeId={id} nodeType="creation" />}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
      />

      {/* Label */}
      <div className="flex items-center gap-1.5 px-1 py-1.5 text-sm text-[#999]">
        <ImageIcon className="w-4 h-4" />
        <span className="truncate max-w-[400px]">{data.label}</span>
      </div>

      {/* Image card */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={handleDrop}
        className={`relative w-[320px] rounded-2xl overflow-hidden border transition-all ${
          dragging ? 'border-primary ring-2 ring-primary/30' : 'border-[#2a2a2a]'
        } ${data.imageUrl ? '' : 'bg-[#111]'}`}
        style={{ minHeight: data.imageUrl ? undefined : 420 }}
      >
        {data.imageUrl ? (
          <>
            <img src={data.imageUrl} alt="" className="w-full h-auto object-contain" draggable={false} />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-white hover:bg-black/80 transition-colors"
            >
              <Replace className="w-3.5 h-3.5" />
              Replace
            </button>
          </>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-[420px] flex flex-col items-center justify-center gap-3 text-[#555] hover:text-[#888] transition-colors cursor-pointer"
          >
            <Upload className="w-8 h-8" />
            <span className="text-sm">Drop image or click to upload</span>
          </button>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm rounded-2xl">
            <div className="flex items-center gap-2 text-sm text-white">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading…
            </div>
          </div>
        )}

        {dragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center">
            <span className="text-sm text-primary font-medium">Drop to upload</span>
          </div>
        )}
      </div>

      {/* Connectors — creation only has outputs (image) */}
      <NodeConnectors inputs={NODE_INPUTS['creation']} outputs={NODE_OUTPUTS['creation']} />
    </div>
  );
}
