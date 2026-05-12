# Phase 3: Frontend Integration Plan

**Date**: May 10, 2026  
**Backend Status**: ✅ Complete and running on port 3001  
**Frontend Status**: ✅ Structure complete, needs API integration  
**Current**: React 18.3.1 + Vite, using mock data

---

## Objective
Integrate React frontend with Node.js/Express backend APIs to create a fully functional PAFR system.

---

## Integration Tasks

### 1. Authentication System
**Status**: ❌ Not Started  
**Files to Create**:
- `src/contexts/AuthContext.jsx` - Auth state management
- `src/pages/Login.jsx` - Login page with form
- `src/hooks/useAuth.js` - Auth hook

**Files to Modify**:
- `src/App.jsx` - Add login route, auth provider, protected routes
- `src/services/api.js` - Enhance with auth endpoints

**Tasks**:
- [ ] Create AuthContext with login/logout logic
- [ ] Create Login component with form validation
- [ ] Implement protected route wrapper
- [ ] Add JWT token storage/retrieval
- [ ] Add logout functionality
- [ ] Handle token expiration

---

### 2. API Service Enhancement
**Status**: 🔄 Partially Complete  
**Files to Modify**:
- `src/services/api.js` - Add missing endpoints

**Tasks**:
- [ ] Add reservists CRUD endpoints
- [ ] Add trainings endpoints
- [ ] Add attendance endpoints
- [ ] Add readiness endpoints
- [ ] Add supplies endpoints
- [ ] Add reports endpoints
- [ ] Add alerts endpoints
- [ ] Add dashboard endpoints
- [ ] Add error interceptor
- [ ] Add loading/spinner logic

---

### 3. Core Pages Integration
**Status**: ❌ Not Started  
**Pages to Update** (replace mock data with API calls):
- [ ] Dashboard.jsx - Connect to `/api/dashboard`
- [ ] Reservists.jsx - Connect to `/api/reservists` CRUD
- [ ] Trainings.jsx - Connect to `/api/trainings`
- [ ] Attendance.jsx - Connect to `/api/attendance`
- [ ] Areas.jsx - Connect to `/api/areas`
- [ ] Analytics.jsx - Connect to `/api/readiness`
- [ ] Logistics.jsx - Connect to `/api/supplies`
- [ ] Reports.jsx - Connect to `/api/reports`

**Per Page Tasks**:
- [ ] Load data from API on mount
- [ ] Implement add/edit/delete operations
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success notifications

---

### 4. Error Handling & UX
**Status**: ❌ Not Started  
**Files to Create**:
- `src/components/ErrorBoundary.jsx` - Error boundary component
- `src/components/LoadingSpinner.jsx` - Loading indicator
- `src/components/Toast.jsx` - Notification component

**Files to Modify**:
- `src/services/api.js` - Add error interceptor
- `src/App.jsx` - Add error boundary wrapper

**Tasks**:
- [ ] Create error boundary component
- [ ] Create loading spinner component
- [ ] Create toast notification system
- [ ] Handle API errors gracefully
- [ ] Display validation error messages
- [ ] Show success/failure feedback

---

### 5. Environment Configuration
**Status**: ❌ Not Started  
**Files to Create**:
- `.env.development` - Dev environment variables
- `.env.production` - Prod environment variables

