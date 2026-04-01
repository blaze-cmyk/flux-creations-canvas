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

function aspectRatioToSize(ratio: string): string {
  const map: Record<string, string> = {
    "9:16": "576x1024",
    "16:9": "1024x576",
    "1:1": "1024x1024",
    "4:3": "1024x768",
    "3:4": "768x1024",
  };
  return map[ratio] || "1024x1024";
}

async function fetchImageAsDataUri(src: string): Promise<string | null> {
  try {
    if (src.startsWith("data:")) return src;
    if (src.startsWith("http")) {
      const resp = await fetch(src);
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const mimeType = resp.headers.get("content-type") || "image/jpeg";
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return `data:${mimeType};base64,${btoa(binary)}`;
    }
    return null;
  } catch { return null; }
}

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
      // Gemini: inline images in parts — pass each image separately, no merging
      const parts: any[] = [];

      for (const refImg of referenceImages) {
        const dataUri = await fetchImageAsDataUri(refImg);
        if (dataUri) {
          const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        }
      }

      // User prompt passed EXACTLY as typed — no modifications
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
      // FLUX: Use /v1/images/generations for ALL cases
      // Pass image_url as string (1 ref) or array (2+ refs) — NEVER merge images
      const endpoint = `${APIYI_BASE}/v1/images/generations`;

      // Convert reference images to data URIs for inline passing
      const refDataUris: string[] = [];
      for (const ref of referenceImages) {
        const dataUri = await fetchImageAsDataUri(ref);
        if (dataUri) refDataUris.push(dataUri);
      }

      // Build request body — prompt is NEVER modified
      const reqBody: Record<string, unknown> = {
        model: modelConfig.apiModel,
        prompt, // raw user prompt, zero modifications
        n: 1,
        size: aspectRatioToSize(ar),
      };

      // Add images only if present — as native array, NEVER merged/stitched
      if (refDataUris.length === 1) {
        reqBody.image_url = refDataUris[0]; // single string for 1 image
      } else if (refDataUris.length > 1) {
        reqBody.image_url = refDataUris; // array for 2+ images
      }

      console.log(`Calling Flux: ${endpoint}, model=${modelConfig.apiModel}, ar=${ar}, refs=${refDataUris.length}, prompt="${prompt.substring(0, 80)}..."`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${APIYI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Flux error:", response.status, errText);
        return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      console.log("Flux response keys:", Object.keys(data));

      const rawUrl = data?.data?.[0]?.url;
      const b64 = data?.data?.[0]?.b64_json;

      if (rawUrl) {
        // Download server-side to avoid CORS issues
        const imgResp = await fetch(rawUrl);
        if (imgResp.ok) {
          const buf = await imgResp.arrayBuffer();
          const bytes = new Uint8Array(buf);
          imageBase64 = toBase64DataUri(bytes, imgResp.headers.get("content-type") || "image/png");
        } else {
          imageUrl = rawUrl;
        }
      } else if (b64) {
        imageBase64 = `data:image/png;base64,${b64}`;
      } else {
        console.error("Unexpected Flux response:", JSON.stringify(data).substring(0, 500));
        return new Response(JSON.stringify({ error: "No image in response" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
