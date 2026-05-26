# Diagnostic Process: Landing Page Training Display Issue

## Objective
Systematically diagnose why the Landing page is not displaying the complete list of internal and external trainings that have been created in the system.

## Environment
- Time: 2026-05-26T12:05:41+08:00
- Working Directory: C:\wamp64\www\Airforce-system
- Recent Changes: Modified `useLandingTrainings.js` to increase limit to 50 and add status filters

## Diagnostic Steps

### Phase 1: Verify Current Implementation
1. **Check Hook Implementation**
   - File: `client/src/hooks/useLandingTrainings.js`
   - Verify current limit and status filters
   - Confirm API service calls are correct

2. **Verify API Service Methods**
   - File: `client/src/services/trainingsService.js`
   - Confirm `getTrainings` and `getExternalTrainings` accept limit/status params
   - Check if params are correctly passed to axios

### Phase 2: Backend Data Verification
3. **Check Database Records**
   - Connect to MySQL database (pafr)
   - Query internal trainings count by status:
     ```sql
     SELECT status, COUNT(*) as count FROM trainings GROUP BY status;
     ```
   - Query external trainings count by status:
     ```sql
     SELECT status, COUNT(*) as count FROM external_trainings GROUP BY status;
     ```

4. **Verify API Endpoints Directly**
   - Test internal trainings endpoint:
     ```
     GET /api/trainings/internal?limit=50&status=published
     ```
   - Test external trainings endpoint:
     ```
     GET /api/trainings/external?limit=50&status=open
     ```
   - Check response structure and data count

### Phase 3: Frontend Data Flow Verification
5. **Add Debug Logging to Hook**
   - Temporarily add console.log in `useLandingTrainings.js` to see:
     - What data is received from API
     - What data is stored in state
     - Loading/error states

6. **Check Landing Page Component Usage**
   - File: `client/src/pages/Landing.jsx`
   - Verify how `useLandingTrainings()` hook is consumed
   - Check if data is correctly passed to child components
   - Verify conditional rendering logic

### Phase 4: Component-Level Diagnosis
7. **Check Training Card Components**
   - Verify `InternalTrainingCard` and `ExternalTrainingCard` render correctly
   - Check if they have any internal filtering or display logic

8. **Verify Grid/Layout Logic**
   - Check if CSS or layout issues are hiding elements
   - Verify that mapping functions are iterating over all items

### Phase 5: Testing and Validation
9. **Create Test Scenarios**
   - Test with various limits (10, 20, 100) 
   - Test with different status filters
   - Test edge cases (no trainings, all draft, etc.)

10. **Verify Fix Against Seed Data**
    - Based on seed data:
      - Internal trainings: 10 total (4 published, 3 draft, 1 ongoing, 2 draft)
      - External trainings: 5 total (3 open, 2 draft)
    - Expected after fix:
      - Internal: 4 published trainings shown
      - External: 3 open trainings shown

## Risk Assessment
- **Low Risk**: Changes are isolated to one hook file
- **Medium Risk**: Status filtering might hide trainings that should be public
- **Low Risk**: Limit increase to 50 is reasonable for landing page

## Success Criteria
- Landing page displays correct number of trainings based on status filters
- Only appropriate status trainings are shown (published/internal, open/external)
- Loading and error states function correctly
- No regressions in existing functionality

## Required Tools
- MySQL client for database queries
- API testing tool (Postman/curl) or browser devtools
- React devtools for frontend inspection
- Console logging for debugging

## Estimated Time: 30-45 minutes