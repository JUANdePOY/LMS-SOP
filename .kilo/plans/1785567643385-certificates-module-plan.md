# Plan: Certificate Management Module

## Goal

Build a fully-featured **Certificate Management** module for the LMS-SOP platform. The module enables:

- **Certificate issuance** upon course completion (integration with existing `course_enrollments` / `courses` `send_completion_certificates` flag)
- **Certificate viewing** — learners see their earned certificates; admins manage all
- **PDF download** — generate and serve branded PDF certificates
- **Certificate verification** — public or auth-gated verification by certificate number / QR code
- **Template management** — admins create/configure certificate templates (title, body, logo, signature fields, layout)
- **Revocation** — admin can revoke a certificate (sets `revoked` flag, audit-logged)

The frontend sidebar already includes a **Certificates** nav item (`/certificates`). The `courses` table already has `send_completion_certificates`. This module completes the end-to-end feature.

---

## Current State

| Component | Status |
|-----------|--------|
| `courses.send_completion_certificates` column | Exists in DB & model |
| `Certificates` sidebar/menu entry | Present, points to `/certificates` (no route/page yet) |
| Certificate DB tables | **None exist** — must be created |
| Certificate API endpoints | **None exist** — must be created |
| Certificate frontend pages | **None exist** — must be created |
| COURSE_MANAGEMENT_FUNCTIONAL_SPEC.md ST-12 | "Download completion certificate upon course completion" — not yet implemented |

---

## Architecture Impact

### Backend (Node.js + Express, Feature-Based)

The new module follows the existing backend conventions:
- **Models** in `server/models/` — thin data-access layer over MySQL
- **Services** in `server/services/` — business logic, error helpers, audit logging
- **Controllers** in `server/controllers/` — HTTP-only glue (request → service → response)
- **Routes** in `server/routes/` — wire controller to `/api/certificates/*`
- **Validators** in `server/validators/` — input schema validation
- **Migrations** in `server/migrations/certificateManagement.js` — registered from `config/database.js` `runMigrations()`

### Frontend (React + Vite, Feature-Based)

New feature directory `client/src/features/certificates/` following the same convention as `sop-management` and `course_management`:

```
client/src/features/certificates/
├── api/
│   └── certificate.api.js          # thin fetch wrappers
├── components/
│   ├── cards/
│   │   └── CertificateCard.jsx     # list-item card
│   ├── CertificateList.jsx         # list view container
│   ├── CertificateTemplate.jsx     # HTML/PDF preview of a certificate
│   ├── CertificateVerification.jsx # verify-by-number form + result
│   └── GenerateCertificateModal.jsx
├── constants/
│   ├── certificateStatus.js        # enum-like: issued, revoked, expired
│   └── certificateTypes.js         # enum-like: course_completion, sop_ack, manual
├── hooks/
│   ├── useCertificates.js          # list + filters
│   ├── useCertificateDetails.js    # single cert fetch
│   └── useGenerateCertificate.js   # mutation hook
├── pages/
│   ├── CertificateListPage.jsx     # /certificates
│   ├── CertificateDetailsPage.jsx  # /certificates/:id
│   └── CertificateVerificationPage.jsx  # /certificates/verify
├── routes/
│   └── certificate.routes.js       # route config + lazy wrappers
├── services/
│   └── certificate.service.js      # business-logic helpers (template rendering, number generation)
├── utils/
│   ├── generateCertificateNumber.js
│   └── formatCertificateDate.js
└── validators/
    └── certificate.validator.js
```

### Routing Integration

- Backend: `app.use('/api/certificates', certificatesRoutes)` added to `server/server.js`
- Frontend: lazy-loaded routes in `App.jsx` under the existing layout, protected by `LMSProtectedWrapper`
- Sidebar: already has the `Certificates` entry — no change needed
- `menuItems.js`: already has the `Certificates` entry — no change needed

---

## Database Changes

> **Rule**: Never modify existing tables without migration. Analyze existing schema first.

### Existing schema reviewed

