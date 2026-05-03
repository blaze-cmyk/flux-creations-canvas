# Backend Hardening — Generation Pipelines + /create Data Layer

Goal: every generation mode (image, video, motion-control, marketing/Seedance) lands a card in the active `/create/:slug` feed, never gets stuck, and the data layer is ready for 1M users (proper indexes + pagination + project scoping). Auth is intentionally **out of scope** for this pass.

## 1. Map of the current backend

```text
                          ┌──────────────── client ─────────────────┐
/create/:slug  ──▶  generatorStore  ──▶  generate-image  ──▶ apiyi/Gemini ─┐
                       videoStore   ──▶  generate-video  ──▶ fal queue    │
                                                              Runware     ├─▶ storage URL
                                                              Evolink     │
                marketing PromptBar ─▶ marketing-orchestrate              │
                                          │  marketing-generate-script    │
                                          │  marketing-generate-video ──▶ AtlasCloud / fal Seedance
                                          ▼                                │
                                       ms_generations row ◀────────────────┘
                       ImageGrid  ◀── generations / video_generations / ms_generations
                                            (merged by createProjectId)
```

Tables today (no indexes, all RLS = `using true`):
- `create_projects` — project rows; sidebar uses `slug`.
- `generations` — image rows. **Has `project_id`** but column is nullable.
- `video_generations` — video rows. **Missing `project_id`** entirely.
- `ms_generations` — marketing rows. Has `create_project_id` (added last loop).
- `ms_products`, `ms_product_images`, `ms_avatars` — marketing inputs.

## 2. Fixes per mode

### 2a. Image (`generate-image` + `generatorStore`)
- `generations.image_url` is set, but `project_id` is whatever `useCreateProjectsStore.getState().activeProjectId` was at the time — confirm `saveToDb` actually receives the active project id from the URL slug, not from a stale store value. Pass `projectId` explicitly through `generate()` instead of reading it from a global getter.
- Verify each fal model payload against fal docs once more (Seedream 4 edit, Flux 2 Pro edit, Kling Image V3, Wan 2.2, Grok Imagine, nano banana via apiyi). The current code mostly matches; the known gap is that `imageBase64` is ~5 MB on hi-res, which inflates DB rows and edge response. Switch to "always upload to `generated-images` bucket → store public URL only", drop base64 from the response (the function already uploads in `uploadToStorage`, the wire payload just needs trimming).
- Add a `width` / `height` columns persistence so the grid can size cards before the image loads.

### 2b. Video (`generate-video` + `videoStore`)
- Add the missing `project_id` column on `video_generations` and pipe it from the client like images do, so videos appear in the right project feed (currently they show in every project).
- Polling lives in the browser and times out after 120 × 5s = 10 minutes. For long fal queue jobs (Veo, Kling Pro) that's borderline. Move polling into a Deno `EdgeRuntime.waitUntil` background loop inside `generate-video` itself (same pattern marketing-orchestrate uses) and write the final `video_url` to `video_generations`. The store then just polls the DB row, not the provider.
- Re-validate per-provider payloads:
  - **fal queue**: confirm `start_image_url`/`image_url` field used per family matches fal docs (Kling v3 vs v2.5 vs Veo 3.1 differ).
  - **Runware**: `frameImages` for image-to-video and `referenceVideos` for edit; videoInference response now has both `videoURL` and `outputURL`.
  - **Evolink**: motion-control submit shape (`image_urls` + `video_urls` + `model_params.character_orientation`) matches docs; verify `quality` accepts `720p|1080p`.
- Persist `reference_images` even when they're long URLs so retry from history works (currently retry uses in-memory state only).

### 2c. Motion control (subset of 2b)
- Same backend (`ev-kling-v3-motion` via Evolink, fal Kling motion endpoints). The two real bugs: (a) the client allows submitting without checking that slot 0 is a video MIME (sometimes users drop an image there), (b) Evolink `responseUrl` is not stored, so a refresh mid-job loses recoverability. Add both checks + store `task_id`+`provider` in `video_generations` (already a column).

### 2d. Marketing (`marketing-orchestrate` + `marketing-generate-video`)
- Pipeline already runs in background (`EdgeRuntime.waitUntil`) and writes to `ms_generations`. Two missing pieces:
  1. `marketingFeedStore` polls every 4s for the active project; that's fine, but the store currently never stops polling when the user navigates away. Add cleanup in the consumer hook (`stopPolling` already exists, just call it on unmount).
  2. Seedance moderation rejects raw avatar storage URLs — already documented in memory as `atlas-avatar-asset-registration`. Confirm `marketing-generate-video` registers avatars via `POST /api/v1/sd/assets` and uses `asset://` ids. (This needs to be re-read against the file; if regressed, restore.)
