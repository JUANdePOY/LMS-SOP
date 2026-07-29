# Feature-Based Architecture Guide

This document describes the feature-based folder structure under `client/src/features/`. Each feature is a self-contained module with its own API layer, components, hooks, pages, routes, services, and utilities.

## Top-Level Structure

```
client/src/features/
├── organization-management/
└── sop_management/
```

Each feature directory follows a consistent internal convention:

```
<feature-name>/
├── api/              # API client functions (thin wrappers around fetch/axios)
├── components/       # UI components, organized by sub-category
│   ├── cards/
│   ├── drawers/
│   ├── Editors/
│   ├── forms/
│   ├── modals/
│   ├── tables/
│   ├── tabs/
│   └── timeline/
├── constants/        # Feature-scoped constants (statuses, types, permissions, etc.)
├── context/          # React Context providers for shared state
├── hooks/            # Custom React hooks
├── pages/            # Route-level page components
├── routes/           # Feature route definitions
├── services/         # Business-logic service layer
├── utils/            # Pure utility functions
└── validators/       # Input validation schemas/functions
```

## Feature: `organization-management`

Manages the organizational hierarchy — businesses, departments, categories, and the hierarchy tree view.

```
organization-management/
├── api/
│   ├── business.api.js
│   ├── category.api.js
│   ├── department.api.js
│   ├── hierarchy.api.js
│   └── users.api.js
├── components/
│   ├── business/
│   │   ├── BusinessForm.jsx
│   │   ├── BusinessModal.jsx
│   │   └── BusinessTable.jsx
│   ├── category/
│   │   ├── CategoryForm.jsx
│   │   ├── CategoryModal.jsx
│   │   └── CategoryTable.jsx
│   ├── department/
│   │   ├── DepartmentForm.jsx
│   │   ├── DepartmentModal.jsx
│   │   └── DepartmentTable.jsx
│   ├── hierarchy/
│   │   ├── BusinessAccountTree.jsx
│   │   ├── BusinessNode.jsx
│   │   ├── DepartmentAccountTree.jsx
│   │   ├── DepartmentNode.jsx
│   │   ├── HierarchyContainer.jsx
│   │   ├── HierarchyNode.jsx
│   │   ├── hierarchyStyles.js
│   │   ├── HierarchyToolbar.jsx
│   │   ├── OrganizationChart.jsx
│   │   ├── SelectedDepartment.jsx
│   │   ├── SopCard.jsx
│   │   ├── SOPModal.jsx
│   │   ├── SubDepartmentNode.jsx
│   │   └── hierarchyTypes.js
│   └── KPICards.jsx
├── hooks/
│   ├── useBusinesses.js
│   ├── useCategories.js
│   ├── useDepartments.js
│   ├── useHierarchy.js
│   └── useUsers.js
├── pages/
│   ├── BusinessPage.jsx
│   ├── CategoryPage.jsx
│   ├── DepartmentPage.jsx
│   └── HierarchyOverviewPage.jsx
├── routes/
│   └── organization.routes.js
├── services/
│   ├── business.service.js
│   ├── department.service.js
│   └── hierarchy.service.js
└── utils/
    └── generateDepartmentCode.js
```

### Convention Notes — `organization-management`

- **`api/`** — Each file corresponds to a domain entity and exposes functions for CRUD operations.
- **`components/`** — Organized by domain entity subfolder (`business/`, `category/`, `department/`, `hierarchy/`). The `hierarchy/` subfolder contains tree/chart visualization components shared across the org structure. `KPICards.jsx` is a shared dashboard component at the feature root.
- **`hooks/`** — One hook per domain entity, encapsulating data fetching and state.
- **`pages/`** — Route-level page components, one per entity.
- **`routes/`** — Exports a route configuration array for the feature.
- **`services/`** — Contains business logic that goes beyond simple API calls (e.g., department code generation, hierarchy traversal).
- **`utils/`** — Pure helper functions scoped to this feature.

## Feature: `sop_management`

Manages Standard Operating Procedures — creation, editing, publishing, versioning, approvals, assignments, and audit trails.

