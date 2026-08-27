# Premium Boxed-Layout Color & UI Styling Strategy

**Context:** The app moved from full-bleed to a boxed layout (`.app-canvas` → `.app-shell` card),
implemented in `client/src/layout/AppLayout.jsx:131-148` and styled in `client/src/index.css`
(`.app-canvas` / `.app-shell` rules, lines ~474-527).

**Problem:** Today the canvas (`#F1F2F6`) is almost identical to the shell (`#F2F2F0`), so the box
does not visually "float." Shadows are single-layer and faint. The orange brand (`#F25C05`) used
with white button text computes to ~3.3:1 contrast, which **fails WCAG AA (4.5:1)** for normal-size
text — a blocker for requirement #4.

**Decisions (confirmed with user):**
- Palette direction: **Refine current brand** — keep orange as the functional primary, add a
  champagne/gold accent + richer, warmer neutrals.
- Canvas depth: **Tonal + layered shadow** — deeper canvas, brighter/cleaner shell, layered soft
  shadow + a hairline border on the shell.

All changes are centralized in `client/src/index.css` design tokens (no component rewrites needed
unless noted). Mobile/tablet stay full-bleed (radius/shadow only apply `≥1024px` — keep that).

---

## 1. Background & Container Colors (depth through tonal steps)

Introduce a 4-step warm-neutral ramp so the box reads as floating on the canvas:

| Layer | Light | Dark | Purpose |
|---|---|---|---|
| Canvas (outer margin) | `#E9E5DE` deeper warm greige | `#16140F` warm near-black | Recedes behind the shell |
| Shell card | `#F6F4F0` warm off-white | `#1E1C19` warm charcoal | The floating container |
| Surface / cards | `#FFFFFF` | `#26241F` | Content sits above shell |
| Subtle inset | `#FAF8F4` | `#221F1B` | Nested wells, inputs |

Update tokens (`:root` and `.dark`):
- `--app-canvas` → `#E9E5DE` (light) / `#16140F` (dark)  *(currently `#F1F2F6` / `#1b1b1a`)*
- `--app-shell-bg` → explicit `#F6F4F0` (light) / `#1E1C19` (dark)  *(currently `var(--bg-page)`)*
- New `--bg-subtle` → `#FAF8F4` (light) / `#221F1B` (dark)
- Keep `--bg-surface: #FFFFFF` light; dark `#26241F` (slightly warmer than current `#30302e`)

Net effect: canvas (deepest) → shell (mid) → card (brightest) creates effortless depth without
relying on shadow alone.

## 2. Color Palette (sophisticated, luxury-leaning)

Keep the existing brand roles but refine the values and add a gold tier.

| Role | Token | Light | Dark | Notes |
|---|---|---|---|---|
| Primary (functional) | `--color-primary` | `#C14E08` burnt orange | `#E06A1F` | **Deepened from `#F25C05` so white text passes AA (4.76:1)** |
| Primary hover | `--color-primary-hover` | `#A84206` | `#C75C16` | |
| Primary active | `--color-primary-active` | `#8F3905` | `#B05114` | |
| Brand bright (decor/large only) | `--color-brand-bright` | `#F25C05` | `#F25C05` | logo, large headings, focus rings (3:1 OK) |
| Secondary (navy) | `--color-secondary` | `#132F45` | `#C9D4DE` | keep navy as anchor |
| Accent — champagne gold | `--color-accent` | `#C8A24B` | `#D9B36B` | decorative lines, borders, icons |
| Accent gold (text-safe) | `--color-accent-strong` | `#A47E2E` | `#E0BD72` | only for large/semantic text |
| Neutral text primary | `--text-primary` | `#132F45` | `#F2EDE4` | warm off-white dark |
| Neutral text secondary | `--text-secondary` | `#32667F` | `#A8B6C0` | teal, keep |
| Neutral text muted | `--text-muted` | `#6E665C` | `#9A9186` | warm gray, ~5.3:1 on white |
| Border (warm hairline) | `--border` | `#E6E0D8` | `rgba(255,255,255,0.08)` | warmer than current bluish `#dde8ef` |

Add premium gradients:
- `--accent-gradient: linear-gradient(135deg, #F25C05, #C14E08)`
- `--gold-gradient: linear-gradient(135deg, #E0BD72, #B8860B)`

> **Why deepen primary:** bright `#F25C05` + white = 3.3:1 (fail). `#C14E08` + white = 4.76:1 (pass AA).
> Bright `#F25C05` is retained as `--color-brand-bright` for large/non-text brand uses.

## 3. Surface & Elevation (hierarchy via layered shadow + hairline)

Replace the single faint shadow with warm, multi-layer elevation. Update `--shadow-*` and add shell
tokens. Use **warm-tinted** rgba (not pure black) for a refined, less "dirty" look.

Light shadows (warm `rgba(40,30,20,…)`):
- `--shadow-sm: 0 1px 2px rgba(40,30,20,0.04), 0 1px 3px rgba(40,30,20,0.06)`
- `--shadow-md: 0 4px 10px rgba(40,30,20,0.06), 0 2px 4px rgba(40,30,20,0.04)`
- `--shadow-lg: 0 12px 28px rgba(40,30,20,0.10), 0 4px 8px rgba(40,30,20,0.05)`
- `--shadow-xl: 0 24px 60px rgba(20,12,4,0.18)`

