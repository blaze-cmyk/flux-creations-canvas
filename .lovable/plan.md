# Fix Seedance sd/assets base URL

## Problem

The Seedance edge function calls `sd/assets` on the wrong host (`api.atlascloud.ai`), which returns 404 and breaks every image registration. Per AtlasCloud docs, the portrait asset endpoint lives on `console.atlascloud.ai`. The marketing edge function already uses the correct host (`ATLAS_ASSET_BASE = 'https://console.atlascloud.ai/api/v1'`), so only Seedance needs the fix.

Videos and audio in the Seedance function already skip `sd/assets` entirely (uploadMedia → raw URL into `reference_videos` / `reference_audios`), so no further routing changes are needed there.

## Change

**File:** `supabase/functions/seedance-generate-video/index.ts`

- Line 24: `ATLAS_ASSETS_BASE` → `https://console.atlascloud.ai/api/v1` (was `https://api.atlascloud.ai/api/v1`).
- Update the header comment on line 8 from `https://api.atlascloud.ai/api/v1/model/sd/assets` → `https://console.atlascloud.ai/api/v1/sd/assets` so future readers don't repeat the mistake.

`ATLAS_BASE` (uploadMedia, generateVideo, prediction) stays on `api.atlascloud.ai/api/v1/model` — that host is correct for those endpoints.

## Marketing function

Already correct — `ATLAS_ASSET_BASE = 'https://console.atlascloud.ai/api/v1'` on line 19. No change needed, no redeploy needed.

## Deploy

Redeploy `seedance-generate-video` only.

## Test

Generate one video with one image reference containing a face + one reference video. Expected: sd/assets returns 200, an `asset://` token comes back, and the video URL is passed raw in `reference_videos`.
