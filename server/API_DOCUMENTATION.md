# PAFR Backend API Documentation

**Last Updated**: May 10, 2026  
**Status**: ✅ All core endpoints operational  
**Base URL**: `http://localhost:3001/api`

---

## API Overview

| Endpoint | Status | Description |
|----------|--------|-------------|
| `/health` | ✅ Operational | Server health check |
| `/auth` | ✅ Operational | Authentication (login/logout/register) |
| `/arsens` | ✅ Operational | ARSEN hierarchy management |
| `/groups` | ✅ Operational | Groups management (CRUD) |
| `/squadron` | ✅ Operational | Squadron management |
| `/areas` | ✅ Operational | Geographic areas management |
| `/reservists` | ✅ Operational | Reservist management (CRUD) |
| `/assignments` | ✅ Operational | Reservist assignments |
| `/trainings` | ✅ Operational | Training scheduling and management |
| `/attendance` | ✅ Operational | Attendance tracking |
| `/readiness` | ✅ Operational | Readiness assessments |
| `/supplies` | ✅ Operational | Supply inventory management |
| `/issuances` | ✅ Operational | Supply issuances tracking |
| `/reports` | ✅ Operational | Reports generation |
| `/alerts` | ✅ Operational | Alerts and notifications |
| `/audit-logs` | ✅ Operational | Audit logging |
| `/dashboard` | ✅ Operational | Dashboard data aggregation |
| `/settings` | ✅ Operational | System settings management |

---

## Core Entity APIs

### Authentication (`/api/auth`)
- `POST /login` - User login with credentials
- `POST /logout` - User logout
- `POST /register` - Create new user account
- **Auth Required**: Yes (for logout/register)

### ARSEN Management (`/api/arsens`)
- `GET /` - List all ARSENs with pagination
- `GET /:id` - Get specific ARSEN details
- `POST /` - Create new ARSEN (admin only)
- `PUT /:id` - Update ARSEN (admin only)
- `DELETE /:id` - Deactivate ARSEN (admin only)
- **Auth Required**: Yes (most operations require admin role)

### Groups Management (`/api/groups`)
- `GET /` - List all groups with filtering
- `GET /arsens/:arsenId/groups` - List groups under specific ARSEN
- `GET /:id` - Get specific group details
- `POST /` - Create new group (admin only)
- `PUT /:id` - Update group (admin only)
- `DELETE /:id` - Deactivate group (admin only)
- **Auth Required**: Yes (most operations require admin role)
- **Note**: Field names properly escaped for MySQL reserved keywords

### Areas Management (`/api/areas`)
- `GET /` - List all areas with hierarchical support
- `GET /:id` - Get specific area details
- `GET /:id/children` - Get child areas
- `POST /` - Create new area (admin only)
- `PUT /:id` - Update area (admin only)
- `DELETE /:id` - Deactivate area (admin only)
- **Auth Required**: Yes (most operations require admin role)

### Squadron Management (`/api/squadron`)
- `GET /` - List all squadrons
- `GET /:id` - Get specific squadron details
- `POST /` - Create new squadron (admin only)
- `PUT /:id` - Update squadron (admin only)
- `DELETE /:id` - Deactivate squadron (admin only)
- **Auth Required**: Yes (most operations require admin role)

---

## Business Logic APIs

### Reservist Management (`/api/reservists`)
- `GET /` - List all reservists with pagination, filtering, sorting
- `GET /:id` - Get specific reservist profile
- `POST /` - Create new reservist (admin only)
- `PUT /:id` - Update reservist information (**FIXED: backtick-escaped SQL columns**)
- `DELETE /:id` - Deactivate reservist (admin only)
- **Auth Required**: Yes (admin for most, reservist for own profile)
- **Filters**: status, group_id, squadron_id, rank, reserve_status, search
- **Sorting**: first_name, last_name, rank, service_number, created_at

### Reservist Assignments (`/api/assignments`)
- `GET /` - List all assignments (admin only)
- `GET /:id` - Get specific assignment
- `POST /` - Create assignment (admin only)
- `PUT /:id` - Update assignment (admin only)
- `DELETE /:id` - Remove assignment (admin only)
- **Auth Required**: Yes (admin role required)
- **Purpose**: Manage primary/secondary assignments to groups and squadrons

### Trainings Management (`/api/trainings`)
- `GET /` - List all training sessions with pagination
- `GET /:id` - Get specific training details
- `POST /` - Create new training (admin only)
- `PUT /:id` - Update training (admin only)
- `DELETE /:id` - Cancel training (admin only)
- **Auth Required**: Yes (admin for create/update/delete)
- **Fields**: title, description, start_date, end_date, venue, max_participants, status

### Attendance Tracking (`/api/attendance`)
- `GET /` - List attendance records with filtering
- `GET /:id` - Get specific attendance record
- `POST /` - Record attendance (admin/reservist)
- `PUT /:id` - Update attendance record (admin only)
- `DELETE /:id` - Remove attendance record (admin only)
- **Auth Required**: Yes
- **Features**: QR code support, real-time tracking, bulk import