- Make sure `create_project_id` is honoured end-to-end so a marketing card appears in the same `/create/:slug` it was generated from (already wired in last loop, verify after image/video changes don't break the merger).

## 3. Unified /create feed

`ImageGrid.tsx` already merges three sources. Two correctness gaps:
- It currently filters images by `projectId === activeProjectId` but videos by no project at all (because the column doesn't exist yet). Add the column + filter.
- Marketing rows are fetched via `useMarketingFeedStore` keyed by `createProjectId`; images/videos use stores that hold ALL items in memory and filter client-side. With 1M users + thousands of gens per user this won't scale. Switch all three to "fetch only the active project's last 100 items", paginate older with `loadMore`.

## 4. Data layer for 1M users (foundations only)

Single migration covering all tables:

```sql
-- Project scoping
ALTER TABLE public.video_generations ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE public.video_generations ADD COLUMN IF NOT EXISTS create_project_id uuid;
ALTER TABLE public.generations       ADD COLUMN IF NOT EXISTS create_project_id uuid;
-- (ms_generations.create_project_id already exists)

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_generations_project_created
  ON public.generations (create_project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_generations_project_created
  ON public.video_generations (create_project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ms_generations_project_created
  ON public.ms_generations (create_project_id, created_at DESC);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_create_projects_slug
  ON public.create_projects (slug);
CREATE INDEX IF NOT EXISTS idx_ms_generations_status_stage
  ON public.ms_generations (status, stage)
  WHERE status IN ('queued','generating','processing');

-- Cascade delete: deleting a project drops its generations
ALTER TABLE public.generations
  ADD CONSTRAINT generations_create_project_fk
  FOREIGN KEY (create_project_id) REFERENCES public.create_projects(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.video_generations
  ADD CONSTRAINT video_generations_create_project_fk
  FOREIGN KEY (create_project_id) REFERENCES public.create_projects(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.ms_generations
  ADD CONSTRAINT ms_generations_create_project_fk
  FOREIGN KEY (create_project_id) REFERENCES public.create_projects(id) ON DELETE CASCADE NOT VALID;
```

`NOT VALID` lets us add the FK without scanning historical NULL rows; new rows are validated. RLS stays `using true` (no auth this pass) but the indexes/scoping/cascades are the prerequisite for flipping it on later.

## 5. Client store changes

- `generatorStore.loadHistory` & `videoStore.loadHistory`: take `createProjectId` arg, query with `.eq('create_project_id', id).order('created_at', desc).limit(100)`, expose `loadMore()`.
- `videoStore`: add `createProjectId` to insert, drop in-memory cross-project state.
- `marketingFeedStore`: add unmount cleanup.
- `Generator.tsx`: when slug changes, switch all three stores' active project; cancel in-flight polling for the previous one.

## 6. Provider docs to re-verify (no code yet, just confirm)

- fal.ai: Seedream 4 / Flux 2 / Kling V3 / Veo 3.1 / Pixverse v6 / LTX-2 / Kling motion (request + queue poll envelope).
- Runware: `imageInference` + `videoInference` + `frameImages`.
- Evolink: `/v1/videos/generations` motion-control body + `/v1/tasks/:id` poll.
- AtlasCloud: avatar asset registration + Seedance reference-to-video.
- apiyi/Gemini: `gemini-3-pro-image-preview` + `gemini-3.1-flash-image-preview` payload shape.

Each diff against current code goes into the same loop's PR; nothing speculative.

## 7. Out of scope (call-outs)

- **Auth + per-user RLS** — confirmed deferred. None of this work assumes a logged-in user; everything stays anonymous-public for now. The schema choice (no `user_id` columns added in this pass) is so a future auth pass can add one column + tighten policies without re-doing indexes.
- **Storage retention / quotas / dashboards** — deferred.
- **Realtime channel for ms_generations** — current 4 s polling is fine at MVP scale; switch to realtime once auth lands.

## 8. Order of operations in the build pass

1. Migration (section 4) — schema + indexes + cascades.
2. `generate-video` — add background polling + persist `project_id`/`create_project_id`/refs.
3. `generate-image` — drop base64 from wire response, persist `width`/`height`, accept explicit `createProjectId`.
4. Stores — switch to per-project `loadHistory(slug)` + pagination; add cleanup.
5. `ImageGrid` — single source of truth: query the 3 stores, all already filtered by active project.
6. Marketing pipeline — re-verify avatar asset registration + cleanup polling.
7. Provider doc spot-checks for any remaining payload mismatches.

Estimated touch: 1 migration, 3 edge functions, 3 stores, 2 components.