**Variables Needed**:
- `VITE_API_BASE_URL` - API base URL (http://localhost:3001/api for dev)

**Tasks**:
- [ ] Create environment files
- [ ] Update API service to use env variable
- [ ] Test with different environments

---

### 6. Form Handling & Validation
**Status**: 🔄 Partial  
**Existing Components** (need API integration):
- Reservist modals
- Training forms
- Attendance forms

**Tasks**:
- [ ] Connect forms to API endpoints
- [ ] Implement validation feedback
- [ ] Handle submission errors
- [ ] Add optimistic updates where appropriate
- [ ] Clear forms after successful submission

---

### 7. Testing & Verification
**Status**: ❌ Not Started  
**Tests to Create**:
- [ ] Login flow (valid/invalid credentials)
- [ ] Protected route access (redirects to login)
- [ ] CRUD operations for each entity
- [ ] Error scenarios
- [ ] Token refresh/expiration
- [ ] Form validation

**Manual Testing Checklist**:
- [ ] Start fresh, login required
- [ ] Create new reservist
- [ ] Edit reservist
- [ ] Delete reservist
- [ ] Filter and search
- [ ] View details
- [ ] Navigate between pages
- [ ] Verify persistence
- [ ] Check error messages

---

## Implementation Order

1. **Authentication** (High Priority)
   - Must have for access control
   - Blocks other integrations

2. **API Service** (High Priority)
   - Foundation for data flow
   - Needed by all pages

3. **Dashboard** (Medium Priority)
   - User's first view
   - Showcases data

4. **Core CRUD Pages** (High Priority)
   - Reservists, Trainings, Attendance
   - Most critical functionality

5. **Error Handling** (Medium Priority)
   - Improves UX
   - Should be throughout

6. **Advanced Features** (Low Priority)
   - Reports, Analytics
   - Can be phased

7. **Testing & Polish** (High Priority)
   - Verification
   - User acceptance

---

## Success Criteria

- ✅ Users can login with valid credentials
- ✅ Unauthorized users cannot access pages (redirect to login)
- ✅ All CRUD operations work end-to-end
- ✅ Data persists in database
- ✅ Errors display user-friendly messages
- ✅ Loading states visible during API calls
- ✅ No console errors
- ✅ Responsive design works
- ✅ Forms validate input
- ✅ Logout clears session

---

## Frontend API Integration Points

```
Frontend Requests → Axios interceptor (adds token)
                   ↓
           Backend API (port 3001)
                   ↓
             JWT validation
                   ↓
          RBAC authorization
                   ↓
             Database query
                   ↓
            Response with data
                   ↓
        Frontend receives data
```

---

## Database & State Flow

```
User Input (Form)
     ↓
Form Validation
     ↓
API Call (POST/PUT)
     ↓
Loading State = true
     ↓
Backend Processing
     ↓
Response (success/error)
     ↓
Loading State = false
     ↓
Update UI State
     ↓
Show Result (success toast/error message)
```

---

## Potential Issues & Mitigations

| Issue | Mitigation |
|-------|-----------|
| CORS errors | Already configured on backend |
| Token expiration | Implement refresh token logic |
| Lost connection | Implement retry logic with user feedback |
| Validation errors | Display field-level error messages |
| Race conditions | Disable submit button during loading |
| Stale data | Add refresh buttons, polling where needed |

---

## File Structure After Integration

```
client/src/
├── contexts/
│   ├── AuthContext.jsx       (NEW)
│   └── HierarchyContext.jsx  (EXISTING)
├── hooks/
│   ├── useAuth.js            (NEW)
│   ├── useTheme.js           (EXISTING)
│   └── useApi.js             (NEW - optional)
├── pages/
│   ├── Login.jsx             (NEW)
│   ├── Dashboard.jsx         (UPDATED)
│   ├── Reservists.jsx        (UPDATED)
│   ├── Trainings.jsx         (UPDATED)
│   └── ...                   (UPDATED)
├── components/
│   ├── ErrorBoundary.jsx     (NEW)
│   ├── LoadingSpinner.jsx    (NEW)
│   ├── Toast.jsx             (NEW)
│   └── ...                   (EXISTING)
├── services/
│   └── api.js                (UPDATED)
├── App.jsx                   (UPDATED)
└── main.jsx                  (EXISTING)
```

---

## Estimated Effort

| Task | Estimated Time |
|------|-----------------|
| Authentication System | 2-3 hours |
| API Service Enhancement | 1-2 hours |
| Dashboard Integration | 1-2 hours |
| Core CRUD Pages (5 pages) | 4-6 hours |
| Error Handling & UX | 2-3 hours |
| Form Integration | 2-3 hours |
| Testing & Verification | 2-3 hours |
| **Total** | **16-22 hours** |

---

## Next Steps

1. ✅ Review plan with team
2. Start Phase 3a: Authentication System
3. Implement API service enhancements
4. Integrate core pages
5. Add error handling
6. Comprehensive testing
7. Deploy to production

