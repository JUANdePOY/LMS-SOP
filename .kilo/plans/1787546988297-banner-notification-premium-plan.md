# Premium Banner & Notification Enhancement Plan

## Context & Current State

### Banners (`client/src/shared/components/ui/BannerSection.jsx`)
- **Two disconnected usages:**
  1. Global `BannerSection` in `AppLayout.jsx:358` renders hardcoded `DEFAULT_BANNERS` (static demo course/event cards) — placeholder content, no backend source.
  2. Dashboard `BannerSection` (`Dashboard.jsx:204`) feeds `dashboardBanners` **derived from unread notifications, announcements, events, messages, and task stats** — this **duplicates the notification stream** already shown in the header dropdown.
- `TYPE_CONFIG` (line 80-144) gives **every** type the identical blue gradient; `isLightBg` is hard-coded `false` so all "light theme" CTA/icon branches are dead code.
- Rich-text sanitizer strips `<img>/<figure>` yet the comment claims images render — inconsistent/contradictory.
- No server entity, targeting, scheduling, personalization, impression tracking, or analytics. Dismissal is localStorage-only (`notificationStore.js` `lms_dismissed_banners`).
- Snooze exists only for `alert` type with `snoozeMs`, but no producer sets `snoozeMs`; `MAX_VISIBLE = 1` with a separate carousel path.

### Notifications
- **Solid real-time core:** WebSocket broadcast (`useWebSocket.js`) + 25s polling fallback (`useNotificationPoller`) + visibility/focus refresh + web-push (`pushNotificationService.js`). Good foundation to build on.
- `notifications` table columns: `id, user_id, title, body, type, link, is_read, entity_type, entity_id, created_at` (from `routes/notifications.js:25`). **Missing:** `priority`, `category`, `image`, `scheduled_at`, `expires_at`, `read_at`, `action_label`, `action_url`, `sound`.
- Dropdown (`NotificationDropdown.jsx`): static "What's New" / "Recent" split, mark-all-read, delete-all. **No** filtering by type/category, no date grouping, no read/unread filter, no pagination beyond server `limit=50`, no DND/quiet hours.
- `NotificationBadge.jsx`: red dot, pulse-on-increase, caps at `9+`.
- Sound (`notificationSound.js`) fires on **every** unread-count increase with no per-type or per-user control.
- Preferences: only a push on/off toggle exists in `Settings.jsx` (`usePushNotifications`). No category-level or channel-level preferences.

## Goals
Transform both features into server-driven, personalized, trackable, and non-intrusive premium components while removing duplication and dead code.

---

## Banner Content Policy (scope of what may appear in the top-of-page slot)

The banner is prime real estate shown on every page and auto-dismisses, so it is reserved for **high-signal, timely, or delightful** moments. Everything routine stays in the notification center, which already has full category/channel preferences.

**Banner-eligible (type allowlist enforced server-side in `getActiveBannersForUser`):**
1. `alert` — actionable, time-critical (outages, security, hard deadlines). Assertive, CTA + snooze.
2. `achievement` — milestones (course complete, certificate earned). Auto-dismiss, celebratory.
3. `new_course` / `new_sop` — only when published within a recency window (e.g. ≤7 days) AND relevant to the user's role/department. Auto-dismiss.
4. `event` — only inside a proximity window (e.g. ≤48h before start). Otherwise it remains in the dropdown.
5. `onboarding` — by definition.

**Not banner-eligible (notification center only):**
- Routine announcements (Announcements feed + dropdown already exist).
- Messages, social, non-overdue task reminders.
- **`promo` / marketing — CONFINED TO THE DROPDOWN** (per decision 2026-08-24). Never the top slot, to protect the premium, low-friction feel. Still gated by the `marketing` category preference.

**Enforcement:** add a server-side gate in `bannerService.getActiveBannersForUser` — type allowlist + event-proximity check + freshness/relevance check — so the slot stays premium by construction, not by campaign author discipline. `promo` is excluded from the allowlist.

> **Remaining implementation task:** the current `getActiveBannersForUser` returns all `active` banners. Before this policy ships, add the type allowlist (`alert, achievement, new_course, new_sop, event, onboarding`), the `event` ≤48h proximity check, and the `new_*` ≤7-day freshness/relevance check; reject `promo` from the banner slot.

---

## 1. Changes & Enhancements

### Backend — Banner Campaign System (new)
Add a managed banner entity so banners become first-class, targetable, schedulable, and measurable.

