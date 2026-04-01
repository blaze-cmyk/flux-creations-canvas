import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIYI_BASE = "https://api.apiyi.com";
const FAL_BASE = "https://fal.run";

type ModelConfig = {
  type: "gemini" | "fal";
  falModel?: string;
  apiModel?: string;
  supportsImageInput?: boolean;
  isMultiRef?: boolean;
  requiresImage?: boolean; // editing-only models that need image_url
  textFallback?: string; // fal model to fallback to when no reference images
};

const MODEL_MAP: Record<string, ModelConfig> = {
  // Gemini models (via apiyi)
  "gemini-3.1-flash-image": { apiModel: "gemini-3.1-flash-image-preview", type: "gemini", supportsImageInput: true, isMultiRef: true },
  "gemini-3-pro-image": { apiModel: "gemini-3-pro-image-preview", type: "gemini", supportsImageInput: true, isMultiRef: true },
  "gemini-2.5-flash-image": { apiModel: "gemini-2.5-flash-image", type: "gemini", supportsImageInput: true, isMultiRef: true },
  // Flux Kontext (via fal.ai) — editing models, require image_url
  "flux-kontext-pro": { falModel: "fal-ai/flux-pro/kontext", type: "fal", supportsImageInput: true, requiresImage: true, textFallback: "fal-ai/flux-pro/v1.1" },
  "flux-kontext-max": { falModel: "fal-ai/flux-pro/kontext/max", type: "fal", supportsImageInput: true, requiresImage: true, textFallback: "fal-ai/flux-pro/v1.1" },
  "flux-kontext-multi": { falModel: "fal-ai/flux-pro/kontext/multi", type: "fal", supportsImageInput: true, isMultiRef: true, requiresImage: true, textFallback: "fal-ai/flux-pro/v1.1" },
  // Flux 2 (via fal.ai) — editing models
  "flux-2-pro": { falModel: "fal-ai/flux-2-pro/edit", type: "fal", supportsImageInput: true, requiresImage: true, textFallback: "fal-ai/flux-pro/v1.1" },
  "flux-2-max": { falModel: "fal-ai/flux-2-max/edit", type: "fal", supportsImageInput: true, requiresImage: true, textFallback: "fal-ai/flux-pro/v1.1" },
  "flux-2-flex": { falModel: "fal-ai/flux-2-flex/edit", type: "fal", supportsImageInput: true, isMultiRef: true, requiresImage: true, textFallback: "fal-ai/flux-pro/v1.1" },
  "flux-2-dev": { falModel: "fal-ai/flux-2/edit", type: "fal", supportsImageInput: true, requiresImage: true, textFallback: "fal-ai/flux/dev" },
  // Flux 1 (via fal.ai) — text-to-image models
  "flux-schnell": { falModel: "fal-ai/flux/schnell", type: "fal", supportsImageInput: false },
  "flux-dev": { falModel: "fal-ai/flux/dev", type: "fal", supportsImageInput: false },
  "flux-pro-v1.1": { falModel: "fal-ai/flux-pro/v1.1", type: "fal", supportsImageInput: false },
  // Other fal.ai models
  "recraft-v3": { falModel: "fal-ai/recraft-v3", type: "fal", supportsImageInput: false },
  "ideogram-v3": { falModel: "fal-ai/ideogram/v3", type: "fal", supportsImageInput: false },
};

const QUALITY_MAP: Record<string, string> = { "1K": "1K", "2K": "2K", "4K": "4K" };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function fetchImageAsDataUri(src: string): Promise<string | null> {
  try {
    if (src.startsWith("data:")) return src;
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const resp = await fetch(src);
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const mimeType = resp.headers.get("content-type") || "image/jpeg";
      return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
    }
    return null;
  } catch {
    return null;
  }
}

function toBase64DataUri(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}