Dark shadows (warm-neutral `rgba(10,8,5,…)`):
- `--shadow-sm/md/lg/xl` analogous with `rgba(0,0,0,0.4–0.55)`.

Shell (the floating card) — update `--app-shell-*`:
- `--app-shell-radius: 18px` (was 14px — softer, premium)
- `--app-shell-inset: 20px` / `--app-shell-inset-lg: 28px` (was 16/20)
- `--app-shell-border: 1px solid rgba(40,30,20,0.06)` (light) / `1px solid rgba(255,255,255,0.07)` (dark)
- `--app-shell-shadow: 0 1px 2px rgba(30,20,10,0.04), 0 8px 24px rgba(30,20,10,0.08), 0 24px 48px rgba(30,20,10,0.06)`

Apply in `.app-shell` (≥1024px block already exists, ~line 516):
```css
.app-shell {
  border-radius: var(--app-shell-radius);
  box-shadow: var(--app-shell-shadow);
  border: var(--app-shell-border);
}
```
Keep `border-radius:0; box-shadow:none; border:none` below 1024px (full-bleed).

Elevation ladder for content cards (reuse `--shadow-sm/md/lg`); add a `.surface-card` utility or
rely on existing `.fb-card` / card classes — ensure they use the new token shadows. Optional: a
`1px` inset hairline `box-shadow: inset 0 0 0 1px var(--border)` on cards for crisp edges.

## 4. Contrast & Accessibility (WCAG AA)

Verified target ratios (compute with a checker during implementation; these are the design intents):

| Pair | Ratio | Verdict |
|---|---|---|
| White text on `--color-primary` `#C14E08` | ~4.76:1 | ✅ AA normal text |
| `--text-primary` `#132F45` on white | ~13:1 | ✅ AAA |
| `--text-muted` `#6E665C` on white | ~5.3:1 | ✅ AA |
| `--text-secondary` `#32667F` on white | ~6:1 | ✅ AA |
| `--color-accent` gold `#C8A24B` on white | ~2.1:1 | ⚠️ **text only if large** → use for lines/borders/icons or large headings |
| `--color-accent-strong` `#A47E2E` on white | ~3.7:1 | ⚠️ large text / non-body only |

Rules to enforce in code:
- Gold (`--color-accent`) is **decorative** (dividers, icon strokes, gradient fills, large display
  text ≥24px). Never use it for body copy or small links.
- All primary buttons use `--color-primary` (deepened) with white text.
- Add a visible focus ring token: `--focus-ring: 0 0 0 3px rgba(193,78,8,0.35)` and apply on
  `:focus-visible` for buttons/inputs/links (currently uses `var(--ring)` — verify ≥3:1 on both themes).
- Disabled states keep ≥3:1 against their background for the *enabled* affordance hint.
- Respect `prefers-reduced-motion` (already handled for scrollbars) — extend to any new transitions.

---

## Implementation Steps (ordered)

1. **Tokens — light (`:root`)**: update `--app-canvas`, `--app-shell-bg`, `--bg-subtle`, `--bg-surface`,
   `--text-muted` (warm), `--border` (warm), `--color-primary(-hover/-active)`, add
   `--color-brand-bright`, `--color-accent`, `--color-accent-strong`, `--accent-gradient`,
   `--gold-gradient`, new `--shadow-*` (warm), new `--app-shell-*` (radius/inset/border/shadow).
2. **Tokens — dark (`.dark`)**: mirror the above with warm-dark values.
3. **Shell styling (~line 516 media block)**: add `border: var(--app-shell-border)`; confirm
   radius/shadow pull from tokens.
4. **Buttons**: ensure `.btn-primary` etc. reference `--color-primary` (deepened) — already do via
   tokens, so only token change needed. Add `:focus-visible` ring using `--focus-ring`.
5. **Login page**: the `.login-page` block (~line 938) overrides tokens to force light — refresh its
   `--bg-page/--bg-subtle/--border/--text-muted` to the new warm neutrals so login matches the
   premium system.
6. **Cards**: point existing card classes (`.fb-card`, any `shadow-*` usages) at the new `--shadow-*`
   tokens if they currently hardcode values.

## Validation

- Run `npm run build` in `client/` — zero errors/warnings.
- Spot-check in browser (light + dark, ≥1024px and <1024px): shell visibly floats on canvas; cards
  sit above shell; gold used only decoratively.
- Contrast audit: paste key pairs (white-on-primary, muted-on-white, gold-on-white) into a WCAG
  checker; confirm ≥4.5:1 for text, ≥3:1 for large/UI. Adjust `--color-primary`/`--color-accent-strong`
  if a checker disagrees with the estimates above.
- `prefers-reduced-motion` still honored.

## Open Questions / Risks

- **Brand sign-off:** deepening `#F25C05` → `#C14E08` changes the logo-adjacent brand color. If
  marketing requires the exact bright orange on buttons, alternative is to keep bright orange but
  enforce large/bold (≥18.66px bold) button labels so 3:1 suffices — but that constrains typography.
- The `.login-page` forced-light override may drift from the new tokens if not updated in step 5.
- Some pages may hardcode Tailwind colors (e.g. `text-neutral-*`, `bg-white`) instead of tokens —
  grep `client/src` for hardcoded neutrals during implementation and migrate high-visibility ones.
