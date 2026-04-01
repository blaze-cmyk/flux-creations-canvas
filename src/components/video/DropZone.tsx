import { useState, useCallback, DragEvent, ReactNode } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
}

export function DropZone({ onFiles, accept = 'image/*', children, className = '', activeClassName = 'ring-2 ring-primary border-primary' }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setDragging(true);
  }, []);

  const handleDragOut = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => {
      if (accept === 'image/*') return f.type.startsWith('image/');
      if (accept === 'video/*') return f.type.startsWith('video/');
      if (accept === 'image/*,video/*') return f.type.startsWith('image/') || f.type.startsWith('video/');
      return true;
    });
    if (files.length > 0) onFiles(files);
  }, [onFiles, accept]);

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`${className} ${dragging ? activeClassName : ''} transition-all`}
    >
      {children}
    </div>
  );
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}
