import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIYI_BASE = "https://api.apiyi.com";

const MODEL_MAP: Record<string, { apiModel: string; type: "gemini" | "flux" }> = {
  "gemini-3.1-flash-image": { apiModel: "gemini-3.1-flash-image-preview", type: "gemini" },
  "gemini-3-pro-image": { apiModel: "gemini-3-pro-image-preview", type: "gemini" },
  "gemini-2.5-flash-image": { apiModel: "gemini-2.5-flash-image", type: "gemini" },
  "flux-kontext-pro": { apiModel: "flux-kontext-pro", type: "flux" },
  "flux-kontext-max": { apiModel: "flux-kontext-max", type: "flux" },
  "flux-dev": { apiModel: "flux-dev", type: "flux" },
  "flux-pro": { apiModel: "flux-pro", type: "flux" },
};

const QUALITY_MAP: Record<string, string> = { "1K": "1K", "2K": "2K", "4K": "4K" };

// Helper: fetch image as bytes
async function fetchImageBytes(src: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  try {
    if (src.startsWith("data:")) {
      const match = src.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return null;
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { bytes, mimeType: match[1] };
    }
    if (src.startsWith("http")) {
      const resp = await fetch(src);
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      return { bytes: new Uint8Array(buf), mimeType: resp.headers.get("content-type") || "image/jpeg" };
    }
    return null;
  } catch { return null; }
}

// Helper: convert bytes to base64 data URI
function toBase64DataUri(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${mimeType};base64,${btoa(binary)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIYI_API_KEY = Deno.env.get("APIYI_API_KEY");
    if (!APIYI_API_KEY) {
      return new Response(JSON.stringify({ error: "APIYI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prompt, referenceImages = [], model = "gemini-3.1-flash-image", quality = "2K", aspectRatio = "1:1" } = body;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modelConfig = MODEL_MAP[model];
    if (!modelConfig) {
      return new Response(JSON.stringify({ error: `Unknown model: ${model}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imageUrl: string | undefined;
    let imageBase64: string | undefined;
    const ar = aspectRatio === "Auto" ? "1:1" : aspectRatio;

    if (modelConfig.type === "gemini") {
      // Gemini: inline images in parts
      const parts: any[] = [];
      
      // Add reference images first so the model sees them before the text instruction
      for (const refImg of referenceImages) {
        const img = await fetchImageBytes(refImg);
        if (img) {
          let binary = "";
          for (let i = 0; i < img.bytes.length; i++) binary += String.fromCharCode(img.bytes[i]);
          parts.push({ inlineData: { mimeType: img.mimeType, data: btoa(binary) } });
        }
      }
      
      parts.push({ text: prompt });

      const imageSize = QUALITY_MAP[quality] || "2K";
      const endpoint = `${APIYI_BASE}/v1beta/models/${modelConfig.apiModel}:generateContent`;

      console.log(`Calling Gemini: ${endpoint}, ar=${ar}, size=${imageSize}, refs=${referenceImages.length}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${APIYI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ar, imageSize } },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini error:", response.status, errText);
        return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const resParts = candidate?.content?.parts ?? [];
      const imgPart = resParts.find((p: any) => p.inlineData?.data);

      if (imgPart?.inlineData?.data) {
        imageBase64 = `data:${imgPart.inlineData.mimeType || "image/png"};base64,${imgPart.inlineData.data}`;
      } else {
        const errorMsg = candidate?.finishMessage || "Image generation failed. Try rephrasing your prompt.";
        console.error("Gemini no image:", candidate?.finishReason, errorMsg);
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    } else if (modelConfig.type === "flux") {
      const hasRefs = referenceImages.length > 0;

      if (hasRefs) {
        // Flux with reference images → use /v1/images/edits (multipart/form-data)
        // For multiple images, we use the first image as the main edit target
        // The prompt should describe what to do with the image
        const firstImg = await fetchImageBytes(referenceImages[0]);
        if (!firstImg) {
          return new Response(JSON.stringify({ error: "Could not load reference image" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Build enhanced prompt referencing all images
        let enhancedPrompt = prompt;
        
        // If multiple reference images, we need to merge them side-by-side
        // and adjust the prompt to reference left/right
        let imageToSend = firstImg;
        
        if (referenceImages.length >= 2) {
          // For multi-image: merge side by side using canvas-like approach
          // Since we can't use Canvas in Deno easily, we'll send as the first image
          // and describe the second image in the prompt
          // Better approach: use Kontext Max which supports the edit API
          
          // Fetch all images
          const allImages: { bytes: Uint8Array; mimeType: string }[] = [];
          for (const ref of referenceImages) {
            const img = await fetchImageBytes(ref);
            if (img) allImages.push(img);
          }
          
          if (allImages.length >= 2) {
            // Create a simple side-by-side merge using PPM format (no external deps needed)
            // We'll use a simpler approach: send first image to edit API with prompt referencing all
            imageToSend = allImages[0];
            
            // For 2+ images with Flux, we enhance the prompt
            // The user's prompt like "swap face from image 1 to image 2" becomes
            // instructions on the primary image
            console.log(`Flux edit with ${allImages.length} reference images`);
          }
        }

        // Use flux-kontext-max for editing (it's the edit-capable model)
        const editModel = modelConfig.apiModel.includes("kontext") ? modelConfig.apiModel : "flux-kontext-max";
        const endpoint = `${APIYI_BASE}/v1/images/edits`;

        // Build multipart form data
        const formData = new FormData();
        const blob = new Blob([imageToSend.bytes], { type: imageToSend.mimeType });
        const ext = imageToSend.mimeType.includes("png") ? "png" : "jpg";
        formData.append("image", blob, `image.${ext}`);
        formData.append("model", editModel);
        formData.append("prompt", enhancedPrompt);
        
        // Add extra params as individual form fields
        formData.append("aspect_ratio", ar);
        formData.append("safety_tolerance", "6");
        formData.append("output_format", "png");

        console.log(`Calling Flux Edit: ${endpoint}, model=${editModel}, ar=${ar}, refs=${referenceImages.length}`);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${APIYI_API_KEY}` },
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Flux Edit error:", response.status, errText);
          return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: errText }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        imageUrl = data?.data?.[0]?.url;

        if (!imageUrl) {
          // Check if base64 response
          const b64 = data?.data?.[0]?.b64_json;
          if (b64) {
            imageBase64 = `data:image/png;base64,${b64}`;
          } else {
            console.error("No URL in Flux edit response:", JSON.stringify(data).substring(0, 500));
            return new Response(JSON.stringify({ error: "No image in response" }), {
              status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

      } else {
        // Flux text-to-image (no reference images)
        const endpoint = `${APIYI_BASE}/v1/images/generations`;

        console.log(`Calling Flux Gen: ${endpoint}, model=${modelConfig.apiModel}, ar=${ar}`);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${APIYI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelConfig.apiModel,
            prompt,
            aspect_ratio: ar,
            safety_tolerance: 6,
            output_format: "png",
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Flux Gen error:", response.status, errText);
          return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: errText }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        imageUrl = data?.data?.[0]?.url;

        if (!imageUrl) {
          console.error("No URL in Flux response:", JSON.stringify(data).substring(0, 500));
          return new Response(JSON.stringify({ error: "No image URL in response" }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ imageUrl, imageBase64 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
