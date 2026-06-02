# Task: Require Registration Form for External Training Creation

## Objective
Prevent external training submission when the registration form has no fields configured.

## Analysis
- **Current state**: `TrainingForm.jsx` validates only `title` and `startDate` for external trainings
- **RegistrationBuilder.jsx**: Used for building registration fields, but fields are optional
- **Location**: `client/src/components/trainings/TrainingForm.jsx`

## Implementation Plan

### Step 1: Add validation for empty registration fields ✅
- [x] In `validate()` function (line ~550), added check for `registrationFields.length === 0` when `trainingType === TRAINING_TYPES.EXTERNAL`
- [x] Set error message: "Registration form must have at least one field."

### Step 2: Display registration error visibly ✅
- [x] Added registration error display in the form body (lines 770-774)
- [x] Added warning indicator "!" badge on Registration tab when error exists (lines 725-729)
- [x] Tab shows red text when registration validation fails (lines 714-716)

### Step 3: Auto-clear error on field changes ✅
- [x] Created `handleRegistrationChange` wrapper function (lines 489-494)
- [x] Error clears when user adds registration fields

## Success Criteria
- [x] External training cannot be submitted with empty registration fields
- [x] Clear error message displayed when validation fails
- [x] Registration tab has visual indicator (red "!") when validation fails
- [x] Existing functionality (internal trainings, editing) unaffected
- [x] No new lint errors introduced

## Review
Changes made to `TrainingForm.jsx`:
1. Line 489-494: Added `handleRegistrationChange` wrapper to clear registration error
2. Line 558-560: Added validation check for empty registration fields
3. Line 714-716: Added red styling for registration tab when error exists
4. Line 725-729: Added "!" warning badge on registration tab
5. Line 765: Changed `onChange` prop to use `handleRegistrationChange`
6. Line 770-774: Added registration error display in form body