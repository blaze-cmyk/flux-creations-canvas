import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FAL_QUEUE = "https://queue.fal.run";
const FAL_BASE = "https://fal.run";
const RUNWARE_BASE = "https://api.runware.ai/v1";

type VideoModelConfig = {
  type: "fal" | "runware";
  textToVideo?: string;
  imageToVideo?: string;
  runwareModel?: string;
};

const VIDEO_MODEL_MAP: Record<string, VideoModelConfig> = {
  // Kling (fal.ai)
  "kling-v3-pro": {
    type: "fal",
    textToVideo: "fal-ai/kling-video/v3/pro/text-to-video",
    imageToVideo: "fal-ai/kling-video/v3/pro/image-to-video",
  },
  "kling-o3-pro": {
    type: "fal",
    imageToVideo: "fal-ai/kling-video/o3/standard/image-to-video",
  },
  "kling-v2.5-turbo-pro": {
    type: "fal",
    textToVideo: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    imageToVideo: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
  },
  "kling-v2.6-pro": {
    type: "fal",
    imageToVideo: "fal-ai/kling-video/v2.6/pro/image-to-video",
  },
  // Veo (fal.ai)
  "veo-3.1": {
    type: "fal",
    textToVideo: "fal-ai/veo3.1",
    imageToVideo: "fal-ai/veo3.1/image-to-video",
  },
  "veo-3.1-fast": {
    type: "fal",
    textToVideo: "fal-ai/veo3.1/fast",
    imageToVideo: "fal-ai/veo3.1/fast/image-to-video",
  },
  "veo-3.1-lite": {
    type: "fal",
    textToVideo: "fal-ai/veo3.1/lite",
    imageToVideo: "fal-ai/veo3.1/lite/image-to-video",
  },
  // MiniMax (fal.ai)
  "minimax-video": {
    type: "fal",
    textToVideo: "fal-ai/minimax/video-01-live",
    imageToVideo: "fal-ai/minimax/video-01-live/image-to-video",
  },
  // PixVerse (fal.ai)
  "pixverse-v6": {
    type: "fal",
    textToVideo: "fal-ai/pixverse/v6/text-to-video",
    imageToVideo: "fal-ai/pixverse/v6/image-to-video",
  },
  // LTX (fal.ai)
  "ltx-2-19b": {
    type: "fal",
    textToVideo: "fal-ai/ltx-2-19b",
    imageToVideo: "fal-ai/ltx-2-19b/image-to-video",
  },
  // Runware models
  "rw-seedance-1.5-pro": {
    type: "runware",
    runwareModel: "bytedance:seedance@1.5-pro",
  },
  "rw-runway-gen4.5": {
    type: "runware",
    runwareModel: "runwayml:gen@4.5",
  },
  "rw-sora-2": {
    type: "runware",
    runwareModel: "openai:3@1",
  },
  "rw-kling-2.5": {
    type: "runware",
    runwareModel: "klingai:6@1",
  },
  "rw-veo-3.1": {
    type: "runware",
    runwareModel: "google:3@2",
  },
  "rw-veo-3.1-fast": {
    type: "runware",
    runwareModel: "google:3@3",
  },
};