**New tables (migration `server/migrations/banners.js`):**
- `banners`: `id, title, message, type (announcement|alert|event|achievement|new_course|new_sop|onboarding|promo), cta_label, cta_link, image_url, priority (int), status (draft|active|paused|archived), start_at, end_at, audience (all|role|department|user_ids), target_roles (JSON), target_departments (JSON), target_user_ids (JSON), created_by, created_at, updated_at`.
- `banner_impressions`: `id, banner_id, user_id, event (impression|click|dismiss|snooze), created_at` — for analytics.
- `banner_dismissals` (per-user persistent dismiss/snooze): `id, banner_id, user_id, dismissed_at, snooze_until, created_at`. (Replaces localStorage `lms_dismissed_banners`.)
- Indexes: `banners(status, start_at, end_at)`, `banner_impressions(banner_id, user_id)`.

**New service `server/services/bannerService.js`** + routes `server/routes/banners.js` (auth + `requirePermission('banners.manage')` for write; public read scoped to caller):
- `GET /api/banners/active` → returns active banners for the **current user** (filter by audience/role/department, `start_at<=now<=end_at`, excluding user dismissals/snoozes).
- `POST /api/banners`, `PUT /api/banners/:id`, `PATCH /api/banners/:id/status`, `DELETE /api/banners/:id` (admin/managers).
- `POST /api/banners/:id/events` → record impression/click/dismiss/snooze; on dismiss/snooze write `banner_dismissals` (snooze sets `snooze_until`).
- Validate all input (express-validator), parameterized queries, consistent `{ success, data, error }` shape, correct status codes.

### Backend — Notification Model Upgrades
Migration `server/migrations/notifications_v2.js`:
- Add `priority TINYINT DEFAULT 0`, `category VARCHAR(50) DEFAULT 'system'` (`system|social|training|security|marketing`), `image_url VARCHAR(512) NULL`, `scheduled_at DATETIME NULL`, `expires_at DATETIME NULL`, `read_at DATETIME NULL`, `action_label VARCHAR(100) NULL`, `action_url VARCHAR(512) NULL`, `sound_enabled TINYINT DEFAULT 1`.
- Index `notifications(user_id, is_read, priority)`, `(user_id, category)`.

**Service changes (`notificationService.js`):**
- `createNotification` / `broadcastSystemChange` accept new fields; respect `scheduled_at` (defer broadcast until due — out of scope for MVP scheduler; store and let poller surface when due) and `expires_at`.
- Add `notification_preferences` table + service: per-user per-category `enabled` flag, `email_enabled`, `push_enabled`, `sound_enabled`, `quiet_hours_start`, `quiet_hours_end`, `timezone`. `createNotification` checks preferences before DB insert / push / sound.

**Routes (`routes/notifications.js`):**
- `GET /` add `category`, `unread_only`, `priority` filters and `cursor` pagination (replace hard `limit=50`).
- `GET /api/notifications/preferences`, `PUT /api/notifications/preferences`.
- `GET /api/notifications/summary` → grouped counts (by category, unread total) for a richer badge/dropdown.

### Frontend — Banner Rework (`BannerSection.jsx`)
- Replace hardcoded `DEFAULT_BANNERS` with a `useActiveBanners()` hook that calls `GET /api/banners/active` and merges `pendingBanners` (for in-session ephemeral banners like achievement toasts).
- Differentiate visuals per `type` via distinct gradient/icon/aria-live (remove the all-blue sameness): alert=red/amber assertive, achievement=emerald, event=violet, announcement=blue, promo=gradient brand.
- Enable light/dark theming properly (remove dead `isLightBg=false` branching; drive from real `resolvedTheme`).
- Support `image_url` (hero thumbnail) — update sanitizer to **allow** curated `img` from a trusted CDN host allowlist (resolves the contradictory strip-images logic).
- Snooze available for `alert` (and `promo` if `snoozeMs` set); persists via `POST /api/banners/:id/events`.
- Queue/stacking: cap concurrent visible banners (e.g. 3) with priority sort; emit impression events on mount.

### Frontend — Notification Dropdown (`NotificationDropdown.jsx`)
- Filter chips by `category` (All / Training / Social / Security / Marketing) + Unread toggle.
- Group by date (Today / Yesterday / Earlier) using `created_at`.
- Show `image_url` thumbnail, `action_label`/`action_url` as a button, `category` color dot.
- "Mark all read" + per-category "mark read"; remove the destructive "Delete all" default visibility (keep behind confirm, already present).
- Respect `quiet_hours` locally: suppress sound/badge pulse during DND window computed from user timezone.

### Frontend — Badge & Sound
- `NotificationBadge`: keep pulse but honor `sound_enabled`/`quiet_hours`; show category-aware color (security=red, marketing=neutral).
- `notificationSound.js`: gate by user preference + category + quiet hours; no sound for `marketing` by default.

### Frontend — Settings (`Settings.jsx`)
- Replace single push toggle with a **Notification Preferences** panel: per-category enable, push/email/sound toggles, quiet-hours start/end, timezone. Wired to new preferences API.

---

