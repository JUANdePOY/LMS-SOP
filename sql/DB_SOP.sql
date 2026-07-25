-- ============================================================================
-- DB_SOP.sql
-- SOP Management Module — Enterprise Edition
-- Version:      2.0
-- Target:       MySQL 8.0.x  (InnoDB, utf8mb4)
-- Stack:        React + Node.js + MySQL
-- Requires:     Pre-existing tables -> users, departments
-- ----------------------------------------------------------------------------
-- Inspired by document/QMS platforms (SharePoint, Document360, MasterControl,
-- ETQ Reliance, ISO/QMS systems), adapted to a lean two-table-dependency stack.
--
-- Design Principles
--   - 3NF normalization
--   - Immutable version history (published versions are never mutated)
--   - Soft delete everywhere important (deleted_at, no hard DELETE in app code)
--   - UUID public identifiers (internal BIGINT PKs stay hidden from the API)
--   - created_by / updated_by / created_at / updated_at on every core table
--   - Composite indexes tuned to real query patterns
--   - Config-driven approval workflow engine (no hardcoded approval chains)
--   - Full audit trail via audit_logs + triggers
--   - Naming convention: pk_ fk_ idx_ uq_ ck_
--
-- SQL File Structure
--   1.  Header / Configuration
--   2.  Categories
--   3.  Tags
--   4.  SOP Core
--   5.  Versioning
--   6.  Sections
--   7.  Steps
--   8.  Step Comments
--   9.  Section Files
--   10. Documents
--   11. Workflow Engine
--   12. Assignments
--   13. Acknowledgements
--   14. Audit Logs
--   15. Future LMS Integration
--   16. Cross-table ALTERs (post-creation FKs)
--   17. Composite Indexes
--   18. Views
--   19. Stored Procedures
--   20. Triggers
--   21. Seed Data
-- ============================================================================


-- ============================================================================
-- 1. CONFIGURATION
-- ============================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


