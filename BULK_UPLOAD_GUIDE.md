# Reservist Bulk Upload Feature Guide

## Overview
The Reservist Bulk Upload feature allows administrators to import multiple reservist records from Excel files in one operation. This is particularly useful for importing organizational structures with groups and squadrons.

## Accessing the Feature

1. Navigate to the **Reservists** page
2. Click the **"Bulk Upload"** button (located next to "Add Reservist" button)
3. The Bulk Upload Modal will open

## Excel File Requirements

### File Format
- **Supported formats**: `.xlsx`, `.xls`, `.csv`
- **Structure**: 
  - **First sheet**: Group-level positions (e.g., "590TH AIR BASE GROUP (RESERVE)")
  - **Additional sheets**: Squadron-level positions (e.g., "OPERATIONS", "MAINTENANCE", "SUPPLY")

### Column Headers
The Excel file must contain these columns (case-insensitive):
- `DESCRIPTION/POSITION` - Job position/title
- `GRADE` - Rank/Grade (O6, E4, etc.)
- `AFSC` - Air Force Specialty Code (e.g., T2610)
- `REQUIRED` - Number of positions required
- `NAME` - Full name with rank and service number

### Name Format
The NAME column should follow one of these formats:

**Format 1** (Service Number with Military ID):
```
LTC RAUL A DECHOSA O-153218 PAF (GSC) (RES)
```

**Format 2** (Service Number with Personnel ID):
```
Sgt Angelyn J Bass MN-T21-024171 PAF(Res)
```

**Components**:
- **Rank**: LTC, CPT, Sgt, etc. (case-insensitive)
- **First Name**: Personal first name
- **Middle/Last Names**: Can include multiple parts
- **Service Number**: Either O-XXXXX (Officer) or MN-XXXXX (Enlisted)
- **Suffix**: PAF or PAF(RES) or similar

## Upload Process

### Step 1: Select File
1. Click the upload area or browse to select an Excel file
2. The file will be validated:
   - Must be Excel format (.xlsx, .xls, or .csv)
   - Must contain at least one sheet
   - Must have rows of data

### Step 2: Review Preview
After selecting a file, the system displays:

**Sheet/Squadron Information**:
- **First sheet** (highlighted in blue): Group positions
- **Other sheets** (light blue): Squadron positions
- Total number of sheets found

**Data Preview**:
- Shows first 3-5 records from each sheet
- Displays: Position, Grade, AFSC, Required, and Name
- Allows you to verify data before upload

### Step 3: Upload
1. Review the preview data
2. Click **"Upload"** to start the import
3. Wait for processing to complete
4. System will show:
   - Number of successful uploads
   - Number of failed records (if any)
   - Specific error messages for failures

## How the System Processes Data

### Group/Squadron Handling

**Groups** (First Sheet):
- If a group with the sheet name doesn't exist, it's automatically created
- Groups are associated with the first active ARSEN (Air Reserve Squadron Center) in the system
- If no ARSEN exists, the upload will fail

**Squadrons** (Other Sheets):
- If a squadron with the sheet name doesn't exist, it's automatically created
- Squadrons are linked to their parent group
- If the group doesn't exist, it's created first

### Reservist Processing

**For New Reservists**:
1. A system account is automatically created
2. Email is generated: `firstname.lastname@pafr.mil`
3. Temporary password is set: `TempPassword123!`
4. Can be changed by the reservist on first login

**For Existing Reservists**:
1. Record is located by service number
2. Rank and specialization are updated if provided
3. Assignment is created/updated

### Assignment Creation
- Each reservist is assigned to their group and squadron
- Primary assignment is set to the current upload
- Previously primary assignments are marked as secondary

## Example Excel Structure

### Sheet 1: "590TH AIR BASE GROUP (RESERVE)"
```
DESCRIPTION/POSITION              | GRADE | AFSC    | REQUIRED | NAME
GROUP COMMANDER                   | O6    | T2610   | 1        | LTC RAUL A DECHOSA O-153218 PAF (GSC) (RES)
DEPUTY GROUP COMMANDER            | O5    | T2614   | 1        | LTC LAARNI L ROQUE O-161917-E PAF(RES)
Administration Apprentice         | E4    | R70230  | 1        | Sgt Angelyn J Bass MN-T21-024171 PAF(Res)
```

### Sheet 2: "OPERATIONS"
```
DESCRIPTION/POSITION              | GRADE | AFSC    | REQUIRED | NAME
OPERATIONS OFFICER                | O4    | T3500   | 1        | MAJ JOHN SANTOS O-200100 PAF(RES)
```

### Sheet 3: "MAINTENANCE"
```
DESCRIPTION/POSITION              | GRADE | AFSC    | REQUIRED | NAME
MAINTENANCE CHIEF                 | E8    | A4100   | 1        | MSGT JUAN DELA CRUZ MN-T22-050001 PAF(RES)
```

## Troubleshooting

### "Please select a valid Excel file"
- Ensure the file is .xlsx, .xls, or .csv format
- Check the file extension
- Try saving the Excel file again

### "Excel file has no sheets"
- File is empty or corrupted
- Try opening the file in Excel to verify it's valid

### "Could not parse name format"
- Name doesn't follow expected format
- Ensure name includes rank and service number
- Example format: `Sgt FIRST MIDDLE LAST MN-XXXXX PAF(RES)`

### "No active ARSEN found"
- The system has no active ARSEN in the database
- Contact your administrator to create an ARSEN first
- Groups cannot be created without an ARSEN

### Failed row entries
- Check specific error messages
- Common issues:
  - Missing NAME field
  - Invalid name format
  - Duplicate service numbers (if using existing reservists)
  - Database constraint violations

## Success Indicators

✅ **Green checkmark and message** indicating number of successful uploads
- Example: "Successfully uploaded 45 reservist(s). 0 failed."

Each successful upload will:
1. Create or update reservist records
2. Create or link to appropriate group/squadron
3. Generate system accounts for new reservists
4. Make records visible in the Reservists list

## Data Validation Notes

- **Empty rows**: Skipped automatically
- **Duplicate names**: Each gets a unique service number
- **Special characters**: Handled appropriately
- **Case sensitivity**: Handled (names normalized)
- **Whitespace**: Trimmed automatically

## After Upload

1. The modal automatically closes after 3 seconds
2. The Reservists list is refreshed
3. New records appear in the table
4. Can search/filter immediately
5. Newly created accounts can log in with temporary password

## Security Considerations

- All uploads require admin authentication
- Audit log records the bulk upload action
- Database transactions ensure consistency
- Failed uploads automatically rollback
- Temporary passwords should be changed on first login

## Tips for Best Results

1. **Test Small First**: Upload a few rows before bulk importing
2. **Consistent Formatting**: Keep name formats consistent across the Excel file
3. **Service Numbers**: Use official military service numbers when available
4. **Backup Data**: Save your Excel file for reference
5. **Review Preview**: Always review the preview before uploading
6. **Check Results**: Verify records in the system after upload

## Support

If you encounter issues:
1. Check the error message details
2. Verify Excel file format against requirements
3. Try with a smaller subset of data
4. Contact your system administrator for help
