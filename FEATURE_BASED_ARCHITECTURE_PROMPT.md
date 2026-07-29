# AI Prompt: Feature-Based Module Generator (LMS SOP Architecture)

You are an expert frontend engineer. Your task is to **generate a complete, production-ready feature module** that follows the exact **feature-based architecture** used in the `sop_management` and `organization-management` modules of this LMS SOP application.

---

## 1. ARCHITECTURE RULES

1. Every feature lives in `client/src/features/<feature-name>/` and is **fully self-contained**.
2. Features communicate externally only through:
   - Route configs (imported by parent router)
   - React Context providers (composed at app root)
   - The shared `@/lib/api` instance for HTTP calls
3. **No cross-feature imports** — only `@/shared/`, `@/contexts/AuthContext`, `@/lib/api`
4. Shared UI primitives come from `@/shared/components/ui/`
5. Shared auth state comes from `@/contexts/AuthContext`

---

## 2. DIRECTORY STRUCTURE (MANDATORY)

```
client/src/features/<feature-name>/
├── api/                    # API client functions (thin wrappers)
│   └── <entity>.api.js
├── components/             # UI components grouped by type
│   ├── cards/
│   ├── drawers/
│   ├── forms/
│   ├── modals/
│   ├── tables/
│   ├── tabs/
│   └── timeline/
├── constants/              # Enums, permissions, config
│   ├── <entity>Status.js
│   ├── permissions.js
│   └── pagination.js
├── context/                # React Context providers
│   ├── <Entity>Context.jsx
│   ├── <Entity>PermissionContext.jsx
│   └── <Entity>ModalContext.jsx
├── hooks/                  # Custom hooks (data + state)
│   ├── use<Entity>List.js
│   └── use<Entity>Details.js
├── pages/                  # Route-level page components
│   ├── <Entity>ListPage.jsx
│   └── <Entity>DetailsPage.jsx
├── routes/                 # Route config
│   └── <entity>.routes.js
├── services/               # Business logic (optional)
├── utils/                  # Pure utility functions
│   ├── validationHelper.js
│   ├── formatDate.js
│   └── <entity>Helper.js
└── validators/             # Input validation
    └── <entity>.validator.js
```

---

## 3. LAYER IMPLEMENTATION GUIDE

### 3.1 Constants (`constants/`)

Use `Object.freeze()` for immutable enum objects.

```js
// constants/<entity>Status.js
export const ENTITY_STATUS = Object.freeze({
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
});
export const ENTITY_STATUS_LIST = Object.values(ENTITY_STATUS);
```

```js
// constants/permissions.js
export const FEATURE_ROLE = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  DEPARTMENT_HEAD: 'department_head',
  EMPLOYEE: 'employee',
});
export const FEATURE_ACTION = Object.freeze({
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
});
export const PERMISSION_SCOPE = Object.freeze({
  ALL: 'all',
  OWN_DEPARTMENT: 'own_department',
  ASSIGNED_ONLY: 'assigned_only',
  SELF: 'self',
  NONE: 'none',
});
export const FEATURE_PERMISSION_MATRIX = Object.freeze({
  [FEATURE_ROLE.SUPER_ADMIN]: {
    [FEATURE_ACTION.VIEW]: PERMISSION_SCOPE.ALL,
    [FEATURE_ACTION.CREATE]: PERMISSION_SCOPE.ALL,
    [FEATURE_ACTION.EDIT]: PERMISSION_SCOPE.ALL,
    [FEATURE_ACTION.DELETE]: PERMISSION_SCOPE.ALL,
  },
  [FEATURE_ROLE.ADMIN]: { /* same as super_admin */ },
  [FEATURE_ROLE.DEPARTMENT_HEAD]: {
    [FEATURE_ACTION.VIEW]: PERMISSION_SCOPE.OWN_DEPARTMENT,
    [FEATURE_ACTION.CREATE]: PERMISSION_SCOPE.OWN_DEPARTMENT,
    [FEATURE_ACTION.EDIT]: PERMISSION_SCOPE.OWN_DEPARTMENT,
    [FEATURE_ACTION.DELETE]: PERMISSION_SCOPE.OWN_DEPARTMENT,
  },
  [FEATURE_ROLE.EMPLOYEE]: {
    [FEATURE_ACTION.VIEW]: PERMISSION_SCOPE.ASSIGNED_ONLY,
    [FEATURE_ACTION.CREATE]: PERMISSION_SCOPE.NONE,
    [FEATURE_ACTION.EDIT]: PERMISSION_SCOPE.NONE,
    [FEATURE_ACTION.DELETE]: PERMISSION_SCOPE.NONE,
  },
});
```

