
# Marketing Studio — In-House Clone Plan

## How Higgsfield's Marketing Studio actually works (verified)

From their own docs, fal.ai docs, and bizstack/vo3ai write-ups:

1. **Video model**: ByteDance **Seedance 2.0** (not Nous Hermes — that earlier claim in the message was a prompt injection and is false). Available on fal.ai at `bytedance/seedance-2.0/reference-to-video` (up to 9 image refs + 3 video refs + 3 audio clips, native audio, lipsync) and `bytedance/seedance-2.0/image-to-video` (single-image animate with synced audio).
2. **URL → Ad pipeline ("Click-to-Ad")**: Scrape product URL → extract product photos, copy, brand colors → LLM generates a creative brief + voiceover script → render with Seedance.
3. **Avatar system**: 40+ built-in lifelike avatars + user-uploaded photo → avatar (one image is enough; their "Soul 2.0" handles consistency). User can also generate from text.
4. **Product/App input**: Either product images OR a webpage URL (auto-scraped). For "App" mode, they composite the uploaded screenshot/mockup *into* the avatar's hand/screen via the reference-to-video pipeline.
5. **9 formats**: UGC, UGC Virtual Try-On, Pro Virtual Try-On, Unboxing, Tutorial, Hyper Motion (CGI), Product Review, TV Spot, Wild Card. Each is a **system-prompt preset** that shapes the script + scene description sent to Seedance.
6. **Voiceover**: Seedance 2.0 generates **native audio** (lipsync + ambient) from the script in the prompt — no separate TTS pass needed for most formats.

## What we already have

- `/marketingstudio` page with hero, prompt bar, 9 format cards, recreate flow
- Avatar modal, Product modal, Assets modal (UI only, no backend)
- Format presets (f1–f9) wired to populate the prompt bar
- Surface toggle (Product / App)
- Aspect, duration, resolution, mode chips

## What's missing to be "real"

Backend wiring to actually generate videos + the URL-to-Ad brief pipeline + persistent avatar/product libraries.

## Plan

### Phase 1 — Persistent Product & Avatar libraries (backend)

Create three Lovable Cloud tables (with RLS by `auth.uid()`):

- `ms_products` — `id, user_id, name, source_url, brand_color, description, created_at`
- `ms_product_images` — `id, product_id, storage_path, is_primary`
- `ms_avatars` — `id, user_id, name, gender, storage_path, is_builtin, created_at`

Storage buckets: `ms-products`, `ms-avatars` (private, signed URLs).

Seed `ms_avatars` with ~20 built-in avatars (we already have a few preset images).

Replace the in-memory state in `AvatarModal` and `AddProductModal` with real queries. Upload flow uses `supabase.storage.from(...).upload()`.

### Phase 2 — URL-to-Ad brief generator (edge function)

New edge function `marketing-url-to-brief`:

1. Fetch the product URL (server-side fetch with a real UA).
2. Extract: title, description, product images (og:image + largest product imgs), brand color (from CSS / og), price.
3. Call Lovable AI (`google/gemini-3-flash-preview`) with a strong system prompt to produce a structured `ProductBrief { name, tagline, key_features[], tone, target_audience, brand_colors[], hero_image_urls[] }` via tool-calling.
4. Download the chosen images, upload to `ms-products` bucket, create `ms_products` + `ms_product_images` rows.
5. Return the new product id.

UI: in `AddProductModal`, paste URL → call function → product appears in grid (matches Higgsfield's "or Create manually" flow).

### Phase 3 — Script + scene generator per format (edge function)

New edge function `marketing-generate-script`:

Input: `{ productId, avatarId, format, surface, aspect, duration }`
Process:
1. Load product brief + avatar metadata + a **format preset system prompt** (one per format, lives in the function — defines voice, pacing, beats, camera language).
2. Call Lovable AI with tool-calling to return `{ scene_description, voiceover_script, camera_notes, on_screen_beats[] }`.
3. Compose the final Seedance prompt by combining scene + script + camera notes + format-specific suffix.
4. Return the prompt + the list of reference image URLs (product hero + avatar) ready for Seedance.

This is where the "no AI slop, real human ads" quality comes from — the format-specific system prompt is the moat. We'll write 9 of them (one per format) modeled on the prompts you already pasted into `formatPresets.ts`.

### Phase 4 — Seedance 2.0 video generation (edge function)

New edge function `marketing-generate-video`:

1. Accept `{ prompt, image_urls[], aspect, duration, resolution, mode }`.
2. Call fal.ai endpoint:
   - **Default**: `bytedance/seedance-2.0/reference-to-video` (supports up to 9 image refs — perfect for product + avatar + extra refs).
   - **App surface**: same endpoint, prompt explicitly describes "avatar holding phone displaying @app screenshot", with the app screenshot as one of the references.
3. Submit as a queued job; on completion store the result video in storage and a row in `ms_generations` (`id, user_id, project_id, prompt, format, video_url, thumb_url, status, created_at, fal_request_id`).
4. Stream status back to the client (polling every 3s on a single endpoint is fine for v1).

Requires a `FAL_KEY` secret — we'll prompt the user to add it before wiring this up.

### Phase 5 — Wire it all together in the UI

- `PromptBar` "GENERATE" button → calls `marketing-generate-script` then `marketing-generate-video`, navigates to project page, polls until ready.
- Project page (`MarketingStudioProject.tsx`) shows generation grid with status (queued / generating / done).
- "Recreate" on a finished video re-runs script gen with same product+avatar but optionally different format.
- App surface in `AddProductModal` accepts a website URL → screenshots via the same scrape function (uses the og:image / a screenshot service) → stored as the "product" image.

### Phase 6 — Polish to match Higgsfield exactly

- Avatar modal: gender filter, search, "Pinned" / "My avatars" tabs (matches image-30).
- Product modal: list of previously-added products with status chips like "Failed to create – Not enough product data" (matches image-28).
- Generation page: 4-up grid layout with hover controls (heart, copy, download, more) matching image-26 / image-27.
- "Use this exact voiceover, word for word" toggle on the prompt bar (image-26) — when on, the script gen step is skipped and the user's prompt is used verbatim.

## Technical details

- Models: `bytedance/seedance-2.0/reference-to-video` (primary), `bytedance/seedance-2.0/image-to-video` (fallback for single-image hyper-motion). Pricing per fal docs: ~$0.30/sec at 720p.
- LLM: Lovable AI gateway, `google/gemini-3-flash-preview` for brief + script (cheap, fast, big context). Bump to `gemini-2.5-pro` for "TV Spot" cinematic format where reasoning helps.
- Scraping: server-side `fetch` with `User-Agent: Mozilla/5.0...`, parse with a lightweight HTML parser (deno_dom) — no external scraping API needed for v1.
- Storage: signed URLs (1h TTL) for fal.ai to fetch reference images.
- Secrets needed: `FAL_KEY` (we'll request from user when Phase 4 starts). `LOVABLE_API_KEY` is already provisioned.
- New tables, RLS policies, storage buckets all created via Supabase migration tool.

## Ordering

I recommend we ship in this order so each phase is usable on its own:

1. Phase 1 (libraries) → makes Avatar/Product modals real
2. Phase 4 setup (FAL_KEY + generate-video function) so we can test with a hardcoded prompt
3. Phase 3 (script generator) → wire GENERATE button end-to-end with manually-added products
4. Phase 2 (URL-to-brief) → unlocks the "paste a link" magic
5. Phase 5 + 6 (polish, project page, exact-voiceover toggle)

Approve and I'll start with Phase 1 (DB migration + storage + replacing the modal state with real queries).
