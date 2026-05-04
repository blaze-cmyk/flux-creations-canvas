## What's actually happening

From the latest edge logs for `marketing-generate-video`:

```
13:21:21  submit: bundle built ... providerOrder: ["atlascloud","fal"]
13:21:22  submit: done provider=atlascloud requestId=c561fdb3...
13:21:41  poll fallback submitted -> provider=fal           ← fallback fired
13:22:27  submit: bundle built ... providerOrder: ["atlascloud","fal"]
13:22:28  WARN  AtlasCloud 402: insufficient balance        ← Atlas wallet empty
13:22:29  submit: done provider=fal ...                     ← fal accepted submit
                                                              then returned
                                                              partner_validation_failed
                                                              on poll
```

So two things are going wrong, and only one is a code fix:

1. **AtlasCloud wallet is at 402 / insufficient balance.** No code change can fix this — you need to top up the AtlasCloud account. Until then, every call falls through to fal.
2. **Our code still falls back to fal**, both on the initial submit and on poll-failure. fal's Seedance endpoint applies ByteDance's "real person" moderation and rejects every Marketing Studio job that has an avatar. That's the `partner_validation_failed` you keep seeing.

The user-pasted "AtlasCloud body" (`seedance-1.0-lite-i2v-250428`, `image_url`, `audio_url`) is the *old v1 lite* shape. Our current Atlas submit code already uses the **Seedance 2.0** shape (`bytedance/seedance-2.0/reference-to-video`, `reference_images[]`, `reference_audios[]`, `ratio`, `resolution`), which matches the live AtlasCloud docs and is what's been working when balance is funded. I'm keeping that — switching to v1 lite would be a regression.

## Plan

### 1. `supabase/functions/marketing-generate-video/index.ts` — make Atlas the only Seedance provider

- `providerOrder()` returns **only** `['atlascloud']` (drop fal entirely from Seedance).
- Delete the `falSubmit` / `falPoll` / `falQueueEndpoint` / `extractFalVideoUrl` helpers and the `FAL_KEY` import. Remove all fal branches in `submitAcrossProviders`, the poll handler, and `submitFallbackFromRow`.
- Remove the poll-time fallback path entirely: when Atlas poll returns `failed`, write the row as `failed` with the exact Atlas error message — no provider swap. (Retry from the UI will resubmit to Atlas cleanly.)
- Keep:
  - the wsrv 640×640 avatar headshot crop,
  - the `createAtlasPortraitAsset` → `asset://` registration step (it's required by Atlas to clear "real person" moderation on Seedance — this is a saved memory rule, not optional),
  - the keyframe-first reference ordering,
  - the Seedance 2.0 reference-to-video body shape.
- Surface Atlas-specific errors verbatim in the row's `error` column, with a special-cased message when Atlas returns `402` / "insufficient balance" so the failure panel shows: *"AtlasCloud account is out of credit — top up to continue generating."*

### 2. `marketing-provider-health` — drop fal from health gating

- Stop probing fal. Health is "ok" iff Atlas is ok. The "block generation" flag fires only when Atlas is unhealthy.
- The Failed Generation panel will now show a single "AtlasCloud" row, which is what we want — fal is not in this pipeline anymore.

### 3. `FailedGenerationPanel.tsx` — minor copy update

- Show a single Atlas health row.
- When `error` contains "insufficient balance" or `402`, render a clear callout: *"AtlasCloud is out of credit. Add credits at console.atlascloud.ai then retry."*

### 4. Out of scope (intentionally)

- We are **not** switching to Seedance 1.0 lite (`seedance-1.0-lite-i2v-250428` / `image_url` / `audio_url`). That endpoint is the older single-image i2v shape and would lose multi-reference, the keyframe lock, and the avatar asset registration that defeats moderation.
- We are **not** touching the keyframe step, script step, or orchestrator — they're working.
- `FAL_KEY` stays in the secret store (other features may use it) but is no longer read by the Marketing Studio video function.

## Action you need to take in parallel

Top up the AtlasCloud account at `console.atlascloud.ai`. Until that's done, every generation will fail at submit with the new (clear) balance error instead of silently falling back to fal and producing a moderation rejection.

## Technical detail — final Atlas Seedance 2.0 body we send

```json
POST https://api.atlascloud.ai/api/v1/model/generateVideo
Authorization: Bearer ATLASCLOUD_API_KEY

{
  "model": "bytedance/seedance-2.0/reference-to-video",
  "prompt": "<reference-map prefix>\n\n<final script>",
  "duration": 8,
  "resolution": "720p",
  "ratio": "9:16",
  "generate_audio": true,
  "watermark": false,
  "reference_images": [
    "<keyframe ms-keyframes signed URL>",
    "asset://<atlas-registered avatar asset id>",
    "<product image 1>", "<product image 2>", ...
  ],
  "reference_audios": ["<elevenlabs voice sample URL>"],
  "reference_videos": [],
  "return_last_frame": false
}
```

Polled at `GET /api/v1/model/prediction/{id}` every few seconds; video URL comes back at `data.outputs[0]`.
