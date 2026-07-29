# TODO: Fix Department Field — Replace Number Input with Select Dropdown

- [x] Create `useDepartmentList` hook
- [x] Update `SOPBasicInfoForm.jsx` — Replace Department ID input with `<select>` dropdown
- [x] Update `CreateSOPModal.jsx` — Fetch departments and pass down
- [x] Update `SOPCreateWizard.jsx` — Fetch departments and pass down for both Basic Info and Assignment forms
- [x] Update `SOPAssignmentForm.jsx` — Replace Department ID input with `<select>` dropdown
- [x] Update `EditBasicInfoModal.jsx` — Add Department dropdown (was entirely missing!)
- [x] Create `useCategoryList` hook
- [x] Update `SOPBasicInfoForm.jsx` — Replace Category ID number input with `<select>` dropdown
- [x] Update `CreateSOPModal.jsx` and `SOPCreateWizard.jsx` to fetch and pass categories
- [x] Create server `categories.js` model and route
- [x] Register `/api/categories` route in server.js
- [x] Fix `sop.validator.js` — Remove required validation for nullable `category_id`