## 2. Deprecations (remove to reduce friction)
- **`DEFAULT_BANNERS`** static demo data in `BannerSection.jsx` and its use in `AppLayout.jsx` — replaced by server-driven `useActiveBanners()`. (Admin-created campaigns only; no fake content.)
- **Dashboard `dashboardBanners` duplication** (`Dashboard.jsx:78-151`): stop rendering unread notifications/announcements/events/tasks as banners. These already live in the dropdown; instead surface a single contextual "You have N updates" entry or rely on the global banner slot. Removes double-noise.
- **Dead `isLightBg` / light-theme CTA branches** in `BannerCard` (never exercised) — delete.
- **Contradictory image stripping** in `sanitizeRichText` — replace with explicit trusted-host `img` allowlist or remove the misleading comment.
- **`localStorage` banner dismissal** (`lms_dismissed_banners`, `notificationStore.dismiss`) — superseded by server `banner_dismissals`; keep fallback for anonymous ephemeral banners only.
- **Unconditional sound on every unread increase** — deprecated in favor of preference/quiet-hour gating.
- **Hardcoded `limit=50`** in notification fetch — deprecated for cursor pagination.

---

## 3. Premium UX Strategies (advanced, differentiators)
1. **Personalization & Targeting:** role/department/segment-based banner audiences; per-user notification categories. Enables "relevant, not noisy."
2. **Smart Timing:** `scheduled_at` + `expires_at`; quiet hours; surface banners after a task completes (event-driven) rather than on every load. Snooze with smart re-surface.
3. **Rich Media:** banner `image_url`/hero art, notification `image_url` thumbnails, optional `action_label`/`action_url` buttons (one-tap CTA) for both banners and dropdown items.
4. **Analytics & Optimization:** `banner_impressions` → CTR/dismiss-rate dashboard for admins to tune campaigns (A/B-style copy rotation can follow).
5. **Progressive Intensity:** cap concurrent banners, auto-dismiss low-priority (achievement/new_course) after `autoDismissMs`, require explicit action only for `alert`.
6. **Cross-channel coherence:** unify in-app banner, dropdown, email, and web-push from one `createNotification`/`createBanner` source with shared preferences (no duplicate sends).
7. **Accessibility & Calm:** `prefers-reduced-motion` respected (already partially), assertive vs polite aria-live per type, focus traps in dropdown, keyboard nav for banner carousel (already has arrows; add Home/End).
8. **Digest option:** "Daily digest" preference bundles low-priority notifications into one summary instead of real-time pings.

---

## Implementation Order (tasks for execution agent)
1. **DB migrations:** `banners`, `banner_impressions`, `banner_dismissals`, `notifications_v2`, `notification_preferences`. Run via existing migration runner.
2. **Backend banners:** `bannerService.js` + `routes/banners.js` + `server.js` mount; validators, authz, consistent responses.
3. **Backend notifications:** extend `notificationService.js` (new fields + preferences gate), `routes/notifications.js` (filters, pagination, preferences endpoints, summary), `pushNotificationService` preference check.
4. **Frontend data layer:** `useActiveBanners()` hook; extend `notificationStore.js` for preferences + banner events; `usePushNotifications` preference wiring.
5. **Frontend banners:** rewrite `BannerSection.jsx` (per-type theming, image support, server source, impression events); update `AppLayout.jsx` and remove `Dashboard.jsx` duplication.
6. **Frontend notifications:** enhance `NotificationDropdown.jsx` (filters, grouping, image/action), `NotificationBadge.jsx` (category color + DND), `notificationSound.js` gating, `Settings.jsx` preferences panel.
7. **Cleanup/Deprecations:** remove `DEFAULT_BANNERS`, dead `isLightBg`, localStorage-only dismissal, contradictory sanitizer logic.
8. **Tests:** backend route/validator tests; frontend hook tests for `useActiveBanners` and preferences; a11y smoke check.

## Validation
- `npm run build` (client) and server lint/start succeed; no console errors.
- Banner API: create active campaign → appears for targeted user only, respects schedule, records impression on view, dismiss persists across reloads, snooze hides then re-surfaces.
- Notification: category filter + pagination work; preferences suppress marketing sound/push; quiet hours mute locally; dropdown groups by date; badge count matches summary.
- Non-targeted users never see a campaign; expired/scheduled banners hidden.
- Accessibility: keyboard-operable carousel & dropdown; reduced-motion respected; aria-live correct per type.

## Risks / Open Questions
- **Banner ↔ notification overlap policy:** confirm we fully drop notification-derived banners on Dashboard (recommended) vs. keep a single consolidated "updates" banner.
- **Email channel:** `notification_preferences.email_enabled` implies an email sender not yet present — defer email or stub it.
- **Scheduling worker:** `scheduled_at` future delivery needs a worker/cron; MVP can surface due items via the poller and skip future sends.
- **Migration safety:** `notifications_v2` adds nullable columns only; low risk, but run on a backup and verify on MySQL.
- **Performance:** `banner_impressions` grows fast — add retention/cleanup job or aggregate counters.
