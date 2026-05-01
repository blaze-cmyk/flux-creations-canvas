## Goal
Match Higgsfield script quality across all 5 input combos (with/without product, with/without avatar, with/without user prompt). Cinematography is already good — only fix the script writer + how we route inputs.

## Root causes (confirmed by reading the code)
1. `marketing-generate-script` is **text-only** — never sends product/avatar images to the LLM. So `PRODUCT_COLOR`, `MATERIAL`, hardware are always "unspecified". → generic dialogue.
2. Same default persona every call → every script sounds the same.
3. UGC and Tutorial system prompts assume an avatar exists. With no avatar, the LLM invents a generic spokesperson.
4. User-typed prompts get demoted into `SETTING_HINT`, diluting the user's actual creative idea.
5. Orchestrator caps product refs to **1 image** when `userPrompt` is blank → Seedance just re-animates the single product photo (the AI-slop you're seeing).
6. Avatar-only + prompt has no dedicated format → forced through product templates that demand a product.
7. Few-shot examples from `mem://reference/higgsfield-prompts` are never shown to the model.

## Changes

### 1. `marketing-generate-script/index.ts` — multimodal + persona + few-shot + user-prompt-as-core
- **Multimodal call**: send up to 3 product images and 1 avatar image as `image_url` content parts. Use `google/gemini-2.5-pro` (vision + better dialogue). Fallback to `gemini-3-flash-preview` on 429/402.
- **Inject 1 verbatim Higgsfield example per format** (UGC, UGC Try-On, Tutorial, Unboxing) as `EXAMPLE OUTPUT` blocks in the system prompt. Hardcode them as constants at the top of the file.
- **Roll a `CREATOR_PERSONA`** per call from 6 archetypes (dry-deadpan / wide-eyed-genuine / chaotic-bestie / quiet-luxury / hype-friend / low-key-cool). Pass to LLM and return in tool output so we can persist it.
- **New `USER_DIRECTION` field** (replaces shoving prompt into SETTING_HINT). System prompt rule: "If USER_DIRECTION is present, build the scene and dialogue around it. Format rules govern camera/structure only — they do not override the user's creative direction."
- **Add POV_HANDS sub-template branches** to UGC and Tutorial format prompts (Unboxing already has one). Triggered when `!avatarId`. Describes hands, nail color, sleeve color matched to product palette.
- **Add new `AVATAR_TALKING_HEAD` format prompt** for avatar-only + user-prompt route (Scenario E). No product references required; avatar speaks to camera about the user's idea.
- **Tool schema** gains `concrete_product_details: string[]` (≥4 entries, sourced from images) and `dialogue_lines: { beat, line, delivery_note }[]`. Server-side validation: if `concrete_product_details` is empty OR script contains any banned word, retry once with stricter instructions.
- Cleanly separate `voiceover_script` (only spoken words for TTS / lipsync) from `final_prompt` (full visual direction).

### 2. `marketing-orchestrate/index.ts` — smarter routing + remove the 1-image cap
- **Remove `maxProductImages: 1` cap** when prompt is blank. Always pass 3–6 product refs to Seedance — model needs material to compose, otherwise it re-renders the single ref. Cap stays at 6 max.
- **Route Scenario E** (avatar + prompt, no product) to script gen with `format = 'AVATAR_TALKING_HEAD'` regardless of UI selection.
- **Pass `userPrompt` as `userDirection` (not setting_hint)** to script gen.
- **Tighten `isWeakGeneratedScript`**: also reject if output doesn't mention any of the `concrete_product_details` strings returned by the writer.
- Persist `script_persona` returned by the writer onto the row.

### 3. `marketing-analyze-product/index.ts` — vision pre-pass (cached)
- Read first to confirm output shape; if it returns dominant colors, materials, visible text, hardware → use it. If not, patch to do so.
- Orchestrator calls it once per product, caches result on `ms_products.vision_analysis` (new jsonb column). Subsequent generations reuse the cache. Result is also stringified into the script writer's user message as `PRODUCT_VISION_FACTS` (belt-and-suspenders alongside the multimodal images).

### 4. Migration
```sql
alter table public.ms_products add column if not exists vision_analysis jsonb;
alter table public.ms_generations add column if not exists script_persona text;
```

## Files touched
- `supabase/functions/marketing-generate-script/index.ts` — multimodal call, model swap, few-shot, persona, USER_DIRECTION, POV_HANDS branches, AVATAR_TALKING_HEAD format, stricter tool schema, retry-on-weak.
- `supabase/functions/marketing-orchestrate/index.ts` — remove 1-image cap, scenario E routing, vision-cache lookup, persist persona, stricter weak-check.
- `supabase/functions/marketing-analyze-product/index.ts` — verify/patch to return structured visual facts.
- New migration for the two columns.

## Out of scope
- UI changes — persona is auto-rolled server-side; no new controls. Existing `exactVoiceover` toggle keeps working unchanged.
- Video provider settings (Seedance) — already producing good cinematography per your feedback.

## Per-scenario expected outcome
- **A (product only, no prompt)**: POV-hands UGC/Tutorial/Unboxing with hands/nails/sleeves matched to product palette, dialogue tied to real product details from vision pass.
- **B (product + avatar, no prompt)**: every generation gets a different persona; dialogue references real product visual details.
- **C (product + avatar + prompt)**: user's creative idea drives the beats, format only governs camera/structure.
- **D (product + prompt, no avatar)**: same as C but POV hands.
- **E (avatar + prompt, no product)**: routed to avatar-talking-head format; clean delivery of the user's idea, no forced product references.