### Readiness Assessments (`/api/readiness`)
- `GET /` - List readiness records
- `GET /:id` - Get specific readiness assessment
- `POST /` - Create readiness assessment (admin only)
- `PUT /:id` - Update assessment (admin only)
- **Auth Required**: Yes (admin for create/update)
- **Assessments**: Medical, Physical, Weapons, Overall readiness scores

### Supply Management (`/api/supplies`)
- `GET /` - List all supplies with pagination
- `GET /:id` - Get specific supply item
- `POST /` - Add new supply item (admin only)
- `PUT /:id` - Update supply information (admin only)
- `DELETE /:id` - Remove supply item (admin only)
- **Auth Required**: Yes (admin for modifications)
- **Tracking**: Stock levels, categories, reorder points

### Supply Issuances (`/api/issuances`)
- `GET /` - List all issuances
- `GET /:id` - Get specific issuance record
- `POST /` - Record supply issuance (admin only)
- `PUT /:id` - Update issuance (admin only)
- **Auth Required**: Yes (admin)
- **Features**: Audit trail, recipient tracking, quantity management

---

## Advanced Features APIs

### Reports Generation (`/api/reports`)
- `GET /` - List available reports
- `GET /generate/:type` - Generate report (async)
- `GET /download/:reportId` - Download generated report
- `POST /schedule` - Schedule automated report (admin only)
- **Auth Required**: Yes
- **Formats**: PDF, Excel, CSV
- **Types**: Attendance, Readiness, Training, Personnel, Logistics

### Alerts & Notifications (`/api/alerts`)
- `GET /` - List active alerts
- `GET /user/:userId` - Get user-specific alerts
- `POST /` - Create alert (admin only)
- `PUT /:id` - Update alert status
- `DELETE /:id` - Remove alert (admin only)
- **Auth Required**: Yes
- **Targeting**: Broadcast, role-based, individual users

### Audit Logging (`/api/audit-logs`)
- `GET /` - List audit logs with filtering
- `GET /:id` - Get specific audit entry
- `GET /user/:userId` - Get user's activity logs
- **Auth Required**: Yes (admin for full access)
- **Tracking**: User actions, entity changes, IP addresses, timestamps

### System Settings (`/api/settings`)
- `GET /` - Get all system settings
- `GET /:key` - Get specific setting
- `PUT /:key` - Update setting (admin only)
- **Auth Required**: Yes (admin for updates)
- **Scope**: Organization-wide configuration

### Dashboard Data (`/api/dashboard`)
- `GET /` - Get dashboard metrics
- `GET /admin` - Admin dashboard summary
- `GET /reservist` - Reservist dashboard summary
- **Auth Required**: Yes
- **Data**: KPIs, attendance metrics, readiness scores, training progress

---

## Common Features

### Pagination
Most list endpoints support pagination:
```
GET /api/reservists?page=1&limit=25
```

### Filtering
Endpoints support role-based and status filtering:
```
GET /api/reservists?status=active&rank=Lieutenant&group_id=5
```

### Sorting
Many endpoints support sorting:
```
GET /api/reservists?sort_by=last_name&sort_order=asc
```

### Response Format
**Success Response (200/201):**
```json
{
  "status": "success",
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "pages": 4
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

---

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Authentication

### JWT Token
Endpoints use JWT (JSON Web Tokens) for authentication:
```
Authorization: Bearer <token>
```

### Roles
- **admin**: Full system access
- **reservist**: Limited to own records and public data

---

## Database Integration

- **Type**: MySQL (5.7+)
- **Connection Pool**: 10 connections
- **Charset**: utf8mb4 (Unicode support)
- **Timezone**: UTC

### Reserved Keywords Handling
All SQL queries properly escape reserved keywords using backticks:
```sql
UPDATE reservists SET `rank` = ? WHERE id = ?
```

---

## Testing

Run the comprehensive API test suite:
```bash
node test-api.js
```

**Test Coverage**: 16 endpoint health checks  
**Last Run**: May 10, 2026  
**Status**: ✅ All tests passing

---

## Performance Notes

- Connection pooling enabled (10 concurrent)
- Audit logging asynchronous
- Report generation queued
- Search queries indexed on common fields
- Response compression available

---

## Security Features

- ✅ JWT authentication
- ✅ Role-based access control (RBAC)
- ✅ Input validation (express-validator)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Audit trail logging
- ✅ CORS configured
- ✅ Rate limiting ready for implementation

---

## Future Enhancements

- [ ] Rate limiting middleware
- [ ] Request caching
- [ ] Webhook support for alerts
- [ ] GraphQL endpoint
- [ ] Batch operations
- [ ] WebSocket real-time updates
- [ ] API versioning (v2)

