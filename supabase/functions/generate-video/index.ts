import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FAL_QUEUE = "https://queue.fal.run";
const RUNWARE_BASE = "https://api.runware.ai/v1";
const EVOLINK_BASE = "https://api.evolink.ai";

type VideoModelConfig = {
  type: "fal" | "runware" | "evolink";
  textToVideo?: string;
  imageToVideo?: string;
  motionControl?: string;
  runwareModel?: string;
  evolinkModel?: string;
};

const VIDEO_MODEL_MAP: Record<string, VideoModelConfig> = {
  "kling-v3-pro": { type: "fal", textToVideo: "fal-ai/kling-video/v3/pro/text-to-video", imageToVideo: "fal-ai/kling-video/v3/pro/image-to-video" },
  "kling-v3-motion": { type: "fal", motionControl: "fal-ai/kling-video/v3/pro/motion-control" },
  "ev-kling-v3-motion": { type: "evolink", evolinkModel: "kling-v3-motion-control" },
  "kling-o3-pro": { type: "fal", imageToVideo: "fal-ai/kling-video/o3/standard/image-to-video" },
  "kling-v2.5-turbo-pro": { type: "fal", textToVideo: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video", imageToVideo: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video" },
  "kling-v2.6-pro": { type: "fal", imageToVideo: "fal-ai/kling-video/v2.6/pro/image-to-video" },
  "kling-v2.6-motion-std": { type: "fal", motionControl: "fal-ai/kling-video/v2.6/standard/motion-control" },
  "kling-v2.6-motion-pro": { type: "fal", motionControl: "fal-ai/kling-video/v2.6/pro/motion-control" },
  "veo-3.1": { type: "fal", textToVideo: "fal-ai/veo3.1", imageToVideo: "fal-ai/veo3.1/image-to-video" },
  "veo-3.1-fast": { type: "fal", textToVideo: "fal-ai/veo3.1/fast", imageToVideo: "fal-ai/veo3.1/fast/image-to-video" },
  "veo-3.1-lite": { type: "fal", textToVideo: "fal-ai/veo3.1/lite", imageToVideo: "fal-ai/veo3.1/lite/image-to-video" },
  "minimax-video": { type: "fal", textToVideo: "fal-ai/minimax/video-01-live", imageToVideo: "fal-ai/minimax/video-01-live/image-to-video" },
  "pixverse-v6": { type: "fal", textToVideo: "fal-ai/pixverse/v6/text-to-video", imageToVideo: "fal-ai/pixverse/v6/image-to-video" },
  "ltx-2-19b": { type: "fal", textToVideo: "fal-ai/ltx-2-19b", imageToVideo: "fal-ai/ltx-2-19b/image-to-video" },
  "rw-seedance-1.5-pro": { type: "runware", runwareModel: "bytedance:seedance@1.5-pro" },
  "rw-runway-gen4.5": { type: "runware", runwareModel: "runwayml:gen@4.5" },
  "rw-sora-2": { type: "runware", runwareModel: "openai:3@1" },
  "rw-kling-2.5": { type: "runware", runwareModel: "klingai:6@1" },
  "rw-veo-3.1": { type: "runware", runwareModel: "google:3@2" },
  "rw-veo-3.1-fast": { type: "runware", runwareModel: "google:3@3" },
};

// ---- Polling helpers ----

