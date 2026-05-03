# /create grid → Marketing Studio parity

## What stays untouched
- Grid background (dark grid + gradient).
- Page layout (sidebar, header, prompt bar position, justified-rows masonry algorithm, 9:16 = 2× height rule).
- Existing hover overlays on **image** cards: top-left select circle, bottom-right Reference / Animate / Delete pills.

## What changes

### 1. Mixed grid: images + videos
The justified-rows grid on `/create` will render BOTH `useGeneratorStore.images` and `useVideoStore.videos`, merged and sorted by `createdAt` desc, filtered to the active project (videos get a `projectId` field set on creation, mirroring images).

### 2. Card states (copied from Marketing Studio)
For every card, regardless of image vs video:
- **Pending** (`generating` / `queued` / `running`): shimmer overlay + centered spinner + uppercase stage label + thin progress bar (fake fill 0→95% over ~60s for images, ~120s for videos) + elapsed-seconds counter. Same visual as `MarketingStudioProject.tsx` lines 395–412.
- **Failed**: dark overlay, red AlertCircle, "Generation failed", error text (line-clamped), Retry + Delete pill buttons. Same as `FailedGenerationPanel` styling used in MS.
- **Complete image**: existing `<img>` with our hover overlays.
- **Complete video**: `<video>` thumbnail that plays on hover (`muted`, `loop`, `playsInline`, `preload="metadata"`), pauses on leave, with its OWN hover overlay (see step 4).

### 3. Top tabs row (All / Liked)
Replace the silent header area with a small tabs pill copied from MS (`tabsRight` block in `MarketingStudioProject.tsx` lines 294–316):
- "All" / "Liked ♥" segmented control on the right.
- Filters the grid client-side.
- Add a `liked: boolean` field to both `GeneratedImage` and `GeneratedVideo` plus a `toggleLike(id)` action in each store. Persist to the existing DB rows (add a `liked` column via migration, default `false`).
- Heart icon appears in each card's hover overlay; filled when liked.

### 4. Hover overlays — split by media type
Keep image overlays as-is. Define a separate set for videos:

**Image hover (unchanged):** select circle (top-left) · Reference · Animate · Delete · Like (added).

**Video hover (new):** select circle (top-left) · Play/Expand · Download · Like · Delete (bottom-right). No Reference or Animate (those are image-only flows). Same circular pill style, same fade-in on group-hover, same danger styling for Delete.

### 5. Empty state
Replace the current "No generations yet" text block with the MS empty state: gradient `ms-cta` rounded square + Play icon + "No generations yet" + "Describe your ad below to get started." (lines 343–350 of `MarketingStudioProject.tsx`).

### 6. Detail modal (expand)
Reuse the existing `ImageDetailModal` shell on `/create` for BOTH media types. Generalize it:
- If the selected item has `videoUrl`, render a `<video controls autoPlay loop>` in the same large-frame slot where the `<img>` currently goes.
- Everything else (prompt panel, model badge, aspect-ratio chip, metadata, action buttons) stays identical so images and videos open in the same shell.
- A new `selectedMediaId` selector (replacing today's `selectedImageId`) resolves to either an image or a video record.

### 7. Banner removed
No "N generations in progress" banner above the grid. Per-card shimmer is the only loading affordance.

## Technical notes (for reference)

**Files touched**
- `src/store/generatorStore.ts` — add `liked`, `toggleLike(id)`, persist `liked` to DB.
- `src/store/videoStore.ts` — add `liked`, `toggleLike(id)`, ensure `projectId` is set on new videos and persisted; expose for grid consumption.
- `src/components/generator/ImageGrid.tsx` — merge images+videos into one feed, add tabs row, swap empty state, render video cards with hover-play, branch hover overlays by media type, swap pending state for MS-style spinner+progress+elapsed.
- `src/components/generator/ImageDetailModal.tsx` → rename internally to `MediaDetailModal` (keep file name to avoid import churn) and conditionally render video vs image; update `useGeneratorStore.selectedImageId` consumers to a unified `selectedMediaId`.
- `src/pages/Generator.tsx` — open the unified modal when `selectedMediaId` is set.
- `supabase/migrations/<timestamp>_add_liked.sql` — `ALTER TABLE generations ADD COLUMN liked BOOLEAN NOT NULL DEFAULT false;` and same on `video_generations`.

**Behavior**
- Sorting: merged feed is sorted by `createdAt` desc; layout algorithm unchanged.
- Per-card 1s tick (already added) keeps elapsed/progress live for both media types.
- Video poster: use `thumbnailUrl` if present, otherwise the `<video preload="metadata">` first frame.