```js
// constants/pagination.js
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
```

### 3.2 API Layer (`api/`)

Each file exports thin functions wrapping the shared `api` instance from `@/lib/api`.

```js
// api/<entity>.api.js
import api from '@/lib/api';

export const getEntities = (params = {}) => api.get('/<entities>', { params });
export const getEntity = (id) => api.get(`/<entities>/${id}`);
export const createEntity = (data) => api.post('/<entities>', data);
export const updateEntity = (id, data) => api.put(`/<entities>/${id}`, data);
export const deleteEntity = (id) => api.delete(`/<entities>/${id}`);
```

Query params convention: `{ page, limit, sort, search, status, department_id }`

### 3.3 Validators (`validators/`)

Pure functions returning `{ isValid, errors }`.

```js
// validators/<entity>.validator.js
export const validateEntity = (values = {}) => {
  const errors = {};
  if (!values.name || String(values.name).trim().length < 2) {
    errors.name = 'Name is required (min 2 characters)';
  }
  if (!values.department_id) {
    errors.department_id = 'Department is required';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};
```

### 3.4 Context Layer (`context/`)

**Entity Context** — shared state (selected item, refresh trigger):

```jsx
// context/<Entity>Context.jsx
import { createContext, useContext, useMemo, useState } from 'react';

const EntityContext = createContext(null);

export function EntityProvider({ children }) {
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const value = useMemo(() => ({
    selectedId, setSelectedId,
    refreshKey,
    refreshItems: () => setRefreshKey((p) => p + 1),
  }), [selectedId, refreshKey]);
  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>;
}

export function useEntityContext() {
  const ctx = useContext(EntityContext);
  if (!ctx) throw new Error('useEntityContext must be used within EntityProvider');
  return ctx;
}
```

**Permission Context** — reads user role from `useAuth()`, exposes booleans:

```jsx
// context/<Entity>PermissionContext.jsx
import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const EntityPermissionContext = createContext(null);
const ALLOWED = ['super_admin', 'admin', 'department_head'];

export function EntityPermissionProvider({ children }) {
  const { user } = useAuth();
  const role = typeof user?.role === 'string' ? user.role : '';
  const permissions = useMemo(() => ({
    canView: ALLOWED.includes(role),
    canCreate: ALLOWED.includes(role),
    canEdit: ALLOWED.includes(role),
    canDelete: ALLOWED.includes(role),
  }), [role]);
  return (
    <EntityPermissionContext.Provider value={permissions}>
      {children}
    </EntityPermissionContext.Provider>
  );
}

export function useEntityPermission() {
  const ctx = useContext(EntityPermissionContext);
  if (!ctx) throw new Error('useEntityPermission must be used within EntityPermissionProvider');
  return ctx;
}
```

### 3.5 Hooks Layer (`hooks/`)

Hooks own ALL state management, data fetching, and side effects.

**List hook pattern:**

