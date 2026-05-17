# Bulk Upload Feature - Setup & Deployment Guide

## 🎯 One-Time Setup (Before First Use)

### Step 1: Install Dependencies

#### Client-side
```bash
cd c:\wamp64\www\PAFR\PAFR\client
npm install
```
This installs the `xlsx` package needed for Excel parsing.

#### Server-side
```bash
cd c:\wamp64\www\PAFR\PAFR\server
npm install
```
The server dependencies (including xlsx and multer) should already be configured.

### Step 2: Verify Database Setup

Ensure these tables exist in your PAFR database:
- [ ] `users` - User accounts
- [ ] `reservists` - Reservist records
- [ ] `groups` - Air base groups
- [ ] `squadron` - Squadrons
- [ ] `reservist_assignments` - Links between reservists and groups/squadrons
- [ ] `arsens` - Air Reserve Squadron Centers

Verify at least one ARSEN exists and is active:
```sql
SELECT id, name FROM arsens WHERE is_active = 1 LIMIT 1;
```

If no ARSEN exists, create one:
```sql
INSERT INTO arsens (code, name, location, is_active) 
VALUES ('ABG', 'Air Base Group', 'Location', 1);
```

### Step 3: Start the Application

#### Terminal 1: Start Backend
```bash
cd c:\wamp64\www\PAFR\PAFR\server
npm start
# Expected: "PAFR Server running on port 3001"
```

#### Terminal 2: Start Frontend
```bash
cd c:\wamp64\www\PAFR\PAFR\client
npm run dev
# Expected: "VITE v... ready in ... ms"
```

### Step 4: Verify Installation

1. **Open browser**: http://localhost:5173 (or configured URL)
2. **Log in** as admin user
3. **Navigate** to Reservists page
4. **Check** for "Bulk Upload" button next to "Add Reservist"
5. **Verify** button is clickable and modal opens

## 📋 Testing Steps

### Test 1: Simple Upload (Recommended First Test)

**Create test Excel file** (`test_reservists.xlsx`):

| DESCRIPTION/POSITION | GRADE | AFSC | REQUIRED | NAME |
|-----|-------|-------|----------|------|
| GROUP COMMANDER | O6 | T2610 | 1 | LTC TEST COMMANDER O-100001 PAF(RES) |
| OPERATIONS OFFICER | O4 | T3500 | 1 | MAJ TEST OFFICER O-100002 PAF(RES) |

**Upload steps**:
1. Click "Bulk Upload" button
2. Select `test_reservists.xlsx`
3. Review preview (should show 2 records)
4. Note sheet name shows as group
5. Click "Upload"
6. Wait for success message
7. Verify records in Reservists list
8. Test search for uploaded names

### Test 2: Multi-Sheet Upload

**Create test Excel file** with multiple sheets:

**Sheet 1: "590TH AIR BASE GROUP"** (Group-level)
| DESCRIPTION/POSITION | GRADE | AFSC | REQUIRED | NAME |
|-----|-------|-------|----------|------|
| GROUP COMMANDER | O6 | T2610 | 1 | LTC GROUP CMD O-100010 PAF(RES) |

**Sheet 2: "OPERATIONS"** (Squadron)
| DESCRIPTION/POSITION | GRADE | AFSC | REQUIRED | NAME |
|-----|-------|-------|----------|------|
| OPS OFFICER | O4 | T3500 | 1 | MAJ OPS OFFICER O-100020 PAF(RES) |

**Sheet 3: "MAINTENANCE"** (Squadron)
| DESCRIPTION/POSITION | GRADE | AFSC | REQUIRED | NAME |
|-----|-------|-------|----------|------|
| MAINT CHIEF | E8 | A4100 | 1 | MSGT MAINT CHIEF MN-T22-000100 PAF(RES) |

