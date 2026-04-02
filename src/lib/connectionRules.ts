// Connection rules: defines what each handle type can connect to
// source handle → target handle compatibility

export type HandleType = 'text-out' | 'img-out' | 'img-out-2' | 'video-out' | 'audio-out' | 
  'start-img-out' | 'end-img-out' |
  'text-in' | 'img-in' | 'ref-in' | 'start-img-in' | 'end-img-in' | 'video-in' | 'audio-in';

// What each source handle can connect to
const COMPATIBLE_TARGETS: Record<string, string[]> = {
  // Text outputs → text inputs
  'text-out': ['text-in'],
  // Image outputs → image inputs (ref, start, end, generic img)
  'img-out': ['img-in', 'ref-in', 'start-img-in', 'end-img-in'],
  'img-out-2': ['img-in', 'ref-in', 'start-img-in', 'end-img-in'],
  'start-img-out': ['img-in', 'ref-in', 'start-img-in'],
  'end-img-out': ['img-in', 'ref-in', 'end-img-in'],
  // Video outputs → video inputs
  'video-out': ['video-in', 'ref-in'],
  // Audio outputs → audio inputs
  'audio-out': ['audio-in'],
};

// What each node type can output
export const NODE_OUTPUTS: Record<string, { id: string; label: string; icon: 'image' | 'video' | 'text' | 'audio' | 'start-image' | 'end-image' }[]> = {
  'creation': [
    { id: 'img-out', label: 'Image output', icon: 'image' },
    { id: 'img-out-2', label: 'Image output 2', icon: 'image' },
  ],
  'image-generator': [
    { id: 'img-out', label: 'Generated image', icon: 'image' },
  ],
  'video-generator': [
    { id: 'start-img-out', label: 'Start image', icon: 'start-image' },
    { id: 'end-img-out', label: 'End image', icon: 'end-image' },
    { id: 'video-out', label: 'Generated video', icon: 'video' },
    { id: 'audio-out', label: 'Audio', icon: 'audio' },
  ],
  'text-node': [
    { id: 'text-out', label: 'Text output', icon: 'text' },
  ],
  'text': [
    { id: 'text-out', label: 'Text output', icon: 'text' },
  ],
  'assistant': [
    { id: 'text-out', label: 'Text output', icon: 'text' },
  ],
};

// What each node type can accept as input
export const NODE_INPUTS: Record<string, { id: string; label: string; icon: 'image' | 'video' | 'text' | 'audio' | 'start-image' | 'end-image' | 'reference' }[]> = {
  'creation': [],
  'image-generator': [
    { id: 'text-in', label: 'Text / Prompt', icon: 'text' },
    { id: 'img-in', label: 'Reference image', icon: 'reference' },
  ],
  'video-generator': [
    { id: 'text-in', label: 'Text / Prompt', icon: 'text' },
    { id: 'start-img-in', label: 'Start image', icon: 'start-image' },
    { id: 'end-img-in', label: 'End image', icon: 'end-image' },
    { id: 'ref-in', label: 'References', icon: 'reference' },
  ],
  'text-node': [],
  'text': [],
  'assistant': [
    { id: 'text-in', label: 'Text input', icon: 'text' },
    { id: 'img-in', label: 'Image context', icon: 'image' },
  ],
};

export function isValidConnection(
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
): boolean {
  if (!sourceHandle || !targetHandle) return false;
  const targets = COMPATIBLE_TARGETS[sourceHandle];
  if (!targets) return false;
  return targets.includes(targetHandle);
}