- `users(id, full_name, email, role, department_id, ...)` — certificate owner
- `courses(id, title, instructor_id, send_completion_certificates, ...)` — certificate source
- `course_enrollments(id, course_id, user_id, status, completed_at, final_grade, ...)` — completion trigger
- `departments(id, ...)` — scoping

No `certificates` or `certificate_templates` tables exist in any SQL file. The migration approach in this project uses `server/migrations/courseManagement.js` (run via `config/database.js` `runMigrations()`) — the same pattern will be followed.

### New Tables

#### 1. `certificate_templates`

Stores reusable certificate templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AI PK | Primary key |
| `name` | VARCHAR(255) | NO | | Template name (e.g. "Course Completion") |
| `type` | ENUM('course_completion','sop_acknowledgement','manual') | NO | 'course_completion' | Template type |
| `title_template` | VARCHAR(500) | NO | | Title with `{user_name}`, `{course_name}`, `{completion_date}` placeholders |
| `body_template` | TEXT | YES | NULL | Body text / description with placeholders |
| `logo_url` | VARCHAR(500) | YES | NULL | Logo image URL |
| `signature_line_1_name` | VARCHAR(255) | YES | NULL | e.g. "Department Head" |
| `signature_line_1_title` | VARCHAR(255) | YES | NULL | e.g. "Dr. Jane Smith" |
| `signature_line_2_name` | VARCHAR(255) | YES | NULL | e.g. "CEO" |
| `signature_line_2_title` | VARCHAR(255) | YES | NULL | |
| `color_scheme` | VARCHAR(100) | YES | NULL | Primary color hex |
| `is_active` | BOOLEAN | NO | TRUE | Active status |
| `is_default` | BOOLEAN | NO | FALSE | Default template for type |
| `created_by` | INT | YES | NULL | FK → users(id) |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME | NO | ON UPDATE | |

**Indexes**: `idx_cert_templates_type (type)`, `idx_cert_templates_active (is_active)`, `idx_cert_templates_default (is_default)`

**FK**: `created_by → users(id) ON DELETE SET NULL`

#### 2. `certificates`

Stores issued certificates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AI PK | Primary key |
| `certificate_number` | VARCHAR(100) | NO | | Unique certificate number (e.g. `CERT-2026-000123`) |
| `template_id` | INT | YES | NULL | FK → certificate_templates(id) |
| `user_id` | INT | NO | | FK → users(id) |
| `course_id` | INT | YES | NULL | FK → courses(id) |
| `enrollment_id` | INT | YES | NULL | FK → course_enrollments(id) |
| `type` | ENUM('course_completion','sop_acknowledgement','manual') | NO | 'course_completion' | Certificate type |
| `title` | VARCHAR(500) | YES | NULL | Rendered title (snapshot) |
| `description` | TEXT | YES | NULL | Rendered description (snapshot) |
| `issue_date` | DATE | NO | | Date certificate was issued |
| `expiry_date` | DATE | YES | NULL | Expiration date (if applicable) |
| `final_grade` | DECIMAL(5,2) | YES | NULL | Grade at time of issuance |
| `score_percentage` | DECIMAL(5,2) | YES | NULL | Completion percentage |
| `status` | ENUM('issued','revoked','expired') | NO | 'issued' | |
| `revoked_at` | DATETIME | YES | NULL | When revoked |
| `revoked_by` | INT | YES | NULL | FK → users(id) |
| `revocation_reason` | TEXT | YES | NULL | Reason for revocation |
| `verification_code` | VARCHAR(255) | NO | | Unique verification hash/code |
| `pdf_url` | VARCHAR(500) | YES | NULL | Path to generated PDF |
| `metadata` | JSON | YES | NULL | Extra data (signatures, QR hash, etc.) |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME | NO | ON UPDATE | |

**Indexes**:
- `idx_certificates_user (user_id)` — fast "my certificates" lookup
- `idx_certificates_course (course_id)` — all certificates for a course
- `idx_certificates_number (certificate_number)` — unique lookup
- `idx_certificates_verification (verification_code)` — verification lookup
- `idx_certificates_status (status)` — filtering
- `idx_certificates_template (template_id)`