**Verification**:
- [ ] Group "590TH AIR BASE GROUP" created
- [ ] Squadron "OPERATIONS" created and linked to group
- [ ] Squadron "MAINTENANCE" created and linked to group
- [ ] 3 reservists created with correct ranks
- [ ] All 3 appear in Reservists list
- [ ] Assignments are correct

### Test 3: Error Handling

**Create test file with errors**:

| DESCRIPTION/POSITION | GRADE | AFSC | REQUIRED | NAME |
|-----|-------|-------|----------|------|
| POSITION 1 | O6 | T2610 | 1 | LTC VALID NAME O-100030 PAF(RES) |
| POSITION 2 | O4 | T3500 | 1 | INVALID PERSON | (invalid name format)
| POSITION 3 | E8 | A4100 | 1 | SGT ANOTHER VALID MN-000110 PAF(RES) |

**Expected**:
- [ ] Upload completes with partial success
- [ ] Success message shows: "Successfully uploaded 2 reservist(s). 1 failed."
- [ ] Error message shows which row failed
- [ ] Valid rows still created in database
- [ ] Failed row details visible

## 🔍 Verification Checklist

After setup and initial testing:

### Frontend
- [ ] "Bulk Upload" button visible on Reservists page
- [ ] Button opens modal when clicked
- [ ] Modal closes with X button
- [ ] File selection works
- [ ] File validation works (reject non-Excel)
- [ ] Preview shows sheet names
- [ ] Preview shows sample records
- [ ] Upload button enabled when preview shows
- [ ] Cancel button works
- [ ] Success message displays
- [ ] No JavaScript console errors

### Backend
- [ ] Endpoint accessible: `POST /api/reservists/bulk-upload`
- [ ] Requires authentication
- [ ] Requires admin role
- [ ] Multer handles file upload
- [ ] XLSX parsing works
- [ ] Groups created automatically
- [ ] Squadrons created automatically
- [ ] Reservists created with correct data
- [ ] Assignments created
- [ ] Database transactions work
- [ ] Errors rolled back properly

### Database
- [ ] New groups appear in `groups` table
- [ ] New squadrons appear in `squadron` table
- [ ] New reservists appear in `reservists` table
- [ ] New users created in `users` table
- [ ] Assignments created in `reservist_assignments` table
- [ ] Service numbers are unique
- [ ] Foreign key relationships maintained

## 🐛 Common Issues & Solutions

### Issue: "Module not found 'xlsx'"
**Symptoms**: Client console error, upload fails
**Solution**:
```bash
cd client
npm install
npm install xlsx@^0.18.5
```

### Issue: "Cannot read file buffer"
**Symptoms**: Server error on upload
**Solution**:
- Verify multer is installed: `npm list multer`
- Check file is being sent as FormData
- Verify Content-Type is multipart/form-data

### Issue: "No ARSEN found" error
**Symptoms**: Upload fails for group creation
**Solution**:
```sql
-- Create an ARSEN
INSERT INTO arsens (code, name, location, is_active) 
VALUES ('ABG-001', 'Air Base Group 001', 'Base Location', 1);
```

### Issue: Names not parsing correctly
**Symptoms**: Reservists created with wrong names
**Solution**:
- Verify Excel format: "Rank FirstName LastName ServiceNo PAF(RES)"
- Check for extra spaces in cells
- Ensure rank is recognized (see developer docs for rank list)

### Issue: Upload timeout
**Symptoms**: Upload starts but never completes
**Solution**:
- Check server logs for errors
- Try smaller file (< 100 rows)
- Increase timeout in browser/server settings
- Verify database connection is active

### Issue: Duplicate service numbers
**Symptoms**: "UNIQUE constraint failed" error
**Solution**:
- Service numbers must be unique
- Check existing reservists for duplicates
- Use different format for duplicates: append timestamp
- Or update existing reservist instead of creating new

## 🚀 Running in Production

