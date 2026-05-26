# Display DOCX, PDF, and Excel Files in Training Attachments

## Current State Analysis

### Server-Side Support
- **File Types Supported**: PDF, JPEG, PNG, DOC, DOCX (via `server/config/uploads.js`)
- **Storage**: Local filesystem with metadata in MySQL (`internal_training_attachments`, `external_training_attachments`)
- **Endpoints**: `/trainings/internal/:id/attachments/:attachmentId/file` for download

### Client-Side Limitations
- **ViewAttachmentModal.jsx**: Only previews images (jpg, jpeg, png, gif, webp) and PDF via iframe
- **LetterOrderUpload.jsx**: Handles upload but preview only works for images/PDF
- **DOCX/Excel**: Shows "Preview not available" message, forces download

## Recommended Approach

### Option A: Client-Side Libraries (Recommended - Simpler Implementation)

**For DOCX:**
- Use `mammoth.js` to convert DOCX to HTML in-browser
- Render HTML in modal with preserved formatting (headings, lists, bold, italic)
- Fallback to download if conversion fails

**For Excel (XLSX):**
- Use `sheetjs` (xlsx) library to read spreadsheet data
- Render as HTML table with pagination for large sheets
- Show sheet tabs for multi-sheet workbooks

**Implementation Steps:**
1. Add `mammoth` and `sheetjs` npm dependencies
2. Update `ViewAttachmentModal.jsx` to handle DOCX/XLSX mime types
3. Add server endpoint to serve files as blob for client-side processing

### Option B: Server-Side Conversion (Better Quality, More Complex)

**For DOCX:**
- Use LibreOffice headless conversion to HTML/PDF on upload
- Store both original and converted versions
- Serve converted version for viewing

**For Excel:**
- Convert to CSV or HTML on server
- Use libraries like `exceljs` with headless browser rendering

### Option C: Third-Party Embed (Quick but External Dependency)

- Use Microsoft Office Online Embed API (requires internet)
- Google Docs Viewer for public documents
- Drawback: Requires external connectivity, privacy concerns

## Recommendation: Option A (Client-Side Libraries)

### Pros:
- Works offline
- No server changes required for conversion
- Faster implementation
- Maintains data privacy (files stay local)

### Cons:
- Larger bundle size
- DOCX formatting limitations with mammoth.js
- No formula support for Excel

## Implementation Plan

### 1. Install Dependencies
```bash
npm install mammoth sheetjs
```

### 2. Create Document Viewer Component
```
client/src/components/ui/DocumentViewer.jsx
```
- Detect file type from extension/mime
- For PDF: Use iframe (existing)
- For images: Use img tag (existing)
- For DOCX: Use mammoth.js to render HTML
- For XLSX: Use sheetjs to render tables

### 3. Update ViewAttachmentModal.jsx
- Import and use DocumentViewer
- Pass file blob and type
- Handle loading states

### 4. Update API Service (trainingsService.js)
- Add method to fetch attachment as blob for viewing

### 5. Server Config Update (optional)
- Add Excel MIME type to allowed list in `server/config/uploads.js`:
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx)
  - `application/vnd.ms-excel` (xls)

## File Changes Summary

| File | Action |
|------|--------|
| `client/package.json` | Add mammoth, sheetjs dependencies |
| `client/src/components/ui/DocumentViewer.jsx` | New component for DOCX/XLSX |
| `client/src/components/ui/ViewAttachmentModal.jsx` | Integrate DocumentViewer |
| `client/src/lib/trainingUtils.js` | Add file type utilities |
| `server/config/uploads.js` | Add Excel MIME types to ALLOWED_MIME |
| `server/models/trainingAttachmentModel.js` | No changes needed |

## Testing Checklist
- [ ] PDF preview works (existing)
- [ ] Image preview works (existing)
- [ ] DOCX renders with basic formatting
- [ ] XLSX renders with sheet selection
- [ ] Large files handle gracefully
- [ ] Fallback to download on error