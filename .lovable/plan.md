# Marketing Studio: Keyframe-First Pipeline + Director's Constitution

Replace the current Claude → Seedance pipeline with:

```text
Claude (script, format-aware) → Nano Banana Pro (keyframe) → Seedance (video)
```

Plus harden the two one-time setup steps (product vision, avatar voice) so Claude and the keyframer have rich, grounded inputs.

Stage flow becomes:
```text
queued → scripting → keyframing → keyframe_ready → videoing → done
                          └──── (fallback) ────→ videoing (no keyframe)
```

---

## Part 1 — Storage bucket: `ms-keyframes`

Migration:
- Create private bucket `ms-keyframes` (10MB cap, png/jpeg/webp).
- RLS: read own keyframes only (foldername = auth.uid).
- Confirm `ms-voice-samples` already exists (it does, public).

## Part 2 — Product vision analysis upgrade
File: `supabase/functions/marketing-analyze-product/index.ts`

The function already extracts `visual_facts`. Extend the schema returned to also include:
- `product_energy` enum (comfort | hype | premium | playful | functional | lifestyle)
- `brief` (2–3 sentence photographer-style description)

Add a "weak analysis" re-trigger inside `marketing-generate-script`: if `vision_analysis` is missing `distinctive_features` or `dominant_colors`, fire `EdgeRuntime.waitUntil(analyzeProduct(productId))` and proceed with what's available.

## Part 3 — Avatar voice at creation
File: `supabase/functions/marketing-generate-voice-sample/index.ts` (already exists)

Already generates and stores `voice_sample_url`. Add:
- A small Gemini call that looks at the avatar image and writes a one-sentence voice description (age/accent/energy/warmth) → store on `ms_avatars.description` if blank.
- Map description + gender to one of 8 ElevenLabs voice IDs (warm/energetic/chill/professional × m/f).
- Store `voice_id` (ElevenLabs ID) and `voice_description` on the avatar row.
- One-shot seeder endpoint `?seed_builtins=1` to backfill all built-in avatars (already partially supported via batch mode — extend it).

## Part 4 — Director's Constitution system prompt
File: `supabase/functions/marketing-generate-script/index.ts`

Replace `FORMAT_SYSTEM_PROMPTS` and the system-message builder with a 3-block layout sent to Claude as a single cached system message:

- **BLOCK_1 — Director's Constitution**: voice rules, banned phrases, body-action lock, "show, don't say", duration/word math.
- **BLOCK_2 — Format module** (selected by `format`): one of UGC, Tutorial, Unboxing, Hyper Motion, Product Review, TV Spot, Wild Card, UGC Virtual Try On, Pro Virtual Try On, Podcast. Each module is a self-contained creative brief in the Higgsfield reference style.
- **BLOCK_3 — Reference anchors A–G**: 7 gold-standard inspiration mini-scripts. Taste anchors, never templates.

Anthropic call:
```ts
system: [{ type: "text", text: BLOCK_1 + "\n\n" + FORMAT_MODULE[format] + "\n\n" + BLOCK_3,
           cache_control: { type: "ephemeral" } }]
```

Claude MUST receive the literal `format` name in BOTH the system block (selected module) AND the user message header (`FORMAT: <name>`) so it can never drift to a different family.

## Part 5 — User message builder + mode detection
Same file. New `buildUserMessage()` returns multimodal content (images first, text last):

1. Up to 3 product images (proxied through wsrv.nl, ≤4.5MB).
2. Avatar image (if present).
3. Up to 2 extra reference images.
4. Text block containing:
   - `FORMAT`, `DURATION`, `BEATS`, `BEAT_WINDOWS`, `MAX_SPOKEN_WORDS`, `ASPECT`
   - `MODE` (AUTO / DIRECTED / DIRECTED_LOCKED / PASSTHROUGH) detected from `userPrompt`
   - `PERSONA` (rolled only in AUTO from a 6-persona pool)
   - `CREATIVE_ANGLE_HINT` (rolled only in AUTO from a 7-angle pool)
   - `PRODUCT_NAME`, `PRODUCT_DESCRIPTION`, `PRODUCT_VISION_FACTS`
   - `AVATAR_*` block (or `MODE: POV_HANDS` if no avatar)
   - `EXTRA REFERENCE IMAGES` casting rules (person → Speaker B in Podcast, object → prop, competitor frame → camera language only)
   - `USER_DIRECTION`
   - "Look at images BEFORE reading text. Extract only what's literally visible."

Helper functions: `detectMode`, `calculateBeats(duration)`, `calculateWindows(duration, beatCount)`, `proxyImageUrl`.

Tool schema `video_prompt` with required `concrete_product_details[]`, `final_prompt`, `voiceover_script`, `scene_description`, plus optional `camera_notes`, `on_screen_beats[]`, `persona_used`. Force `tool_choice` to this tool.

## Part 6 — Slop gate v2
Same file. After Claude returns:

- Banned-phrase scan (extended list).
- `final_prompt.length >= 350`.
- ≥2 of `concrete_product_details` must appear (substring) inside `final_prompt`.
- `voiceover_script` word count ≤ `maxWords * 1.3`.
- Format-scoped checks (Podcast → must contain "mic" + ≥3 quoted lines).
- Beat/action coherence: if script > 30 words, must have ≥2 `on_screen_beats`.

Flow: weak → retry once with `stricter: true, reason: <code>` → still weak → deterministic `buildFallbackPrompt()`.

Important: keep the existing two-lane Unboxing logic intact; the new gates run in addition, family-scoped, not universal.

## Part 7 — NEW edge function: `marketing-generate-keyframe`
File: `supabase/functions/marketing-generate-keyframe/index.ts`

