# Add Bunny Stream Video Support to the Video Lesson Type

## Context
The course-builder "video" lesson type currently supports YouTube, Vimeo, and direct
video files via `parseVideoUrl` (`client/src/features/course_management/utils/videoUrl.js`)
and renders previews in `VideoPreview`
(`client/src/features/course_management/components/course-builder/VideoPreview.jsx`).

The user wants **Bunny Stream** videos to also work in the same video lesson type.
Decision (confirmed with user):
- **Scope:** Embed/play Bunny Stream URLs only. No API keys, no upload, no backend
  changes. Pure client-side.
- **Detection:** Auto-detect from the pasted URL (no new lesson type / provider selector).

No Bunny Stream code/config exists anywhere in the repo today, and `.env.example` has
no Bunny keys — consistent with the client-only scope.

## Affected files
1. `client/src/features/course_management/utils/videoUrl.js` — add `bunny` provider.
2. `client/src/features/course_management/components/course-builder/VideoPreview.jsx` — render Bunny iframe + badge.
3. (No change needed) `LessonEditor.jsx` already routes through `parseVideoUrl`/`PROVIDER_LABEL`; it will pick up `bunny` automatically. Confirm the `Source:` label and the `!parseVideoUrl(url)` validation behave correctly after the change.

## Implementation steps

### 1. `videoUrl.js` — detect Bunny Stream URLs
Add a Bunny branch in `parseVideoUrl` (after Vimeo, before the final `return null`):
- Recognize hosts: `iframe.mediadelivery.net`, `video.bunnycdn.com`, `bunnycdn.com`
  (strip `www.` as already done).
- Extract `libraryId` + `videoId` from the path.
  - Preferred embed form: `/embed/<libraryId>/<videoId>` (also `/embed/<videoId>` when
    library is in a query/host — handle gracefully).
  - Player form: `/<libraryId>/<videoId>` or `/<videoId>`.
- Return:
  ```js
  {
    provider: "bunny",
    url,                                   // original pasted URL
    videoId,                               // string or null
    libraryId,                             // string or null
    embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`,
    isValid: true,
  }
  ```
- Add `bunny: "Bunny Stream"` to `PROVIDER_LABEL`.

Edge cases:
- If `videoId` can't be parsed → return `null` (keeps "Unsupported video URL" state).
- Tolerate missing `libraryId` (some share links) by still building the best-effort
  embed URL; if both ids are missing return `null`.
- Do NOT treat `bunnycdn.com` generic asset/CDN file links as videos — only the
  `/embed/...` or `/<id>/<id>` video player paths.

### 2. `VideoPreview.jsx` — render the Bunny iframe
- Add a `bunny` badge color (reuse an existing palette, e.g. the `file`/`vimeo` style)
  in the `badgeColor` map.
- Add an explicit `if (parsed.provider === "bunny")` branch (mirror the existing YouTube/
  Vimeo `iframe` path):
  - Render a lazy-play button like the YouTube/Vimeo branch, then swap to
    `<iframe src={parsed.embedUrl} ... allowFullScreen />` on click.
  - Keep the "Open original" link pointing at `parsed.url`.
  - The Bunny iframe `src` is the `iframe.mediadelivery.net` embed; it already supports
    `?autoplay=1` if desired (optional).
- The existing `file` (native `<video>`) and `youtube`/`vimeo` (lazy iframe) branches
  must remain unchanged.

### 3. Verify `LessonEditor.jsx` integration (no edit expected)
- `parseVideoUrl(url)` validation (line ~781) will now accept Bunny URLs → error state
  cleared.
- `PROVIDER_LABEL[parsed.provider]` (line ~786) will show "Bunny Stream".
- No code change required unless a type-specific guard exists (none found).

## Validation
- `npm run build` in `client/` must succeed with zero errors.
- Manual / scenario checks (describe in PR, do not require backend):
  1. Paste `https://iframe.mediadelivery.net/embed/<libId>/<videoId>` → detected as
     Bunny Stream, preview shows iframe after play click.
  2. Paste `https://video.bunnycdn.com/<libId>/<videoId>` → same.
  3. Paste `https://youtube.com/...` and `https://vimeo.com/...` → still work.
  4. Paste a random non-video URL → still "Unsupported video URL".
  5. Save the lesson with a Bunny URL; reopen → URL persists and preview renders.
- Confirm no other `parseVideoUrl` consumer breaks (grep returned only `VideoPreview`
  and `LessonEditor`).

## Risks / notes
- Client-only; no server, migration, env, or auth changes.
- Bunny embed URLs are public if the video is public; this matches existing YouTube/
  Vimeo behavior (no auth on embeds).
- If future work needs managed upload/transcode, that is a separate, larger backend
  project (out of scope here).

## Open questions (none blocking)
- None.
