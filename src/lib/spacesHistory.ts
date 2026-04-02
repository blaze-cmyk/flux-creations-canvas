import { supabase } from '@/integrations/supabase/client';

export async function logSpacesEvent(params: {
  projectId: string;
  nodeId: string;
  eventType: 'image_generated' | 'video_generated' | 'text_generated' | 'image_uploaded' | 'assistant_response';
  contentUrl?: string;
  prompt?: string;
  model?: string;
  metadata?: Record<string, any>;
}) {
  const { projectId, nodeId, eventType, contentUrl, prompt, model, metadata } = params;
  if (!projectId) return;
  
  await supabase.from('spaces_history').insert({
    project_id: projectId,
    node_id: nodeId,
    event_type: eventType,
    content_url: contentUrl || null,
    prompt: prompt || null,
    model: model || null,
    metadata: metadata || {},
  } as any);
}
