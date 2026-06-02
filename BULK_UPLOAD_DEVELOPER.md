# Bulk Upload Feature - Developer Reference

## Architecture Overview

```
Frontend (React)
├── BulkUploadModal.jsx (Component)
│   ├── File selection & validation
│   ├── Client-side Excel parsing (preview)
│   └── Upload state management
│
├── Reservists.jsx (Page)
│   ├── Modal state
│   └── Success callback (reload data)
│
└── api.js (Service)
    ├── bulkUploadReservists()
    └── bulkPreviewReservists()

Backend (Express/Node.js)
├── server.js (Express setup)
│   └── Routes mounted
│
└── routes/reservists.js (API Endpoints)
    ├── POST /api/reservists (existing)
    ├── POST /api/reservists/:id/assign (existing)
    └── POST /api/reservists/bulk-upload (NEW)
        ├── File upload (multer)
        ├── Excel parsing (xlsx)
        ├── Group/Squadron auto-creation
        ├── Reservist record creation
        ├── Assignment creation
        └── Transaction handling
```

## Key Files

### 1. Client Components

**File**: `client/src/components/reservists/BulkUploadModal.jsx`
- **Purpose**: Main UI component for bulk upload
- **Props**:
  - `isOpen` (boolean): Modal visibility
  - `onClose` (function): Close handler
  - `onSuccess` (function): Success callback
- **States**:
  - `file`: Selected file
  - `stage`: 'upload' | 'preview' | 'uploading' | 'success'
  - `previewData`: Parsed Excel data
  - `sheetNames`: Array of sheet names
  - `loading`: Upload in progress
  - `error`: Error message
  - `successMessage`: Success message
- **Key Functions**:
  - `parseExcelFile()`: XLSX parsing
  - `handleFileChange()`: File selection
  - `handleUpload()`: POST to backend
  - `handleClose()`: Reset and close

**File**: `client/src/pages/Reservists.jsx`
- **Changes**:
  - Import BulkUploadModal
  - Add `bulkUploadModal` state
  - Add "Bulk Upload" button
  - Render BulkUploadModal with callback

### 2. Backend Routes

**File**: `server/routes/reservists.js`
- **New Endpoint**: `POST /api/reservists/bulk-upload`
- **Authentication**: Requires auth token + admin role
- **Middleware**: multer for file upload
- **Multer Config**:
  - Storage: Memory storage (buffer)
  - File type: Excel/CSV only
  - Accept: .xlsx, .xls, .csv
- **Process Flow**:
  1. Validate file existence
  2. Parse Excel workbook
  3. Iterate sheets
  4. For each sheet:
     - Create/get group (first sheet)
     - Create/get squadron (other sheets)
     - Parse each row
     - Create/update reservist
     - Create assignment
  5. Commit transaction
  6. Return results

**Name Parsing Logic**:
```javascript
// Extract service number: MN-XXXXX or O-XXXXX
const serviceNumber = /MN-\w+|O-\w+/

// Extract rank: LTC, CPT, Sgt, etc.
const rankPattern = /^(LTC|LTCOL|COL|...)/i

// Remove PAF(RES) suffix
// Split remainder into first and last names
```

### 3. API Integration

**File**: `client/src/services/api.js`
- **New Functions**:
  ```javascript
  bulkUploadReservists(formData)  // POST with multipart/form-data
  bulkPreviewReservists(formData) // Prepared for future use
  ```
- **Usage**:
  ```javascript
  const response = await bulkUploadReservists(formData);
  // response.data.status: 'success'
  // response.data.data.successful: number
  // response.data.data.failed: number
  // response.data.data.errors: []
  ```

### 4. Dependencies

**Frontend** (`client/package.json`):
```json
{
  "xlsx": "^0.18.5"
}
```

**Backend** (`server/package.json`):
```json
{
  "xlsx": "^0.18.5",
  "multer": "^1.4.5-lts.1"
}
```

## Data Flow

### Upload Request
```
User selects file
  ↓
Frontend validates (file type)
  ↓
Frontend parses Excel (XLSX library)
  ↓
Frontend shows preview
  ↓
User confirms
  ↓
Frontend sends FormData to backend
  ↓
```

### Backend Processing
```
Receive file buffer
  ↓
Parse Excel (XLSX library)
  ↓
Start transaction
  ↓
For each sheet:
  - Create/get group/squadron
  - For each row:
    - Extract data (name, rank, etc.)
    - Create/get user account
    - Create/update reservist
    - Create assignment
  ↓
Commit transaction
  ↓
Return success/failure counts
  ↓
```

### Response
```javascript
{
  status: 'success',
  message: 'Bulk upload completed',
  data: {
    successful: 45,
    failed: 2,
    total: 47,
    errors: [
      'Row "INVALID NAME" in sheet "OPERATIONS": Could not parse name format'
    ]
  }
}
```

## Database Interactions

### Queries Used

1. **Find or Create Group**:
   ```sql
   SELECT id FROM `groups` WHERE name = ?
   INSERT INTO `groups` (arsen_id, code, name, is_active) VALUES (?, ?, ?, TRUE)
   ```

2. **Find or Create Squadron**:
   ```sql
   SELECT id FROM squadron WHERE group_id = ? AND name = ?
   INSERT INTO squadron (group_id, name, is_active) VALUES (?, ?, TRUE)
   ```

3. **Find or Create User**:
   ```sql
   SELECT id FROM users WHERE email = ?
   INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)
   ```