async function pollFalResult(responseUrl: string, statusUrl: string | null, falKey: string, maxWaitMs = 300000): Promise<any> {
  const headers = { Authorization: `Key ${falKey}`, Accept: "application/json" };
  const start = Date.now();
  const pollUrl = statusUrl || responseUrl;

  while (Date.now() - start < maxWaitMs) {
    const resp = await fetch(pollUrl, { method: "GET", headers });

    if (resp.status === 202 || resp.status === 400) {
      const body = await resp.text();
      if (resp.status === 400 && !body.includes("in progress")) {
        throw new Error(`Poll error: ${resp.status} ${body}`);
      }
      console.log("Still processing, waiting 5s...");
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Result fetch failed: ${resp.status} ${body}`);
    }

    const data = await resp.json();

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
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    return data;
  }
  throw new Error("Video generation timed out");
}

async function pollEvolinkTask(taskId: string, apiKey: string, maxWaitMs = 300000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const resp = await fetch(`${EVOLINK_BASE}/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Evolink task check failed: ${resp.status} ${body}`);
    }
    const data = await resp.json();
    if (data.status === "completed") return data;
    if (data.status === "failed") throw new Error(data.error?.message || "Evolink task failed");
    console.log(`Evolink task ${taskId}: ${data.status} (${data.progress || 0}%)`);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error("Evolink task timed out");
}

function normalizeClientFacingError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "Internal server error";

  if (rawMessage.includes("file_too_large")) {
    return {
      message: "Reference image exceeds the provider 10MB limit. Upload a smaller image.",
      status: 400,
    };
  }

  if (rawMessage.includes("Result fetch failed: 422")) {
    return {
      message: rawMessage,
      status: 400,
    };
  }

  return {
    message: rawMessage,
    status: 500,
  };
}

// ---- Main handler ----

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";
    // Client should have already uploaded base64 → URLs
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

    // ========== EVOLINK ==========
    if (config.type === "evolink") {
      const EVOLINK_API_KEY = Deno.env.get("EVOLINK_API_KEY");
      if (!EVOLINK_API_KEY) {
        return new Response(JSON.stringify({ error: "EVOLINK_API_KEY not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Motion control: slot 0 = motion video, slot 1 = character image
      const motionVideo = referenceImages[0];
      const characterImage = referenceImages[1];

      if (!motionVideo || !characterImage) {
        return new Response(JSON.stringify({ error: "Motion control requires a motion video (slot 0) and a character image (slot 1)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const evolinkBody: Record<string, unknown> = {
        model: config.evolinkModel,
        image_urls: [characterImage],
        video_urls: [motionVideo],
        quality: "1080p",
        model_params: {
          character_orientation: body?.characterOrientation === "image" ? "image" : "video",
        },
      };
      if (prompt) evolinkBody.prompt = prompt;

      console.log(`Submitting Evolink task: model=${config.evolinkModel}`);

      const submitResp = await fetch(`${EVOLINK_BASE}/v1/videos/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${EVOLINK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evolinkBody),
      });

      if (!submitResp.ok) {
        const errText = await submitResp.text();
        console.error("Evolink submit error:", submitResp.status, errText);
        return new Response(JSON.stringify({ error: `Evolink API error: ${submitResp.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const submitData = await submitResp.json();
      const taskId = submitData.id;

      if (!taskId) {
        return new Response(JSON.stringify({ error: "No task ID in Evolink response" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Polling Evolink task: ${taskId}`);
      const result = await pollEvolinkTask(taskId, EVOLINK_API_KEY);

      // Extract video URL from results
      const results = result?.results;
      if (Array.isArray(results) && results.length > 0) {
        videoUrl = typeof results[0] === "string" ? results[0] : results[0]?.url;
      }

      if (!videoUrl) {
        console.error("Evolink result:", JSON.stringify(result).substring(0, 500));
        return new Response(JSON.stringify({ error: "No video in Evolink response" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
        if (!endpoint) return new Response(JSON.stringify({ error: `Model ${model} does not support motion control` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else if (isImageMode) {
        endpoint = config.imageToVideo;
        if (!endpoint) return new Response(JSON.stringify({ error: `Model ${model} does not support image to video` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        endpoint = config.textToVideo;
        if (!endpoint) return new Response(JSON.stringify({ error: `Model ${model} does not support text to video` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const input: Record<string, unknown> = {};

      if (isMotionControl) {
        const motionVideo = referenceImages[0];
        const characterImage = referenceImages[1];
        if (!motionVideo || !characterImage) {
          return new Response(JSON.stringify({ error: "Motion control requires a motion video (slot 0) and a character image (slot 1)" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        input.image_url = characterImage;
        input.video_url = motionVideo;
        input.character_orientation = body?.characterOrientation === "image" ? "image" : "video";
        input.keep_original_sound = body?.keepOriginalSound !== false;
        if (prompt) input.prompt = prompt;
      } else {
        const durNum = parseInt(duration) || 5;
        const falDuration = durNum <= 4 ? "4s" : durNum <= 6 ? "6s" : "8s";
        input.prompt = prompt;
        input.duration = falDuration;
        input.aspect_ratio = aspectRatio;
        input.negative_prompt = "blur, distort, and low quality";
        if (isImageMode) {
          input.image_url = referenceImages[0];
          if (referenceImages.length > 1) input.tail_image_url = referenceImages[1];
        }
      }

      console.log(`Submitting to fal.ai queue: ${endpoint}, mode=${mode}`);

      const submitResp = await fetch(`${FAL_QUEUE}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
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
      const responseUrl = submitData.response_url;

      if (!responseUrl) {
        const payload = submitData?.data ?? submitData;
        const vid = payload?.video?.url || payload?.video;
        if (vid) videoUrl = typeof vid === "string" ? vid : vid.url;
      } else {
        console.log(`Polling fal.ai: request_id=${submitData.request_id}`);
        const result = await pollFalResult(responseUrl, submitData.status_url || null, FAL_KEY);
        const payload = result?.data ?? result;
        const vid = payload?.video?.url || payload?.video;
        if (vid) videoUrl = typeof vid === "string" ? vid : vid.url;
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

      const { width: rwWidth, height: rwHeight } = aspectRatio === "9:16" ? { width: 720, height: 1280 } : aspectRatio === "1:1" ? { width: 1024, height: 1024 } : { width: 1280, height: 720 };

      const task: Record<string, unknown> = {
        taskType: "videoInference",
        taskUUID: crypto.randomUUID(),
        model: config.runwareModel,
        positivePrompt: prompt,
        duration: parseInt(duration) || 5,
        width: rwWidth,
        height: rwHeight,
        outputFormat: "MP4",
        outputType: "URL",
      };

      if (referenceImages.length > 0 && (mode === "image-to-video")) {
        task.frameImages = referenceImages.map((url: string) => ({ imageURL: url }));
      }

      console.log(`Calling Runware video: model=${config.runwareModel}`);

      const response = await fetch(RUNWARE_BASE, {
        method: "POST",
        headers: { Authorization: `Bearer ${RUNWARE_API_KEY}`, "Content-Type": "application/json" },
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
      let videoResult = resData?.data?.find((d: any) => d.taskType === "videoInference");
      videoUrl = videoResult?.videoURL || videoResult?.outputURL;

      // Runware is async — if no videoURL yet, poll the task
      if (!videoUrl && videoResult?.taskUUID) {
        const taskUUID = videoResult.taskUUID;
        console.log(`Runware task queued: ${taskUUID}, polling...`);
        const start = Date.now();
        const maxWaitMs = 300000;
        while (Date.now() - start < maxWaitMs) {
          await new Promise(r => setTimeout(r, 5000));
          const pollResp = await fetch(RUNWARE_BASE, {
            method: "POST",
            headers: { Authorization: `Bearer ${RUNWARE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify([{ taskType: "videoInference", taskUUID }]),
          });
          if (pollResp.ok) {
            const pollData = await pollResp.json();
            const result = pollData?.data?.find((d: any) => d.videoURL);
            if (result?.videoURL) {
              videoUrl = result.videoURL;
              break;
            }
            console.log(`Runware still processing ${taskUUID}...`);
          } else {
            const errText = await pollResp.text();
            console.log(`Runware poll ${pollResp.status}: ${errText.substring(0, 200)}`);
          }
        }
      }

      if (!videoUrl) {
        console.log("Runware final response:", JSON.stringify(resData).substring(0, 500));
        return new Response(JSON.stringify({ error: "No video in Runware response (timed out)" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ videoUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const { message, status } = normalizeClientFacingError(e);
    console.error("Video generation error:", e);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
