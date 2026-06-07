# RBAC Workflow Documentation

## Overview

This document describes the Role-Based Access Control (RBAC) system implemented in the Airforce System, including the authorization flow, scope-based data filtering, and modification guidelines.

## Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                        admin (Super Admin)                  │
│              Full system access, no restrictions             │
└─────────────────┬───────────────────┬───────────────────────┘
                  │                   │
┌─────────────────┴───────────────────┼───────────────────────┐
│        admin_arsen                   │    admin_group        │    admin_squadron      │
│  Can manage groups/squadrons        │  Can manage squadrons  │  Read-only squadron access │
│  within assigned ARSEN              │  within assigned group  │  within assigned squadron │
└─────────────────┬───────────────────┼───────────────────────┘
                  │                   │
                  └─────────┬─────────┘
                            │
                    ┌───────▼───────┐
                    │    reservist  │
                    │  Self-service │
                    │  view only    │
                    └───────────────┘
```

## Core Components

### 1. Authentication Middleware (`server/middleware/auth.js`)

**Key Functions:**
- `authenticateToken` - Validates JWT token, attaches user data to `req.user`
- `requireAdmin` - Any admin role can pass
- `requireSuperAdmin` - Only `admin` role passes
- `requireAdminOrHigher` - `admin`, `admin_arsen`, `admin_group` pass (for squadron data mutation)
- `requireAdminArsenOrHigher` - `admin`, `admin_arsen` pass (for reservist data mutation)

### 2. RBAC Middleware (`server/middleware/rbac.js`)

**Key Functions:**
- `authorize(...roles)` - Generic role check middleware
- `requireAdmin` - Shorthand middleware for any admin role
- `requireSuperAdmin` - Only super admin passes
- `requireAdminArsenOrHigher` - `admin`, `admin_arsen` pass (for reservist mutations)
- `checkOwnership(userIdField)` - Ownership verification (admins bypass)
- `getUserScopeFilter(user, columns)` - Returns SQL WHERE conditions for scope filtering
- `enforceScope(options)` - Middleware that sets `req.scopeFilter` for queries

### 3. User Management Hierarchy (`server/middleware/scopedUserManagement.js`)

Handles user-to-user management permissions and role assignment hierarchies.

**`ROLES_BY_HIERARCHY`:**
```javascript
const ROLES_BY_HIERARCHY = {
  admin: ['admin', 'admin_arsen', 'admin_group', 'admin_squadron', 'reservist'],
  admin_arsen: ['admin_group', 'admin_squadron', 'reservist', 'admin_arsen'],
  admin_group: ['admin_squadron', 'reservist', 'admin_group'],
  admin_squadron: ['reservist'],
  reservist: []
};
```

## Scope-Based Data Filtering

### `getUserScopeFilter` Function

**Purpose:** Generates SQL WHERE conditions based on user's scope assignment.

**Logic:**
```javascript
function getUserScopeFilter(user, columns) {
  // admin (super admin) → { conditions: [], params: [] }
  // admin_arsen (scope_arsen_id=5) → { conditions: ['arsen_id = ?'], params: [5] }
  // admin_group (scope_group_id=10) → { conditions: ['group_id = ?'], params: [10] }
  // admin_squadron (scope_squadron_id=25) → { conditions: ['squadron_id = ?'], params: [25] }
}
```

**Usage in Routes:**
```javascript
// squadron.js - GET list endpoint
if (req.user.role !== 'admin') {
  const { conditions, params: scopeP } = getUserScopeFilter(req.user, {
    squadron: 's.id',
    group: 's.group_id',
    arsen: 'g.arsen_id'
  });
  if (conditions.length > 0) {
    whereConditions.push('(' + conditions.join(' OR ') + ')');
    queryParams.push(...scopeP);
  }
}
```

## Authorization Patterns by Resource

### ARSENs (`server/routes/arsents.js`)
| Operation | Required Role | Scope Applied |
|-----------|---------------|---------------|
| GET list | any authenticated user | Yes (non-admin) |
| GET single | any authenticated user | N/A |
| POST | `admin` (super admin) | No |
| PUT | `admin` (super admin) | No |
| DELETE | `admin` (super admin) | No |

### Groups (`server/routes/groups.js`)
| Operation | Required Role | Scope Applied |
|-----------|---------------|---------------|
| GET list | `admin`, `admin_arsen`, `admin_group` | Yes (non-admin) |
| GET single | any authenticated user | N/A |
| POST | `admin`, `admin_arsen` | No (validates arsen_id exists) |
| PUT | `admin`, `admin_arsen` | No |
| DELETE | `admin`, `admin_arsen` | No |

### Squadrons (`server/routes/squadron.js`)
| Operation | Required Role | Scope Applied |
|-----------|---------------|---------------|
| GET list | any authenticated user | Yes (non-admin) |
| GET single | any authenticated user | N/A |
| POST | `admin`, `admin_arsen`, `admin_group` | No |
| PUT | `admin`, `admin_arsen`, `admin_group` | No |
| DELETE | `admin`, `admin_arsen`, `admin_group` | No |

### Reservists (`server/routes/reservists.js`)
| Operation | Required Role | Scope Applied |
|-----------|---------------|---------------|
| GET list | `admin`, `admin_arsen`, `admin_group` | Yes (non-admin) |
| GET single | `admin` or self (`reservist`) | Yes (unit admin) |
| POST | `admin`, `admin_arsen` | Yes (admin_arsen scoped to their ARSEN) |
| PUT | `admin`, `admin_arsen` | Yes (admin_arsen scoped to their ARSEN) |
| DELETE | `admin`, `admin_arsen` | Yes (admin_arsen scoped to their ARSEN) |
| assign | `admin`, `admin_arsen` | Yes (admin_arsen scoped to their ARSEN) |
| bulk upload | `admin`, `admin_arsen` | Yes (admin_arsen scoped to their ARSEN) |

## Modification Guidelines

### Adding a New Admin Role

1. **Update `server/middleware/auth.js`:**
   - Add role to `ADMIN_ROLES` array if applicable
   - Add new middleware if unique permission logic needed

2. **Update `server/middleware/rbac.js`:**
   - Add role to `ADMIN_ROLES` array

3. **Update `server/middleware/scopedUserManagement.js`:**
   - Add role to `VALID_ROLES` array
   - Add role to `ROLES_BY_HIERARCHY` object

4. **Update Database Migration:**
   - Ensure `users` table includes new role values

### Adding Scope-Based Filtering to a Route

```javascript
// Example: Adding scope to a new resource endpoint
router.get('/', authenticateToken, async (req, res) => {
  let whereConditions = [];
  let queryParams = [];

  // Apply scope filter for non-admin users
  if (req.user.role !== 'admin') {
    const { conditions, params } = getUserScopeFilter(req.user, {
      // Map your table's columns to scope types
      squadron: 'your_table.squadron_id',
      group: 'your_table.group_id',
      arsen: 'your_table.arsen_id'
    });
    if (conditions.length > 0) {
      whereConditions.push('(' + conditions.join(' OR ') + ')');
      queryParams.push(...params);
    }
  }
  // Continue with query...
});
```

### Adding Role Check to Frontend

```jsx
// Example: Conditional UI based on role
// For reservists: admin and admin_arsen can mutate
const canMutate = user?.role === 'admin' || user?.role === 'admin_arsen';

// For groups: admin and admin_arsen can mutate
const canManageGroups = user?.role === 'admin' || user?.role === 'admin_arsen';

return (
  <>
    {canMutate && (
      <PrimaryButton onClick={openAdd}>Add Item</PrimaryButton>
    )}
    {/* ...rest of component */}
  </>
);
```

## Related Files

| Category | File Path |
|----------|-----------|
| Core Auth | `server/middleware/auth.js` |
| Core RBAC | `server/middleware/rbac.js` |
| User Mgmt | `server/middleware/scopedUserManagement.js` |
| Squadrons | `server/routes/squadron.js` |
| Groups | `server/routes/groups.js` |
| ARSENs | `server/routes/arsents.js` |
| Reservists | `server/routes/reservists.js` |
| Organization | `server/routes/organization.js` |
| Frontend Auth | `client/src/contexts/AuthContext.jsx` |
| UI Components | `client/src/pages/airbase/ManageSquadrons.jsx` |

## Testing Considerations

- Test each role can access appropriate endpoints
- Test scope filtering doesn't leak data across boundaries
- Test `admin_squadron` has read-only access where appropriate
- Test `reservist` cannot access admin endpoints
- Test data isolation for unit admins across their scope boundaries