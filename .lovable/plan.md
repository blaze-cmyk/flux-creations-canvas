## Goal

Strip out the Nano Banana keyframe composition step entirely. Go back to the simpler pipeline: script → submit to Seedance with avatar + product images as references. The keyframe wasn't preserving the avatar's face anyway, and the user wants the previous, working setup back.

## Pipeline before vs after

```text
BEFORE: script → keyframing (Nano Banana Pro/Flash) → videoing (keyframe[0] + avatar[1] + products[2+])
AFTER:  script → videoing (avatar[0] + products[1+])
```

## Changes

### 1. `supabase/functions/marketing-orchestrate/index.ts` (lines ~443-505)
- Remove the `stage: 'keyframing'` update; go straight from `scripting` → `videoing`.
- Delete the `invokeFn('marketing-generate-keyframe', ...)` block and the row-refresh that reads `keyframe_url` back.
- Submit to `marketing-generate-video` with `image_urls: refs` (no keyframe prepend) and drop the `keyframe_url` field from the body.

### 2. `supabase/functions/marketing-generate-video/index.ts`
- In `buildReferenceBundle` (around lines 290-330): remove the `keyframeUrl` parameter, the `createRequiredAtlasPortraitAsset` call for the keyframe, and the `orderedRefs` swap logic. Final order becomes: `asset://<avatar>` first, product URLs after.
- In `withReferenceMap` (around line 346): drop `hasKeyframe` branch; the prompt prefix becomes just "Image 1 is the avatar identity lock; Images 2+ are product references."
- In the request handler (around lines 525-565): stop reading `keyframe_url` from the body and from the existing row; remove `rowPayload.keyframe_url` write.
- Update the `assetRegistrationError` message to drop "/keyframe" wording.

### 3. `supabase/functions/marketing-generate-keyframe/index.ts`
- Delete the file. It is only invoked by the orchestrator, which no longer calls it.

### 4. Storage bucket `ms-keyframes`
- Leave the bucket and existing rows' `keyframe_url` / `keyframe_path` columns alone — no migration. They will simply stop being populated. (Removing the columns is unnecessary risk for zero benefit; the types file regenerates fine with unused columns.)

### 5. Deploy
- Deploy `marketing-orchestrate` and `marketing-generate-video`.
- Delete the `marketing-generate-keyframe` function from the project.

## Out of scope
- Atlas asset registration for the avatar stays in place — that's the moderation-bypass fix and is unrelated to the keyframe step.
- Script generator, persona logic, energy directive, voice sample, and provider health are untouched.
- AtlasCloud-only routing (no fal fallback) stays as-is.