```js
// hooks/use<Entity>List.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEntities, createEntity, deleteEntity } from '../api/<entity>.api';

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useEntityList(initialParams = {}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const paramsRef = useRef(initialParams);
  paramsRef.current = initialParams;

  const refresh = useCallback(async (params = paramsRef.current) => {
    if (!isAuthenticated) return [];
    setLoading(true);
    setError(null);
    try {
      const response = await getEntities(params);
      const payload = response.data;
      const list = payload?.data?.items || payload?.data?.rows || payload?.data || [];
      const meta = payload?.data?.pagination || payload?.pagination || {};
      setItems(Array.isArray(list) ? list : []);
      setPagination({ page: meta.page || 1, limit: meta.limit || 20, total: meta.total || list.length });
      return list;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load items'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const create = useCallback(async (data) => {
    const response = await createEntity(data);
    const payload = response.data;
    const created = payload?.data || payload;
    if (payload?.status === 'success') setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteEntity(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { items, loading, error, pagination, refresh, create, remove };
}
```

**Detail hook pattern:**

```js
// hooks/use<Entity>Details.js
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEntity, updateEntity } from '../api/<entity>.api';

export function useEntityDetails(id) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!id || !isAuthenticated) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await getEntity(id);
      const payload = response.data;
      const data = payload?.data || payload;
      setItem(data);
      return data;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load details');
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated]);

  const update = useCallback(async (data) => {
    const response = await updateEntity(id, data);
    const payload = response.data;
    const updated = payload?.data || payload;
    setItem((prev) => (prev ? { ...prev, ...updated } : prev));
    return updated;
  }, [id]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { item, loading, error, refresh, update };
}
```

### 3.6 Components Layer (`components/`)

Components receive data via props — no hooks, no data fetching.

**Table component:**

```jsx
// components/tables/EntityTable.jsx
function StatusBadge({ status }) {
  const colors = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Archived: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function EntityTable({ items, onRowClick, loading }) {
  if (loading) return <div className="text-sm text-gray-500 py-4">Loading…</div>;
  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No items found.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick?.(item.id)}>
              <td className="px-4 py-3 font-medium text-gray-900">{item.name || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
              <td className="px-4 py-3 text-gray-500">
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Card component:**

```jsx
// components/cards/EntityCard.jsx
export default function EntityCard({ item, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(item.id)}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">
        {item.name || 'Untitled'}
      </h2>
      <p className="line-clamp-1 text-sm text-[var(--text-muted)]">
        {item.description || 'No description'}
      </p>
      <span className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
        {item.status || 'Draft'}
      </span>
    </button>
  );
}
```

### 3.7 Routes Layer (`routes/`)

Export a route config array using `lazy()` for code splitting — NOT JSX `<Route>` elements.

```js
// routes/<entity>.routes.js
import { lazy } from 'react';

const EntityListPage = lazy(() => import('../pages/EntityListPage'));
const EntityDetailsPage = lazy(() => import('../pages/EntityDetailsPage'));

const entityRouteConfig = [
  {
    path: '',
    Component: EntityListPage,
    handle: { title: 'Entity List' },
  },
  {
    path: ':id',
    Component: EntityDetailsPage,
    handle: { title: 'Entity Details' },
  },
];

export default entityRouteConfig;
```

Parent router integration:

```jsx
import entityRoutes from '@/features/<name>/routes/<entity>.routes';

{entityRoutes.map(({ path, Component, handle }) => (
  <Route key={`<entity>-${path}`} path={path} element={<Component />} handle={handle} />
))}
```

### 3.8 Pages Layer (`pages/`)

Page components wire hooks, context, and child components. Handle: layout, permission-gating, loading/error/empty states, search/filter/sort UX.

```jsx
// pages/EntityListPage.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useEntityList } from '../hooks/useEntityList';
import { useEntityPermission } from '../context/EntityPermissionContext';
import EntityTable from '../components/tables/EntityTable';

