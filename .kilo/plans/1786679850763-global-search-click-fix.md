# Fix: Global Search — user result click + mobile UX

File: `client/src/components/GlobalSearch.jsx` (and `useGlobalSearch.js` for path verification only).

---

## Part A — Click doesn't navigate to the user profile (root cause)

The results dropdown is rendered only while `open && query` is true. Two defects prevent a simple click on a user (and any) result from redirecting:

1. **Blur race (primary cause)** — Clicking a result blurs the search `<input>`, firing `onBlur` → `handleBlurClose` (lines 95-101), which calls `setOpen(false)` after a **150ms** timer. If `mouseup`/`click` lands after that timer (slow click, trackpad, timing jitter), the dropdown unmounts the row before the `click` event fires, so `navigateToResult` never runs. The click is "lost."
2. **`<a href>` + fragile guard** — `ResultRow` is an `<a href="/profile/{id}">` whose `onClick` (lines 44-49) only calls `preventDefault()` for a pristine left-click (`e.button === 0 && !modifiers`). If that guard isn't met, the browser does a hard full-page navigation to `/profile/{id}` (404s under static hosting) instead of an SPA route change.

### Fix A
- In `ResultRow`, add `onMouseDown={(e) => e.preventDefault()}` so clicking a result keeps the input focused and the dropdown mounted until `click` fires (standard dropdown pattern).
- Convert `ResultRow` from `<a href=…>` to a `<button type="button">`:
  - Replace the modifier/button guard with a simple `onClick={() => onClick(category, item)}` — a single normal click always navigates ("just click is enough"). Enter/Space work for free.
  - Reuse the existing `className`; add `w-full text-left` for proper button layout.
- Leave `handleClickOutside` (document `mousedown`) and `handleBlurClose` as-is — they still close the panel on genuine outside clicks; the `onMouseDown` preventDefault only suppresses blur for result clicks.
- Navigation path is already correct: `CATEGORY_PATHS.users` → `/profile/${item.id}` (line 21) and `useGlobalSearch.navigateToResult` → `/profile/${userId}` (useGlobalSearch.js:57) resolve to the existing route `profile/:userId` → `UserProfilePage` (App.jsx:187). No backend/route changes.

---

## Part B — Mobile UI/UX improvements

Current problems on `< sm` (mobile), given the header at `AppLayout.jsx:188-350` (`h-14`, hamburger + visible `currentTitle` + centered search + notifications + profile avatar):
- Result dropdown is `w-full max-w-[16rem]` and left-aligned inside the centered `flex-1 max-w-xl mx-auto` container → narrow, can overflow/misalign on phones.
- Small tap targets; iOS zooms because input is `text-sm`.
- No clear "search mode" affordance.

### Fix B (all inside `GlobalSearch.jsx`, no AppLayout changes)
1. **Full-width dropdown on mobile** — change the dropdown wrapper from
   `absolute top-full z-50 mt-1 w-full max-w-[16rem] sm:max-w-lg`
   to a mobile overlay that spans the viewport under the header:
   `fixed inset-x-0 top-14 z-50 mt-0 w-auto sm:absolute sm:inset-x-auto sm:top-full sm:w-full sm:max-w-lg`
   (`top-14` matches the `h-14` header height.) Add a mobile backdrop to dismiss:
   `{open && query && (<div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={() => setOpen(false)} />)}`
   placed before the dropdown.
2. **Taller scroll area on mobile** — `max-h-96` → `max-h-[70vh] sm:max-h-96`.
3. **Bigger, clearer tap targets** — on `ResultRow`, change `py-2` → `py-2.5 sm:py-2`, add `active:bg-neutral-100 dark:active:bg-neutral-800` and `touch-manipulation`, and ensure the category label/icon are legible (`text-xs` already).
4. **Prevent iOS zoom** — input `text-sm` → `text-base sm:text-sm`.
5. **Dismiss affordance** — the existing clear (`X`) button already works; keep it. Optionally increase its hit area on mobile (`p-2 sm:p-1.5`).

These are additive and don't change desktop behavior (`sm:` overrides restore current desktop styling).

---

## Files to edit
- `client/src/components/GlobalSearch.jsx`
  - `ResultRow` (lines 34-68): `<a>` → `<button type="button">`; add `onMouseDown` preventDefault; simplify `onClick`; improve mobile `className`/tap targets.
  - Results dropdown wrapper (lines 162-172): mobile `fixed` full-width overlay + backdrop + taller `max-h`.
  - Search `<input>` (lines 126-145): `text-base sm:text-sm`.
  - Clear button (lines 146-154): slightly larger mobile hit area (optional).

## Validation
1. `npm run build` (client) succeeds with no new errors/warnings.
2. **Click fix:** type a name → results appear → single left-click a user → SPA navigates to `/profile/{id}` (UserProfilePage); no full reload, URL changes, no 404. Test slow click (>150ms hold), Enter/Space on focused row, clicking outside still closes, other categories (courses, sops, quizzes, tasks) still navigate.
3. **Mobile UX:** at `< 640px` width — dropdown is full-width under the header, tappable rows, tapping a result navigates, tapping the backdrop or outside closes it, no iOS zoom on focus, desktop layout unchanged at `≥ sm`.