**FKs**:
- `template_id → certificate_templates(id) ON DELETE SET NULL`
- `user_id → users(id) ON DELETE CASCADE`
- `course_id → courses(id) ON DELETE SET NULL`
- `enrollment_id → course_enrollments(id) ON DELETE SET NULL`
- `revoked_by → users(id) ON DELETE SET NULL`

### Idempotency

Certificate issuance must be idempotent per `(user_id, course_id, enrollment_id)` — if a certificate already exists for this enrollment, do not re-issue.

### Migration Strategy

Follow the existing pattern in `server/migrations/courseManagement.js`:
- Create `server/migrations/certificateManagement.js` with `CREATE TABLE IF NOT EXISTS` statements
- Call `runCertificateMigrations()` from `config/database.js` `runMigrations()` alongside `runCourseMigrations()`
- Use `CREATE TABLE IF NOT EXISTS` so existing DBs are not affected
- Use `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` for safe idempotent alters

---

## Backend Implementation

### Model: `server/models/certificateModel.js`

Functions:
- `listCertificates(filters)` — paginated list with joins to users, courses, templates; supports filtering by `user_id`, `course_id`, `type`, `status`, `search`
- `findById(id)` — single certificate with full join
- `findByNumber(certificateNumber)` — for verification
- `findByVerificationCode(code)` — for verification
- `findByEnrollment(enrollmentId)` — check if certificate exists for enrollment (idempotency)
- `create(data)` — insert with parameterized query
- `update(id, updates)` — update status, revocation info, pdf_url
- `revoke(id, revokedBy, reason)` — set `revoked` status + audit
- `countByFilters(filters)` — total count for pagination

All queries use parameterized `?` placeholders (existing `db = require('../config/database')` pattern).

### Service: `server/services/certificateService.js`

Business logic:
- `generateCertificateNumber()` — `CERT-{year}-{sequential 6-digit}`
- `generateVerificationCode()` — crypto random hash
- `renderCertificateData(template, userData, courseData, enrollmentData)` — resolve template placeholders
- `issueCertificate({ userId, courseId, enrollmentId, templateName })` — orchestrates: check idempotency, find template, find enrollment, render data, generate verification code, insert, log audit
- `generatePDF(certificateId)` — generate PDF from rendered HTML + template styling (using a library like `pdfkit` or `puppeteer` or serve HTML preview first)
- `getCertificates(filters)` — delegate to model, return pagination metadata
- `getCertificateById(id)` — delegate to model
- `verifyCertificate(numberOrCode, options)` — find by number or verification code, check revocation status
- `revokeCertificate(id, actorId, reason)` — update + audit
- `getCertificatesByUser(userId)` — "my certificates"

### Controller: `server/controllers/certificateController.js`

HTTP-only handlers:
- `GET /api/certificates` — list (auth: admin/dept_head see all; employee sees own via query param override)
- `GET /api/certificates/:id` — get single certificate
- `GET /api/certificates/:id/download` — download PDF
- `GET /api/certificates/verify/:code` — verify (public or auth-gated)
- `POST /api/certificates` — issue (admin/dept_head only; or auto-trigger on enrollment completion)
- `POST /api/certificates/issue-from-enrollment/:enrollmentId` — convenience endpoint to issue from enrollment
- `POST /api/certificates/:id/regenerate-pdf` — regenerate PDF
- `PATCH /api/certificates/:id/revoke` — revoke (admin only)
- `GET /api/certificates/user/:userId` — get certificates for a user (auth: self or admin)
- `GET /api/certificates/templates` — list templates (admin only)
- `POST /api/certificates/templates` — create template (admin only)
- `PUT /api/certificates/templates/:id` — update template (admin only)
- `DELETE /api/certificates/templates/:id` — soft-delete template (admin only)

Each handler:
1. Extracts `req.user.id` from auth middleware
2. Validates input (delegates to validator)
3. Calls service
4. Returns `{ success, message, data, pagination? }`
5. Logs audit via `logAudit()`

### Routes: `server/routes/certificates.js`