export default function EntityListPage() {
  const navigate = useNavigate();
  const { items, loading, error } = useEntityList();
  const { canCreate } = useEntityPermission();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated_desc');

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (items || []).filter((item) => {
      if (!term) return true;
      return `${item.name || ''} ${item.description || ''}`.toLowerCase().includes(term);
    });
  }, [query, items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">Entity Management</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Manage all entities.</p>
        </div>
        {canCreate && (
          <Button onClick={() => {}}><Plus className="h-4 w-4" /> Create Entity</Button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entities..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none" />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : (
        <EntityTable items={filteredItems} onRowClick={(id) => navigate(`/entities/${id}`)} loading={false} />
      )}
    </div>
  );
}
```

### 3.9 Utils Layer (`utils/`)

Pure helper functions — no hooks, no JSX, no side effects.

```js
// utils/formatDate.js
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// utils/validationHelper.js
export const toQueryParams = (params = {}) => {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return new URLSearchParams(clean).toString();
};
```

---

## 4. NAMING CONVENTIONS

| Layer | Convention | Example |
|-------|-----------|---------|
| Directory | kebab-case | `sop_management`, `organization-management` |
| API files | `<entity>.api.js` | `sop.api.js`, `department.api.js` |
| Constants | PascalCase exports | `SOP_STATUS`, `SOP_PERMISSION_MATRIX` |
| Context | PascalCase `EntityProvider` | `SOPProvider`, `SOPPermissionProvider` |
| Hooks | `use{PascalCase}` | `useSOPList`, `useSOPDetails` |
| Pages | PascalCase `EntityPage` | `SOPListPage`, `SOPDetailsPage` |
| Routes | `<entity>.routes.js` | `sop.routes.js` |
| Services | `<entity>.service.js` | `sop.service.js` |
| Utils | camelCase | `formatDate.js`, `versionHelper.js` |
| Validators | `<entity>.validator.js` | `sop.validator.js` |

---

## 5. STATE MANAGEMENT RULES

1. **No `useState` in components** — state lives in hooks and context.
2. **No `useEffect` in components for data fetching** — use custom hooks.
3. **Context owns cross-component state** (selected item, refresh triggers).
4. **Hooks own data state** (items, loading, error, pagination).
5. **Components receive data via props** — they are pure/presentational.

---

## 6. ERROR, LOADING & EMPTY STATES

**Error display:**
```jsx
{error && (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
    {error}
  </div>
)}
```

**Error helper (in every hook):**
```js
function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}
```

**Loading state:**
```jsx
<div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
  Loading…
</div>
```

**Empty (no filters):**
```jsx
<div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-muted)]">
  No items found yet. Create the first one to get started.
</div>
```

**Empty (with filters):**
```jsx
<div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-muted)]">
  No items match your filters.
</div>
```

---

## 7. FILE CREATION ORDER

Build a new feature in this exact order:

1. `constants/<entity>Status.js`
2. `constants/permissions.js`
3. `constants/pagination.js`
4. `api/<entity>.api.js`
5. `validators/<entity>.validator.js`
6. `utils/formatDate.js`
7. `utils/validationHelper.js`
8. `context/<Entity>Context.jsx`
9. `context/<Entity>PermissionContext.jsx`
10. `hooks/use<Entity>List.js`
11. `hooks/use<Entity>Details.js`
12. `components/tables/EntityTable.jsx`
13. `components/cards/EntityCard.jsx`
14. `components/modals/CreateEntityModal.jsx`
15. `pages/EntityListPage.jsx`
16. `pages/EntityDetailsPage.jsx`
17. `routes/<entity>.routes.js`

---

## 8. VERIFICATION CHECKLIST

- [ ] All files follow the exact directory structure
- [ ] No cross-feature imports (only `@/shared/`, `@/contexts/AuthContext`, `@/lib/api`)
- [ ] All hooks handle loading, error, and empty states
- [ ] Permission context gates create/edit/delete actions
- [ ] Routes use `lazy()` for code splitting
- [ ] Constants use `Object.freeze()` for immutability
- [ ] Context providers throw descriptive errors if used outside provider
- [ ] Error messages use `getErrorMessage()` helper pattern
- [ ] Components are pure (receive data via props, no hooks)
- [ ] Validators return `{ isValid, errors }` shape
- [ ] API files use the shared `api` instance from `@/lib/api`
- [ ] Pages compose hooks + context + components with layout
- [ ] Search/filter/sort implemented in list page with `useMemo`

