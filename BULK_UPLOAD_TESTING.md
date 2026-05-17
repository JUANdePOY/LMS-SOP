# Bulk Upload Feature - Testing & Setup Checklist

## Pre-Deployment Setup

### 1. Install Dependencies
- [ ] Run `npm install` in the `client/` directory to install xlsx package
- [ ] Verify `server/` already has `xlsx` in dependencies
- [ ] Check no errors during installation

### 2. Database Prerequisites
- [ ] At least one ARSEN (Air Reserve Squadron Center) exists and is active
- [ ] Database schema includes all required tables:
  - [ ] `reservists`
  - [ ] `users`
  - [ ] `groups`
  - [ ] `squadron`
  - [ ] `reservist_assignments`

### 3. Server Configuration
- [ ] Server is running on correct port (default 3001)
- [ ] CORS is enabled
- [ ] Authentication middleware is working
- [ ] Authorization checks for admin role are in place

## Feature Testing Checklist

### Unit 1: File Upload Interface
- [ ] "Bulk Upload" button appears on Reservists page
- [ ] Button is positioned next to "Add Reservist" button
- [ ] Clicking button opens the modal
- [ ] Modal displays upload instructions
- [ ] Upload area shows drag-drop zone

### Unit 2: File Selection
- [ ] Can click upload area to open file browser
- [ ] File browser filters for Excel files (.xlsx, .xls, .csv)
- [ ] Can select file successfully
- [ ] Selected filename appears in modal
- [ ] Can click "Choose Different File" to select another

### Unit 3: File Validation
- [ ] Rejecting non-Excel files shows error message
- [ ] Accepting .xlsx files works
- [ ] Accepting .xls files works
- [ ] Accepting .csv files works
- [ ] Empty files show appropriate error

### Unit 4: Preview Display
- [ ] After file selection, preview stage shows
- [ ] Sheet names display with icons:
  - [ ] First sheet shows "🏢" icon (group)
  - [ ] Other sheets show "🛩️" icons (squadrons)
- [ ] Preview shows sample records (first 3-5 from each sheet)
- [ ] Preview shows correct columns: Position, Grade, AFSC, Required, Name
- [ ] Each preview item shows sheet name and row number

### Unit 5: Upload Process
- [ ] "Upload" button is enabled when preview shows
- [ ] Clicking "Upload" changes stage to uploading
- [ ] Shows loading spinner during upload
- [ ] Success message shows with counts
- [ ] Modal auto-closes after 3 seconds

### Unit 6: Error Handling
- [ ] Invalid file formats show appropriate error
- [ ] File parsing errors are caught and displayed
- [ ] Server errors are returned to user
- [ ] Can cancel upload at any stage
- [ ] Can retry after errors

### Unit 7: Data Processing (Backend)

#### 7a: Group Creation
- [ ] Group with new name is created automatically
- [ ] Group is associated with an active ARSEN
- [ ] Group appears in groups table
- [ ] Existing group is found and reused

#### 7b: Squadron Creation
- [ ] Squadron with new name is created
- [ ] Squadron is linked to correct group
- [ ] Squadron appears in squadron table
- [ ] Existing squadron is found and reused

#### 7c: Reservist Creation
- [ ] New reservist record is created
- [ ] First name, last name parsed correctly
- [ ] Rank extracted from name
- [ ] Service number captured from name
- [ ] Specialization set to position
- [ ] User account created with email
- [ ] Password hash generated

#### 7d: Reservist Parsing
Test with various name formats:
- [ ] "LTC RAUL A DECHOSA O-153218 PAF (GSC) (RES)"
- [ ] "Sgt Angelyn J Bass MN-T21-024171 PAF(Res)"
- [ ] "MAJ JUAN SANTOS O-200100 PAF(RES)"
- [ ] Mixed case names
- [ ] Names with multiple middle names

#### 7e: Assignments
- [ ] Assignment record created for each reservist
- [ ] Assignment linked to correct group and squadron
- [ ] Assignment marked as primary
- [ ] Previous primary assignments become secondary

### Unit 8: Data Verification
After successful upload:
- [ ] Reservist appears in Reservists list
- [ ] Can search for uploaded reservist
- [ ] Correct group is assigned
- [ ] Correct squadron is assigned
- [ ] All fields populated correctly
- [ ] Created user account is active

### Unit 9: Multi-Sheet Processing
- [ ] All sheets are processed (not just first)
- [ ] Group positions from first sheet
- [ ] Squadron positions from other sheets
- [ ] Cross-sheet records don't interfere
- [ ] Sheet order doesn't matter

### Unit 10: Error Scenarios
- [ ] Missing NAME column: Error shown for affected rows
- [ ] Unparseable name format: Error shown with row details
- [ ] Duplicate service numbers: Handled gracefully
- [ ] Empty rows: Skipped silently
- [ ] Network error: Shows error and allows retry

## Test Data Scenarios

### Scenario 1: Simple Single Group
**File**: 1 sheet with 3 rows
**Expected**: 1 group, 3 reservists created

### Scenario 2: Group with Squadrons  
**File**: 3 sheets (Group + 2 Squadrons) with 5 rows each
**Expected**: 1 group, 2 squadrons, 15 reservists created

### Scenario 3: Mixed New/Existing
**File**: Group exists, new squadron, some existing reservists
**Expected**: Existing reused, new created, assignments updated

### Scenario 4: Large Batch
**File**: 10 sheets with 50+ rows each
**Expected**: All processed successfully, no timeout

### Scenario 5: Invalid Data Mixed
**File**: Valid and invalid rows mixed
**Expected**: Valid rows processed, invalid rows skipped with errors

## Performance Testing

- [ ] File with 100 rows: < 5 seconds
- [ ] File with 500 rows: < 15 seconds
- [ ] File with 1000 rows: < 30 seconds
- [ ] No memory leaks
- [ ] No database connection issues

## UI/UX Testing

- [ ] Modal is responsive on different screen sizes
- [ ] Upload area has good hover feedback
- [ ] Preview scrolls properly for many records
- [ ] Error messages are clear
- [ ] Success message is visible
- [ ] No console errors

## Security Testing

- [ ] Non-admin users cannot access upload
- [ ] Failed auth redirects to login
- [ ] Audit log records upload action
- [ ] Large files don't bypass server limits
- [ ] No SQL injection via names
- [ ] No XSS via special characters

## Browser Testing

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers

## Integration Testing

- [ ] Upload doesn't break existing CRUD operations
- [ ] Can edit uploaded reservists
- [ ] Can delete uploaded reservists
- [ ] Can filter uploaded reservists
- [ ] Reports include uploaded reservists
- [ ] Dashboard reflects uploaded data

## Deployment Checklist

Before going live:
- [ ] All tests passed
- [ ] Dependencies installed in production
- [ ] Database backed up
- [ ] Admin trained on feature
- [ ] Documentation available
- [ ] Support plan in place
- [ ] Rollback plan ready

## Post-Deployment Monitoring

- [ ] Check error logs for upload failures
- [ ] Monitor database for orphaned records
- [ ] Verify reservists can login with new accounts
- [ ] Check audit logs for upload records
- [ ] Get user feedback on usability
- [ ] Monitor performance with real data

## Known Limitations & Notes

- [ ] First active ARSEN used for new groups
- [ ] Temporary passwords not emailed (user sees them in system)
- [ ] Large files (>10MB) will be rejected
- [ ] Max 100 reservists per second recommended
- [ ] Sheet names must be unique in file
- [ ] Service number format flexible but recommended: O-XXXXX or MN-XXXXXX