```js
router.use(authenticateToken);

router.get('/', certificateController.list);
router.get('/verify/:code', certificateController.verify);     // public-ish for links
router.get('/user/:userId', certificateController.listByUser);
router.get('/:id', certificateController.getById);
router.get('/:id/download', certificateController.download);
router.post('/', certificateController.create);
router.post('/issue-from-enrollment/:enrollmentId', certificateController.issueFromEnrollment);
router.post('/:id/regenerate-pdf', certificateController.regeneratePdf);
router.patch('/:id/revoke', certificateController.revoke);

// Template management
router.get('/templates', certificateController.listTemplates);
router.post('/templates', certificateController.createTemplate);
router.put('/templates/:id', certificateController.updateTemplate);
router.delete('/templates/:id', certificateController.deleteTemplate);
```

### Validator: `server/validators/certificateValidator.js`

- `issueCertificateSchema` — validate `userId`, `courseId`, `enrollmentId`
- `revokeCertificateSchema` — validate `reason` (required string)
- `templateSchema` — validate `name`, `type`, `titleTemplate`, etc.

### Server Registration

File: `server/server.js`
```js
const certificatesRoutes = require('./routes/certificates');
// ...
app.use('/api/certificates', certificatesRoutes);
```

### Database Registration

File: `server/config/database.js` `runMigrations()`:
```js
const { runCertificateMigrations } = require('../migrations/certificateManagement');
await runCertificateMigrations();
console.log('Certificate management migrations applied');
```

### Auto-Issuance Integration (Optional Phase 2)

In `server/controllers/enrollmentsController.js` or `server/services/enrollmentService.js`:
- When enrollment status changes to `completed` AND the course has `send_completion_certificates = true`, auto-call `certificateService.issueCertificate()`.
- This is a low-risk extension — can be a separate step after the core module.

---

## Frontend Implementation

### API Layer: `client/src/features/certificates/api/certificate.api.js`

Follows the `course.api.js` pattern:
- `getCertificateList(params)` — `GET /api/certificates?...`
- `getCertificateById(id)` — `GET /api/certificates/:id`
- `downloadCertificate(id)` — `GET /api/certificates/:id/download` (returns blob)
- `verifyCertificate(code)` — `GET /api/certificates/verify/:code`
- `issueCertificate(payload)` — `POST /api/certificates`
- `issueFromEnrollment(enrollmentId)` — `POST /api/certificates/issue-from-enrollment/:enrollmentId`
- `revokeCertificate(id, payload)` — `PATCH /api/certificates/:id/revoke`
- `regeneratePdf(id)` — `POST /api/certificates/:id/regenerate-pdf`
- Template CRUD: `getTemplates()`, `createTemplate()`, `updateTemplate()`, `deleteTemplate()`

Auth: reads `token` from `localStorage`, sets `Authorization: Bearer` header. All `fetch` calls include `authHeaders()`.

### Service Layer: `client/src/features/certificates/services/certificate.service.js`

- `renderCertificateTitle(template, data)` — resolve placeholders
- `renderCertificateDescription(template, data)` — resolve placeholders
- `formatCertificateDate(dateString)` — locale date formatting
- `downloadCertificateAsPdf(certificateId)` — triggers browser download of blob

### Hooks

- `useCertificates(params)` — fetches paginated list; cancellation token via `cancelRef`
- `useCertificateDetails(id)` — fetches single certificate
- `useGenerateCertificate()` — returns `{ mutate, loading, error }` for issuing certificates

### Constants

- `certificateStatus.js`: `{ ISSUED: 'issued', REVOKED: 'revoked', EXPIRED: 'expired' }`
- `certificateTypes.js`: `{ COURSE_COMPLETION: 'course_completion', SOP_ACKNOWLEDGEMENT: 'sop_acknowledgement', MANUAL: 'manual' }`

### Pages

1. **`CertificateListPage.jsx`** (`/certificates`)
   - Tabs: "All Certificates", "My Certificates", "Templates", "Verify Certificate"
   - Filter bar: search, type, status, date range
   - Data table or card grid with CertificateCard
   - Pagination controls

2. **`CertificateDetailsPage.jsx`** (`/certificates/:id`)
   - Certificate preview (Template component rendered with data)
   - Download PDF button
   - Metadata panel: certificate number, issue date, expiry, grade, status
   - Revoke button (admin only)
   - Verification QR code