```
sop_management/
├── api/
│   ├── acknowledgement.api.js
│   ├── approval.api.js
│   ├── assignment.api.js
│   ├── attachment.api.js
│   ├── audit.api.js
│   ├── section.api.js
│   ├── share.api.js
│   ├── sop.api.js
│   ├── step.api.js
│   └── version.api.js
├── components/
│   ├── cards/
│   │   ├── ApprovalCard.jsx
│   │   ├── AttachmentCard.jsx
│   │   ├── SOPCard.jsx
│   │   ├── UserAssignmentCard.jsx
│   │   └── VersionCard.jsx
│   ├── drawers/
│   │   ├── ActivityDrawer.jsx
│   │   ├── AuditDrawer.jsx
│   │   ├── HistoryDrawer.jsx
│   │   └── VersionDrawer.jsx
│   ├── Editors/
│   │   ├── MarkdownEditor.jsx
│   │   ├── RichTextEditor.jsx
│   │   ├── SectionEditor.jsx
│   │   └── StepEditor.jsx
│   ├── forms/
│   │   ├── SOPAssignmentForm.jsx
│   │   ├── SOPAttachmentForm.jsx
│   │   ├── SOPBasicInfoForm.jsx
│   │   ├── SOPPublishForm.jsx
│   │   ├── SOPSectionForm.jsx
│   │   └── SOPStepForm.jsx
│   ├── modals/
│   │   ├── ApproveModal.jsx
│   │   ├── ArchiveModal.jsx
│   │   ├── AssignmentModal.jsx
│   │   ├── AttachmentModal.jsx
│   │   ├── CreateSOPModal.jsx
│   │   ├── DeleteSOPModal.jsx
│   │   ├── EditBasicInfoModal.jsx
│   │   ├── PublishModal.jsx
│   │   ├── RejectModal.jsx
│   │   ├── RestoreVersionModal.jsx
│   │   ├── SectionModal.jsx
│   │   ├── ShareSOPModal.jsx
│   │   ├── SOPCreateWizard.jsx
│   │   └── StepModal.jsx
│   ├── tables/
│   │   ├── AcknowledgementTable.jsx
│   │   ├── ApprovalTable.jsx
│   │   ├── AssignmentTable.jsx
│   │   ├── SOPTable.jsx
│   │   └── VersionTable.jsx
│   ├── tabs/
│   │   ├── ApprovalsTab.jsx
│   │   ├── AssignmentsTab.jsx
│   │   ├── AttachmentsTab.jsx
│   │   ├── AuditTab.jsx
│   │   ├── OverviewTab.jsx
│   │   ├── ProcedureTab.jsx
│   │   ├── SectionsTab.jsx
│   │   └── VersionsTab.jsx
│   └── timeline/
│       ├── ApprovalTimeline.jsx
│       ├── AuditTimeline.jsx
│       └── VersionTimeline.jsx
├── constants/
│   ├── approvalStatus.js
│   ├── assignmentTypes.js
│   ├── documentTypes.js
│   ├── pagination.js
│   ├── permissions.js
│   ├── sectionTypes.js
│   └── sopStatus.js
├── context/
│   ├── SOPContext.jsx
│   ├── SOPModalContext.jsx
│   └── SOPPermissionContext.jsx
├── hooks/
│   ├── useAcknowledgements.js
│   ├── useApprovals.js
│   ├── useArchiveSOP.js
│   ├── useAssignments.js
│   ├── useAttachments.js
│   ├── useAuditLogs.js
│   ├── useCategoryList.js
│   ├── useCreateSOP.js
│   ├── useDeleteSOP.js
│   ├── useDepartmentList.js
│   ├── usePublishSOP.js
│   ├── useRestoreVersion.js
│   ├── useShareSOP.js
│   ├── useSOPDetails.js
│   ├── useSOPFilters.js
│   ├── useSOPList.js
│   ├── useSOPSections.js
│   ├── useSOPSteps.js
│   ├── useSOPVersions.js
│   └── useUpdateSOP.js
├── pages/
│   ├── SOPDetailsPage.jsx
│   └── SOPListPage.jsx
├── routes/
│   └── sop.routes.js
├── services/
│   ├── acknowledgement.service.js
│   ├── approval.service.js
│   ├── assignment.service.js
│   ├── export.service.js
│   ├── notification.service.js
│   ├── publish.service.js
│   ├── sop.service.js
│   ├── version.service.js
│   └── workflow.service.js
├── utils/
│   ├── apiResponse.js
│   ├── approvalHelper.js
│   ├── compareVersions.js
│   ├── downloadFile.js
│   ├── formatDate.js
│   ├── generateSOPCode.js
│   ├── sopStatus.js
│   └── validationHelper.js
├── validators/
│   ├── assignment.validator.js
│   ├── publish.validator.js
│   ├── section.validator.js
│   ├── sop.validator.js
│   └── step.validator.js
└── TODO.md
```

### Convention Notes — `sop_management`

- **`api/`** — One file per domain entity (SOP, step, section, approval, etc.). Each is a thin API client layer.
- **`components/`** — Organized by UI role:
  - `cards/` — Presentational cards for list views.
  - `drawers/` — Slide-over panels for secondary content (activity, audit, history, versions).
  - `Editors/` — Rich content editors for SOP body, steps, and sections.
  - `forms/` — Form components for creating/editing SOP data.
  - `modals/` — Dialog modals for actions (approve, reject, publish, archive, share, create, delete, etc.).
  - `tables/` — Data tables for list views.
  - `tabs/` — Tab panels within the SOP Details page (Overview, Procedure, Sections, Versions, etc.).
  - `timeline/` — Timeline visualizations for approvals, audit events, and version history.
