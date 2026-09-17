# Plan: Fix image size reverting to Large after save (SOP text editor)

## Summary

When a user inserts an image in the SOP rich text editor and sets it to Small (`25%`) or Medium (`50%`), the size is correct in the live editor but reverts to Large (`100%`) after the module is saved and reloaded. The bug is a schema mismatch in the Tiptap `Image` extension: the persisted HTML stores `data-width` on the parent `<figure>`, but `parseHTML` reads it off the `<img>`, and falls back to the `<img>`'s hardcoded inline `style: width: 100%`. On reload, Tiptap re-parses the saved HTML and the width collapses to `100%`.

## Root cause

File: `client/src/features/sop-management/components/SOPEditor/ImageResizable.jsx`

- `renderHTML()` (line 65–96) bakes `data-width` onto the **`<figure>`** element (line 93), not the `<img>`. The `<img>` only gets `style: 'width: 100%; height: auto; display: block;'` (line 71) — no `data-width`.
- `parseHTML()` (line 61–63) returns `[{ tag: 'img[src]' }]`, so the element passed to the `width.parseHTML` function (line 34) is the **`<img>`**.
- Line 34: `parseHTML: (el) => el.getAttribute('data-width') || el.style.width || null`
  - `el.getAttribute('data-width')` on `<img>` → `null` (it lives on `<figure>`)
  - `el.style.width` on `<img>` → `'100%'` (hardcoded inline style)
  - Result: `width` always re-parses to `'100%'` = Large.

This re-parse fires on every `setContent`, i.e. when the module is loaded after a save, when switching modules, or on page reload. The live editor state is fine; only the persisted HTML round-trip is broken.

The `align` attribute has the same latent mismatch (line 45 reads `data-align` from `<img>`, line 86 writes it to `<figure>`), but `align` still renders because `renderHTML` also bakes alignment into the figure's inline `margin` (lines 80–84). Size has no such fallback, which is why only size is visibly broken.

## Fix

Make `parseHTML` and `renderHTML` agree on where `data-width` lives. Two changes in `ImageResizable.jsx`:

1. **Write `data-width` onto the `<img>`** so `parseHTML` can find it:
   - In `renderHTML()`, add `'data-width'` to the `<img>` attributes (alongside the existing figure-level `data-width`):
     ```js
     const children = [['img', {
       ...imgAttrs,
       ...(dataWidth ? { 'data-width': dataWidth } : {}),
       style: 'width: 100%; height: auto; display: block;',
     }]];
     ```
   This is the primary fix. After this, `parseHTML` line 34 finds `data-width` on the `<img>` and restores the correct width.

2. **Drop the dangerous `el.style.width` fallback** in `width.parseHTML` so a missing `data-width` yields `null` instead of silently forcing `100%`:
   ```js
   parseHTML: (el) => el.getAttribute('data-width') || null,
   ```
   This is a safety net. Without it, any image lacking `data-width` (e.g. legacy HTML, or images inserted without explicit sizing) would still collapse to `100%` on reload. With it, the node view's own fallback (`width || '60%'`, line 60 of `ImageNodeView.jsx) applies, matching the persisted figure width (`dataWidth || '60%'`, line 91).

Both changes are minimal and confined to `ImageResizable.jsx`. No other files need editing.

## Files affected

- `client/src/features/sop-management/components/SOPEditor/ImageResizable.jsx` (only file changed)

## Files reviewed (no change needed)

- `client/src/features/sop-management/components/SOPEditor/ImageNodeView.jsx` — size presets and `updateAttributes({ width })` are correct; the node view applies `width || '60%'` as the box width, which matches the new persisted behavior.
- `client/src/features/sop-management/components/SOPEditor/RichTextEditor.jsx` — saves via `editor.getHTML()`; no change needed.
- `server/services/sopModuleService.js` — passes `data.content` to the DB with no sanitization, which is fine because the fix is in the HTML generation itself.
- `server/utils/dom.js` — read-only htmlparser2 wrapper, not used to strip attributes; no change needed.

## Validation

1. Insert an image into the SOP editor, set it to Small (`25%`) and Medium (`50%`) using the preset buttons, then save the module.
2. Reload the module (or switch away and back). Confirm the image retains its Small/Medium width instead of reverting to Large.
3. Test an image that is drag-resized to a custom width — confirm it persists.
4. Test an image that is never explicitly resized (no `data-width`) — confirm it renders at the `60%` fallback, not full-bleed `100%`.
5. Confirm alignment (left/center/right) still renders correctly after reload.
6. Confirm captions still persist after reload.
7. Run the project's existing lint/typecheck/build commands (per repo conventions) to ensure no regressions.

## Open questions

None. The fix is isolated to one file and the behavior is fully determined by the existing code.