3. **`CertificateVerificationPage.jsx`** (`/certificates/verify/:code` or `/certificates/verify`)
   - Form to enter certificate number or verification code
   - Result display: valid/invalid, name, course, issue date, status badge

### Components

- **`CertificateCard.jsx`** — card showing cert image preview, recipient name, course, date, status badge, download button
- **`CertificateTemplate.jsx`** — renders the certificate HTML with styled border, logo, signature lines, placeholders filled with data
- **`CertificateVerification.jsx`** — form + result display
- **`GenerateCertificateModal.jsx`** — form to issue a certificate for an enrollment (manual issuance by admin)

### Routing Integration

File: `client/src/App.jsx`

Add lazy imports:
```js
const CertificateListPage = lazy(() => import("@/features/certificates/pages/CertificateListPage"));
const CertificateDetailsPage = lazy(() => import("@/features/certificates/pages/CertificateDetailsPage"));
const CertificateVerificationPage = lazy(() => import("@/features/certificates/pages/CertificateVerificationPage"));
```

Add routes under the existing `children` array:
```js
{ path: "certificates", element: LMSProtectedWrapper(CertificateListPage), handle: { title: "Certificates" } },
{ path: "certificates/:id", element: LMSProtectedWrapper(CertificateDetailsPage), handle: { title: "Certificate Details" } },
{ path: "certificates/verify/:code?", element: LMSProtectedWrapper(CertificateVerificationPage), handle: { title: "Verify Certificate" } },
```

### Context (Optional)

If certificate state needs to be shared across components (e.g. for optimistic updates or modal state), add a `CertificateContext.jsx` similar to `CourseContext.jsx`. Given the feature scope (list + detail + verify), a simple context may suffice to avoid prop drilling for certificate data on the details page.

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **Authentication** | All `/api/certificates` endpoints (except `verify`) require `authenticateToken` middleware |
| **Authorization** | Role-based: `admin` / `super_admin` can manage templates & issue/revocate; `department_head` can issue/revoke within scope; `employee` can only view their own certificates (via `user_id` check in service) |
| **Ownership check** | `getCertificateById` verifies `req.user.id === certificate.user_id` unless user is admin/dept_head |
| **Input validation** | All POST/PATCH routes validated via `certificateValidator.js`; no raw user input reaches SQL |
| **SQL injection** | All DB queries use parameterized `?` placeholders (consistent with existing models) |
| **PDF path disclosure** | `pdf_url` stored as server-relative path; download endpoint reads file server-side, never exposes filesystem path to client |
| **Certificate tampering** | `verification_code` is a cryptographically random hash; `metadata` JSON can store a digital signature hash for integrity |
| **Mass assignment** | `update()` in model uses whitelist of allowed fields (same pattern as `courseModel.update`) |
| **Audit trail** | All certificate actions (issue, revoke, regenerate, download) logged via `logAudit()` |

---

## Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| **List pagination** | Server-side pagination with `LIMIT/OFFSET`; results cached by user_id + status |
| **Indexing** | Composite indexes on `user_id + status`, `course_id + status`, `certificate_number`, `verification_code` |
| **PDF generation** | Generate on first request, store `pdf_url`; subsequent requests serve cached file. Regeneration is explicit admin action |
| **Verification lookups** | Index on `verification_code` (unique) and `certificate_number` (unique) for O(1) lookups |
| **Idempotency check** | `findByEnrollment(enrollmentId)` uses index on `enrollment_id` — fast dedup |
| **Template rendering** | Template strings resolved in-memory (no DB round-trip per certificate beyond the single template fetch) |

---

## Files Affected

### New Files (Backend)

| File | Purpose |
|------|---------|
| `server/migrations/certificateManagement.js` | Migration: create `certificate_templates` + `certificates` tables |
| `server/models/certificateModel.js` | DB model: CRUD + queries |
| `server/services/certificateService.js` | Business logic: issue, verify, revoke, render, PDF |
| `server/controllers/certificateController.js` | HTTP handlers |
| `server/routes/certificates.js` | Express route definitions |
| `server/validators/certificateValidator.js` | Input validation schemas |
| `server/models/certificateTemplateModel.js` | Template model (optional split) — kept in certificateModel.js for simplicity |

