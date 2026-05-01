## Goal

Ship "Podcast" as a first-class Marketing Studio format. Distilled from your four reference breakdowns in `podcasting_1.md` (Comfrt sweatpants 25s two-person, Comfrt grey 44s interview, Comfrt magenta 44s interview, Comfrt navy 36s tactile-demo). The writer must produce two-person podcast-clip ads (or single-guest + invisible interviewer) with a visible mic, conversational overlap, a tactile proof beat, and an action-cut transition. Never AI-slop.

## Files touched

```text
NEW   supabase/functions/_skills/podcast-ugc.md          (~14 sections, ~280 lines)
EDIT  supabase/functions/marketing-generate-script/index.ts
EDIT  src/store/marketingStudioStore.ts
EDIT  src/components/marketingstudio/FormatPickerModal.tsx
EDIT  src/components/marketingstudio/formatPresets.ts
EDIT  src/pages/MarketingStudio.tsx
```

## 1. New skill file — `supabase/functions/_skills/podcast-ugc.md`

Mirrors the style and frontmatter shape of `creatify-video-ad.md`. Sections, in order:

1. **IDENTITY** — locked tripod, ~35mm, mixed practicals, mic-on-couch, 0–1 cuts.
2. **WHEN TO USE / NOT USE** — apparel + comfort + wellness yes; macro/hero/ASMR no.
3. **SHOT GRAMMAR** — two-shot vs single-guest, posture-as-proof, no camera moves, no B-roll.
4. **CASTING / PERSONAS** — Mode A (host + guest on couch), Mode B (single guest + invisible off-camera interviewer). Persona pairings spelled out.
5. **BEAT TIMELINE TEMPLATES** — 25s two-person, 36s tactile-demo, 44s single-guest interview. ASCII tables.
6. **HOOK FORMULAS (5)** — Question, Pattern-Interrupt Social Proof, Bold Compliment, Mid-Sentence Open, Setup-then-Objection.
7. **BODY STRUCTURES (4)** — Feature Cascade, Objection-Reversal, Tactile-Proof Loop, Setup→Demo→CTA.
8. **CTA PATTERNS** — Direct, Soft Intrigue, Pointed Fourth-Wall, Social Proof Close.
9. **MANDATORY ELEMENTS** — visible mic, tactile proof beat, two distinct voices, disfluency floor, posture-as-proof, no mirrors.
10. **ACTION-CUT TRANSITION RULE** — throw mask, lean mask, hand-swipe mask. No clean wipes.
11. **BANNED PATTERNS** — green-screen, ring-light, "Hey guys", camera moves, music, single-monologue, rigid turn-based dialogue.
12. **EXAMPLE SHOT PLAN A** — Comfrt sweatpants 25s, two-person, distilled into one Higgsfield-style paragraph (~280 words) ready to use as a few-shot.
13. **EXAMPLE SHOT PLAN B** — Comfrt magenta 44s, single-guest interview, distilled into one paragraph (~340 words).
14. **WHAT TO STEAL FROM REAL REFERENCES** — Podcast Camouflage, Tactile Proof Beat, Action-Cut Transition, Invisible Interviewer, Posture as Proof, Mid-Sentence Open, Conversational Overlap.

## 2. `marketing-generate-script/index.ts` changes

**Add `EX_PODCAST` few-shot** — verbatim distilled Comfrt sweatpants 25s, same shape as `EX_UGC` etc.

**Add `PODCAST_PROMPT` constant** — mirrors `UGC_PROMPT` structure but encodes podcast rules:
- SETTING: interior, couch/armchair, foreground podcast mic explicit.
- CASTING: pick Mode A (host + guest) or Mode B (single guest + invisible off-cam interviewer). Off-cam lines marked `(off-camera)` inside the paragraph.
- PRODUCT IN HAND: pulled from `concrete_product_details`; on-product text must read forward.
- BEATS: 4–6 beats, scaled to duration. One beat MUST be a tactile-proof beat. If wardrobe change occurs, use action-cut transition language ("hard cut masked by motion blur of …").
- DIALOGUE RULES: 2 distinct voices, ≤14 words/line, all in double quotes, at least 3 disfluencies across script, conversational overlap allowed (mark with two consecutive quoted lines).
- POSTURE-AS-PROOF rule for comfort/wellness products.
- Voice = `CREATOR_PERSONA`.

**Register format:**
```
'Podcast': PODCAST_PROMPT,
```
inside `FORMAT_SYSTEM_PROMPTS`.

**Routing guards:**
- Skip the POV_HANDS branch when `format === 'Podcast'` even if no avatar is provided. Podcast is two-voice by design; if no avatar, the writer invents both characters.
- Skip the AVATAR_TALKING_HEAD override (currently no-op for `format === 'Podcast'` since the trigger is `!productId`, but add an explicit guard for safety).

**Harden `isWeak()` for Podcast outputs:**
- Require the words `podcast` AND (`mic`|`microphone`) anywhere in `final_prompt`.
- Require at least 4 quoted lines (proxy for two-speaker dialogue).
- Reuse existing length / banned-phrase / time-window checks unchanged.

## 3. `src/store/marketingStudioStore.ts`

Extend the `MSMode` union with `'Podcast'`. No store-logic changes.

## 4. `src/components/marketingstudio/FormatPickerModal.tsx`

- Add `'Podcast'` to the `FormatId` union.
- Insert a new entry in `FORMAT_ITEMS`:
  ```
  { id: 'Podcast', label: 'Podcast', desc: 'Faux-podcast clip — two-person ad', src: '/formats/podcast-1.mp4', preview: '/formats/preview-ugc.png' }
  ```
- If `/formats/podcast-1.mp4` doesn't exist yet the picker simply shows a black placeholder; nothing crashes (existing `<video>` falls back gracefully).

## 5. `src/components/marketingstudio/formatPresets.ts`

- Add a `PODCAST_COMFRT` constant containing the same distilled 25s Comfrt-sweatpants paragraph used in EX_PODCAST.
- Register a new preset key `f10`:
  ```
  f10: {
    mode: 'Podcast',
    prompt: PODCAST_COMFRT,
    duration: '25s',
    aspect: '9:16',
    productName: 'Comfrt Olive Set',
    avatarName: 'Guy 1 + Guy 2',
  }
  ```

## 6. `src/pages/MarketingStudio.tsx`

Add the matching grid card to the `FORMATS` array:
```
{ id: 'f10', label: 'Podcast', src: '/formats/podcast-1.mp4' },
```

## Out of scope (intentionally)

- No DB migration. The skill `.md` file is for human reference and future RAG; the writer reads from inlined constants (same pattern as Creatify distilled).
- No new artwork. UI uses existing `preview-ugc.png` until you upload a podcast preview clip.
- No keyframe/video pipeline changes. Podcast routes through the existing two-person Seedance path.

## Acceptance

- "Podcast" appears in the format picker and the landing-page format grid.
- Selecting f10 + Generate produces a script with: visible foreground mic, two distinct speakers (or one guest + off-cam interviewer), at least one tactile proof beat, disfluencies, no banned phrases.
- All existing formats (UGC, Tutorial, Unboxing, Try-On, Hyper Motion) behave exactly as before.

Approve and I'll implement all six file changes in one pass.