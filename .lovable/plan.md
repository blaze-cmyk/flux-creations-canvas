## Change

Drop the FormatsGrid swap — marketing mode on `/image` should look identical to Image / Video / Motion Control modes. Only the prompt bar changes; the page body keeps showing `ImageGrid` (the user's generation history).

### Edits

**`src/pages/Generator.tsx`**
- Always render `<ImageGrid />` regardless of mode.
- Always use `pb-44` (no extra padding for marketing).
- Remove the `FormatsGrid` import and conditional.

```tsx
<div className="flex-1 px-3 md:px-5 pt-3 pb-44">
  <ImageGrid />
</div>
```

The prompt-bar dock at the bottom keeps swapping between `PromptBar`, `VideoPromptBarInline`, and `MarketingPromptBar` based on `mode` — exactly like today.

**`src/components/generator/FormatsGrid.tsx`**
- Delete (no longer used anywhere).

Everything else (nav bar, marketing prompt bar, backend, project pages) stays as-is.