### Modified Files (Backend)

| File | Change |
|------|--------|
| `server/config/database.js` | Add `runCertificateMigrations()` call in `runMigrations()` |
| `server/server.js` | `app.use('/api/certificates', certificatesRoutes)` |

### New Files (Frontend)

| File | Purpose |
|------|---------|
| `client/src/features/certificates/api/certificate.api.js` | API wrappers |
| `client/src/features/certificates/services/certificate.service.js` | Service helpers (rendering, download) |
| `client/src/features/certificates/constants/certificateStatus.js` | Status enum |
| `client/src/features/certificates/constants/certificateTypes.js` | Type enum |
| `client/src/features/certificates/hooks/useCertificates.js` | List hook |
| `client/src/features/certificates/hooks/useCertificateDetails.js` | Detail hook |
| `client/src/features/certificates/hooks/useGenerateCertificate.js` | Mutation hook |
| `client/src/features/certificates/components/CertificateCard.jsx` | Card component |
| `client/src/features/certificates/components/CertificateList.jsx` | List view |
| `client/src/features/certificates/components/CertificateTemplate.jsx` | Certificate rendering |
| `client/src/features/certificates/components/CertificateVerification.jsx` | Verify form + result |
| `client/src/features/certificates/components/GenerateCertificateModal.jsx` | Issue modal |
| `client/src/features/certificates/pages/CertificateListPage.jsx` | Route page: /certificates |
| `client/src/features/certificates/pages/CertificateDetailsPage.jsx` | Route page: /certificates/:id |
| `client/src/features/certificates/pages/CertificateVerificationPage.jsx` | Route page: /certificates/verify |
| `client/src/features/certificates/routes/certificate.routes.js` | Route config (optional) |
| `client/src/features/certificates/utils/generateCertificateNumber.js` | Number generation (frontend mirror) |
| `client/src/features/certificates/utils/formatCertificateDate.js` | Date formatting |

### Modified Files (Frontend)

| File | Change |
|------|--------|
| `client/src/App.jsx` | Add 3 lazy imports + 3 route entries |

### Already in Place (No Change Needed)

| File | Status |
|------|--------|
| `client/src/config/menuItems.js` | Already has "Certificates" entry at `/certificates` |
| `client/src/shared/components/navigation/sidebar/Sidebar.jsx` | Already has "Certificates" in menu |

---

## Implementation Phases

### Phase 1 (Foundation)
- Database migration + model
- API layer (api/certificates) — list, get, verify
- Service + controller (issue, verify, revoke)
- Routes registration
- Frontend: list page + card + verification page
- App.jsx routing

### Phase 2 (Issuance & Export)
- PDF generation endpoint
- Download PDF
- Certificate preview component
- Details page with full metadata
- Regenerate PDF

### Phase 3 (Template Management)
- Template CRUD API + pages
- Template management tab in list page
- Template form modal

### Phase 4 (Auto-Issuance Integration)
- Hook into enrollment completion in existing enrollment controller/service
- Respect `courses.send_completion_certificates` flag

---

## Migration Path for Existing Data

- No existing certificate data exists → no data migration needed
- `ALTER TABLE courses ... send_completion_certificates` already exists
- No destructive changes to any existing table
- All new tables use `CREATE TABLE IF NOT EXISTS`

---

## Testing & Verification

1. **Migration**: Run server, verify `certificate_templates` and `certificates` tables created
2. **API**: `GET /api/certificates` returns `{}` (empty) with proper pagination metadata
3. **Manual issuance**: `POST /api/certificates` with `{ userId, courseId, enrollmentId }` creates certificate, audit log written
4. **Verification**: `GET /api/certificates/verify/:code` returns valid/invalid
5. **Revocation**: `PATCH /api/certificates/:id/revoke` sets status, audit logged
6. **Frontend**: Navigate to `/certificates`, list loads, click card → details, download PDF
7. **RBAC**: Employee user can only see their own certificates; admin sees all
