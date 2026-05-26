## 2026-05-26 - Fix Attachment View Button Error

**Context**: The "View" button for attachments in TrainingDetailsModal was failing with a 501 Not Implemented error when clicked, causing an unhandled promise rejection.

**Mistake**: Assuming that the downloadInternalAttachment service function would handle errors internally and return a consistent response format like other functions in the service.

**Pattern**: Service functions should always return a standardized response object with success/error handling, and components should check the result before using returned data.

**Action**: Always verify that service functions return consistent response objects and handle both success and error cases in components before proceeding with data usage.