# Plan: Multi-Process Bulk Upload Wizard

## Goal
Add a two-step bulk upload wizard to the SecondarySidebar business `...` menu:
1. Bulk upload **clients** with their **business(es)**
2. Bulk upload **tasks** for the clients/businesses created in step 1

## Current State
- Task bulk upload modal exists at `client/src/features/task-management/components/TaskBulkUploadModal.jsx`
- Client creation API: `POST /api/clients` with `{ client_name, business_id, department_id }`
- Adding business to client: `POST /api/clients/:id/businesses` with `{ business_name }`
- No bulk client upload endpoint exists
- SecondarySidebar business `...` menu currently only has "Hide business" (super_admin)

## Proposed Design

### 1. Backend: New Client Bulk Upload Endpoint
**File:** `server/controllers/clientController.js`
**Route:** `POST /api/clients/bulk-upload` in `server/routes/clients.js`

**Behavior:**
- Accepts multipart/form-data with `.xlsx` or `.csv` file
- Expected columns: `Client Name`, `Business Name(s)` (comma-separated for multiple businesses per client)
- Optional: `Department` column mapped to `department_id`
- Creates each client in a transaction
- For each client, creates associated businesses via `clientModel.addBusiness()`
- Returns summary: `{ success: true, data: { created: [...], failed: [...] } }`
- On partial failure, commits successful rows and returns errors per row
- Validation: client_name required, business_name(s) required, max 25MB, xlsx/csv only

**Reuse:**
- `clientModel.createClient()` for client creation
- `clientModel.addBusiness()` for business creation
- Multer memory storage like task bulk upload

### 2. Frontend: Wizard Modal Component
**New file:** `client/src/features/organization-management/components/BulkUploadWizardModal.jsx`

**Props:** `open`, `onClose`, `toast`, `refetch`

**State:**
- `step`: `'clients'` | `'tasks'`
- `file`, `format` (`'xlsx'` default), `rawContent`, `preview`, `importing`, `importResult`
- `createdClients`: array of `{ id, client_name, businesses: [{ id, business_name }] }`
- `selectedClientId`, `selectedBusinessId` for task step

**Step 1 - Clients:**
- Format selector (xlsx/csv/json), file upload, raw content paste
- Template download with headers: `Client Name`, `Business Name(s)`, `Department`
- Parse & Preview table
- Import creates clients + businesses via `POST /api/clients/bulk-upload`
- On success: show summary, "Next: Upload Tasks" button

**Step 2 - Tasks:**
- Reuse `TaskBulkUploadModal` internally, but scoped to selected client/business
- Client/business dropdowns pre-populated from `createdClients`
- If only one client/business was created, auto-select them
- Import uses existing `bulkUploadTasks` service with context

**Navigation:**
- "Next" button advances to step 2 with created entities
- "Back" returns to step 1
- "Close" exits wizard

### 3. SecondarySidebar Integration
**File:** `client/src/shared/components/navigation/SecondarySidebar.jsx`

**Change:** In the business `...` menu (`renderBizGroup`), add a "Bulk Upload Clients & Tasks" menu item when `isAnyAdmin && hasPermission('manage_clients')`.

**Handler:**
- Opens `BulkUploadWizardModal`
- On wizard close, calls `refresh()` and `notifyOrgTreeChanged()` to update the sidebar tree

### 4. Template Formats

**Client Template (xlsx/csv):**
```
Client Name,Business Name(s),Department
Acme Corp,"Office A, Office B",Engineering
Beta LLC,Main Office,Sales
```

**Task Template (existing, unchanged):**
Reuse `TaskBulkUploadModal`'s current template logic, already scoped by client/business.

## Data Flow

1. User clicks business `...` → "Bulk Upload Clients & Tasks"
2. Wizard Step 1 opens
3. User uploads client file → preview → import
4. Backend creates clients + businesses, returns created list with IDs
5. Wizard stores `createdClients`, shows "Next: Upload Tasks"
6. User clicks Next → Step 2 opens
7. Client/business dropdowns pre-filled from `createdClients`
8. User uploads task file → preview → import (existing task bulk flow)
9. Wizard closes, sidebar refreshes

## Edge Cases

- **No clients created:** "Next" button disabled; user can retry step 1
- **Partial failures:** Step 1 shows success/failed counts; failed rows have error messages; wizard still allows proceeding with successful rows
- **Multiple businesses per client:** Task step allows selecting any created business
- **User skips task step:** User can Close after step 1 without uploading tasks
- **Large files:** 25MB limit, same as existing task bulk upload
- **Duplicate client names:** Backend returns 409; row marked as failed

## Files to Modify

| File | Change |
|------|--------|
| `server/controllers/clientController.js` | Add `bulkUploadClients` function |
| `server/routes/clients.js` | Add `POST /bulk-upload` route |
| `server/models/clientModel.js` | No changes; reuse `createClient` + `addBusiness` |
| `client/src/features/organization-management/components/BulkUploadWizardModal.jsx` | New wizard component |
| `client/src/shared/components/navigation/SecondarySidebar.jsx` | Add menu item + modal trigger |
| `client/src/features/task-management/components/TaskBulkUploadModal.jsx` | No changes; reuse as-is |

## Validation Plan

1. Build passes (`npm run build`)
2. Lint passes on new/modified files
3. Upload client CSV/XLSX with 2 clients, each with 2 businesses
4. Verify clients appear in SecondarySidebar tree
5. Click Next, verify task dropdown is pre-populated
6. Upload task file scoped to created client/business
7. Verify tasks appear under correct client/business in task hierarchy
8. Test partial failure (duplicate client name) - verify error reporting
9. Test cancel/close at each step
