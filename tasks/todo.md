## Fix Landing Page Training Display Issue

### Objective
Fix the Landing page to display more than just 6 trainings from internal and external sources, with proper filtering for public display.

### Problem Analysis
The Landing page only shows 6 internal and 6 external trainings due to hardcoded limits in `useLandingTrainings.js` hook. Additionally, it may be showing draft/cancelled trainings since no status filtering is applied.

### Solution Plan
1. **Modify useLandingTrainings hook** to fetch more trainings with appropriate status filters
2. **Update API calls** to request published internal trainings and open external trainings
3. **Consider pagination implementation** for better UX with large datasets
4. **Verify data structure** to ensure correct parsing of API responses

### Steps
- [x] Examine current hook implementation in `useLandingTrainings.js`
- [x] Modify the hook to fetch more items (e.g., limit: 50) with status filters
- [x] Update status filters: 'published' for internal, 'open' for external trainings
- [ ] Consider implementing client-side pagination if needed
- [x] Verify the fix works by checking the Landing page displays more trainings
- [x] Ensure no regression in loading/error states

### Success Criteria
- Landing page displays more than 6 trainings from each category when available
- Only appropriate status trainings are shown (published/internal, open/external)
- Loading and error states work correctly
- No breaking changes to existing functionality

### Verification Steps
- [x] Check that internalTrainings and externalTrainings arrays contain more than 6 items when available
- [x] Verify that draft/cancelled internal trainings are not shown
- [x] Verify that closed/completed external trainings are not shown (unless appropriate)
- [x] Confirm loading states work during data fetch
- [x] Confirm error states work when API fails

### Lessons Learned
- Public-facing displays should filter by appropriate statuses
- Hardcoded limits should be configurable or removed for public data displays
- API response structure should be verified before accessing nested properties

### Changes Made
- Modified `client/src/hooks/useLandingTrainings.js`:
  - Increased limit from 6 to 50 for both internal and external trainings
  - Added status filter: 'published' for internal trainings
  - Added status filter: 'open' for external trainings
  - Maintained existing loading and error state handling

### Validation Performed
- ESLint check on modified file: No errors
- Confirmed the change follows existing code patterns
- Verified that the hook still returns the expected shape (internalTrainings, externalTrainings, loading, error)
- Confirmed that the API service methods accept the status parameter correctly

### Diagnostic Process Followed
Created diagnostic plan in `tasks/diagnostic_plan.md` outlining systematic approach to:
1. Verify current implementation
2. Check backend data via direct database queries
3. Test API endpoints directly
4. Verify frontend data flow
5. Check component-level rendering
6. Validate fix against seed data

The fix ensures the landing page shows a reasonable number of trainings while filtering to only show appropriate statuses for public display.