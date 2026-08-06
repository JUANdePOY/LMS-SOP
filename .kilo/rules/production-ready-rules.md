# Production Readiness Rules

**Stack:** React (Vite) · JavaScript · Node.js · PostgreSQL

These rules apply whenever code is generated, modified, or reviewed. Treat them as hard requirements, not suggestions. If a change violates a rule, flag it before finishing the task instead of silently shipping it.

---

## 1. General Principles

- Never mark a task "done" if it introduces `TODO`, `FIXME`, `console.log`, commented-out code, or placeholder logic in files meant for production.
- Prefer explicit, readable code over clever one-liners. Optimize for the next developer reading it, not for brevity.
- Follow the existing patterns and folder structure of the project. Do not introduce a new pattern (state manager, folder layout, naming convention) without a clear reason.
- Every function should do one thing. If a function exceeds ~40-50 lines or has more than 2-3 levels of nesting, refactor it.
- No magic numbers or strings — use named constants or config/env values.
- Remove dead code and unused imports/variables before considering a change complete.

---

## 2. React / Vite (Frontend)

- **No default exports of anonymous components.** Every component has a name for debugging/dev tools.
- **Keys in lists** must be stable, unique IDs — never array index (unless the list is static and never reordered/filtered).
- **No inline object/array/function literals** passed as props to memoized components (breaks memoization).
- **useEffect** dependency arrays must be complete and correct. No suppressing `eslint-disable-line react-hooks/exhaustive-deps` without a written reason.
- **Cleanup** all subscriptions, timers, and event listeners in `useEffect` return functions.
- **Error boundaries** must wrap top-level routes/pages so one component crash doesn't blank the whole app.
- **Loading, empty, and error states** are required for every data-fetching component — never assume the happy path.
- **No secrets or API keys** in frontend code or `import.meta.env.VITE_*` unless the value is genuinely safe to expose publicly.
- **Environment variables** used in Vite must be prefixed `VITE_` and documented in `.env.example`.
- **Build check:** `npm run build` must succeed with zero errors and no new warnings before considering frontend work production-ready.
- **Bundle hygiene:** no unused heavy dependencies; check that new libraries don't significantly bloat the bundle without justification.
- **Accessibility baseline:** interactive elements are real `<button>`/`<a>` tags (not `<div onClick>`), images have `alt`, forms have associated `<label>`s.
- **No direct DOM manipulation** (`document.querySelector`, etc.) inside React components — use refs and state instead.

---

## 3. JavaScript (Shared)

- **Strict equality** (`===`/`!==`) only, never `==`/`!=`.
- **No unhandled promises.** Every `async` call is either `await`ed inside a `try/catch` or has a `.catch()`.
- **No floating promises** — don't call an async function without awaiting or explicitly handling it.
- **Input validation** at every boundary (form submit, API request body, query params) — never trust incoming data.
- **Immutable updates** for state/objects — no direct mutation of props, state, or shared objects.
- **Consistent async style** — pick `async/await` as the standard; avoid mixing with raw `.then()` chains in the same module.
- **No `var`** — use `const` by default, `let` only when reassignment is required.

---

## 4. Node.js / Express (Backend)

- **Centralized error handling middleware** — no route should let an unhandled error crash the process or leak a raw stack trace to the client.
- **All routes wrapped** so async errors are caught (async handler wrapper or equivalent) — an uncaught rejection in a route must not crash the server.
- **Input validation on every endpoint** (e.g. Zod/Joi/express-validator) — validate body, params, and query before touching the database.
- **Consistent API response shape** across all endpoints (e.g. `{ success, data, error }`), including error responses.
- **Correct HTTP status codes** — no `200` on failure, no `500` for a validation error (that's `400`).
- **No secrets in source.** All credentials, connection strings, and API keys come from environment variables, never hardcoded, never committed.
- **`.env` is gitignored**; a `.env.example` with placeholder values exists and is kept up to date.
- **Authentication & authorization checked on every protected route** — never rely on the frontend to hide a button as the only access control.
- **Rate limiting** on public-facing and auth endpoints (login, signup, password reset, contact forms).
- **CORS configured explicitly** — no `origin: '*'` in production.
- **Security headers** in place (e.g. via `helmet`).
- **Structured logging** (not raw `console.log`) with distinguishable levels (info/warn/error), and no sensitive data (passwords, tokens, full card numbers) ever logged.
- **Graceful shutdown** — server closes DB connections and in-flight requests cleanly on `SIGTERM`/`SIGINT`.
- **No blocking/synchronous heavy operations** on the main event loop (e.g. large sync file reads, CPU-heavy loops) in request handlers.

---

## 5. PostgreSQL / Database

- **Parameterized queries only.** No string concatenation or template literals building SQL — always use placeholders/prepared statements or a query builder/ORM to prevent SQL injection.
- **Migrations, not manual schema edits.** Every schema change goes through a versioned migration file, never a manual `ALTER TABLE` run once and forgotten.
- **Explicit transactions** for any operation touching multiple tables or requiring atomicity (`BEGIN`/`COMMIT`/`ROLLBACK`), with rollback on error.
- **Indexes** exist on foreign keys and columns used in `WHERE`, `JOIN`, or `ORDER BY` on non-trivial tables.
- **Connection pooling** is used (e.g. `pg.Pool`), never a single ad-hoc connection per request, and pool size is sized appropriately.
- **No `SELECT *`** in production queries — select only the columns needed.
- **Constraints at the database level** (`NOT NULL`, `UNIQUE`, foreign keys, `CHECK`) — don't rely on application code alone to enforce data integrity.
- **Sensitive data** (passwords, tokens) stored hashed/encrypted, never in plaintext. Passwords use a proper hashing algorithm (bcrypt/argon2) with adequate cost factor.
- **Pagination** required on any endpoint returning a potentially large result set — never return an unbounded table dump.
- **Cascade behavior** on foreign keys (`ON DELETE CASCADE`/`SET NULL`/`RESTRICT`) is deliberate, not left at the default without thought.

---

## 6. Testing & Verification

- Before declaring a feature complete: run the app/build, exercise the changed code path, and confirm no console errors.
- New logic (especially backend business logic, validation, and data transforms) should have at least basic automated tests where a test setup exists in the project.
- Edge cases considered explicitly: empty input, null/undefined, network failure, duplicate submission, unauthorized access, concurrent requests.
- No feature is "production ready" if it only works with perfect/happy-path input.

---

## 7. Configuration & Deployment

- All environment-specific values (API URLs, DB credentials, feature flags) come from environment variables — nothing hardcoded per-environment in source.
- `NODE_ENV` is respected — dev-only tooling (verbose logging, debug routes, mock data) must not run when `NODE_ENV=production`.
- Dependencies are pinned/locked (`package-lock.json` committed and consistent with `package.json`).
- No dev dependencies required at runtime in production (check they're in `devDependencies`, not `dependencies`).
- Health-check endpoint exists for the backend (e.g. `GET /health`) for uptime monitoring.

---

## 8. Definition of "Production Ready"

A change is production ready only when **all** of the following are true:

1. It follows every applicable rule above.
2. It builds/runs with zero errors and no new warnings.
3. It handles errors, empty states, and invalid input gracefully — nothing crashes or hangs on bad input.
4. No secrets, debug code, or placeholder logic remain in the diff.
5. Database access is safe (parameterized), transactional where needed, and migration-based.
6. Security basics are in place: auth checks, input validation, no data leakage in errors/logs.

If any of these cannot be confirmed, say so explicitly instead of presenting the work as finished.
