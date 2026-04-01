import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Image, decode } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

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

function toBase64DataUri(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${mimeType};base64,${btoa(binary)}`;
}

// Merge multiple images side-by-side into a single image
async function mergeImagesSideBySide(imageDataList: { bytes: Uint8Array; mimeType: string }[]): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const decoded: Image[] = [];
  for (const img of imageDataList) {
    const d = await decode(img.bytes);
    decoded.push(d as Image);
  }

  // Normalize heights to the tallest image
  const maxH = Math.max(...decoded.map(d => d.height));
  const resized: Image[] = [];
  for (const d of decoded) {
    if (d.height < maxH) {
      const scale = maxH / d.height;
      const newW = Math.round(d.width * scale);
      resized.push(d.resize(newW, maxH));
    } else {
      resized.push(d);
    }
  }

  const totalW = resized.reduce((s, d) => s + d.width, 0);
  const canvas = new Image(totalW, maxH);

  let x = 0;
  for (const img of resized) {
    canvas.composite(img, x, 0);
    x += img.width;
  }

  const pngBytes = await canvas.encode(1); // PNG format
  return { bytes: new Uint8Array(pngBytes), mimeType: "image/png" };
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
        // Fetch all reference images
        const allImages: { bytes: Uint8Array; mimeType: string }[] = [];
        for (const ref of referenceImages) {
          const img = await fetchImageBytes(ref);
          if (img) allImages.push(img);
        }

        if (allImages.length === 0) {
          return new Response(JSON.stringify({ error: "Could not load reference images" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let imageToSend: { bytes: Uint8Array; mimeType: string };
        let enhancedPrompt = prompt;

        if (allImages.length >= 2) {
          // Merge all reference images side-by-side, numbered left to right
          console.log(`Merging ${allImages.length} images side-by-side for Flux edit`);
          imageToSend = await mergeImagesSideBySide(allImages);
          // Minimal context — let the user's prompt do the work
          const labels = allImages.map((_, i) => `image ${i + 1}`).join(", ");
          enhancedPrompt = `This image contains ${allImages.length} reference images placed side by side (left to right: ${labels}). Output a single final image, not a collage. ${prompt}`;
          console.log(`Enhanced prompt: ${enhancedPrompt}`);
        } else {
          imageToSend = allImages[0];
        }

        const editModel = "flux-kontext-max";
        const endpoint = `${APIYI_BASE}/v1/images/edits`;

        const formData = new FormData();
        const blob = new Blob([imageToSend.bytes], { type: imageToSend.mimeType });
        const ext = imageToSend.mimeType.includes("png") ? "png" : "jpg";
        formData.append("image", blob, `image.${ext}`);
        formData.append("model", editModel);
        formData.append("prompt", enhancedPrompt);
        formData.append("aspect_ratio", ar);
        formData.append("safety_tolerance", "6");
        formData.append("output_format", "png");

        console.log(`Calling Flux Edit: ${endpoint}, model=${editModel}, ar=${ar}, refs=${allImages.length}`);

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
        const rawUrl = data?.data?.[0]?.url;

        if (rawUrl) {
          const imgResp = await fetch(rawUrl);
          if (imgResp.ok) {
            const buf = await imgResp.arrayBuffer();
            const bytes = new Uint8Array(buf);
            imageBase64 = toBase64DataUri(bytes, imgResp.headers.get("content-type") || "image/png");
          } else {
            imageUrl = rawUrl;
          }
        } else {
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
        const rawUrl = data?.data?.[0]?.url;

        if (rawUrl) {
          const imgResp = await fetch(rawUrl);
          if (imgResp.ok) {
            const buf = await imgResp.arrayBuffer();
            const bytes = new Uint8Array(buf);
            imageBase64 = toBase64DataUri(bytes, imgResp.headers.get("content-type") || "image/png");
          } else {
            imageUrl = rawUrl;
          }
        } else {
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