Inputs: `generation_id`. Loads generation + product images + avatar.

Builds a Nano Banana Pro request:
- Images: avatar first (cropped via wsrv.nl), then up to 3 product images.
- Prompt: composes ONE photoreal 9:16 still — avatar IN `scene_description`, holding/wearing the product, camera per `camera_notes`. Locks face from image 1, locks product from images 2..N. No collage / overlay / text.

Provider order:
1. Primary: `google/gemini-3-pro-image-preview` via Lovable AI Gateway (Nano Banana Pro).
2. Fallback: `google/gemini-3.1-flash-image-preview` (Nano Banana 2) via Lovable AI Gateway.

On success: download base64 → upload to `ms-keyframes/<gen_id>.png` → write `keyframe_url` (1h signed URL), `keyframe_path`, `stage = 'keyframe_ready'`.

On total failure: log, set `keyframe_url = null`, advance `stage = 'videoing'` so video step still runs (graceful degrade).

Add to `supabase/config.toml`:
```toml
[functions.marketing-generate-keyframe]
verify_jwt = false
```

## Part 8 — Orchestrator stage transition
File: `supabase/functions/marketing-orchestrate/index.ts`

After Claude script is persisted (around line 443), instead of jumping straight to `videoing`:
1. Set `stage = 'keyframing'`.
2. `await invoke('marketing-generate-keyframe', { generation_id })`.
3. Read updated row to get `keyframe_url` (may be null).
4. Set `stage = 'videoing'`, then call `marketing-generate-video` with `keyframe_url` passed through.

Failure inside keyframing must NOT fail the whole job — the keyframer already degrades gracefully.

## Part 9 — Video function reference reorder
File: `supabase/functions/marketing-generate-video/index.ts`

New `buildReferenceBundle(generation, keyframeUrl)`:

If `keyframeUrl` present:
```text
image_urls[0] = keyframe   ← "COMPOSED SCENE — animate this"
image_urls[1] = avatar     ← "facial identity ONLY, ignore background/wardrobe"
image_urls[2..] = products ← "preserve exact appearance"
image_urls[N..] = extras
```

If null: keep current order (avatar first), so we can A/B and revert in one line.

Prepend a `Reference map:\n…\nIDENTITY DIRECTIVE: …\nSCENE SEED: …\n\n<final_prompt>` to the Seedance prompt body.

Atlas avatar registration constraint stays — keyframe is a generated image (not the avatar storage URL) so it does NOT need `asset://` registration; the avatar reference still does.

## Part 10 — UI stage labels + progress
Files: `src/hooks/useGenerationProgress.ts`, `src/pages/MarketingStudioProject.tsx`

`MARKETING_EXPECTED_S` already includes `keyframing` and `keyframe_ready`. Add label config consumed by the overlay:

```ts
const STAGE_CONFIG = {
  queued:         { label: "Queued",           color: "gray" },
  scripting:      { label: "Writing script…",  color: "blue" },
  keyframing:     { label: "Composing scene…", color: "purple" },
  keyframe_ready: { label: "Scene ready",      color: "purple" },
  videoing:       { label: "Filming…",         color: "pink" },
  done:           { label: "Done",             color: "green" },
  failed:         { label: "Failed",           color: "red" },
};
```

Render the chip in the pending overlay on `MarketingStudioProject.tsx` keyed on `generation.stage`. Show keyframe thumbnail in the overlay once `keyframe_url` is set (gives visible "scene is real" feedback before the video lands).

## Part 11 — Memory updates

After implementation:
- `mem://constraint/keyframe-first-pipeline`: keyframe IS the scene; avatar = face lock only; never let video reorder back without an A/B reason.
- Update `mem://index.md` Core with: "Marketing Studio = Claude(script, format-aware, cached) → Nano Banana Pro(keyframe) → Seedance(video). Keyframe is the scene anchor; avatar reference is face-lock ONLY."

---

## Execution order (each step independently testable)

1. Migration: `ms-keyframes` bucket + RLS.
2. Extend `marketing-analyze-product` schema (energy + brief).
3. Voice description + voice_id storage in `marketing-generate-voice-sample`; backfill built-ins.
4. Rewrite system prompt (Blocks 1+2+3) and `buildUserMessage` in `marketing-generate-script`. Add prompt caching.
5. Add slop gate v2 + retry + deterministic fallback.
6. Build `marketing-generate-keyframe` edge function + register in `config.toml`.
7. Wire orchestrator: scripting → keyframing → videoing.
8. Reorder references in `marketing-generate-video` (keyframe[0], avatar[1], products[2..]).
9. UI: stage labels + keyframe preview in overlay.
10. A/B 5 product+avatar combos (keyframe ON vs OFF). If avatar-in-scene fidelity is clearly better → keep. If not → flip orchestrator flag to skip keyframe (one-line revert).

## Technical notes

- Anthropic prompt caching (`cache_control: ephemeral`) on the system block — already enabled today, must remain on the new combined block. First call full price, ~10% thereafter.
- All product/avatar images going to Claude AND Nano Banana Pro must route through wsrv.nl (1280w, q82) to stay under 4.5MB Anthropic / Gemini image limits — pattern already used elsewhere.
- Format selection: BLOCK_2 module + `FORMAT:` line in user text — both required; never rely on only one.
- Atlas avatar registration constraint (mem://constraint/atlas-avatar-asset-registration) is unaffected: Seedance still needs `asset://` ID for the avatar reference; keyframe is a fresh generated image and goes in as a normal URL.
- Keyframe failure must never fail the generation — graceful degrade to old reference order is mandatory.
- Cost: keyframe adds ~$0.04/gen (Nano Banana Pro). Voice samples are one-time per avatar (~$0.05). Vision analysis is one-time per product.