-- ============================================================================
-- 2. CATEGORIES
-- ==========================================================
-- Table: categories
-- Purpose:
--   Classification of SOPs, optionally scoped to a department.
--
-- Relationships:
--   departments (1) ---- (N) categories
--   categories  (1) ---- (N) sops
-- ==========================================================
CREATE TABLE IF NOT EXISTS categories (
    id              BIGINT UNSIGNED AUTO_INCREMENT,
    public_id       CHAR(36)      NOT NULL DEFAULT (UUID()),
    department_id   BIGINT UNSIGNED NULL,
    name            VARCHAR(100)  NOT NULL,
    description     TEXT NULL,
    is_active       TINYINT(1)    NOT NULL DEFAULT 1,
    created_by      BIGINT UNSIGNED NULL,
    updated_by      BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME      NULL,
    CONSTRAINT pk_categories PRIMARY KEY (id),
    CONSTRAINT uq_categories_public_id UNIQUE (public_id),
    CONSTRAINT uq_categories_dept_name UNIQUE (department_id, name),
    CONSTRAINT fk_category_department  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_category_created_by  FOREIGN KEY (created_by)    REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_category_updated_by  FOREIGN KEY (updated_by)    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 3. TAGS
-- ==========================================================
-- Table: tags / sop_tags
-- Purpose:
--   Free-form labels for search/discovery, many-to-many with sops.
-- ==========================================================
CREATE TABLE IF NOT EXISTS tags (
    id          BIGINT UNSIGNED AUTO_INCREMENT,
    public_id   CHAR(36)     NOT NULL DEFAULT (UUID()),
    name        VARCHAR(100) NOT NULL,
    created_by  BIGINT UNSIGNED NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  DATETIME     NULL,
    CONSTRAINT pk_tags PRIMARY KEY (id),
    CONSTRAINT uq_tags_name UNIQUE (name),
    CONSTRAINT uq_tags_public_id UNIQUE (public_id),
    CONSTRAINT fk_tag_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 4. SOP CORE
-- ==========================================================
-- Table: sops
-- Purpose:
--   Master identity record for an SOP. Content itself lives in
--   sop_versions / sop_sections / sop_steps — sops never changes
--   once the identity fields (sop_code, department, owner) are set,
--   aside from status/current_version_id bookkeeping.
--
-- Relationships:
--   departments (1) ---- (N) sops
--   categories  (1) ---- (N) sops
--   users       (1) ---- (N) sops [owner]
--   sops        (1) ---- (N) sop_versions
-- ==========================================================
CREATE TABLE IF NOT EXISTS sops (
    id                  BIGINT UNSIGNED AUTO_INCREMENT,
    public_id           CHAR(36)      NOT NULL DEFAULT (UUID()),
    sop_code            VARCHAR(50)   NOT NULL,
    title               VARCHAR(255)  NOT NULL,
    description         TEXT NULL,
    department_id       BIGINT UNSIGNED NOT NULL,
    category_id         BIGINT UNSIGNED NULL,
    owner_id            BIGINT UNSIGNED NOT NULL,
    current_version_id  BIGINT UNSIGNED NULL,   -- FK added later (see section 16, avoids circular dependency)
    status              ENUM('Draft','For Review','Approved','Published','Archived') NOT NULL DEFAULT 'Draft',
    created_by          BIGINT UNSIGNED NOT NULL,
    updated_by          BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          DATETIME      NULL,
    CONSTRAINT pk_sops PRIMARY KEY (id),
    CONSTRAINT uq_sops_public_id UNIQUE (public_id),
    CONSTRAINT uq_sop_code UNIQUE (sop_code),
    CONSTRAINT ck_sop_code_length CHECK (CHAR_LENGTH(sop_code) >= 3),
    CONSTRAINT fk_sop_department FOREIGN KEY (department_id) REFERENCES departments(id),
    CONSTRAINT fk_sop_category   FOREIGN KEY (category_id)   REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_sop_owner      FOREIGN KEY (owner_id)      REFERENCES users(id),
    CONSTRAINT fk_sop_created_by FOREIGN KEY (created_by)    REFERENCES users(id),
    CONSTRAINT fk_sop_updated_by FOREIGN KEY (updated_by)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- Table: sop_tags (junction)
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_tags (
    sop_id  BIGINT UNSIGNED NOT NULL,
    tag_id  BIGINT UNSIGNED NOT NULL,
    CONSTRAINT pk_sop_tags PRIMARY KEY (sop_id, tag_id),
    CONSTRAINT fk_sop_tags_sop FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
    CONSTRAINT fk_sop_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 5. VERSIONING
-- ==========================================================
-- Table: sop_versions
-- Purpose:
--   Stores every immutable revision of an SOP. Once status = 'Published',
--   application logic must never UPDATE content rows tied to this version —
--   a new version is created instead (see sp_create_new_version).
--
-- Relationships:
--   sops (1) ---- (N) sop_versions
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_versions (
    id              BIGINT UNSIGNED AUTO_INCREMENT,
    public_id       CHAR(36)      NOT NULL DEFAULT (UUID()),
    sop_id          BIGINT UNSIGNED NOT NULL,
    version         VARCHAR(20)   NOT NULL,        -- e.g. '1.0', '1.1', '2.0'
    is_current      TINYINT(1)    NOT NULL DEFAULT 0,
    change_summary  TEXT NULL,
    effective_date  DATE NULL,
    review_date     DATE NULL,
    status          ENUM('Draft','For Review','Approved','Published','Archived') NOT NULL DEFAULT 'Draft',
    published_at    DATETIME NULL,
    archived_at     DATETIME NULL,
    created_by      BIGINT UNSIGNED NOT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      DATETIME      NULL,
    CONSTRAINT pk_sop_versions PRIMARY KEY (id),
    CONSTRAINT uq_sop_versions_public_id UNIQUE (public_id),
    CONSTRAINT uq_version_sop_version UNIQUE (sop_id, version),
    CONSTRAINT fk_version_sop  FOREIGN KEY (sop_id)     REFERENCES sops(id) ON DELETE CASCADE,
    CONSTRAINT fk_version_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- Table: sop_change_logs
-- Purpose:
--   Field-level diff tracking between versions, for compliance
--   review ("who changed what, when").
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_change_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT,
    sop_version_id  BIGINT UNSIGNED NOT NULL,
    field_name      VARCHAR(100) NOT NULL,
    old_value       LONGTEXT NULL,
    new_value       LONGTEXT NULL,
    changed_by      BIGINT UNSIGNED NULL,
    changed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sop_change_logs PRIMARY KEY (id),
    CONSTRAINT fk_changelog_version FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_changelog_user    FOREIGN KEY (changed_by)     REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 6. SECTIONS
-- ==========================================================
-- Table: sop_sections
-- Purpose:
--   Structured narrative sections (Purpose, Scope, Safety Notes, etc.)
--   belonging to one specific version.
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_sections (
    id              BIGINT UNSIGNED AUTO_INCREMENT,
    sop_version_id  BIGINT UNSIGNED NOT NULL,
    section_type    ENUM('Purpose','Scope','Objectives','Responsibilities','Definitions','Safety Notes','References','Appendix') NOT NULL,
    title           VARCHAR(255) NULL,
    content         LONGTEXT NOT NULL,
    sort_order      INT NOT NULL DEFAULT 1,
    created_by      BIGINT UNSIGNED NULL,
    updated_by      BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL,
    CONSTRAINT pk_sop_sections PRIMARY KEY (id),
    CONSTRAINT fk_section_version FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_section_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_section_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 7. STEPS
-- ==========================================================
-- Table: sop_steps
-- Purpose:
--   Ordered procedural steps within a version. Supports drag & drop
--   reordering, insertion, and duplication via sort_order.
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_steps (
    id                  BIGINT UNSIGNED AUTO_INCREMENT,
    sop_version_id      BIGINT UNSIGNED NOT NULL,
    step_number         INT NOT NULL,
    title               VARCHAR(255) NULL,
    instruction         LONGTEXT NOT NULL,
    estimated_minutes   INT NULL,
    sort_order          INT NOT NULL,
    created_by          BIGINT UNSIGNED NULL,
    updated_by          BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          DATETIME NULL,
    CONSTRAINT pk_sop_steps PRIMARY KEY (id),
    CONSTRAINT uq_step_version_order UNIQUE (sop_version_id, sort_order),
    CONSTRAINT fk_step_version FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_step_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_step_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_step_order (sop_version_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 8. STEP COMMENTS
-- ==========================================================
-- Table: sop_step_comments
-- Purpose:
--   Review/collaboration comments attached to individual steps
--   (e.g. during "For Review" status), independent of formal approvals.
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_step_comments (
    id           BIGINT UNSIGNED AUTO_INCREMENT,
    step_id      BIGINT UNSIGNED NOT NULL,
    user_id      BIGINT UNSIGNED NOT NULL,
    comment      TEXT NOT NULL,
    resolved_at  DATETIME NULL,
    resolved_by  BIGINT UNSIGNED NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   DATETIME NULL,
    CONSTRAINT pk_sop_step_comments PRIMARY KEY (id),
    CONSTRAINT fk_stepcomment_step     FOREIGN KEY (step_id)      REFERENCES sop_steps(id) ON DELETE CASCADE,
    CONSTRAINT fk_stepcomment_user     FOREIGN KEY (user_id)      REFERENCES users(id),
    CONSTRAINT fk_stepcomment_resolver FOREIGN KEY (resolved_by)  REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_stepcomment_step (step_id, resolved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 9. SECTION FILES
-- ==========================================================
-- Table: sop_section_files
-- Purpose:
--   Small inline attachments scoped to a single section (diagrams,
--   reference images), distinct from top-level sop_documents which
--   are version-wide deliverables.
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_section_files (
    id             BIGINT UNSIGNED AUTO_INCREMENT,
    section_id     BIGINT UNSIGNED NOT NULL,
    filename       VARCHAR(255) NOT NULL,
    original_name  VARCHAR(255) NOT NULL,
    storage_path   VARCHAR(500) NOT NULL,
    mime_type      VARCHAR(100) NULL,
    file_size      BIGINT NULL,
    uploaded_by    BIGINT UNSIGNED NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     DATETIME NULL,
    CONSTRAINT pk_sop_section_files PRIMARY KEY (id),
    CONSTRAINT fk_sectionfile_section FOREIGN KEY (section_id)  REFERENCES sop_sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_sectionfile_user    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 10. DOCUMENTS
-- ==========================================================
-- Table: sop_documents
-- Purpose:
--   Version-level file attachments (PDF, Word, Excel, Image, Video).
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_documents (
    id              BIGINT UNSIGNED AUTO_INCREMENT,
    sop_version_id  BIGINT UNSIGNED NOT NULL,
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    storage_path    VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(100) NULL,
    file_size       BIGINT NULL,
    document_type   ENUM('PDF','Word','Excel','Image','Video','Attachment') NOT NULL,
    display_order   INT NOT NULL DEFAULT 1,
    uploaded_by     BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL,
    CONSTRAINT pk_sop_documents PRIMARY KEY (id),
    CONSTRAINT fk_document_version FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_document_user    FOREIGN KEY (uploaded_by)    REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_document_version_type (sop_version_id, document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 11. WORKFLOW ENGINE
-- ==========================================================
-- Tables: approval_workflows, workflow_steps, workflow_instances, workflow_actions
-- Purpose:
--   Configurable multi-step approval chains, so changing the approval
--   sequence (e.g. Dept Review -> QA -> Legal -> CEO) requires only
--   data changes, never code changes.
-- ==========================================================
CREATE TABLE IF NOT EXISTS approval_workflows (
    id             BIGINT UNSIGNED AUTO_INCREMENT,
    public_id      CHAR(36)     NOT NULL DEFAULT (UUID()),
    name           VARCHAR(150) NOT NULL,
    department_id  BIGINT UNSIGNED NULL,   -- NULL = organization-wide default workflow
    description    TEXT NULL,
    is_active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_by     BIGINT UNSIGNED NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     DATETIME     NULL,
    CONSTRAINT pk_approval_workflows PRIMARY KEY (id),
    CONSTRAINT uq_workflow_public_id UNIQUE (public_id),
    CONSTRAINT fk_workflow_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_workflow_created_by FOREIGN KEY (created_by)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_steps (
    id                    BIGINT UNSIGNED AUTO_INCREMENT,
    workflow_id           BIGINT UNSIGNED NOT NULL,
    step_order            INT NOT NULL,
    step_name             VARCHAR(150) NOT NULL,        -- e.g. 'Department Review', 'QA Review'
    approver_type         ENUM('User','Role','Department') NOT NULL DEFAULT 'Role',
    approver_reference_id BIGINT UNSIGNED NULL,          -- user_id or department_id depending on approver_type
    approver_role         VARCHAR(100) NULL,             -- role name when approver_type = 'Role'
    is_required            TINYINT(1) NOT NULL DEFAULT 1,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            DATETIME NULL,
    CONSTRAINT pk_workflow_steps PRIMARY KEY (id),
    CONSTRAINT uq_workflow_step_order UNIQUE (workflow_id, step_order),
    CONSTRAINT fk_workflowstep_workflow FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_instances (
    id                 BIGINT UNSIGNED AUTO_INCREMENT,
    public_id          CHAR(36) NOT NULL DEFAULT (UUID()),
    sop_version_id     BIGINT UNSIGNED NOT NULL,
    workflow_id        BIGINT UNSIGNED NOT NULL,
    current_step_order INT NOT NULL DEFAULT 1,
    status             ENUM('In Progress','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'In Progress',
    started_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at       DATETIME NULL,
    created_by         BIGINT UNSIGNED NOT NULL,
    CONSTRAINT pk_workflow_instances PRIMARY KEY (id),
    CONSTRAINT uq_workflowinstance_public_id UNIQUE (public_id),
    CONSTRAINT fk_workflowinstance_version  FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflowinstance_workflow FOREIGN KEY (workflow_id)    REFERENCES approval_workflows(id),
    CONSTRAINT fk_workflowinstance_creator  FOREIGN KEY (created_by)     REFERENCES users(id),
    INDEX idx_workflowinstance_status (status, current_step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_actions (
    id                   BIGINT UNSIGNED AUTO_INCREMENT,
    workflow_instance_id BIGINT UNSIGNED NOT NULL,
    workflow_step_id     BIGINT UNSIGNED NOT NULL,
    actor_id             BIGINT UNSIGNED NOT NULL,
    action               ENUM('Submitted','Approved','Rejected','Delegated','Commented') NOT NULL,
    comments              TEXT NULL,
    action_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_workflow_actions PRIMARY KEY (id),
    CONSTRAINT fk_workflowaction_instance FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflowaction_step     FOREIGN KEY (workflow_step_id)     REFERENCES workflow_steps(id),
    CONSTRAINT fk_workflowaction_actor    FOREIGN KEY (actor_id)             REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 12. ASSIGNMENTS
-- ==========================================================
-- Tables: sop_assignments (header) + assignment_departments /
--         assignment_positions / assignment_users (targets)
-- Purpose:
--   Determines who must comply with a published SOP version. Split into
--   a header + three target tables instead of one wide nullable table,
--   so each compliance target type is queryable and indexable on its own.
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_assignments (
    id              BIGINT UNSIGNED AUTO_INCREMENT,
    public_id       CHAR(36) NOT NULL DEFAULT (UUID()),
    sop_version_id  BIGINT UNSIGNED NOT NULL,
    assigned_by     BIGINT UNSIGNED NOT NULL,
    assigned_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date        DATE NULL,
    notes           TEXT NULL,
    CONSTRAINT pk_sop_assignments PRIMARY KEY (id),
    CONSTRAINT uq_assignment_public_id UNIQUE (public_id),
    CONSTRAINT fk_assignment_version FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_by      FOREIGN KEY (assigned_by)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignment_departments (
    id             BIGINT UNSIGNED AUTO_INCREMENT,
    assignment_id  BIGINT UNSIGNED NOT NULL,
    department_id  BIGINT UNSIGNED NOT NULL,
    CONSTRAINT pk_assignment_departments PRIMARY KEY (id),
    CONSTRAINT uq_assignment_department UNIQUE (assignment_id, department_id),
    CONSTRAINT fk_assigndept_assignment FOREIGN KEY (assignment_id) REFERENCES sop_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_assigndept_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignment_positions (
    id             BIGINT UNSIGNED AUTO_INCREMENT,
    assignment_id  BIGINT UNSIGNED NOT NULL,
    position_name  VARCHAR(100) NOT NULL,   -- NOTE: no dedicated positions table exists yet;
                                              -- swap to a FK once one is introduced.
    CONSTRAINT pk_assignment_positions PRIMARY KEY (id),
    CONSTRAINT uq_assignment_position UNIQUE (assignment_id, position_name),
    CONSTRAINT fk_assignpos_assignment FOREIGN KEY (assignment_id) REFERENCES sop_assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignment_users (
    id             BIGINT UNSIGNED AUTO_INCREMENT,
    assignment_id  BIGINT UNSIGNED NOT NULL,
    user_id        BIGINT UNSIGNED NOT NULL,
    CONSTRAINT pk_assignment_users PRIMARY KEY (id),
    CONSTRAINT uq_assignment_user UNIQUE (assignment_id, user_id),
    CONSTRAINT fk_assignuser_assignment FOREIGN KEY (assignment_id) REFERENCES sop_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignuser_user       FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 13. ACKNOWLEDGEMENTS
-- ==========================================================
-- Tables: sop_acknowledgements, acknowledgement_history
-- Purpose:
--   Tracks whether an individual user has read/accepted a published
--   version, plus a full status-change history for audit purposes.
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_acknowledgements (
    id              BIGINT UNSIGNED AUTO_INCREMENT,
    public_id       CHAR(36) NOT NULL DEFAULT (UUID()),
    sop_version_id  BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    status          ENUM('Pending','Acknowledged','Reopened','Expired') NOT NULL DEFAULT 'Pending',
    acknowledged_at DATETIME NULL,
    ip_address      VARCHAR(45) NULL,
    user_agent      VARCHAR(255) NULL,
    remarks         TEXT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sop_acknowledgements PRIMARY KEY (id),
    CONSTRAINT uq_ack_public_id UNIQUE (public_id),
    CONSTRAINT uq_ack_version_user UNIQUE (sop_version_id, user_id),
    CONSTRAINT fk_ack_version FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ack_user    FOREIGN KEY (user_id)        REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acknowledgement_history (
    id                BIGINT UNSIGNED AUTO_INCREMENT,
    acknowledgement_id BIGINT UNSIGNED NOT NULL,
    previous_status   ENUM('Pending','Acknowledged','Reopened','Expired') NULL,
    new_status        ENUM('Pending','Acknowledged','Reopened','Expired') NOT NULL,
    changed_by        BIGINT UNSIGNED NULL,
    changed_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks           TEXT NULL,
    CONSTRAINT pk_acknowledgement_history PRIMARY KEY (id),
    CONSTRAINT fk_ackhistory_ack  FOREIGN KEY (acknowledgement_id) REFERENCES sop_acknowledgements(id) ON DELETE CASCADE,
    CONSTRAINT fk_ackhistory_user FOREIGN KEY (changed_by)         REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 14. AUDIT LOGS
-- ==========================================================
-- Table: audit_logs
-- Purpose:
--   Generalized, entity-agnostic audit trail. Populated by triggers
--   (section 20) and directly by application/service code for actions
--   that have no table-level UPDATE/DELETE signature (Download, Print,
--   Login, Logout, Publish, Restore).
-- ==========================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id           BIGINT UNSIGNED AUTO_INCREMENT,
    public_id    CHAR(36) NOT NULL DEFAULT (UUID()),
    entity_type  VARCHAR(50) NOT NULL,     -- e.g. 'sop', 'sop_version', 'sop_acknowledgement'
    entity_id    BIGINT UNSIGNED NOT NULL,
    action       ENUM('Create','Update','Delete','Publish','Restore','Download','Print','Login','Logout') NOT NULL,
    performed_by BIGINT UNSIGNED NULL,
    ip_address   VARCHAR(45) NULL,
    user_agent   VARCHAR(255) NULL,
    old_values   JSON NULL,
    new_values   JSON NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_audit_logs PRIMARY KEY (id),
    CONSTRAINT uq_audit_public_id UNIQUE (public_id),
    CONSTRAINT fk_audit_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 15. FUTURE LMS INTEGRATION
-- ==========================================================
-- Table: sop_course_links
-- Purpose:
--   Prepared bridge for SOP -> Course -> Quiz -> Certificate, without
--   coupling this module to LMS tables that don't exist yet.
--   course_id intentionally has NO foreign key until the Course
--   Management module is built; add the constraint at that time.
-- ==========================================================
CREATE TABLE IF NOT EXISTS sop_course_links (
    id          BIGINT UNSIGNED AUTO_INCREMENT,
    sop_id      BIGINT UNSIGNED NOT NULL,
    course_id   BIGINT UNSIGNED NULL,   -- future FK -> courses(id)
    link_type   ENUM('Prerequisite','Reference','Companion') NOT NULL DEFAULT 'Reference',
    created_by  BIGINT UNSIGNED NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  DATETIME NULL,
    CONSTRAINT pk_sop_course_links PRIMARY KEY (id),
    CONSTRAINT fk_courselink_sop  FOREIGN KEY (sop_id)     REFERENCES sops(id) ON DELETE CASCADE,
    CONSTRAINT fk_courselink_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 16. CROSS-TABLE ALTERS (post-creation FKs, resolves circular dependency)
-- ============================================================================
ALTER TABLE sops
    ADD CONSTRAINT fk_current_version
    FOREIGN KEY (current_version_id) REFERENCES sop_versions(id)
    ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================================
-- 17. COMPOSITE INDEXES
-- ============================================================================
CREATE INDEX idx_sop_code              ON sops(sop_code);
CREATE INDEX idx_sop_title             ON sops(title);
CREATE INDEX idx_sop_department_status ON sops(department_id, status);
CREATE INDEX idx_sop_category_status   ON sops(category_id, status);

CREATE INDEX idx_version_status        ON sop_versions(status);
CREATE INDEX idx_version_status_review ON sop_versions(status, review_date);
CREATE INDEX idx_version_sop_current   ON sop_versions(sop_id, is_current);

CREATE INDEX idx_ack_user_status       ON sop_acknowledgements(user_id, status);
CREATE INDEX idx_ack_version_status    ON sop_acknowledgements(sop_version_id, status);

CREATE INDEX idx_audit_entity          ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor_time      ON audit_logs(performed_by, created_at);


-- ============================================================================
-- 18. VIEWS
-- ============================================================================

-- vw_current_sops: one row per SOP, joined to its live current version
CREATE OR REPLACE VIEW vw_current_sops AS
SELECT
    s.id                AS sop_id,
    s.public_id          AS sop_public_id,
    s.sop_code,
    s.title,
    s.status             AS sop_status,
    s.department_id,
    s.category_id,
    s.owner_id,
    v.id                 AS version_id,
    v.public_id          AS version_public_id,
    v.version,
    v.status              AS version_status,
    v.effective_date,
    v.review_date,
    v.published_at
FROM sops s
LEFT JOIN sop_versions v ON v.id = s.current_version_id
WHERE s.deleted_at IS NULL;

-- vw_pending_acknowledgements: outstanding read/accept obligations
CREATE OR REPLACE VIEW vw_pending_acknowledgements AS
SELECT
    a.id                AS acknowledgement_id,
    a.public_id          AS acknowledgement_public_id,
    a.user_id,
    a.status,
    a.created_at,
    v.id                 AS version_id,
    v.version,
    s.id                 AS sop_id,
    s.sop_code,
    s.title
FROM sop_acknowledgements a
JOIN sop_versions v ON v.id = a.sop_version_id
JOIN sops s         ON s.id = v.sop_id
WHERE a.status IN ('Pending','Reopened');

-- vw_review_due: published versions whose review_date has arrived/passed
CREATE OR REPLACE VIEW vw_review_due AS
SELECT
    v.id       AS version_id,
    v.version,
    v.review_date,
    s.id       AS sop_id,
    s.sop_code,
    s.title,
    s.department_id,
    s.owner_id
FROM sop_versions v
JOIN sops s ON s.id = v.sop_id
WHERE v.status = 'Published'
  AND v.review_date IS NOT NULL
  AND v.review_date <= CURDATE()
  AND v.deleted_at IS NULL;

-- vw_version_history: full chronological revision trail per SOP
CREATE OR REPLACE VIEW vw_version_history AS
SELECT
    s.id          AS sop_id,
    s.sop_code,
    v.id          AS version_id,
    v.version,
    v.status,
    v.change_summary,
    v.created_by,
    v.created_at,
    v.published_at,
    v.archived_at
FROM sop_versions v
JOIN sops s ON s.id = v.sop_id
ORDER BY s.id, v.created_at;


-- ============================================================================
-- 19. STORED PROCEDURES
-- ============================================================================
DELIMITER $$

-- ----------------------------------------------------------------------------
-- sp_create_new_version
-- Clones sections + steps from the SOP's current version into a fresh
-- Draft version, so authors edit a copy rather than mutating a
-- published record.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_create_new_version (
    IN  p_sop_id         BIGINT UNSIGNED,
    IN  p_created_by     BIGINT UNSIGNED,
    IN  p_change_summary TEXT,
    IN  p_new_version    VARCHAR(20),
    OUT p_new_version_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_source_version_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT current_version_id INTO v_source_version_id
    FROM sops
    WHERE id = p_sop_id
    FOR UPDATE;

    INSERT INTO sop_versions (sop_id, version, change_summary, status, created_by)
    VALUES (p_sop_id, p_new_version, p_change_summary, 'Draft', p_created_by);

    SET p_new_version_id = LAST_INSERT_ID();

    IF v_source_version_id IS NOT NULL THEN
        INSERT INTO sop_sections (sop_version_id, section_type, title, content, sort_order, created_by)
        SELECT p_new_version_id, section_type, title, content, sort_order, p_created_by
        FROM sop_sections
        WHERE sop_version_id = v_source_version_id AND deleted_at IS NULL;

        INSERT INTO sop_steps (sop_version_id, step_number, title, instruction, estimated_minutes, sort_order, created_by)
        SELECT p_new_version_id, step_number, title, instruction, estimated_minutes, sort_order, p_created_by
        FROM sop_steps
        WHERE sop_version_id = v_source_version_id AND deleted_at IS NULL;
    END IF;

    INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values)
    VALUES ('sop_version', p_new_version_id, 'Create', p_created_by,
            JSON_OBJECT('sop_id', p_sop_id, 'version', p_new_version));

    COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- sp_publish_sop
-- Publishes a version: archives the previously current version, marks
-- the new version Published + current, updates sops.current_version_id,
-- and generates Pending acknowledgements from the version's assignments.
-- Fully transactional — any failure rolls back the entire publish.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_publish_sop (
    IN p_sop_id     BIGINT UNSIGNED,
    IN p_version_id BIGINT UNSIGNED,
    IN p_actor_id   BIGINT UNSIGNED
)
BEGIN
    DECLARE v_previous_version_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT current_version_id INTO v_previous_version_id
    FROM sops
    WHERE id = p_sop_id
    FOR UPDATE;

    -- Archive previous published version, if any
    IF v_previous_version_id IS NOT NULL THEN
        UPDATE sop_versions
        SET status = 'Archived', is_current = 0, archived_at = NOW()
        WHERE id = v_previous_version_id;
    END IF;

    -- Publish the new version
    UPDATE sop_versions
    SET status = 'Published', is_current = 1, published_at = NOW()
    WHERE id = p_version_id AND sop_id = p_sop_id;

    -- Point the SOP master record at the new current version
    UPDATE sops
    SET current_version_id = p_version_id, status = 'Published', updated_by = p_actor_id
    WHERE id = p_sop_id;

    -- Generate Pending acknowledgements from direct user assignments
    INSERT IGNORE INTO sop_acknowledgements (sop_version_id, user_id, status)
    SELECT p_version_id, au.user_id, 'Pending'
    FROM sop_assignments a
    JOIN assignment_users au ON au.assignment_id = a.id
    WHERE a.sop_version_id = p_version_id;

    -- Generate Pending acknowledgements from department-wide assignments
    INSERT IGNORE INTO sop_acknowledgements (sop_version_id, user_id, status)
    SELECT p_version_id, u.id, 'Pending'
    FROM sop_assignments a
    JOIN assignment_departments ad ON ad.assignment_id = a.id
    JOIN users u ON u.department_id = ad.department_id
    WHERE a.sop_version_id = p_version_id;

    INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values)
    VALUES ('sop_version', p_version_id, 'Publish', p_actor_id,
            JSON_OBJECT('sop_id', p_sop_id, 'previous_version_id', v_previous_version_id));

    COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- sp_assign_sop
-- Creates an assignment header plus one target row (user or department).
-- Call once per target from the application layer.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_assign_sop (
    IN p_sop_version_id BIGINT UNSIGNED,
    IN p_assigned_by    BIGINT UNSIGNED,
    IN p_user_id        BIGINT UNSIGNED,
    IN p_department_id  BIGINT UNSIGNED,
    IN p_due_date       DATE
)
BEGIN
    DECLARE v_assignment_id BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO sop_assignments (sop_version_id, assigned_by, due_date)
    VALUES (p_sop_version_id, p_assigned_by, p_due_date);

    SET v_assignment_id = LAST_INSERT_ID();

    IF p_user_id IS NOT NULL THEN
        INSERT INTO assignment_users (assignment_id, user_id)
        VALUES (v_assignment_id, p_user_id);
    END IF;

    IF p_department_id IS NOT NULL THEN
        INSERT INTO assignment_departments (assignment_id, department_id)
        VALUES (v_assignment_id, p_department_id);
    END IF;

    COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- sp_acknowledge_sop
-- Records a user's acknowledgement and appends a history row.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_acknowledge_sop (
    IN p_sop_version_id BIGINT UNSIGNED,
    IN p_user_id        BIGINT UNSIGNED,
    IN p_ip_address     VARCHAR(45)
)
BEGIN
    DECLARE v_ack_id BIGINT UNSIGNED;
    DECLARE v_previous_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT id, status INTO v_ack_id, v_previous_status
    FROM sop_acknowledgements
    WHERE sop_version_id = p_sop_version_id AND user_id = p_user_id
    FOR UPDATE;

    -- Session variable read by trg_ack_history_on_update so the history row
    -- captures who made the change; the trigger is the single source of
    -- history rows (avoids double-logging from procedure + trigger).
    SET @ack_change_actor = p_user_id;

    UPDATE sop_acknowledgements
    SET status = 'Acknowledged', acknowledged_at = NOW(), ip_address = p_ip_address
    WHERE id = v_ack_id;

    SET @ack_change_actor = NULL;

    COMMIT;
END$$

DELIMITER ;


-- ============================================================================
-- 20. TRIGGERS
-- ============================================================================
DELIMITER $$

-- NOTE ON is_current EXCLUSIVITY:
-- A trigger that UPDATEs sop_versions from within a trigger fired by an
-- UPDATE on sop_versions itself is rejected by MySQL/MariaDB (error 1442 —
-- a table cannot be re-entered by a trigger while the firing statement is
-- still using it). Exclusivity of is_current is therefore enforced
-- procedurally inside sp_publish_sop (archive-then-publish, same
-- transaction) rather than via trigger. Any code path that sets
-- is_current = 1 outside sp_publish_sop must first zero out sibling rows
-- in the same statement/transaction.

-- Audit trail: sops create/update/delete
CREATE TRIGGER trg_audit_sops_insert
AFTER INSERT ON sops
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values)
    VALUES ('sop', NEW.id, 'Create', NEW.created_by,
            JSON_OBJECT('sop_code', NEW.sop_code, 'title', NEW.title, 'status', NEW.status));
END$$

CREATE TRIGGER trg_audit_sops_update
AFTER UPDATE ON sops
FOR EACH ROW
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, old_values)
        VALUES ('sop', NEW.id, 'Delete', NEW.updated_by, JSON_OBJECT('status', OLD.status));
    ELSE
        INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, old_values, new_values)
        VALUES ('sop', NEW.id, 'Update', NEW.updated_by,
                JSON_OBJECT('status', OLD.status, 'title', OLD.title),
                JSON_OBJECT('status', NEW.status, 'title', NEW.title));
    END IF;
END$$

-- Audit trail: acknowledgement status changes -> history table.
-- Single source of truth for history rows (see note in sp_acknowledge_sop
-- above). Reads @ack_change_actor when a stored procedure has set it;
-- falls back to NULL for direct/ad-hoc UPDATEs.
CREATE TRIGGER trg_ack_history_on_update
AFTER UPDATE ON sop_acknowledgements
FOR EACH ROW
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO acknowledgement_history (acknowledgement_id, previous_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, @ack_change_actor);
    END IF;
END$$

DELIMITER ;


-- ============================================================================
-- 21. SEED DATA
-- ============================================================================
-- NOTE: assumes at least one row already exists in `users` and `departments`.
-- Adjust IDs to match your environment before running in a real database.

INSERT IGNORE INTO tags (name) VALUES
    ('Safety'), ('Quality'), ('Compliance'), ('Operations'), ('HR'), ('IT');

INSERT IGNORE INTO categories (department_id, name, description) VALUES
    (NULL, 'General', 'Uncategorized / cross-department SOPs'),
    (NULL, 'Health & Safety', 'Workplace safety and emergency procedures'),
    (NULL, 'Quality Assurance', 'QA and ISO/QMS related procedures');

-- Default organization-wide approval workflow (created_by assumes user id 1 exists)
INSERT IGNORE INTO approval_workflows (id, name, department_id, description, created_by)
VALUES (1, 'Standard SOP Approval', NULL, 'Default 4-step approval chain for all SOPs', 1);

INSERT IGNORE INTO workflow_steps (workflow_id, step_order, step_name, approver_type, approver_role, is_required) VALUES
    (1, 1, 'Department Review', 'Role', 'Department Head', 1),
    (1, 2, 'QA Review',         'Role', 'QA Officer',      1),
    (1, 3, 'Legal Review',      'Role', 'Legal Counsel',   0),
    (1, 4, 'Final Approval',    'Role', 'CEO',             1);

-- ============================================================================
-- END OF DB_SOP.sql (v2.0)
-- ============================================================================