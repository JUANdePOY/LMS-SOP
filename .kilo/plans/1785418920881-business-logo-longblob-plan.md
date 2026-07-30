# Business Logo LONGBLOB — Implementation Plan

## Overview

Make the Business Logo a self-contained feature that stores the binary image data directly in the database using the existing `LONG` `BLOB` column (`logo_data`) instead of saving files to disk. Enforce a **5 MB** per-logo size limit. Remove the disk-based file upload flow entirely.

---

## Architecture Impact

- **Backend**: Replace multer disk-storage upload with memory/stream-based upload that writes binary data into the `logo_data` LONGBLOB column. Add a new GET endpoint to serve logo binary data with the correct MIME type.
- **Frontend**: Update the `BusinessForm` logo upload to send the file as binary data (base64 or FormData with blob). Update the `BusinessTable` logo rendering to fetch the logo from the API endpoint instead of using a file-path URL. Add a new `business logo` API module function.
- **Database**: The `businesses` table already has `logo_data longblob`, `logo_name varchar(255)`, `logo_mime_type varchar(100)`, `logo_size bigint(20)` — no schema migrations needed.
- **Security**: Validate MIME type server-side (not just client-side). Enforce 5 MB limit at the route level. Sanitize filename metadata stored in `logo_name`.
- **Performance**: LONGBLOB retrieval is streamed per-row; the GET endpoint should set appropriate `Cache-Control` headers. The 5 MB cap keeps each row manageable.

---

## Files Affected

### Backend
| File | Action |
|------|--------|
| `server/middleware/businessUpload.js` | Rewrite: replace disk storage with memory storage (`multer.memoryStorage()`). Keep MIME type allowlist and 5 MB limit. |
| `server/routes/businesses.js` | Replace `/upload-logo` route to store binary in DB. Add `GET /api/businesses/:id/logo` to serve binary data. Remove `removeOldLogo` file deletion logic. Update `POST /businesses` and `PUT /businesses/:id` to accept `logo_data` metadata. |
| `server/models/businessModel.js` | Add `saveLogo(id, logoData, metadata)` method. Add `getLogo(id)` method returning `{ logo_data, logo_mime_type, logo_name }`. Update `create()` to handle `logo_data`. Update `update()` to handle `logo_data`. Remove `removeOldLogo()`. |
| `server/services/businessService.js` (new) | Create to encapsulate logo validation (MIME type, 5 MB size) and storage logic. |