- **`constants/`** — Enum-like objects for statuses, types, permissions, and pagination defaults.
- **`context/`** — Three providers: `SOPProvider` (global SOP state), `SOPModalProvider` (modal visibility/state), and `SOPPermissionProvider` (role-based access).
- **`hooks/`** — One hook per domain action or entity. Naming follows `use<Action><Entity>` convention.
- **`pages/`** — Two route-level pages: `SOPListPage` (list view) and `SOPDetailsPage` (detail view with tabs).
- **`routes/`** — Exports route definitions for the SOP feature.
- **`services/`** — Business logic layer that orchestrates API calls, transforms data, and handles feature-specific workflows (publish, export, workflow transitions).
- **`utils/`** — Pure helper functions (formatting, file download, code generation, status helpers).
- **`validators/`** — Input validation schemas per domain entity.
- **`TODO.md`** — Feature-specific task tracking.

## Cross-Cutting Conventions

### Path Aliases

The project uses Vite path resolution with the `@/` alias pointing to `client/src/`:

```js
// vite.config.js
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

Import examples:

```js
import SOPListPage from "@/features/sop_management/pages/SOPListPage";
import { SOPProvider } from "@/features/sop_management/context/SOPContext";
import Button from "@/shared/components/ui/Button";
```

### Feature Registration in App

Features are consumed in `App.jsx` via lazy-loaded route imports:

```js
const SOPListPage = lazy(() => import("@/features/sop_management/pages/SOPListPage"));
const OrgHierarchyPage = lazy(() => import("@/features/organization-management/pages/HierarchyOverviewPage"));
```

Context providers from features are composed at the app root:

```jsx
<SOPProvider>
  <SOPModalProvider>
    <SOPPermissionProvider>
      <RouterProvider router={router} />
    </SOPPermissionProvider>
  </SOPModalProvider>
</SOPProvider>
```

### Adding a New Feature

1. Create a new directory under `client/src/features/<feature-name>/`.
2. Add the standard subdirectories: `api/`, `components/`, `hooks/`, `pages/`, `routes/`, `services/`, `utils/`, `constants/`, `context/`, `validators/`.
3. Organize `components/` by UI role (`cards/`, `forms/`, `modals/`, `tables/`, etc.) or by domain entity.
4. Add an `index.js` (or `index.jsx`) at the feature root if the feature needs a public API.
5. Register routes in `App.jsx` using lazy loading.
6. Compose any needed context providers in `App.jsx`.

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Feature directory | kebab-case | `sop_management`, `organization-management` |
| API files | `<entity>.api.js` | `sop.api.js`, `department.api.js` |
| Hook files | `use<EntityOrAction>.js` | `useSOPList.js`, `useDepartments.js` |
| Page files | `<PageName>Page.jsx` | `SOPListPage.jsx`, `DepartmentPage.jsx` |
| Service files | `<entity>.service.js` | `sop.service.js`, `approval.service.js` |
| Route files | `<feature>.routes.js` | `sop.routes.js`, `organization.routes.js` |
| Component files | `<ComponentName>.jsx` | `SOPCard.jsx`, `DepartmentForm.jsx` |
| Constant files | `<domain>.js` | `sopStatus.js`, `approvalStatus.js` |
| Validator files | `<entity>.validator.js` | `sop.validator.js`, `step.validator.js` |

### Component Organization Inside `components/`

When a feature grows large, organize components by **UI role** (preferred) or **domain entity**:

```
components/
├── cards/        # List-item cards
├── drawers/      # Slide-over panels
├── Editors/      # Content editors
├── forms/        # Form components
├── modals/       # Dialog modals
├── tables/       # Data tables
├── tabs/         # Tab panels
└── timeline/     # Timeline visualizations
```

For domain-specific groupings (as in `organization-management`), use entity subfolders:

```
components/
├── business/
│   ├── BusinessForm.jsx
│   ├── BusinessModal.jsx
│   └── BusinessTable.jsx
├── department/
│   ├── DepartmentForm.jsx
│   └── ...
└── hierarchy/
    ├── HierarchyContainer.jsx
    └── ...
```

## Shared Layer

Shared components used across features live outside the `features/` directory at:

```
client/src/shared/
├── components/
│   ├── ui/           # Base UI primitives (Button, Input, etc.)
│   ├── navigation/   # Sidebar, nav components
│   ├── dashboard/    # Dashboard-specific shared components
│   ├── airbase/      # Airbase-specific shared components
│   ├── reservists/   # Reservists-specific shared components
│   └── ...
```

Import shared components via `@/shared/...`:

```js
import Button from "@/shared/components/ui/Button";
```