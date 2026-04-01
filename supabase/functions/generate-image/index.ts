import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIYI_BASE = "https://api.apiyi.com";

// Model ID → APIYI model mapping and API type
const MODEL_MAP: Record<string, { apiModel: string; type: "gemini" | "flux" }> = {
  "nano-banana-2": { apiModel: "gemini-3.1-flash-image-preview", type: "gemini" },
  "nano-banana-pro": { apiModel: "gemini-3-pro-image-preview", type: "gemini" },
  "nano-banana": { apiModel: "gemini-2.5-flash-image", type: "gemini" },
  "flux-kontext-pro": { apiModel: "flux-kontext-pro", type: "flux" },
  "flux-kontext-max": { apiModel: "flux-kontext-max", type: "flux" },
};

// Quality → imageSize for Gemini models
const QUALITY_MAP: Record<string, string> = {
  "1K": "1K",
  "2K": "2K",
  "4K": "4K",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIYI_API_KEY = Deno.env.get("APIYI_API_KEY");
    if (!APIYI_API_KEY) {
      return new Response(JSON.stringify({ error: "APIYI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      prompt,
      referenceImages = [],
      model = "nano-banana-pro",
      quality = "2K",
      aspectRatio = "1:1",
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
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

    if (modelConfig.type === "gemini") {
      // Build parts: text + reference images
      const parts: any[] = [{ text: prompt }];

      for (const refImg of referenceImages) {
        // refImg can be base64 data URI or URL
        if (refImg.startsWith("data:")) {
          const match = refImg.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: { mimeType: match[1], data: match[2] },
            });
          }
        } else if (refImg.startsWith("http")) {
          // Fetch the image and convert to base64
          try {
            const imgResp = await fetch(refImg);
            const imgBuf = await imgResp.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
            const ct = imgResp.headers.get("content-type") || "image/jpeg";
            parts.push({ inlineData: { mimeType: ct, data: b64 } });
          } catch (e) {
            console.error("Failed to fetch reference image:", e);
          }
        }
      }

      const ar = aspectRatio === "Auto" ? "1:1" : aspectRatio;
      const imageSize = QUALITY_MAP[quality] || "2K";

      const endpoint = `${APIYI_BASE}/v1beta/models/${modelConfig.apiModel}:generateContent`;

      console.log(`Calling Gemini API: ${endpoint}, aspectRatio=${ar}, imageSize=${imageSize}`);

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
        console.error("APIYI Gemini error:", response.status, errText);
        return new Response(
          JSON.stringify({ error: `API error: ${response.status}`, details: errText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      console.log("Gemini response keys:", Object.keys(data));

      // Extract base64 image
      const candidate = data?.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      if (part?.inlineData?.data) {
        imageBase64 = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
      } else {
        console.error("Unexpected Gemini response:", JSON.stringify(data).substring(0, 500));
        return new Response(
          JSON.stringify({ error: "No image in response", details: JSON.stringify(data).substring(0, 500) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (modelConfig.type === "flux") {
      // Flux uses OpenAI Images API format
      const ar = aspectRatio === "Auto" ? "1:1" : aspectRatio;

      const endpoint = `${APIYI_BASE}/v1/images/generations`;

      console.log(`Calling Flux API: ${endpoint}, model=${modelConfig.apiModel}, aspectRatio=${ar}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${APIYI_API_KEY}`,
          "Content-Type": "application/json",
        },
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
        console.error("APIYI Flux error:", response.status, errText);
        return new Response(
          JSON.stringify({ error: `API error: ${response.status}`, details: errText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      imageUrl = data?.data?.[0]?.url;

      if (!imageUrl) {
        console.error("No URL in Flux response:", JSON.stringify(data).substring(0, 500));
        return new Response(
          JSON.stringify({ error: "No image URL in response" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ imageUrl, imageBase64 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
