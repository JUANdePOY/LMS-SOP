# System Structure & Architecture

> **Purpose**: This document defines the complete system architecture, data model, and functional requirements for the PAFR (Personnel & Attendance Force Readiness) system. It serves as the single source of truth for all development work.

**Last Updated**: 2026-05-01  
**Version**: 1.0

---

## Environment Context

### Target Environment
- **Web Server Stack**: WAMP (Windows, Apache, MySQL/MariaDB, PHP)
- **Database**: MySQL (bundled with WAMPServer, typically MySQL 5.7+ or MariaDB 10.4+)
- **Development Server**: Localhost via WAMPServer (http://localhost or http://localhost:port)
- **Management Tool**: phpMyAdmin (typically at http://localhost/phpmyadmin)
- **OS**: Windows

### Database Configuration (WAMP-Specific)
- **Default MySQL Host**: `localhost`
- **Default Port**: `3306` (may vary if multiple MySQL instances)
- **Root User**: `root`
- **Default Password**: (none) — set during WAMPServer installation
- **Database Directory**: `D:\Wampp64\bin\mysql\mysqlX.X\data\` (default WAMP installation path)
- **Character Set**: utf8mb4 (recommended for full Unicode support including emojis)
- **Collation**: utf8mb4_unicode_ci

### Development Considerations
- **File Paths**: Windows paths (backslashes) for any filesystem operations
- **Line Endings**: CRLF on Windows (consistent with git config)
- **PHP Version**: Check WAMPServer PHP version (7.4+, 8.0+ recommended)
- **Apache Rewrite Module**: Ensure `mod_rewrite` enabled for clean URLs

### Deployment Target
- Initial development: Local WAMP instance
- Production migration: **Not WAMP** — migrate to Linux-based production (Ubuntu/Debian + Nginx + MySQL/MariaDB)
- Database dumps must be compatible across platforms (avoid Windows-specific path references)
---

0. [Environment Context](#environment-context)
1. [Core Entities & Relationships](#1-core-entities--relationships)
2. [Required Pages (by Role)](#2-required-pages-by-role)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Backend API Requirements](#4-backend-api-requirements)
5. [Database Schema](#5-database-schema)
6. [Non-functional Requirements](#6-non-functional-requirements)
   - 6.1 [WAMP-Specific Constraints](#61-wamp-specific-constraints)
7. [Deliverables](#7-deliverables)
8. [Development Notes](#8-development-notes)
9. [System Improvements & Recommendations](#9-system-improvements--recommendations)
10. [Open Questions & Decisions Needed](#10-open-questions--decisions-needed)
11. [Appendices](#11-appendices)
    - A. [WAMP Development Setup Guide](#a-wamp-development-setup-guide)
    - B. [Technology Stack Summary](#b-technology-stack-summary-suggested)
    - C. [Number of Servers Required](#c-number-of-servers-required-estimate)

---

## 1. Core Entities & Relationships

### Hierarchy Structure
```
ARSEN (top-level unit, e.g., ARSEN-1)
└── Group (belongs to exactly one ARSEN)
    └── City (belongs to exactly one Group)
        └── Reservist (primary assignment: Group + City combination)
```

### Entity Definitions

#### ARSEN
- Top-level organizational unit
- Code (e.g., "ARSEN-1"), name, location
- May contain multiple Groups

#### Group
- Belongs to single ARSEN
- Name, code
- Manages multiple Cities

#### City
- Belongs to single Group
- Name, province
- Geographic assignment unit

#### Reservist
- Associated with exactly one user account (role = reservist)
- Primary assignment: Group + City
- Personal data: first/last name, rank, service number, etc.
- Can be active or inactive

#### Areas
- Geographical/operational areas
- Hierarchical (parent-child relationships)
- Used for territorial assignments or operational zones

#### Trainings
- Scheduled training events
- Contains multiple Activities
- Properties: title, start/end datetime, venue, status (planned, ongoing, completed, cancelled)
- Linked to Attendance records

#### Activities
- Sub-events within a Training
- Properties: title, start_time, end_time
- Allow granular scheduling

#### Attendance
- Tracks reservist presence per training
- Status: present, absent, late, excused
- Check-in/check-out timestamps (optional location/QR support)

#### Readiness
- Periodic assessment records
- Components: medical_status, physical_score, weapons_qualification
- Overall readiness_score = average of components
- assessment_date tracks when evaluation occurred

#### Logistics & Supplies
- **Supplies**: inventory items (name, category, quantity_available, reorder_level)
- **Supply Issuances**: records of items issued to reservists
  - due_return_date, returned flag
  - Track current inventory levels

#### Reports
- Generated PDF/Excel files
- Types: attendance, readiness, logistics
- Stored with file_path, generated_by user, creation timestamp

#### Alerts
- System notifications
- Properties: title, message, target_role (admin/reservist), is_active
- User-specific read status via user_alerts join table

#### System Settings
- Configurable application parameters
- Key-value store (key, value)
- Settings like QR code enabled, notification preferences, etc.

---

## 2. Required Pages (by Role)

### Admin Pages (Full CRUD Access)

#### Dashboard
- Overview metrics:
  - Total reservists (active count)
  - Upcoming trainings (next 7 days)
  - Attendance rate (last 30 days average)
  - Low stock alerts (supplies below reorder_level)
  - Readiness trends (chart - last 6 months)
- Quick actions shortcuts

#### Reservists Management
- List view with filters (by Group, City, status)
- Create/Edit/Delete reservist records
- Assign to Group + City (primary assignment)
- Activate/Deactivate status (soft delete)
- Reset password functionality
- Bulk import via CSV (recommended improvement)

#### Groups & Units
- Manage ARSENs, Groups, Cities hierarchy
- CRUD for each level
- View assignments (which reservists belong to which Group/City)
- Hierarchy tree view (recommended improvement)

#### Areas
- Hierarchical CRUD with parent-child relationships
- Tree structure editor
- Assign reservists to areas (optional enhancement)

#### Trainings & Activities
- Create/Update/Cancel trainings
- Add/Edit/Delete activities within training
- Manage venues (could link to Areas or separate locations)
- Status workflow: Draft → Published → In Progress → Completed
- Notify affected reservists on changes (recommended automation)

#### Attendance
- Mark attendance per training (bulk operations)
- View per-training attendance lists with filters
- Export attendance as CSV/Excel
- Edit attendance records (with audit trail)
- QR code check-in/out interface (optional enhancement)

#### Readiness & Analytics
- Assess reservists (medical, physical, weapons)
- Bulk upload scores (recommended improvement)
- Unit-wise readiness heatmaps
- Trend charts (per Group/City/ARSEN)
- Identify reservists below threshold
- Automated notifications for upcoming expirations

#### Logistics & Supplies
- Inventory management:
  - Add/Update/Delete supply items
  - Adjust stock levels (manual adjustments with reason)
  - Low stock alerts listing
- Issue supplies to reservists
- Track returns and late returns
- Reservist supply history
- Supply usage analytics

#### Reports
- Generate reports (attendance, readiness, logistics)
- Schedule recurring reports (recommended improvement)
- Download PDF/Excel
- Preview before download
- Email delivery option (recommended enhancement)

#### Alerts
- Create broadcast alerts (training reminders, medical deadlines)
- Target by role, Group, City, or all
- Set active/inactive, start/end dates
- Expire old alerts automatically (scheduled job)
- View alert read receipts

#### System
- Audit logs (user actions, timestamp, IP)
- User activity monitoring (login history)
- System health checks
- Database backup/restore interface (admin-only)

#### Settings
- Application-wide settings
- Role permissions matrix (fine-grained control)
- QR code settings for attendance
- Notification templates
- Email configuration

### Reservist Pages

#### Dashboard
- Personal summary:
  - Upcoming trainings (next 7 days)
  - Own readiness score (and breakdown)
  - Pending alerts (unread count)
  - Issued supplies (pending returns)
- Quick links

#### My Profile
- View personal information
- Edit profile (subject to approval workflow optional)
- Upload documents (medical certificates, etc.)
- Change password

#### My Trainings
- View schedule
- Register/Unregister for upcoming trainings
- Download training materials (documents, agendas)
- View attendance history for past trainings

#### My Attendance
- View attendance history (all trainings)
- Check-in/Check-out (if location/QR enabled)
- Attendance summary by month/year

#### My Readiness
- View readiness status and component scores
- Historical trends
- Improvement tips/recommendations (rule-based)
- Upload supporting documents

#### My Supplies
- Request supplies (form with justification)
- View issued items and due dates
- Request return extension
- Mark items as returned (if manual process)

#### Alerts
- View all alerts (admin broadcasts)
- Mark as read/unread
- Archive old alerts

#### Settings
- Change password
- Notification preferences (email, in-app)
- Privacy settings (optional)

---

## 3. Authentication & Authorization

### Authentication
- **Method**: JWT (JSON Web Token) based
- **Flow**: Login → receive access_token + refresh_token
- **Token Storage**: HTTP-only cookies (secure) or localStorage with proper XSS protection
- **Token Expiry**: Access token ~15-30 minutes, refresh token longer with rotation
- **Logout**: Invalidate token on server, clear client storage

### Authorization
- **Two roles**: admin, reservist
- **Admin**: Full access to all admin pages and reservist data
- **Reservist**: Access only to own data and public pages
- **Route Protection**: Frontend (React Router guards) + Backend (middleware decorators)

### Password Security
- **Hashing**: bcrypt (cost factor 10-12)
- **Reset Flow**: Token-based email link with expiry (1 hour)
- **Change Password**: Requires current password verification
- **Password Policy**: Minimum length, complexity rules (configurable)

### Session Management
- Concurrent session tracking (optional)
- Device fingerprinting (optional security enhancement)
- Automatic logout on inactivity (configurable timeout)

---

## 4. Backend API Requirements

### Architecture Style
**RESTful** API with consistent patterns:
- Resource-based URLs
- HTTP verbs: GET, POST, PUT/PATCH, DELETE
- JSON request/response bodies
- Standard HTTP status codes

### Core Endpoint Categories

#### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/change-password
POST   /api/auth/request-reset
POST   /api/auth/reset-password
GET    /api/auth/me (current user info)
```

#### Reservists
```
GET    /api/reservists                    (list with filters, pagination)
GET    /api/reservists/:id                (detail)
POST   /api/reservists                    (create)
PUT    /api/reservists/:id                (update)
DELETE /api/reservists/:id                (soft delete - deactivate)
GET    /api/reservists/:id/assignments    (assignment history)
POST   /api/reservists/:id/assign         (assign to Group/City)
POST   /api/reservists/:id/reset-password (admin reset)
GET    /api/reservists/export             (bulk export)
POST   /api/reservists/import             (bulk import)
```

#### Groups, ARSENs, Cities
```
# ARSENs
GET    /api/arsens                        (list)
GET    /api/arsens/:id                    (detail)
POST   /api/arsens                        (create)
PUT    /api/arsens/:id                    (update)
DELETE /api/arsens/:id                    (delete)

# Groups
GET    /api/groups                        (list, filter by arsens_id)
GET    /api/groups/:id                    (detail)
POST   /api/groups                        (create)
PUT    /api/groups/:id                    (update)
DELETE /api/groups/:id                    (delete)
GET    /api/groups/:id/cities             (nested cities)

# Cities
GET    /api/cities                        (list, filter by group_id)
GET    /api/cities/:id                    (detail)
POST   /api/cities                        (create)
PUT    /api/cities/:id                    (update)
DELETE /api/cities/:id                    (delete)
```

#### Areas
```
GET    /api/areas                         (tree structure or flat)
GET    /api/areas/:id                     (detail with children)
POST   /api/areas                         (create with parent_id)
PUT    /api/areas/:id                     (update)
DELETE /api/areas/:id                     (delete, check for children)
GET    /api/areas/:id/descendants         (get subtree)
```

#### Trainings & Activities
```
# Trainings
GET    /api/trainings                     (list with filters, pagination)
GET    /api/trainings/:id                 (detail with activities)
POST   /api/trainings                     (create)
PUT    /api/trainings/:id                 (update)
DELETE /api/trainings/:id                 (cancel/delete)
GET    /api/trainings/upcoming            (filter by date)
GET    /api/trainings/:id/attendees       (list of assigned reservists)

# Activities
POST   /api/trainings/:id/activities      (create)
PUT    /api/activities/:id                (update)
DELETE /api/activities/:id                (delete)
```

#### Attendance
```
GET    /api/attendance                    (list with filters: training_id, reservist_id, date range)
POST   /api/attendance                    (record attendance for multiple reservists)
PUT    /api/attendance/:id                (update single record)
GET    /api/attendance/training/:id       (get attendance for specific training)
GET    /api/attendance/reservist/:id      (get history for reservist)
POST   /api/attendance/check-in           (QR/location check-in)
POST   /api/attendance/check-out          (QR/location check-out)
GET    /api/attendance/export/:trainingId (export CSV)
```

#### Readiness
```
GET    /api/readiness                     (list with filters)
GET    /api/readiness/:id                 (detail)
POST   /api/readiness                     (create assessment)
PUT    /api/readiness/:id                 (update assessment)
GET    /api/readiness/reservist/:id       (get all assessments for reservist)
GET    /api/readiness/latest/reservist/:id (get latest score)
GET    /api/readiness/analytics           (aggregated analytics, heatmaps)
```

#### Analytics & Dashboard
```
GET    /api/dashboard/summary             (admin dashboard metrics)
GET    /api/dashboard/reservist           (reservist personal summary)
GET    /api/analytics/attendance-rate     (grouped by Group/City/Period)
GET    /api/analytics/readiness-trends    (over time)
GET    /api/analytics/training-compliance (per reservist/group)
```

#### Logistics
```
# Supplies
GET    /api/supplies                      (list with stock filters)
GET    /api/supplies/:id                  (detail with stock history)
POST   /api/supplies                      (create)
PUT    /api/supplies/:id                  (update)
DELETE /api/supplies/:id                  (delete)
GET    /api/supplies/low-stock            (items below reorder level)
POST   /api/supplies/adjust-stock         (manual adjustment)

# Supply Issuances
GET    /api/issuances                     (list with filters)
GET    /api/issuances/:id                 (detail)
POST   /api/issuances                     (issue supplies to reservist)
PUT    /api/issuances/:id                 (update return status)
GET    /api/issuances/reservist/:id       (reservist's issued items)
GET    /api/issuances/overdue             (unreturned past due date)
```

#### Reports
```
POST   /api/reports/generate              (async job create)
GET    /api/reports                       (list of generated reports)
GET    /api/reports/:id                   (download file)
DELETE /api/reports/:id                   (delete file and record)
POST   /api/reports/schedule              (schedule recurring)
GET    /api/reports/templates             (available report templates)
```

#### Alerts
```
GET    /api/alerts                        (list with filters)
GET    /api/alerts/:id                    (detail)
POST   /api/alerts                        (create broadcast)
PUT    /api/alerts/:id                    (update)
DELETE /api/alerts/:id                    (delete)
GET    /api/alerts/unread                 (unread count for user)
POST   /api/alerts/:id/read               (mark as read)
POST   /api/alerts/mark-all-read          (mark all as read)
```

#### System Settings
```
GET    /api/settings                      (all settings or by key)
PUT    /api/settings/:key                 (update setting)
GET    /api/settings/permissions          (role permissions matrix)
PUT    /api/settings/permissions          (update permissions)
```

#### Audit Logs
```
GET    /api/audit-logs                    (list with filters by user, action, date)
GET    /api/audit-logs/:id                (detail)
```

### Common Requirements for ALL List Endpoints
- **Pagination**: `?page=1&limit=25` (default 25, max 100)
- **Filtering**: `?field=value` (multiple allowed)
- **Sorting**: `?sort_by=field&sort_order=asc|desc` (default created_at DESC)
- **Search**: `?q=keyword` (full-text search where applicable)
- **Fields selection**: `?fields=id,name,email` (optional - reduce payload)

---

## 5. Database Schema

### Compatibility Requirements
- **Minimum MySQL Version**: 5.7.8+ (for JSON support, generated columns)
- **Recommended**: MySQL 8.0+ or MariaDB 10.6+ (bundled with latest WAMPServer)
- **Storage Engine**: InnoDB (required for foreign keys and transactions)
- **Character Set**: utf8mb4 (full Unicode including emojis)
- **SQL Mode**: Only strict mode recommended (no ANSI_QUOTES unless needed)

### Version-Specific Adjustments

**If using MySQL 5.7 (older WAMP)**:
- Remove `UNIQUE KEY uk_reservist_primary (reservist_id, is_primary) WHERE is_primary = TRUE` — replace with unique index on `(reservist_id)` and enforce uniqueness in application logic
- `JSON` columns still supported, but limited indexing capabilities
- `GENERATED ALWAYS AS` computed columns work in 5.7+

**If using MariaDB (MariaDB 10.2+)**:
- `JSON` support via `LONGTEXT` alias — behaves similarly
- Generated columns supported
- All standard indexes work, but `WHERE` clause indexes only in MariaDB 10.0.5+

**If using MySQL 8.0+ (modern WAMP/standalone)**:
- Full feature set available including `CREATE INDEX ... WHERE` partial indexes
- Window functions if analytics queries need them
- Role-based privileges for finer access control

**Check Version**:
```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'version%';
```

### Tables

#### users
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'reservist') NOT NULL DEFAULT 'reservist',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### reservists
```sql
CREATE TABLE reservists (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    rank VARCHAR(50) NOT NULL,
    service_number VARCHAR(100) UNIQUE NOT NULL,
    date_of_birth DATE NULL,
    phone_number VARCHAR(20) NULL,
    emergency_contact_name VARCHAR(200) NULL,
    emergency_contact_phone VARCHAR(20) NULL,
    address TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_service_number (service_number),
    INDEX idx_name (last_name, first_name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### arsens
```sql
CREATE TABLE arsens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(500) NULL,
    commander_name VARCHAR(200) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### groups
```sql
CREATE TABLE groups (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    arsen_id BIGINT NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    commander_name VARCHAR(200) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (arsen_id) REFERENCES arsens(id) ON DELETE CASCADE,
    UNIQUE KEY uk_group_code (arsen_id, code),
    INDEX idx_arsen (arsen_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### cities
```sql
CREATE TABLE cities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    INDEX idx_group (group_id),
    INDEX idx_province (province)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### reservist_assignments
```sql
CREATE TABLE reservist_assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    city_id BIGINT NOT NULL,
    assigned_date DATE NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
    UNIQUE KEY uk_reservist_primary (reservist_id, is_primary) WHERE is_primary = TRUE,
    INDEX idx_group_city (group_id, city_id),
    INDEX idx_reservist (reservist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### areas
```sql
CREATE TABLE areas (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_area_id BIGINT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NULL,
    geographic_boundary JSON NULL,  -- GeoJSON for coordinates
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_area_id) REFERENCES areas(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_area_id),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### trainings
```sql
CREATE TABLE trainings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    venue VARCHAR(500) NOT NULL,
    area_id BIGINT NULL,
    status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    capacity INT NULL,  -- optional limit
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    CHECK (end_datetime > start_datetime),
    INDEX idx_status (status),
    INDEX idx_dates (start_datetime, end_datetime),
    INDEX idx_area (area_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### activities
```sql
CREATE TABLE activities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    training_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    location VARCHAR(500) NULL,  -- can override training venue
    instructor VARCHAR(200) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    CHECK (end_time > start_time),
    INDEX idx_training (training_id),
    INDEX idx_timing (start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### attendance
```sql
CREATE TABLE attendance (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    training_id BIGINT NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused', 'pending') NOT NULL DEFAULT 'pending',
    check_in_time DATETIME NULL,
    check_out_time DATETIME NULL,
    location_check_in JSON NULL,  -- GeoJSON location
    qr_code_used VARCHAR(255) NULL,  -- token for verification
    notes TEXT NULL,
    recorded_by BIGINT NULL,  -- admin who marked attendance
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    UNIQUE KEY uk_reservist_training (reservist_id, training_id),
    INDEX idx_training_status (training_id, status),
    INDEX idx_reservist (reservist_id),
    INDEX idx_dates (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### readiness
```sql
CREATE TABLE readiness (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    assessment_date DATE NOT NULL,
    medical_status ENUM('fit', 'unfit', 'limited', 'pending') NOT NULL DEFAULT 'pending',
    medical_notes TEXT NULL,
    physical_score DECIMAL(5,2) NOT NULL,  -- 0-100 scale
    physical_test_date DATE NULL,
    weapons_qualification ENUM('expert', 'sharpshooter', 'marksman', 'qualified', 'unqualified', 'none') DEFAULT 'none',
    weapons_test_date DATE NULL,
    overall_score DECIMAL(5,2) GENERATED ALWAYS AS (
        ROUND(
            (CASE WHEN medical_status = 'fit' THEN 100
                  WHEN medical_status = 'limited' THEN 70
                  WHEN medical_status = 'pending' THEN 50
                  ELSE 0 END
             + physical_score
             + CASE weapons_qualification
                WHEN 'expert' THEN 100
                WHEN 'sharpshooter' THEN 90
                WHEN 'marksman' THEN 80
                WHEN 'qualified' THEN 70
                ELSE 0 END
            ) / 3, 2)
    ) STORED,
    assessed_by BIGINT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    FOREIGN KEY (assessed_by) REFERENCES users(id),
    UNIQUE KEY uk_reservist_date (reservist_id, assessment_date),
    INDEX idx_reservist (reservist_id),
    INDEX idx_assessment_date (assessment_date),
    INDEX idx_overall_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### supplies
```sql
CREATE TABLE supplies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    unit VARCHAR(20) NOT NULL,  -- e.g., 'pcs', 'boxes', 'liters'
    quantity_available INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    max_stock INT NULL,  -- optional upper limit
    location VARCHAR(200) NULL,  -- storage location
    supplier VARCHAR(200) NULL,
    last_ordered_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_name (name),
    INDEX idx_low_stock (quantity_available, reorder_level) WHERE quantity_available <= reorder_level
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### supply_issuances
```sql
CREATE TABLE supply_issuances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    supply_id BIGINT NOT NULL,
    quantity_issued INT NOT NULL,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_return_date DATE NOT NULL,
    returned_date DATE NULL,
    returned_quantity INT NULL,  -- for partial returns
    condition_on_issue ENUM('new', 'good', 'fair', 'poor') DEFAULT 'good',
    condition_on_return ENUM('new', 'good', 'fair', 'poor', 'damaged') NULL,
    issued_by BIGINT NOT NULL,
    received_by BIGINT NULL,  -- reservist signature/user id
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id),
    FOREIGN KEY (received_by) REFERENCES users(id),
    CHECK (returned_quantity IS NULL OR returned_quantity <= quantity_issued),
    INDEX idx_reservist (reservist_id),
    INDEX idx_supply (supply_id),
    INDEX idx_due_date (due_return_date),
    INDEX idx_overdue (due_return_date, returned_date) WHERE returned_date IS NULL AND due_return_date < CURRENT_DATE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### reports
```sql
CREATE TABLE reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    type ENUM('attendance', 'readiness', 'logistics', 'custom') NOT NULL,
    format ENUM('pdf', 'excel', 'csv') NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INT NULL,
    parameters JSON NULL,  -- report filters/parameters used
    generated_by BIGINT NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,  -- for scheduled reports
    is_recurring BOOLEAN DEFAULT FALSE,
    schedule_pattern VARCHAR(100) NULL,  -- cron expression or 'daily', 'weekly'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id),
    INDEX idx_type (type),
    INDEX idx_generated_at (generated_at),
    INDEX idx_generated_by (generated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### alerts
```sql
CREATE TABLE alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    target_role ENUM('admin', 'reservist', 'all') NOT NULL DEFAULT 'all',
    target_group_id BIGINT NULL,  -- optional specific group
    target_city_id BIGINT NULL,   -- optional specific city
    target_area_id BIGINT NULL,   -- optional specific area
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (target_group_id) REFERENCES groups(id) ON DELETE SET NULL,
    FOREIGN KEY (target_city_id) REFERENCES cities(id) ON DELETE SET NULL,
    FOREIGN KEY (target_area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_target (target_role, target_group_id, target_city_id),
    INDEX idx_active_dates (is_active, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### user_alerts
```sql
CREATE TABLE user_alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    alert_id BIGINT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_alert (user_id, alert_id),
    INDEX idx_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### system_settings
```sql
CREATE TABLE system_settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` JSON NOT NULL,  -- flexible JSON for complex settings
    description TEXT NULL,
    updated_by BIGINT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,  -- can be NULL for system actions
    action VARCHAR(100) NOT NULL,  -- e.g., 'reservist.created', 'attendance.updated'
    entity_type VARCHAR(50) NOT NULL,  -- e.g., 'reservist', 'training'
    entity_id BIGINT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### WAMP-Specific Notes
- **Engine**: All tables use `InnoDB` for transaction support and foreign keys
- **Default Charset**: `utf8mb4` with `utf8mb4_unicode_ci` collation (WAMPServer default may be `latin1` — change if needed)
- **Auto-increment**: MySQL default OK (starts at 1)
- **JSON Support**: MySQL 5.7+ required for JSON columns (WAMPServer typically includes 5.7+)
- **Generated Columns**: `overall_score` in `readiness` uses MySQL 5.7+ generated column syntax
- **Partial Indexes**: `WHERE` clause indexes require MySQL 8.0+ (MariaDB 10.0+). If using older MySQL, drop partial index conditions and use NULL checks in queries instead

### Recommended Indexes (Additional)
```sql
-- Composite indexes for common filters
CREATE INDEX idx_reservist_active_assignments ON reservist_assignments(reservist_id, is_primary, group_id, city_id);
CREATE INDEX idx_attendance_training_reservist ON attendance(training_id, reservist_id, status);
CREATE INDEX idx_readiness_reservist_date ON readiness(reservist_id, assessment_date DESC);
CREATE INDEX idx_issuances_reservist_due ON supply_issuances(reservist_id, returned_date, due_return_date);
CREATE INDEX idx_trainings_dates_status ON trainings(start_datetime, status);
```

---

## 6. Non-functional Requirements

### Security
- **HTTPS mandatory** in production (TLS 1.2+)
- **Input validation**: Server-side validation on all endpoints
- **SQL injection prevention**: Use prepared statements/ORM
- **Rate limiting**: Per IP/user (e.g., 100 requests/15 minutes)
- **CSRF protection**: For state-changing operations
- **XSS prevention**: Output encoding, Content-Security-Policy headers
- **CORS**: Configured for specific origins only
- **Sensitive data encryption**: At rest for PII fields (optional compliance requirement)

### Performance
- **Database indexes**: As specified per table, plus query-based indexing
- **Pagination**: All list endpoints (default 25, max 100)
- **Caching**: Redis for frequently accessed data (dashboard metrics, lookup tables)
- **CDN**: Static assets (images, PDFs)
- **Database connection pooling**: Proper sizing
- **Query optimization**: Avoid N+1 queries, use joins appropriately
- **Frontend**: React Query for data fetching with cache invalidation

### Scalability Considerations
- Horizontal scaling: stateless backend servers
- Database read replicas for reporting queries
- Async task queue for heavy operations (report generation, email sending)
- File storage: S3-compatible object storage or dedicated file server

### Availability & Reliability
- Health check endpoints (`/health`, `/ready`)
- Graceful degradation when optional services down
- Database backups (automated daily minimum)
- Logging: structured logs (JSON) with correlation IDs
- Error tracking: Sentry or similar

### Reporting
- **Formats**: CSV, Excel (.xlsx), PDF
- **Export**: Async generation for large reports
- **Scheduled reports**: Cron-based generation with email delivery
- **Templates**: Use templating engine (Jinja2, Handlebars, etc.)
- **Watermarks/Security**: Optional for sensitive reports

### Internationalization (i18n)
- **Recommended**: Multi-language support (English + local language)
- UI strings externalized
- Date/number formatting per locale
- RTL support optional if needed

### Mobile Responsiveness
- **Reservist interface** must be mobile-friendly
- Responsive CSS (Bootstrap/Tailwind)
- Touch-friendly UI elements (minimum 44px)
- QR scanning via camera (browser API or native)

### Browser Support
- Modern browsers: Chrome, Firefox, Safari, Edge (last 2 versions)
- Optional: IE11 if legacy required (not recommended)

---

## 6.5 Environment-Specific Constraints (WAMP)

### MySQL Version Considerations
- **Check WAMP version**:Determine MySQL/MariaDB version via WAMP tray or `SELECT VERSION();`
  - WAMPServer 3.x typically includes MySQL 5.7+ or MariaDB 10.4+
  - If MySQL 5.6 or older: **Not supported** — upgrade WAMP
- **JSON column support**: Requires MySQL 5.7+ or MariaDB 10.2+ (standard in recent WAMP)
- **Generated columns**: MySQL 5.7+ — if unavailable, compute `overall_score` in application layer
- **Window functions**: Not needed initially (if analytics complex, may require MySQL 8.0+)
- **Partial indexes**: `WHERE` clause indexes require MySQL 8.0+ (MariaDB 10.0+). Fallback: remove condition, index full column and filter in queries

### File System
- **Windows paths**: Use `path.join()` or raw strings with backslashes in code
- **Case sensitivity**: Windows file system is case-insensitive — be consistent in naming
- **Upload directory**: `D:\Wampp64\www\PAFR\uploads\` or `wamp\uploads\` — ensure Apache write permissions
- **Report storage**: `wamp\www\PAFR\storage\reports\` — configure Apache to serve with proper headers

### Apache Configuration (WAMP)
- **URL Rewrites**: Enable `mod_rewrite` for clean URLs (Frontend routing, API endpoints)
- **Document Root**: Typically `D:\Wampp64\www\`
- **Virtual Hosts** (optional): Configure for `pafr.local` for cleaner local URL
- **CORS**: Add headers for frontend dev server (port 5173) if separate origins
- **PHP Extensions** (if using PHP backend):
  - `pdo_mysql` (required)
  - `mbstring` (recommended)
  - `openssl` (JWT)
  - `fileinfo` (file uploads)
  - `gd` or `imagick` (QR code generation)

### Development Workflow with WAMP
1. **Database access**:
   - phpMyAdmin: `http://localhost/phpmyadmin`
   - Or MySQL CLI: `mysql -u root -p` (WAMP's `bin\mysql\mysqlX.X\bin\mysql.exe`)
2. **View logs**:
   - Apache: `WAMPServer\tools\apacheX.X.X\logs\`
   - PHP: `WAMPServer\tools\phpX.X.X\logs\`
   - MySQL: `wamp\logs\mysql.log`
3. **Restart services**: WAMP tray icon → Restart All Services
4. **Port conflicts**: If port 80/3306 in use, change via WAMP settings (Apache → httpd.conf, MySQL → my.ini)

### Common WAMP Pitfalls
- **MySQL service not starting**: Usually port 3306 conflict (Skype, VMware, another MySQL). Change port or stop conflicting service.
- **Apache won't start**: Port 80 conflict (IIS, World Wide Web Publishing Service). Stop service or change Apache port.
- **Permission denied on uploads**: Apache user (running as SYSTEM or specific user) needs write permissions on upload folder.
- **Encoding problems**: Ensure database and tables = utf8mb4, connection uses `SET NAMES utf8mb4`.
- **Path issues in code**: Never hardcode `C:\wamp\...` — use config/env variables.

### Production Migration Notes
- **Never deploy WAMP to production** — it's Windows/dev-only
- Production should be Linux-based (Ubuntu/Debian/CentOS) with Nginx/Apache
- Export data from WAMP MySQL using `mysqldump --routines --triggers --single-transaction`
- Import to production with `mysql < dump.sql` after creating database

---

## 7. Deliverables

### Code Deliverables
1. **Source code** with clear folder structure:
   ```
   backend/
     src/
       controllers/
       models/
       services/
       middleware/
       routes/
       config/
       utils/
     tests/
     migrations/
   frontend/
     src/
       components/
       pages/
       services/
       hooks/
       utils/
       styles/
     public/
   ```

2. **Database migration scripts**: SQL schema + versioned migrations
3. **Seed data**: Sample ARSENs, Groups, Cities, reservists, admin user

### Documentation
1. **README** with setup instructions:
   - Prerequisites
   - Local development setup
   - Production deployment guide
   - Environment variables
   - Troubleshooting

2. **API Documentation**: Swagger/OpenAPI spec with examples
3. **Database ER Diagram**: Visual representation
4. **Deployment Guide**: Docker Compose setup (frontend, backend, MySQL)
5. **Operations Manual**:
   - Backup procedures
   - Monitoring instructions
   - Log rotation
   - Common admin tasks

### Deployment Packages

#### Local Development (WAMP)
```
wamp/
├── www/
│   └── PAFR/              ← Project root (this repository)
│       ├── backend/       ← Backend source (PHP/Node/Python)
│       ├── frontend/      ← React app (built files or dev server)
│       ├── database/
│       │   ├── migrations/
│       │   ├── seed.sql
│       │   └── schema.sql
│       ├── docs/
│       └── docker-compose.yml (optional for dev)
```

**WAMP Configuration**:
1. Install WAMPServer (64-bit recommended)
2. Create database via phpMyAdmin: `CREATE DATABASE pafr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
3. Import `database/schema.sql` then `database/seed.sql`
4. Configure backend `.env`:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=pafr
   DB_USER=root
   DB_PASSWORD=your_wamp_root_password
   ```
5. Start MySQL service via WAMP tray icon
6. Run frontend dev server: `npm run dev` (port 5173 default)
7. Backend URL: `http://localhost:8000` (adjust to backend framework default)

#### Production Environment (Recommended)
```
Production stack (NOT WAMP):
- OS: Ubuntu 22.04 LTS or Debian 12
- Web Server: Nginx (reverse proxy) + SSL (Let's Encrypt)
- Database: MySQL 8.0 or MariaDB 10.6 on dedicated server
- Backend: Gunicorn/uWSGI (Python) or PM2 (Node.js)
- Cache: Redis 7+
- Storage: Local volume or S3-compatible object storage
- Monitoring: Prometheus + Grafana + Sentry
- CI/CD: GitHub Actions → staging → production
```

**Migration from WAMP to Production**:
- Export database via `mysqldump` (include `--default-character-set=utf8mb4`)
- Review for Windows path references and replace
- Update environment variables for production credentials
- Configure firewall rules (3306 closed to public)
- Set up automated backups (daily + transaction logs)
- Enable slow query log for performance tuning

#### Docker Option (Alternative)
For consistent environments across dev/prod:
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```
WAMPServer is only for local Windows development; do not use in production.

---

## 8. Development Notes

### Assumptions
- Team will use: **Frontend: React + Vite**, **Backend: to be chosen** (Node.js/Express, Python/FastAPI, PHP/Laravel, etc.)
- Reservist workflows must be demonstrated both admin and reservist roles
- QR code attendance is optional enhancement, can be Phase 2
- Readiness score computed as average (adjustable formula)

### Recommendations for Backend Language
If flexibility to change:
- **Python + FastAPI**: High productivity, async support, auto-generated API docs, excellent for data-heavy apps
- **Node.js + Express/NestJS**: JS full-stack, large ecosystem, good real-time capabilities
- **PHP + Laravel**: Mature framework, built-in auth, ORM, rapid development
- **Java + Spring Boot**: Enterprise-grade, robust, excellent for large teams

**Preferred**: Python FastAPI for rapid development + auto API docs.

### Phase Planning (Recommended)
```
Phase 1: Core authentication + reservist CRUD + hierarchy (ARSEN/Group/City) + basic dashboard
Phase 2: Trainings + activities + attendance marking + reports
Phase 3: Readiness assessments + analytics + alerts
Phase 4: Logistics/inventory + supply issuances
Phase 5: Advanced features: QR check-in, scheduled reports, mobile app
Phase 6: Polish: i18n, advanced analytics, bulk operations, UI/UX refinements
```

### Data Integrity Rules
- Deactivate reservist → preserve attendance and readiness records (soft delete)
- Delete training with attendance → cascade delete or prevent? (Recommend: archive status, never hard delete)
- Adjust supply inventory → must log reason in audit trail
- Change readiness scores → keep history (audit required)

### Edge Cases to Handle
- Reservist assigned to multiple Groups/Cities over time (history must be preserved)
- Training overlapping activities (time conflict detection)
- Attendance marking after deadline (late submissions policy)
- Supply returns overdue (auto-escalation alerts)
- Concurrent attendance marking (multiple admins)

### Testing Strategy
- Unit tests: All services, models, utilities
- Integration tests: API endpoints (HTTP requests)
- E2E tests: Critical user journeys (admin creates training → reservist registers → attendance recorded)
- Load tests: Dashboard queries with 10k+ reservists

---

## 9. System Improvements & Recommendations

### 9.1 Architectural Enhancements

#### Issue: Monolithic Design Risk
**Current**: Single application handling all features.
**Recommendation**: Implement **modular architecture** from start:
- Separate microservices or well-defined modules
- Service boundaries: User Service, Training Service, Attendance Service, Logistics Service
- Independent databases per service (or shared with clear ownership)
- Message queue for async communication (RabbitMQ/Kafka) if scaling needed

**Benefit**: Easier to scale, deploy independently, team parallelism.

#### Issue: No Event Sourcing / Audit Trail
**Current**: Audit logs stored as JSON snapshots.
**Recommendation**: Implement **event sourcing for critical entities**:
- Every change produces an immutable event
- Rebuild state from event stream
- Full history available, easier debugging

**Benefit**: Compliance, debugging, temporal queries (how record looked on date X).

### 9.2 Data Model Improvements

#### Add: `reservist_history` Table
```sql
-- Track all changes to reservist profile for audit
CREATE TABLE reservist_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    changed_by BIGINT NOT NULL,
    change_type ENUM('profile', 'assignment', 'status') NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);
```

**Why**: Complete audit trail, GDPR compliance, rollback capability.

#### Add: `training_attendees` Junction Table
```sql
CREATE TABLE training_attendees (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    training_id BIGINT NOT NULL,
    reservist_id BIGINT NOT NULL,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'attended', 'no-show', 'cancelled') DEFAULT 'registered',
    UNIQUE KEY (training_id, reservist_id)
);
```

**Why**: Pre-registration tracking, capacity management, separate from attendance record.

#### Normalize: `supply_categories` Table
```sql
CREATE TABLE supply_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NULL,
    parent_category_id BIGINT NULL
);
```

**Why**: Centralized category management, reusable, hierarchical categories possible.

### 9.3 Feature Enhancements

#### Bulk Operations (High Priority)
- Bulk import/export reservists (CSV)
- Bulk assign reservists to groups/cities
- Bulk update supply stock
- Bulk record attendance (upload CSV)
- Bulk readiness assessments upload

**Why**: Admin productivity, reduces manual work.

#### Advanced Analytics
- Predictive readiness: Machine learning to flag at-risk reservists
- Attendance patterns: Identify reservists with chronic absenteeism
- Training effectiveness: Score improvement post-training
- Resource optimization: Supply usage forecasting

**Implementation**: Use Python (pandas/scikit-learn) in separate analytics service.

#### Notifications & Alerts (Expand)
- Email notifications (SMTP integration)
- SMS alerts (Twilio integration) for critical alerts
- Push notifications (mobile/web)
- Digest emails (daily/weekly summaries)
- Escalation chains for unread critical alerts

**Why**: Ensure timely receipt, multiple channels.

#### Mobile Application
- **Progressive Web App (PWA)**: Installable, offline support
- **Native Mobile**: React Native/Flutter for camera QR scanning, push notifications
- Offline attendance marking (sync when online)

**Why**: Reservists often in field, need mobile-first.

#### Role & Permission Granularity
**Current**: Binary roles (admin/reservist).
**Recommendation**: **RBAC (Role-Based Access Control)** system:
- Roles: Super Admin, ARSEN Commander, Group Commander, Training Officer, Logistics Officer, Reservist
- Permissions matrix: CRUD per resource per role
- Custom roles creation

**Why**: Realistic hierarchy mirroring military structure.

#### Approval Workflows
- Profile changes require approval (chain of command)
- Supply requests need authorization
- Readiness score corrections need supervisor sign-off

**Implementation**: State machine per entity with approver tracking.

#### Document Management
- Upload supporting documents (medical certificates, qualifications)
- Version control
- Expiry tracking (notify before expiry)
- Digital signatures (optional)

**Why**: Centralized records, compliance.

#### Multi-ARSEN Support (SaaS Ready)
**Current**: Hierarchical ARSEN→Group→City.
**Recommendation**: **Multi-tenancy from day one**:
- Tenants = ARSENs
- Complete data isolation per tenant
- Shared infrastructure, separate databases or shared with tenant_id
- Super Admin portal to manage all ARSENs

**Why**: Productize as SaaS for multiple organizations.

#### APIs for External Integration
- RESTful API for external systems (HR, payroll)
- Webhooks for events (attendance recorded, alert created)
- Calendar integration (iCal, Google Calendar) for trainings
- SSO/SAML integration with organizational identity provider

**Why**: Interoperability, reduce manual data transfer.

### 9.4 Technical Stack Recommendations

#### Backend
**Recommended**: **Python + FastAPI**
- **Why**: Auto-generated OpenAPI docs, async support, high performance, type hints, easy ORM (SQLAlchemy), rapid development
- **Alternative**: Node.js + NestJS (TypeScript, structured, good for JS shops)

#### Database
- MySQL 8.0+ (as specified) or PostgreSQL 15+ (recommended)
- **Why PostgreSQL**: Better JSON support, geographic types (for areas), more features, active development

#### Frontend
- React + TypeScript (already using Vite)
- UI Library: **ShadCN UI** or **MUI** or **Ant Design**
- State management: **TanStack Query** (React Query) + Zustand/Jotai
- Styling: Tailwind CSS (already good choice)

#### Infrastructure
- **Containerization**: Docker + Docker Compose for dev
- **Orchestration**: Docker Compose (dev), Kubernetes (prod if scaling)
- **Reverse Proxy**: Nginx or Traefik
- **Monitoring**: Prometheus + Grafana (metrics), Sentry (errors)
- **Logging**: ELK stack or Loki + Grafana
- **Queue**: Celery (Python) or BullMQ (Node.js) for async tasks

#### CI/CD
- GitHub Actions or GitLab CI
- Automated testing on PRs
- Docker image builds
- Deploy to staging/production on merge

### 9.5 Process & Workflow

#### Git Branch Strategy
```
main (production)
develop (integration)
feature/* (feature branches)
hotfix/* (emergency fixes)
release/* (release candidates)
```

#### Code Quality
- Pre-commit hooks (lint, format, type check)
- Automated code review (SonarQube)
- Pull request template with checklist
- Mandatory code review before merge (1+ approvals)

#### Testing Pyramid
- 70% Unit tests
- 20% Integration tests
- 10% E2E tests

#### Database Migrations
- Versioned migration files (Alembic for Python, Flyway, or knex)
- Never modify production data directly
- Rollback scripts included

#### Environment Configuration
- `.env` files for local dev
- Env variables in Docker/production
- Config per environment (dev, staging, prod)
- Secrets management: Vault or Docker secrets

#### Data Backup Strategy
- Daily full backups (retain 30 days)
- Transaction log backups (hourly)
- Test restores monthly
- Offsite backup storage (S3)

---

## 10. Open Questions & Decisions Needed

1. **Backend language/framework**: Final selection (Node.js vs Python vs PHP)?
2. **Database choice**: MySQL vs PostgreSQL? *(Note: MySQL selected due to WAMP environment)*
3. **Real-time requirements**: Do we need WebSocket for live notifications?
4. **File storage**: Local filesystem vs S3-compatible object storage?
5. **Authentication method**: JWT only or session-based fallback?
6. **Multi-tenancy**: Is this SaaS (multi-ARSEN) or single-tenant?
7. **Reporting engine**: Which library (PDF: ReportLab, WeasyPrint; Excel: openpyxl, XLSXWriter)?
8. **Email service**: SMTP self-hosted or SendGrid/Mailgun?
9. **QR code implementation**: Browser-based scanning or native app?
10. **Mobile strategy**: PWA vs native app (or both)?

---

## Appendix

### A. WAMP Development Setup Guide

#### Prerequisites
1. **Install WAMPServer 3.x 64-bit** (latest) from https://www.wampserver.com/
   - Default installation path: `D:\Wampp64\` (assuming drive D)
   - Include MySQL, PHP, Apache, phpMyAdmin
2. **Verify services**:
   - Click WAMP tray icon → should turn green
   - Open `http://localhost` → WAMP homepage should load
   - Open `http://localhost/phpmyadmin` → login (no password by default, unless set)
3. **Set MySQL root password** (optional but recommended):
   - phpMyAdmin → Users → root → Edit privileges → Change password
   - Or via MySQL console: `ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';`

#### Project Setup Steps
```bash
# 1. Navigate to WAMP www directory
cd D:\Wampp64\www

# 2. Clone or copy project into PAFR folder
# (Already at D:\Programs\Wampp64\www\PAFR per current setup)

# 3. Create database (via phpMyAdmin or CLI)
mysql -u root -p
> CREATE DATABASE pafr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> USE pafr;
> SOURCE D:/Programs/Wampp64/www/PAFR/database/schema.sql;
> SOURCE D:/Programs/Wampp64/www/PAFR/database/seed.sql;

# 4. Configure WAMP Apache (if needed)
# - Virtual host: Add entry to httpd-vhosts.conf for pafr.local
# - Rewrite module: Ensure "LoadModule rewrite_module modules/mod_rewrite.so" is NOT commented
# - Restart Apache via WAMP tray

# 5. Backend configuration
# Copy .env.example to .env and set:
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=pafr
DB_USERNAME=root
DB_PASSWORD=your_password_here
JWT_SECRET=your_random_secret_key_here

# 6. Frontend configuration (if separate)
# Vite config proxy to backend (port 8000 or 3000):
# server: { proxy: { '/api': 'http://localhost:8000' } }

# 7. Start development
# - Backend: npm run dev or python -m uvicorn main:app --reload
# - Frontend: npm run dev (opens port 5173)
# - Access: http://localhost:5173 (frontend) → calls http://localhost:8000/api/*
```

#### Troubleshooting WAMP
| Issue | Solution |
|-------|----------|
| MySQL won't start | Check port 3306 (Skype uses it). Change MySQL port in my.ini or stop conflicting service. |
| Apache won't start | Port 80 conflict (IIS). Stop "World Wide Web Publishing Service" or change Apache port to 8080. |
| Database connection refused | Ensure MySQL service running (WAMP tray icon → MySQL → Service → Start/Resume) |
| Access denied for user 'root'@'localhost' | Set password in .env matching WAMP MySQL root password |
| phpMyAdmin not loading | Apache not running or port 80 conflict |
| UTF-8 characters garbled | Ensure DB: `utf8mb4`, connection sets `SET NAMES utf8mb4`, HTML meta `<meta charset="UTF-8">` |
| Upload directory not writable | Grant write permissions to `wamp64/www/PAFR/uploads/` (Apache user: usually SYSTEM) |

#### Useful WAMP Commands
```batch
REM Restart all services from command line
wampmanager.exe -restartall

REM Start only MySQL
wampmanager.exe -startservice mysql

REM Check PHP version
php -v

REM MySQL CLI (from WAMP bin)
D:\wamp64\bin\mysql\mysql8.0.33\bin\mysql.exe -u root -p

REM Export database
mysqldump -u root -p pafr > backup.sql

REM Import database
mysql -u root -p pafr < backup.sql
```

---

### B. Technology Stack Summary (Suggested)
| Layer        | Technology                 | Alternative(s)          |
|--------------|---------------------------|-------------------------|
| Frontend     | React + TypeScript + Vite | Next.js (if SSR needed) |
| UI Library   | ShadCN UI + Tailwind      | MUI, Ant Design         |
| State        | TanStack Query + Zustand  | Redux Toolkit           |
| Backend      | Python FastAPI            | Node.js NestJS          |
| Database     | PostgreSQL 15             | MySQL 8.0               |
| ORM          | SQLAlchemy + Alembic      | Prisma, TypeORM         |
| Auth         | JWT + bcrypt              | Passport.js             |
| Queue        | Celery + Redis            | BullMQ                 |
| Cache        | Redis                     | Memcached               |
| Docs         | OpenAPI/Swagger           | Postman                 |
| Monitoring   | Sentry + Prometheus       | Datadog                 |
| Deployment   | Docker Compose + Nginx    | Kubernetes              |

### B. Number of Servers Required (Estimate)
```
Development:
  - 1 machine (localhost WAMP) running all services

Production Minimum (Linux):
  - Frontend: 1-2 servers or CDN (Nginx static files)
  - Backend API: 2-4 application servers (load balanced)
  - Database: 1 primary MySQL + 1 replica (read scaling)
  - Redis: 1-2 instances (cache + queue broker)
  - File storage: Dedicated server or S3-compatible (MinIO, Ceph, AWS S3)
  - Monitoring: Separate VPS or SaaS (Sentry, Prometheus+Grafana cloud)

Note: WAMP is Windows-only and unsuitable for production deployment.
Production must use Linux + proper orchestration.
```

### C. Team Structure (if applicable)
- Frontend Developer (1-2)
- Backend Developer (1-2)
- DevOps/Platform Engineer (1)
- QA Engineer (1)
- Product Owner/Manager (1)
- UX/UI Designer (part-time)

---

**Document Control**
- Created: 2026-05-01
- Version: 1.0
- Status: Draft → Review → Approved
- Next Review: [Date]
