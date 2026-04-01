import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FAL_QUEUE = "https://queue.fal.run";
const RUNWARE_BASE = "https://api.runware.ai/v1";

type VideoModelConfig = {
  type: "fal" | "runware";
  textToVideo?: string;
  imageToVideo?: string;
  motionControl?: string;
  runwareModel?: string;
};

const VIDEO_MODEL_MAP: Record<string, VideoModelConfig> = {
  "kling-v3-pro": {
    type: "fal",
    textToVideo: "fal-ai/kling-video/v3/pro/text-to-video",
    imageToVideo: "fal-ai/kling-video/v3/pro/image-to-video",
  },
  "kling-v3-motion": {
    type: "fal",
    motionControl: "fal-ai/kling-video/v3/pro/motion-control",
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
  "kling-v2.6-motion-std": {
    type: "fal",
    motionControl: "fal-ai/kling-video/v2.6/standard/motion-control",
  },
  "kling-v2.6-motion-pro": {
    type: "fal",
    motionControl: "fal-ai/kling-video/v2.6/pro/motion-control",
  },
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
  "minimax-video": {
    type: "fal",
    textToVideo: "fal-ai/minimax/video-01-live",
    imageToVideo: "fal-ai/minimax/video-01-live/image-to-video",
  },
  "pixverse-v6": {
    type: "fal",
    textToVideo: "fal-ai/pixverse/v6/text-to-video",
    imageToVideo: "fal-ai/pixverse/v6/image-to-video",
  },
  "ltx-2-19b": {
    type: "fal",
    textToVideo: "fal-ai/ltx-2-19b",
    imageToVideo: "fal-ai/ltx-2-19b/image-to-video",
  },
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

// Poll fal.ai queue using status_url then fetch result from response_url
async function pollFalResult(responseUrl: string, statusUrl: string | null, falKey: string, maxWaitMs = 300000): Promise<any> {
  const headers = { Authorization: `Key ${falKey}`, Accept: "application/json" };
  const start = Date.now();
  const pollUrl = statusUrl || responseUrl;

  while (Date.now() - start < maxWaitMs) {
    const resp = await fetch(pollUrl, { method: "GET", headers });

    if (resp.status === 202 || resp.status === 400) {
      // Still in progress (fal returns 400 with "still in progress" for some models)
      const body = await resp.text();
      if (resp.status === 400 && !body.includes("in progress")) {
        throw new Error(`Poll error: ${resp.status} ${body}`);
      }
      console.log(`Still processing, waiting 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Result fetch failed: ${resp.status} ${body}`);
    }

    const data = await resp.json();

    // If polling status_url, check for COMPLETED/FAILED
    if (pollUrl !== responseUrl) {
      if (data.status === "COMPLETED") {
        const resultResp = await fetch(responseUrl, { method: "GET", headers });
        if (!resultResp.ok) {
          const rb = await resultResp.text();
          throw new Error(`Result fetch failed: ${resultResp.status} ${rb}`);
        }
        return await resultResp.json();
      }
      if (data.status === "FAILED") {
        throw new Error(data.error || "Video generation failed");
      }
      // IN_QUEUE or IN_PROGRESS
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    // If polling response_url directly, the response IS the result
    return data;
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
      ? body.referenceImages.filter((img: unknown): img is string => typeof img === "string" && img.length > 0)
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

      const isMotionControl = mode === "motion-control";
      const isImageMode = mode === "image-to-video" && referenceImages.length > 0;

      let endpoint: string | undefined;
      if (isMotionControl) {
        endpoint = config.motionControl;
        if (!endpoint) {
          return new Response(JSON.stringify({ error: `Model ${model} does not support motion control` }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (isImageMode) {
        endpoint = config.imageToVideo;
        if (!endpoint) {
          return new Response(JSON.stringify({ error: `Model ${model} does not support image to video` }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        endpoint = config.textToVideo;
        if (!endpoint) {
          return new Response(JSON.stringify({ error: `Model ${model} does not support text to video` }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Build the input payload
      const input: Record<string, unknown> = {};

      if (isMotionControl) {
        // Motion control: slot 0 = motion video, slot 1 = character image
        const motionVideo = referenceImages[0];
        const characterImage = referenceImages[1];

        if (!motionVideo || !characterImage) {
          return new Response(JSON.stringify({ error: "Motion control requires both a motion reference video (slot 0) and a character image (slot 1)" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Per fal.ai docs: image_url (character), video_url (motion ref), character_orientation (required)
        input.image_url = characterImage;
        input.video_url = motionVideo;
        input.character_orientation = body?.characterOrientation === "image" ? "image" : "video";
        input.keep_original_sound = body?.keepOriginalSound !== false;
        if (prompt) input.prompt = prompt;
      } else {
        input.prompt = prompt;
        input.duration = duration;
        input.aspect_ratio = aspectRatio;
        input.negative_prompt = "blur, distort, and low quality";

        if (isImageMode) {
          input.image_url = referenceImages[0];
          if (referenceImages.length > 1) {
            input.tail_image_url = referenceImages[1];
          }
        }
      }

      console.log(`Submitting to fal.ai queue: ${endpoint}, mode=${mode}, input_keys=${Object.keys(input).join(",")}`);

      // Submit to queue with { input: ... } wrapper per fal.ai docs
      const submitResp = await fetch(`${FAL_QUEUE}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!submitResp.ok) {
        const errText = await submitResp.text();
        console.error("Fal submit error:", submitResp.status, errText);
        return new Response(JSON.stringify({ error: `Fal API error: ${submitResp.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const submitData = await submitResp.json();
      console.log(`Fal submit response keys: ${Object.keys(submitData).join(",")}`);

      const responseUrl = submitData.response_url;

      if (!responseUrl) {
        // Synchronous response — extract video directly
        const payload = submitData?.data ?? submitData;
        const vid = payload?.video?.url || payload?.video;
        if (vid) {
          videoUrl = typeof vid === "string" ? vid : vid.url;
        }
      } else {
        // Async queue — poll response_url
        console.log(`Polling fal.ai: request_id=${submitData.request_id}, response_url=${responseUrl}`);
        const result = await pollFalResult(responseUrl, submitData.status_url || null, FAL_KEY);
        const payload = result?.data ?? result;
        const vid = payload?.video?.url || payload?.video;
        if (vid) {
          videoUrl = typeof vid === "string" ? vid : vid.url;
        }
      }

      if (!videoUrl) {
        console.error("No video URL found in fal response");
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
