# Frontend Integration Guide

## Overview

This guide documents the frontend-backend integration for the PAFR system, covering authentication, API layer, and component connections.

## 1. Authentication Flow

### Login Process
1. User enters ID Number and password in Login.jsx
2. AuthContext calls `/api/auth/login` with credentials
3. Backend validates credentials and returns JWT token
4. Token stored in localStorage, user redirected to dashboard

### Protecting Routes
- Use `ProtectedRoute` component to wrap pages requiring authentication
- AuthContext provides `isAuthenticated`, `loading`, `user`, `login`, `logout` state

```jsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
}
```

## 2. API Service Layer

### Base Configuration
Located in `src/services/api.js`:
- Base URL from `VITE_API_BASE_URL` env variable
- Axios interceptors add JWT token to requests
- Response interceptor handles 401 errors (redirects to login)

### Available Endpoints

| Module | Endpoint | Methods |
|--------|----------|---------|
| Auth | `/auth/login` | POST |
| Auth | `/auth/logout` | POST |
| Auth | `/auth/profile` | GET |
| Reservists | `/reservists` | GET, POST |
| Reservists | `/reservists/:id` | GET, PUT, DELETE |
| Trainings | `/trainings` | GET, POST, PUT, DELETE |
| Attendance | `/attendance` | GET, POST, PUT |
| Supplies | `/supplies` | GET, POST, PUT, DELETE |
| Supplies | `/supplies/low-stock` | GET |
| Supplies | `/supplies/categories` | GET |

### Using API Functions
```jsx
import { getReservists, createReservist, deleteReservist } from '@/services/api';

// Fetch data
const response = await getReservists({ page: 1, limit: 25 });
const data = response.data.data;

// Create record
const newRes = await createReservist({ first_name: 'John', ... });

// Delete record
await deleteReservist(id);
```

## 3. Component Integration

### Reservists Page
- Loads data from `/api/reservists` on mount
- Supports search, filtering, pagination
- CRUD operations integrated with API

### Error Handling Components

**ErrorBoundary** - Wraps app to catch JavaScript errors:
```jsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Toast** - Notification system:
```jsx
import { useToast } from '@/components/Toast';

const { success, error, warning, info } = useToast();
success('Operation completed!');
error('Something went wrong');
```

**LoadingSpinner** - Loading indicator:
```jsx
import LoadingSpinner from '@/components/LoadingSpinner';

<LoadingSpinner size="lg" />
```

## 4. Environment Configuration

Create `.env.development` in client folder:
```
VITE_API_BASE_URL=http://localhost:3001/api
```

For production, create `.env.production`:
```
VITE_API_BASE_URL=/api
```

## 5. Testing the Integration

### Manual Testing Checklist
1. Start backend: `cd server && npm start`
2. Start frontend: `cd client && npm run dev`
3. Test login with valid credentials
4. Verify protected routes redirect when not authenticated
5. Test CRUD operations on Reservists page
6. Verify error messages display correctly

### Common Issues

**CORS Errors**: Backend already configured with CORS middleware

**401 Unauthorized**: Check if token is being sent correctly in request headers

**Network Errors**: Verify backend is running on port 3001

## 6. Data Flow

```
User Action (e.g., click Add)
  ↓
Component handler
  ↓
API call (createReservist)
  ↓
Backend validation → Database
  ↓
Response with new data
  ↓
Update local state (setData)
  ↓
UI re-renders with new data
```

## 7. Next Steps

- Connect remaining pages (Trainings, Attendance, Logistics) to APIs
- Implement form validation with proper error feedback
- Add optimistic updates for better UX
- Implement refresh token logic