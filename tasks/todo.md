# Task: Fix Attachment View Button in TrainingDetailsModal

## Problem
The "View" button for attachments in TrainingDetailsModal fails with a 501 Not Implemented error when clicked. The error occurs because the downloadInternalAttachment service function does not handle the response correctly and throws an unhandled promise rejection.

## Root Cause
1. The downloadInternalAttachment function in trainingsService.js returns raw response data without checking for success.
2. The server returns a 501 error indicating the endpoint is not implemented, but the service function doesn't handle error responses properly.
3. The component doesn't check the result of the downloadInternalAttachment call before trying to use the blob.

## Solution
1. Update downloadInternalAttachment in trainingsService.js to return a standardized response object with success/error handling.
2. Update the click handler in TrainingDetailsModal.jsx to check the result before setting the view modal state.

## Steps
- [x] Identify the root cause from error logs and code inspection
- [x] Modify downloadInternalAttachment to handle errors and return consistent response format
- [x] Update TrainingDetailsModal to handle the new response format
- [x] Verify the fix works by testing the view button (manual verification)
- [ ] Add tests if applicable (to be determined)
- [ ] Update documentation if needed (to be determined)

## Verification
- Check that the view button no longer throws an error in the console
- Verify that the attachment viewer opens correctly when the endpoint is functional
- Ensure error handling works when the endpoint returns an error

## Notes
- The service function now follows the same pattern as other functions in trainingsService.js
- The component now properly handles both success and error cases from the service call