### Frontend
| File | Action |
|------|--------|
| `client/src/features/organization-management/api/business.api.js` | Remove `uploadBusinessLogo`. Add `uploadBusinessLogo(formData)` (sends to new endpoint), `getBusinessLogo(id)` (GET binary), `deleteBusinessLogo(id)`. |
| `client/src/features/organization-management/components/business/BusinessForm.jsx` | Update logo upload handler to use new API (send binary, don't expect a URL back). Update logo preview to support base64/blob rendering of DB-stored logos. |
| `client/src/features/organization-management/components/business/BusinessTable.jsx` | Update logo cell to fetch logo via `getBusinessLogo(id)` and render from blob URL instead of `logo_url`. |
| `client/src/features/organization-management/hooks/useBusinesses.js` | No changes required (business list already includes `logo_data` metadata fields from DB). |

### Database
| File | Action |
|------|--------|
| No migration needed | Schema already has `logo_data longblob`, `logo_name varchar(255)`, `logo_mime_type varchar(100)`, `logo_size bigint(20)`. |

---

## Implementation Details

### 1. Backend Upload Middleware (`businessUpload.js`)

Replace `multer.diskStorage` with `multer.memoryStorage()`. This keeps the file buffer in memory (within the 5 MB limit) so it can be passed directly to the database layer without writing to disk.

```js
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => { ... }, // same allowlist
  limits: { fileSize: 5 * 1024 * 1024 },  // same 5 MB cap
});
```

### 2. Backend Logo Upload Route

Replace `POST /businesses/upload-logo` with a route that:
- Accepts `multipart/form-data` with `logo` field
- Validates MIME type from multer (already validated)
- Validates size from multer (already capped at 5 MB)
- Stores `logo_data` (Buffer), `logo_name` (original filename), `logo_mime_type` (mime), `logo_size` (file.size) into the `businesses` table for the specified `business_id`
- Returns `{ status: 'success', data: { logo_name, logo_mime_type, logo_size } }`

### 3. Backend Logo GET Route (`GET /api/businesses/:id/logo`)

- Fetch `logo_data`, `logo_mime_type` from the database by `business_id`
- If no logo exists, return 404
- Set `Content-Type` header to the stored MIME type
- Set `Cache-Control: public, max-age=3600`
- Send the binary buffer as the response body

### 4. Backend Model Updates (`businessModel.js`)

Add methods:
- `saveLogo(id, { buffer, name, mime, size })` — INSERT or REPLACE into `logo_data`, `logo_name`, `logo_mime_type`, `logo_size` WHERE `id = ?`
- `getLogo(id)` — SELECT `logo_data`, `logo_mime_type`, `logo_name`, `logo_size` WHERE `id = ?`
- Update `create()` and `update()` to handle `logo_data`/`logo_name`/`logo_mime_type`/`logo_size` fields when present in the data object
- Remove `removeOldLogo()` (no more disk files to clean up)

### 5. Frontend API Client (`business.api.js`)

Add/modify functions:
- `uploadBusinessLogo(businessId, formData)` — `POST /businesses/:businessId/logo`
- `getBusinessLogo(businessId)` — `GET /businesses/:businessId/logo` (returns Blob)
- Keep existing CRUD functions unchanged

### 6. Frontend `BusinessForm.jsx`

Update logo handling:
- On file select/drop, validate client-side (image type, 5 MB) — already implemented
- Upload via `uploadBusinessLogo(businessId, formData)` — needs `businessId` (from `initialData.id` for edits, or generated/assigned after business creation)
- For edit mode: store the `businessId` from `initialData.id`
- Logo preview: if `logo_data` exists in `initialData`, create a `URL.createObjectURL(new Blob([logo_data], { type: logo_mime_type }))` for display
- On form submit, no longer include `logo_url` in the form data; instead include logo metadata fields

### 7. Frontend `BusinessTable.jsx`

Update logo cell rendering:
- Instead of `<img src={business.logo_url}>`, use a component that fetches the logo via API and displays it as a blob URL
- For list views, lazy-load logos (use a small thumbnail or initials fallback if the logo hasn't loaded yet)

---

## Security Considerations

- **MIME type validation**: Enforce server-side allowlist (`image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`) in the upload middleware and business service layer.
- **Size limit**: 5 MB enforced by multer `limits.fileSize` and also validated in the business service layer.
- **SQL injection**: Use parameterized queries exclusively (already standard in the model).
- **XSS via SVG**: SVG files can contain scripts. Consider either:
  - Excluding SVG from the allowlist, or
  - Sanitizing SVG content before storage (recommendation: exclude SVG for simplicity, or strip `<script>` tags)
- **No file execution**: Since logos are stored in the DB as BLOBs, there is no risk of executable upload via the file system.

---

## Performance Considerations

- **5 MB cap**: Keeps each LONGBLOB row manageable; MySQL handles BLOBs efficiently with inline storage for smaller values and overflow pages for larger ones.
- **GET /logo caching**: Add `Cache-Control: public, max-age=3600` headers so browsers cache logo responses.
- **Lazy loading**: Business table should lazy-load logos; they should not block initial page render.
- **Connection pooling**: Ensure the DB connection pool can handle binary data retrieval without exhausting connections.

---

## Acceptance Criteria

1. Logo upload stores binary data in `logo_data` LONGBLOB column, not on disk.
2. Files larger than 5 MB are rejected with a clear error message.
3. Non-image MIME types are rejected server-side.
4. `GET /api/businesses/:id/logo` returns the binary image with correct `Content-Type`.
5. Business list table renders logos from the LONGBLOB endpoint.
6. Edit mode pre-fills logo preview from stored LONGBLOB data.
7. Logo can be removed/cleared (sets `logo_data` to NULL).
8. No disk files are created or referenced for business logos.
9. All existing business CRUD operations continue to work.
