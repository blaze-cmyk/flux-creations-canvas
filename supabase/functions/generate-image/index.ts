import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIYI_BASE = "https://api.apiyi.com";
const FAL_BASE = "https://queue.fal.run";

const MODEL_MAP: Record<string, { falModel?: string; apiModel?: string; type: "gemini" | "flux" }> = {
  "gemini-3.1-flash-image": { apiModel: "gemini-3.1-flash-image-preview", type: "gemini" },
  "gemini-3-pro-image": { apiModel: "gemini-3-pro-image-preview", type: "gemini" },
  "gemini-2.5-flash-image": { apiModel: "gemini-2.5-flash-image", type: "gemini" },
  "flux-kontext-pro": { falModel: "fal-ai/flux-pro/kontext", type: "flux" },
  "flux-kontext-max": { falModel: "fal-ai/flux-pro/kontext/max", type: "flux" },
  "flux-dev": { falModel: "fal-ai/flux/dev", type: "flux" },
  "flux-pro": { falModel: "fal-ai/flux-pro/v1.1", type: "flux" },
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

// Poll fal.ai queue until complete
async function pollFalResult(requestId: string, falModel: string, falKey: string): Promise<any> {
  const statusUrl = `https://queue.fal.run/${falModel}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${falModel}/requests/${requestId}`;

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusResp = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });

    if (!statusResp.ok) {
      console.error("Fal status check error:", statusResp.status);
      continue;
    }

    const statusData = await statusResp.json();
    console.log(`Fal status (${i}):`, statusData.status);

    if (statusData.status === "COMPLETED") {
      const resultResp = await fetch(resultUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });
      if (!resultResp.ok) {
        throw new Error(`Failed to fetch fal result: ${resultResp.status}`);
      }
      return await resultResp.json();
    }

    if (statusData.status === "FAILED") {
      throw new Error(statusData.error || "Fal generation failed");
    }
  }

  throw new Error("Fal generation timed out");
}

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

      // Add reference images as inline data
      for (const refImg of referenceImages) {
        const dataUri = await fetchImageAsDataUri(refImg);
        if (!dataUri) continue;
        const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) continue;
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }

      // Add prompt text — passed exactly as user typed
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
        console.error("Gemini no image:", candidate?.finishReason, errorMsg);
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ========== FLUX MODELS (via fal.ai) ==========
    if (modelConfig.type === "flux") {
      const FAL_KEY = Deno.env.get("FAL_KEY");
      if (!FAL_KEY) {
        return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const falModel = modelConfig.falModel!;
      const isKontext = falModel.includes("kontext");

      // Build fal.ai request body
      const reqBody: Record<string, unknown> = {
        prompt, // raw user prompt, NEVER modified
        num_images: 1,
        output_format: "png",
        safety_tolerance: "6",
      };

      // Add aspect ratio
      if (ar !== "Auto") {
        reqBody.aspect_ratio = ar;
      }

      // For Kontext models: pass reference image(s) via image_url
      // Kontext accepts URLs or base64 data URIs natively
      if (isKontext && referenceImages.length > 0) {
        // Kontext takes a single image_url — for multiple refs, use the first one
        // (Kontext pro/max is designed for single-image editing with prompt)
        const refUrl = referenceImages[0];
        reqBody.image_url = refUrl;
        console.log(`Flux Kontext: using 1 reference image`);
      }

      // For non-kontext flux models (dev, pro): no image_url support
      // They are text-to-image only

      const endpoint = `${FAL_BASE}/${falModel}`;

      console.log(
        `Calling fal.ai: ${endpoint}, ar=${ar}, refs=${referenceImages.length}, prompt="${prompt.substring(0, 80)}..."`,
      );

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

      const submitData = await submitResp.json();
      console.log("Fal submit response:", JSON.stringify(submitData).substring(0, 300));

      let resultData: any;

      // Check if we got an immediate result (sync) or need to poll (queue)
      if (submitData.images && submitData.images.length > 0) {
        // Synchronous result
        resultData = submitData;
      } else if (submitData.request_id) {
        // Queue-based — poll for result
        console.log(`Fal queued, request_id: ${submitData.request_id}`);
        resultData = await pollFalResult(submitData.request_id, falModel, FAL_KEY);
      } else {
        console.error("Unexpected fal response:", JSON.stringify(submitData).substring(0, 500));
        return new Response(JSON.stringify({ error: "Unexpected fal.ai response" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Fal result keys:", Object.keys(resultData || {}));

      // Extract image from result
      const outputImage = resultData?.images?.[0];
      if (outputImage?.url) {
        // Proxy the image to avoid CORS issues
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
        
        // Check for NSFW
        if (resultData?.has_nsfw_concepts?.[0]) {
          return new Response(JSON.stringify({ error: "Image was filtered due to content policy." }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
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