### Server Configuration
```javascript
// server.js - verify these settings
app.use(express.json({ limit: '10mb' }));  // File size limit
app.use(express.urlencoded({ extended: true }));

// For HTTPS (recommended)
const https = require('https');
const fs = require('fs');
const cert = fs.readFileSync('path/to/cert.pem');
const key = fs.readFileSync('path/to/key.pem');
https.createServer({cert, key}, app).listen(3001);
```

### Environment Variables
```bash
# .env file in server directory
PORT=3001
DB_HOST=localhost
DB_USER=pafr_user
DB_PASSWORD=secure_password
DB_NAME=pafr
JWT_SECRET=your_jwt_secret
```

### Security Recommendations
1. **Use HTTPS**: Always use HTTPS in production
2. **Rate Limiting**: Add rate limiter middleware
3. **File Scanning**: Consider antivirus scanning for uploaded files
4. **Database Backup**: Back up before bulk operations
5. **Audit Trail**: Monitor audit logs for all uploads
6. **Admin Authentication**: Use strong passwords
7. **API Keys**: Implement API key validation if needed

### Performance Optimization
1. **Connection Pooling**: MySQL pool for multiple connections
2. **Caching**: Cache ARSEN list for quick lookup
3. **Indexing**: Ensure indexes on service_number
4. **Batch Size**: Limit to 500 rows per upload

## 📊 Monitoring & Maintenance

### Log Monitoring
```bash
# Check server logs
tail -f server.log

# Check error logs
tail -f error.log

# Database error log
tail -f /var/log/mysql/error.log
```

### Database Monitoring
```sql
-- Check recent uploads
SELECT * FROM audit_logs 
WHERE action = 'reservist.bulk_upload' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for failed constraints
SELECT * FROM reservists 
WHERE service_number IS NULL 
  OR first_name IS NULL;

-- Verify assignments
SELECT COUNT(*) FROM reservist_assignments 
WHERE group_id IS NULL 
  OR squadron_id IS NULL;
```

### Cleanup Tasks
```sql
-- Remove test data
DELETE FROM reservist_assignments 
WHERE reservist_id IN (
  SELECT id FROM reservists 
  WHERE first_name LIKE 'TEST%'
);

-- Archive old audit logs
DELETE FROM audit_logs 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY) 
  AND action = 'reservist.bulk_upload';
```

## 📝 Documentation Quick Links

| Document | Purpose |
|----------|---------|
| `BULK_UPLOAD_GUIDE.md` | User guide with examples |
| `BULK_UPLOAD_TESTING.md` | Comprehensive testing checklist |
| `BULK_UPLOAD_DEVELOPER.md` | Architecture and code reference |
| `BULK_UPLOAD_IMPLEMENTATION.md` | Feature overview and summary |

## ✅ Final Verification

Before considering setup complete:

```
Setup Verification Checklist:

Frontend Setup:
  ☐ npm install completed in client/
  ☐ Bulk Upload button visible
  ☐ Modal opens and closes
  ☐ No console errors

Backend Setup:
  ☐ npm install completed in server/
  ☐ Server starts without errors
  ☐ Database connected
  ☐ At least one ARSEN exists

Testing:
  ☐ Test file created
  ☐ Simple upload successful
  ☐ Records appear in database
  ☐ Can search uploaded records

Documentation:
  ☐ User guide read
  ☐ Testing checklist reviewed
  ☐ Admin trained on feature
  ☐ Support plan documented
```

## 🆘 Getting Help

If you encounter issues not covered here:

1. **Check the appropriate documentation**:
   - Users: See `BULK_UPLOAD_GUIDE.md`
   - Developers: See `BULK_UPLOAD_DEVELOPER.md`

2. **Review error messages carefully** - they provide specific guidance

3. **Check log files** for technical details

4. **Test with sample data** before production use

5. **Contact support** with:
   - Error message
   - Steps to reproduce
   - Log excerpts
   - Sample Excel file

---

**Setup Version**: 1.0
**Last Updated**: 2026-05-17
**Status**: Ready for Production