async function pollFalResult(requestId: string, endpoint: string, falKey: string, maxWaitMs = 300000): Promise<any> {
  const statusUrl = `https://queue.fal.run/${endpoint}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${endpoint}/requests/${requestId}`;
  const headers = { Authorization: `Key ${falKey}` };

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const resp = await fetch(statusUrl, { headers });
    if (!resp.ok) throw new Error(`Status check failed: ${resp.status}`);
    const status = await resp.json();

    if (status.status === "COMPLETED") {
      const resultResp = await fetch(resultUrl, { headers });
      if (!resultResp.ok) throw new Error(`Result fetch failed: ${resultResp.status}`);
      return await resultResp.json();
    }

    if (status.status === "FAILED") {
      throw new Error(status.error || "Video generation failed");
    }

    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error("Video generation timed out");
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
    const model = typeof body?.model === "string" ? body.model : "kling-v2.5-turbo-pro";
    const mode = typeof body?.mode === "string" ? body.mode : "text-to-video";
    const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : "16:9";
    const duration = typeof body?.duration === "string" ? body.duration : "5";

    const config = VIDEO_MODEL_MAP[model];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown video model: ${model}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let videoUrl: string | undefined;

    // ========== FAL.AI ==========
    if (config.type === "fal") {
      const FAL_KEY = Deno.env.get("FAL_KEY");
      if (!FAL_KEY) {
        return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isImageMode = (mode === "image-to-video" || mode === "motion-control") && referenceImages.length > 0;
      let endpoint = isImageMode ? config.imageToVideo : config.textToVideo;

      if (!endpoint) {
        // Fallback: if no image-to-video endpoint, use text-to-video
        endpoint = config.textToVideo || config.imageToVideo;
      }
      if (!endpoint) {
        return new Response(JSON.stringify({ error: `Model ${model} does not support ${mode}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reqBody: Record<string, unknown> = { prompt };

      // Duration & aspect ratio
      reqBody.duration = duration;
      reqBody.aspect_ratio = aspectRatio;
      reqBody.negative_prompt = "blur, distort, and low quality";

      // Image input
      if (isImageMode && referenceImages.length > 0) {
        reqBody.image_url = referenceImages[0];
        if (referenceImages.length > 1) {
          reqBody.tail_image_url = referenceImages[1];
        }
      }

      console.log(`Calling fal.ai video: ${endpoint}, mode=${mode}, ar=${aspectRatio}, dur=${duration}s`);

      // Use queue API for video (long-running)
      const submitResp = await fetch(`${FAL_QUEUE}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });

      if (!submitResp.ok) {
        const errText = await submitResp.text();
        console.error("Fal video submit error:", submitResp.status, errText);
        return new Response(JSON.stringify({ error: `Fal API error: ${submitResp.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const submitData = await submitResp.json();
      const requestId = submitData.request_id;

      if (!requestId) {
        // Direct response (some models return immediately)
        const vid = submitData?.video?.url || submitData?.video;
        if (vid) {
          videoUrl = typeof vid === "string" ? vid : vid.url;
        }
      } else {
        // Poll for result
        console.log(`Polling fal.ai request: ${requestId}`);
        const result = await pollFalResult(requestId, endpoint, FAL_KEY);
        const vid = result?.video?.url || result?.video;
        if (vid) {
          videoUrl = typeof vid === "string" ? vid : vid.url;
        }
      }

      if (!videoUrl) {
        return new Response(JSON.stringify({ error: "No video in fal.ai response" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ========== RUNWARE ==========
    if (config.type === "runware") {
      const RUNWARE_API_KEY = Deno.env.get("RUNWARE_API_KEY");
      if (!RUNWARE_API_KEY) {
        return new Response(JSON.stringify({ error: "RUNWARE_API_KEY not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const task: Record<string, unknown> = {
        taskType: "videoInference",
        taskUUID: crypto.randomUUID(),
        model: config.runwareModel,
        positivePrompt: prompt,
        duration: parseInt(duration),
        aspectRatio,
        outputFormat: "MP4",
      };

      if (referenceImages.length > 0 && (mode === "image-to-video" || mode === "motion-control")) {
        task.seedImage = referenceImages[0];
      }

      console.log(`Calling Runware video: model=${config.runwareModel}, dur=${duration}s`);

      const response = await fetch(RUNWARE_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RUNWARE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([task]),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Runware video error:", response.status, errText);
        return new Response(JSON.stringify({ error: `Runware API error: ${response.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resData = await response.json();
      const videoResult = resData?.data?.find((d: any) => d.taskType === "videoInference");
      videoUrl = videoResult?.videoURL || videoResult?.outputURL;

      if (!videoUrl) {
        console.log("Runware response:", JSON.stringify(resData).substring(0, 500));
        return new Response(JSON.stringify({ error: "No video in Runware response" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ videoUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Video generation error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