4. **Find or Create Reservist**:
   ```sql
   SELECT id FROM reservists WHERE service_number = ?
   UPDATE reservists SET rank = ?, specialization = ? WHERE id = ?
   INSERT INTO reservists (...) VALUES (...)
   ```

5. **Manage Assignments**:
   ```sql
   UPDATE reservist_assignments SET is_primary = FALSE WHERE reservist_id = ? AND is_primary = TRUE
   INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary) VALUES (?, ?, ?, CURDATE(), TRUE)
   ```

### Transaction Handling
```javascript
connection = await db.getConnection()
await connection.beginTransaction()

// ... all queries ...

await connection.commit()
// On error: await connection.rollback()
```

## Error Handling

### Frontend Errors
- File validation errors: "Please select a valid Excel file"
- Parse errors: "Error parsing Excel file: {error message}"
- Upload errors: "Upload failed: {server error}"

### Backend Errors
- No file: 400 "No file provided"
- Invalid Excel: 400 "Excel file has no sheets"
- Database errors: 500 "Bulk upload failed: {error message}"
- Auth errors: 401 "Unauthorized" / 403 "Forbidden"

### Row-Level Errors
- Invalid name format
- Duplicate constraints
- Parse failures
- Missing required fields

## Configuration & Customization

### Adjustable Parameters

1. **Preview Size** (BulkUploadModal.jsx line ~120):
   ```javascript
   const sheetPreview = jsonData.slice(0, 5).map(...)  // First 5 records
   ```

2. **File Size Limit** (server.js):
   ```javascript
   app.use(express.json({ limit: '10mb' }));  // Current: 10MB
   ```

3. **Temporary Password** (reservists.js bulk-upload):
   ```javascript
   const tempPassword = 'TempPassword123!';  // Can be customized
   ```

4. **Email Format** (reservists.js bulk-upload):
   ```javascript
   const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@pafr.mil`;
   ```

5. **Supported Ranks** (reservists.js name parsing):
   ```javascript
   const rankPattern = /^(LTC|LTCOL|COL|...)/i;  // Add more ranks as needed
   ```

## Extension Points

### 1. Add Validation Rules
```javascript
// In bulk upload endpoint, before row processing:
if (specialRules(rowData)) {
  errors.push('Custom validation failed');
  continue;
}
```

### 2. Custom Group Creation
```javascript
// Instead of auto-creating, show mapping dialog:
// Create modal showing unmatched groups and let user select existing
```

### 3. Email Notifications
```javascript
// After successful upload:
await sendBulkUploadNotification(admin, results);
await sendNewAccountNotifications(newUsers, tempPassword);
```

### 4. Import from Other Sources
```javascript
// Extend endpoint to accept:
// - CSV from different systems
// - JSON from APIs
// - Google Sheets
```

### 5. Custom Name Parsing
```javascript
// Replace rankPattern with custom logic:
function extractRankAndName(fullText) {
  // Custom parsing logic
}
```

## Testing Utilities

### Mock Excel File Creation
```javascript
// JavaScript to create test file:
const XLSX = require('xlsx');
const data = [
  { DESCRIPTION: 'Position', GRADE: 'O6', NAME: 'LTC TEST O-123 PAF(RES)' }
];
const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'TestGroup');
XLSX.writeFile(wb, 'test.xlsx');
```

### API Testing
```bash
# Using curl to test upload:
curl -X POST http://localhost:3001/api/reservists/bulk-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.xlsx"

# Expected response:
{
  "status": "success",
  "data": {
    "successful": 10,
    "failed": 0,
    "total": 10
  }
}
```

## Performance Considerations

- **Memory**: Uses buffer storage (files held in RAM)
- **Processing**: Synchronous for consistency (uses transactions)
- **Database**: Each row = ~3-4 queries (check + insert/update pattern)
- **Optimization**: Could use batch inserts for large files
- **Recommended**: Process max 100-200 reservists per batch

## Security Considerations

- Authentication required (token-based)
- Authorization check (admin only)
- File type validation
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize names)
- Rate limiting recommended (not yet implemented)
- Audit logging enabled

## Common Issues & Solutions

### Issue: "xlsx is not defined"
**Solution**: `npm install xlsx` in client directory

### Issue: "Multer not found"
**Solution**: `npm install multer` in server directory

### Issue: "Cannot parse Excel file"
**Solution**: Ensure file is valid Excel (not corrupted, correct extension)

### Issue: "No ARSEN found"
**Solution**: Create an ARSEN first via admin panel before bulk upload

### Issue: "Database transaction failed"
**Solution**: Check database connection and permissions; rollback occurs automatically

### Issue: "Upload timeout"
**Solution**: Split large files into smaller batches (< 500 rows per file)

## Future Enhancements

1. **Progress Bar**: Real-time updates during upload
2. **Drag & Drop**: Full drag-drop support
3. **Email Notifications**: Send new credentials to reservists
4. **Mapping UI**: Manual group/squadron mapping before upload
5. **Template Export**: Download template Excel file
6. **Scheduled Imports**: Schedule recurring imports from external systems
7. **Rollback Feature**: Undo entire upload operation
8. **Batch History**: Track all bulk uploads with details
9. **Validation Rules**: Custom business logic per organization
10. **API Integration**: Import from HR systems directly

## Maintenance Notes

- Monitor error logs for parsing failures
- Update rank list as military structure changes
- Consider caching ARSEN list for performance
- Archive old bulk upload data periodically
- Update documentation if Excel format changes