// fal.run is synchronous — no polling needed

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";
    const referenceImages = Array.isArray(body?.referenceImages)
      ? body.referenceImages.filter((img: unknown): img is string => typeof img === "string")
      : [];
    const model = typeof body?.model === "string" ? body.model : "gemini-3.1-flash-image";
    const quality = typeof body?.quality === "string" ? body.quality : "2K";
    const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : "1:1";

    if (!prompt.trim()) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modelConfig = MODEL_MAP[model];
    if (!modelConfig) {
      return new Response(JSON.stringify({ error: `Unknown model: ${model}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imageUrl: string | undefined;
    let imageBase64: string | undefined;
    const ar = aspectRatio === "Auto" ? "1:1" : aspectRatio;

    // ========== GEMINI MODELS (via apiyi) ==========
    if (modelConfig.type === "gemini") {
      const APIYI_API_KEY = Deno.env.get("APIYI_API_KEY");
      if (!APIYI_API_KEY) {
        return new Response(JSON.stringify({ error: "APIYI_API_KEY not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parts: any[] = [];

      for (const refImg of referenceImages) {
        const dataUri = await fetchImageAsDataUri(refImg);
        if (!dataUri) continue;
        const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) continue;
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }

      // Prompt passed exactly as user typed
      parts.push({ text: prompt });

      const imageSize = QUALITY_MAP[quality] || "2K";
      const endpoint = `${APIYI_BASE}/v1beta/models/${modelConfig.apiModel}:generateContent`;

      console.log(`Calling Gemini: ${endpoint}, ar=${ar}, size=${imageSize}, refs=${referenceImages.length}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${APIYI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: ar, imageSize },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini error:", response.status, errText);
        return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        const isFiltered = candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT';
        console.error("Gemini no image:", candidate?.finishReason, errorMsg);
        return new Response(JSON.stringify({ error: errorMsg, filtered: isFiltered }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ========== FAL.AI MODELS ==========
    if (modelConfig.type === "fal") {
      const FAL_KEY = Deno.env.get("FAL_KEY");
      if (!FAL_KEY) {
        return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If model requires image_url but none provided, fallback to text-to-image model
      let falModel = modelConfig.falModel!;
      if (modelConfig.requiresImage && referenceImages.length === 0) {
        if (modelConfig.textFallback) {
          falModel = modelConfig.textFallback;
          console.log(`No reference images for editing model, falling back to: ${falModel}`);
        }
      }

      // Build request body — prompt is ALWAYS raw, never modified
      const reqBody: Record<string, unknown> = {
        prompt,
        num_images: 1,
        output_format: "png",
        safety_tolerance: "6",
      };

      // Add aspect ratio
      if (ar !== "Auto") {
        reqBody.aspect_ratio = ar;
      }

      // Add reference images if model supports them and images are provided
      if (modelConfig.supportsImageInput && referenceImages.length > 0) {
        if (modelConfig.isMultiRef && referenceImages.length > 1) {
          reqBody.image_url = referenceImages;
          console.log(`Fal multi-ref: passing ${referenceImages.length} images`);
        } else {
          reqBody.image_url = referenceImages[0];
          console.log(`Fal single-ref: passing 1 image`);
        }
      }

      const endpoint = `${FAL_BASE}/${falModel}`;
      console.log(`Calling fal.ai: ${endpoint}, ar=${ar}, refs=${referenceImages.length}, prompt="${prompt.substring(0, 80)}..."`);

      // Submit to fal.ai queue
      const submitResp = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!submitResp.ok) {
        const errText = await submitResp.text();
        console.error("Fal submit error:", submitResp.status, errText);
        return new Response(JSON.stringify({ error: `Fal API error: ${submitResp.status}`, details: errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resultData = await submitResp.json();
      console.log("Fal result keys:", Object.keys(resultData || {}));

      // Check for NSFW
      if (resultData?.has_nsfw_concepts?.[0]) {
        return new Response(JSON.stringify({ error: "Image was filtered due to content policy.", filtered: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract image from result
      const outputImage = resultData?.images?.[0];
      if (outputImage?.url) {
        // Proxy the image to base64 to avoid CORS
        const imgResp = await fetch(outputImage.url);
        if (imgResp.ok) {
          const buf = await imgResp.arrayBuffer();
          const bytes = new Uint8Array(buf);
          imageBase64 = toBase64DataUri(bytes, imgResp.headers.get("content-type") || "image/png");
        } else {
          imageUrl = outputImage.url;
        }
      } else {
        console.error("No image in fal result:", JSON.stringify(resultData).substring(0, 500));
        return new Response(JSON.stringify({ error: "No image in fal.ai response" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ imageUrl, imageBase64 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
