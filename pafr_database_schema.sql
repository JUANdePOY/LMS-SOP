-- MariaDB dump 10.19-11.4.9-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: pafr
-- ------------------------------------------------------
-- Server version	11.4.9-MariaDB

;

--
-- Table structure for table activities
--

DROP TABLE IF EXISTS activities;

CREATE TABLE activities (
  id bigint GENERATED ALWAYS AS IDENTITY,
  training_id bigint NOT NULL,
  title varchar(500) NOT NULL,
  description text DEFAULT NULL,
  start_time timestamp NOT NULL,
  end_time timestamp NOT NULL,
  location varchar(500) DEFAULT NULL,
  instructor varchar(200) DEFAULT NULL,
  is_mandatory boolean NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT activities_chk_1 CHECK (end_time > start_time)
);

--
-- Table structure for table alert_rules
--

DROP TABLE IF EXISTS alert_rules;

CREATE TABLE alert_rules (
  id bigint GENERATED ALWAYS AS IDENTITY,
  type varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  description text DEFAULT NULL,
  severity varchar(100) NOT NULL DEFAULT 'warning',
  threshold decimal(10,2) DEFAULT NULL,
  lookback_days integer DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table alerts
--

DROP TABLE IF EXISTS alerts;

CREATE TABLE alerts (
  id bigint GENERATED ALWAYS AS IDENTITY,
  title varchar(500) NOT NULL,
  message text NOT NULL,
  target_role varchar(100) NOT NULL DEFAULT 'all',
  target_group_id bigint DEFAULT NULL,
  target_squadron_id bigint DEFAULT NULL,
  target_area_id bigint DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date DEFAULT NULL,
  created_by bigint NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table areas
--

DROP TABLE IF EXISTS areas;

CREATE TABLE areas (
  id bigint GENERATED ALWAYS AS IDENTITY,
  parent_area_id bigint DEFAULT NULL,
  name varchar(200) NOT NULL,
  code varchar(50) NOT NULL,
  description text DEFAULT NULL,
  geographic_boundary jsonb DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (code)
);

--
-- Table structure for table arsens
--

DROP TABLE IF EXISTS arsens;

CREATE TABLE arsens (
  id bigint GENERATED ALWAYS AS IDENTITY,
  code varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  location varchar(500) DEFAULT NULL,
  commander_name varchar(200) DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (code)
);

--
-- Table structure for table attendance
--

DROP TABLE IF EXISTS attendance;

CREATE TABLE attendance (
  id bigint GENERATED ALWAYS AS IDENTITY,
  reservist_id bigint NOT NULL,
  training_id bigint NOT NULL,
  event_type varchar(100) NOT NULL DEFAULT 'internal',
  external_training_id bigint DEFAULT NULL,
  status varchar(100) NOT NULL DEFAULT 'pending',
  check_in_time timestamp DEFAULT NULL,
  check_out_time timestamp DEFAULT NULL,
  location_check_in jsonb DEFAULT NULL,
  qr_code_used varchar(255) DEFAULT NULL,
  scan_method varchar(100) DEFAULT NULL,
  scan_timestamp timestamp DEFAULT NULL,
  notes text DEFAULT NULL,
  recorded_by bigint DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (reservist_id,training_id)
);

--
-- Table structure for table audit_logs
--

DROP TABLE IF EXISTS audit_logs;

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY,
  user_id bigint DEFAULT NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(50) NOT NULL,
  entity_id bigint DEFAULT NULL,
  old_values jsonb DEFAULT NULL,
  new_values jsonb DEFAULT NULL,
  ip_address varchar(45) DEFAULT NULL,
  user_agent text DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table external_training_attachments
--

DROP TABLE IF EXISTS external_training_attachments;

CREATE TABLE external_training_attachments (
  id bigint GENERATED ALWAYS AS IDENTITY,
  external_training_id bigint NOT NULL,
  kind varchar(50) NOT NULL DEFAULT 'letter_order',
  stored_filename varchar(500) NOT NULL,
  original_filename varchar(500) NOT NULL,
  mime_type varchar(100) DEFAULT NULL,
  size_bytes integer DEFAULT NULL,
  storage_backend varchar(50) NOT NULL DEFAULT 'local',
  relative_path varchar(1000) DEFAULT NULL,
  uploaded_by bigint DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table external_training_attendance
--

DROP TABLE IF EXISTS external_training_attendance;

CREATE TABLE external_training_attendance (
  id bigint GENERATED ALWAYS AS IDENTITY,
  external_training_id bigint NOT NULL,
  registration_id bigint DEFAULT NULL,
  reservist_id bigint DEFAULT NULL,
  participant_name varchar(300) DEFAULT NULL,
  participant_data jsonb DEFAULT NULL,
  status varchar(100) NOT NULL DEFAULT 'pending',
  check_in_time timestamp DEFAULT NULL,
  check_out_time timestamp DEFAULT NULL,
  scan_method varchar(100) DEFAULT NULL,
  qr_code_scanned varchar(255) DEFAULT NULL,
  notes text DEFAULT NULL,
  recorded_by bigint DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table external_trainings
--

DROP TABLE IF EXISTS external_trainings;

CREATE TABLE external_trainings (
  id bigint GENERATED ALWAYS AS IDENTITY,
  title varchar(500) NOT NULL,
  description text DEFAULT NULL,
  start_date date NOT NULL,
  start_time time DEFAULT NULL,
  venue varchar(500) DEFAULT NULL,
  status varchar(100) NOT NULL DEFAULT 'draft',
  capacity integer DEFAULT NULL,
  instructor varchar(200) DEFAULT NULL,
  squadron_limits text DEFAULT NULL ,
  registration_fields jsonb DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id));

--
-- Table structure for table groups
--

DROP TABLE IF EXISTS groups;

CREATE TABLE groups (
  id bigint GENERATED ALWAYS AS IDENTITY,
  arsen_id bigint NOT NULL,
  code varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  commander_name varchar(200) DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (arsen_id,code)
);

--
-- Table structure for table internal_training_attachments
--

DROP TABLE IF EXISTS internal_training_attachments;

CREATE TABLE internal_training_attachments (
  id bigint GENERATED ALWAYS AS IDENTITY,
  training_id bigint NOT NULL,
  kind varchar(50) NOT NULL DEFAULT 'letter_order',
  stored_filename varchar(500) NOT NULL,
  original_filename varchar(500) NOT NULL,
  mime_type varchar(100) DEFAULT NULL,
  size_bytes integer DEFAULT NULL,
  storage_backend varchar(50) NOT NULL DEFAULT 'local',
  relative_path varchar(1000) DEFAULT NULL,
  uploaded_by bigint DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table internal_training_participants
--

DROP TABLE IF EXISTS internal_training_participants;

CREATE TABLE internal_training_participants (
  id bigint GENERATED ALWAYS AS IDENTITY,
  training_id bigint NOT NULL,
  reservist_id bigint NOT NULL,
  squadron_id bigint NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (training_id,reservist_id)
);

--
-- Table structure for table readiness
--

DROP TABLE IF EXISTS readiness;

CREATE TABLE readiness (
  id bigint GENERATED ALWAYS AS IDENTITY,
  reservist_id bigint NOT NULL,
  assessment_date date NOT NULL,
  medical_status varchar(100) NOT NULL DEFAULT 'pending',
  medical_notes text DEFAULT NULL,
  physical_score decimal(5,2) NOT NULL,
  physical_test_date date DEFAULT NULL,
  weapons_qualification varchar(100) DEFAULT 'none',
  weapons_test_date date DEFAULT NULL,
  overall_score decimal(5,2) GENERATED ALWAYS AS (round((case when medical_status = 'fit' then 100 when medical_status = 'limited' then 70 when medical_status = 'pending' then 50 else 0 end + physical_score + case weapons_qualification when 'expert' then 100 when 'sharpshooter' then 90 when 'marksman' then 80 when 'qualified' then 70 else 0 end) / 3,2)) STORED,
  assessed_by bigint DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (reservist_id,assessment_date)
);

--
-- Table structure for table report_documentations
--

DROP TABLE IF EXISTS report_documentations;

CREATE TABLE report_documentations (
  id bigint GENERATED ALWAYS AS IDENTITY,
  report_id bigint NOT NULL,
  original_filename varchar(500) NOT NULL,
  file_path varchar(1000) NOT NULL,
  file_size integer DEFAULT NULL,
  mime_type varchar(100) DEFAULT NULL,
  uploaded_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id));

--
-- Table structure for table report_participants
--

DROP TABLE IF EXISTS report_participants;

CREATE TABLE report_participants (
  report_id bigint NOT NULL,
  reservist_id bigint NOT NULL,
  squadron_id bigint DEFAULT NULL,
  attendance_status varchar(100) NOT NULL DEFAULT 'present',
  notes varchar(500) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id,reservist_id));

--
-- Table structure for table reports
--

DROP TABLE IF EXISTS reports;

CREATE TABLE reports (
  id bigint GENERATED ALWAYS AS IDENTITY,
  title varchar(500) NOT NULL,
  event_type varchar(100) NOT NULL DEFAULT 'internal',
  event_source_id bigint DEFAULT NULL,
  event_date date DEFAULT NULL,
  summary text DEFAULT NULL,
  type varchar(100) NOT NULL,
  format varchar(100) NOT NULL,
  file_path varchar(1000) NOT NULL,
  file_size integer DEFAULT NULL,
  parameters jsonb DEFAULT NULL,
  generated_by bigint NOT NULL,
  generated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp DEFAULT NULL,
  is_recurring boolean DEFAULT FALSE,
  schedule_pattern varchar(100) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table reservist_assignments
--

DROP TABLE IF EXISTS reservist_assignments;

CREATE TABLE reservist_assignments (
  id bigint GENERATED ALWAYS AS IDENTITY,
  reservist_id bigint NOT NULL,
  group_id bigint NOT NULL,
  squadron_id bigint NOT NULL,
  assigned_date date NOT NULL,
  is_primary boolean NOT NULL DEFAULT TRUE,
  notes text DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table reservists
--

DROP TABLE IF EXISTS reservists;

CREATE TABLE reservists (
  id bigint GENERATED ALWAYS AS IDENTITY,
  user_id bigint NOT NULL,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  rank varchar(50) NOT NULL,
  service_number varchar(100) NOT NULL,
  qr_code varchar(255) DEFAULT NULL,
  date_of_birth date DEFAULT NULL,
  place_of_birth varchar(200) DEFAULT NULL,
  age integer DEFAULT NULL,
  sex varchar(100) DEFAULT NULL,
  civil_status varchar(100) DEFAULT NULL,
  citizenship varchar(100) DEFAULT 'Filipino',
  height decimal(5,2) DEFAULT NULL,
  weight decimal(5,2) DEFAULT NULL,
  blood_type varchar(100) DEFAULT 'Unknown',
  phone_number varchar(20) DEFAULT NULL,
  address text DEFAULT NULL,
  reserve_center varchar(200) DEFAULT NULL,
  category varchar(100) DEFAULT NULL,
  date_enlisted date DEFAULT NULL,
  source_of_commission varchar(100) DEFAULT NULL,
  rank_date_appointment date DEFAULT NULL,
  position varchar(200) DEFAULT NULL,
  specialization varchar(200) DEFAULT NULL,
  reserve_status varchar(100) DEFAULT 'Ready Reserve',
  highest_education varchar(100) DEFAULT NULL,
  course_degree varchar(200) DEFAULT NULL,
  school varchar(300) DEFAULT NULL,
  year_graduated integer DEFAULT NULL,
  occupation varchar(200) DEFAULT NULL,
  employer varchar(200) DEFAULT NULL,
  office_address text DEFAULT NULL,
  basic_training_completed varchar(100) DEFAULT NULL,
  basic_training_date date DEFAULT NULL,
  emergency_contact_name varchar(200) DEFAULT NULL,
  emergency_contact_phone varchar(20) DEFAULT NULL,
  emergency_contact_address text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (user_id),
  UNIQUE (service_number),
  UNIQUE (qr_code)
);

--
-- Table structure for table roles
--

DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
  id integer GENERATED ALWAYS AS IDENTITY,
  name varchar(50) NOT NULL,
  display_name varchar(100) NOT NULL,
  description text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (name)
);

--
-- Table structure for table scan_audit_log
--

DROP TABLE IF EXISTS scan_audit_log;

CREATE TABLE scan_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY,
  training_id bigint DEFAULT NULL,
  external_training_id bigint DEFAULT NULL,
  event_type varchar(100) NOT NULL,
  qr_code_scanned varchar(255) NOT NULL,
  reservist_id bigint DEFAULT NULL,
  scan_result varchar(100) NOT NULL,
  scan_method varchar(100) DEFAULT NULL,
  device_info varchar(500) DEFAULT NULL,
  facilitator_id bigint DEFAULT NULL,
  error_message varchar(500) DEFAULT NULL,
  scanned_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table squadron
--

DROP TABLE IF EXISTS squadron;

CREATE TABLE squadron (
  id bigint GENERATED ALWAYS AS IDENTITY,
  group_id bigint NOT NULL,
  name varchar(200) NOT NULL,
  code varchar(50) DEFAULT NULL,
  location varchar(200) DEFAULT NULL,
  latitude decimal(10,7) DEFAULT NULL,
  longitude decimal(10,7) DEFAULT NULL,
  specialization varchar(100) DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table supplies
--

DROP TABLE IF EXISTS supplies;

CREATE TABLE supplies (
  id bigint GENERATED ALWAYS AS IDENTITY,
  name varchar(200) NOT NULL,
  category varchar(100) NOT NULL,
  description text DEFAULT NULL,
  unit varchar(20) NOT NULL,
  quantity_available integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 10,
  max_stock integer DEFAULT NULL,
  location varchar(200) DEFAULT NULL,
  supplier varchar(200) DEFAULT NULL,
  last_ordered_date date DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id));

--
-- Table structure for table supply_issuances
--

DROP TABLE IF EXISTS supply_issuances;

CREATE TABLE supply_issuances (
  id bigint GENERATED ALWAYS AS IDENTITY,
  reservist_id bigint NOT NULL,
  supply_id bigint NOT NULL,
  quantity_issued integer NOT NULL,
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  due_return_date date NOT NULL,
  returned_date date DEFAULT NULL,
  returned_quantity integer DEFAULT NULL,
  condition_on_issue varchar(100) DEFAULT 'good',
  condition_on_return varchar(100) DEFAULT NULL,
  issued_by bigint NOT NULL,
  received_by bigint DEFAULT NULL,
  notes text DEFAULT NULL,
  issuance_type varchar(100) NOT NULL DEFAULT 'issued',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT supply_issuances_chk_1 CHECK (returned_quantity is null or returned_quantity <= quantity_issued)
);

--
-- Table structure for table system_alerts
--

DROP TABLE IF EXISTS system_alerts;

CREATE TABLE system_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY,
  rule_id bigint DEFAULT NULL,
  alert_type varchar(100) NOT NULL,
  severity varchar(100) NOT NULL DEFAULT 'warning',
  title varchar(500) NOT NULL,
  message text NOT NULL,
  entity_type varchar(50) DEFAULT NULL,
  entity_id bigint DEFAULT NULL,
  entity_name varchar(500) DEFAULT NULL,
  squadron_id bigint DEFAULT NULL,
  group_id bigint DEFAULT NULL,
  arsen_id bigint DEFAULT NULL,
  is_acknowledged boolean NOT NULL DEFAULT FALSE,
  acknowledged_by bigint DEFAULT NULL,
  acknowledged_at timestamp DEFAULT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table system_settings
--

DROP TABLE IF EXISTS system_settings;

CREATE TABLE system_settings (
  key varchar(100) NOT NULL,
  value text NOT NULL ,
  description text DEFAULT NULL,
  updated_by bigint DEFAULT NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key)
);

--
-- Table structure for table training_facilitators
--

DROP TABLE IF EXISTS training_facilitators;

CREATE TABLE training_facilitators (
  id bigint GENERATED ALWAYS AS IDENTITY,
  training_id bigint DEFAULT NULL,
  external_training_id bigint DEFAULT NULL,
  user_id bigint NOT NULL,
  assigned_by bigint DEFAULT NULL,
  assigned_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (training_id,user_id),
  UNIQUE (external_training_id,user_id)
);

--
-- Table structure for table training_registrations
--

DROP TABLE IF EXISTS training_registrations;

CREATE TABLE training_registrations (
  id bigint GENERATED ALWAYS AS IDENTITY,
  training_id bigint NOT NULL,
  participant_data jsonb DEFAULT NULL,
  registered_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table trainings
--

DROP TABLE IF EXISTS trainings;

CREATE TABLE trainings (
  id bigint GENERATED ALWAYS AS IDENTITY,
  title varchar(500) NOT NULL,
  description text DEFAULT NULL,
  start_datetime timestamp NOT NULL,
  end_datetime timestamp NOT NULL,
  venue varchar(500) NOT NULL,
  area_id bigint DEFAULT NULL,
  status varchar(100) NOT NULL DEFAULT 'draft',
  capacity integer DEFAULT NULL,
  is_mandatory boolean NOT NULL DEFAULT FALSE,
  created_by bigint NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT trainings_chk_1 CHECK (end_datetime > start_datetime)
);

--
-- Table structure for table user_alerts
--

DROP TABLE IF EXISTS user_alerts;

CREATE TABLE user_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY,
  user_id bigint NOT NULL,
  alert_id bigint NOT NULL,
  is_read boolean NOT NULL DEFAULT FALSE,
  read_at timestamp DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (user_id,alert_id)
);

--
-- Table structure for table user_role_history
--

DROP TABLE IF EXISTS user_role_history;

CREATE TABLE user_role_history (
  id bigint GENERATED ALWAYS AS IDENTITY,
  user_id bigint NOT NULL,
  old_role varchar(50) DEFAULT NULL,
  new_role varchar(50) NOT NULL,
  old_scope_arsen_id bigint DEFAULT NULL,
  new_scope_arsen_id bigint DEFAULT NULL,
  old_scope_group_id bigint DEFAULT NULL,
  new_scope_group_id bigint DEFAULT NULL,
  old_scope_squadron_id bigint DEFAULT NULL,
  new_scope_squadron_id bigint DEFAULT NULL,
  changed_by bigint DEFAULT NULL,
  changed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--
-- Table structure for table users
--

DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY,
  email varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role varchar(100) NOT NULL DEFAULT 'reservist',
  scope_arsen_id bigint DEFAULT NULL,
  scope_group_id bigint DEFAULT NULL,
  scope_squadron_id bigint DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  last_login_at timestamp DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (email)
);

--

-- Foreign key constraints added after all tables exist
ALTER TABLE activities ADD CONSTRAINT activities_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings (id) ON DELETE CASCADE;
ALTER TABLE alerts ADD CONSTRAINT alerts_ibfk_1 FOREIGN KEY (target_group_id) REFERENCES groups (id) ON DELETE SET NULL;
ALTER TABLE alerts ADD CONSTRAINT alerts_ibfk_2 FOREIGN KEY (target_squadron_id) REFERENCES squadron (id) ON DELETE SET NULL;
ALTER TABLE alerts ADD CONSTRAINT alerts_ibfk_3 FOREIGN KEY (target_area_id) REFERENCES areas (id) ON DELETE SET NULL;
ALTER TABLE alerts ADD CONSTRAINT alerts_ibfk_4 FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE areas ADD CONSTRAINT areas_ibfk_1 FOREIGN KEY (parent_area_id) REFERENCES areas (id) ON DELETE SET NULL;
ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists (id) ON DELETE CASCADE;
ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_2 FOREIGN KEY (training_id) REFERENCES trainings (id) ON DELETE CASCADE;
ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_3 FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE external_training_attachments ADD CONSTRAINT external_training_attachments_ibfk_1 FOREIGN KEY (external_training_id) REFERENCES external_trainings (id) ON DELETE CASCADE;
ALTER TABLE external_training_attachments ADD CONSTRAINT external_training_attachments_ibfk_2 FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE external_training_attendance ADD CONSTRAINT external_training_attendance_ibfk_1 FOREIGN KEY (external_training_id) REFERENCES external_trainings (id) ON DELETE CASCADE;
ALTER TABLE external_training_attendance ADD CONSTRAINT external_training_attendance_ibfk_2 FOREIGN KEY (registration_id) REFERENCES training_registrations (id) ON DELETE SET NULL;
ALTER TABLE external_training_attendance ADD CONSTRAINT external_training_attendance_ibfk_3 FOREIGN KEY (reservist_id) REFERENCES reservists (id) ON DELETE SET NULL;
ALTER TABLE external_training_attendance ADD CONSTRAINT external_training_attendance_ibfk_4 FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE groups ADD CONSTRAINT groups_ibfk_1 FOREIGN KEY (arsen_id) REFERENCES arsens (id) ON DELETE CASCADE;
ALTER TABLE internal_training_attachments ADD CONSTRAINT internal_training_attachments_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings (id) ON DELETE CASCADE;
ALTER TABLE internal_training_attachments ADD CONSTRAINT internal_training_attachments_ibfk_2 FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE internal_training_participants ADD CONSTRAINT internal_training_participants_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings (id) ON DELETE CASCADE;
ALTER TABLE internal_training_participants ADD CONSTRAINT internal_training_participants_ibfk_2 FOREIGN KEY (reservist_id) REFERENCES reservists (id) ON DELETE CASCADE;
ALTER TABLE internal_training_participants ADD CONSTRAINT internal_training_participants_ibfk_3 FOREIGN KEY (squadron_id) REFERENCES squadron (id) ON DELETE CASCADE;
ALTER TABLE readiness ADD CONSTRAINT readiness_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists (id) ON DELETE CASCADE;
ALTER TABLE readiness ADD CONSTRAINT readiness_ibfk_2 FOREIGN KEY (assessed_by) REFERENCES users (id);
ALTER TABLE reports ADD CONSTRAINT reports_ibfk_1 FOREIGN KEY (generated_by) REFERENCES users (id);
ALTER TABLE reservist_assignments ADD CONSTRAINT reservist_assignments_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists (id) ON DELETE CASCADE;
ALTER TABLE reservist_assignments ADD CONSTRAINT reservist_assignments_ibfk_2 FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE;
ALTER TABLE reservist_assignments ADD CONSTRAINT reservist_assignments_ibfk_3 FOREIGN KEY (squadron_id) REFERENCES squadron (id) ON DELETE CASCADE;
ALTER TABLE reservists ADD CONSTRAINT reservists_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE scan_audit_log ADD CONSTRAINT scan_audit_log_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings (id) ON DELETE SET NULL;
ALTER TABLE scan_audit_log ADD CONSTRAINT scan_audit_log_ibfk_2 FOREIGN KEY (external_training_id) REFERENCES external_trainings (id) ON DELETE SET NULL;
ALTER TABLE scan_audit_log ADD CONSTRAINT scan_audit_log_ibfk_3 FOREIGN KEY (reservist_id) REFERENCES reservists (id) ON DELETE SET NULL;
ALTER TABLE scan_audit_log ADD CONSTRAINT scan_audit_log_ibfk_4 FOREIGN KEY (facilitator_id) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE squadron ADD CONSTRAINT squadron_ibfk_1 FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE;
ALTER TABLE supply_issuances ADD CONSTRAINT supply_issuances_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists (id) ON DELETE CASCADE;
ALTER TABLE supply_issuances ADD CONSTRAINT supply_issuances_ibfk_2 FOREIGN KEY (supply_id) REFERENCES supplies (id) ON DELETE CASCADE;
ALTER TABLE supply_issuances ADD CONSTRAINT supply_issuances_ibfk_3 FOREIGN KEY (issued_by) REFERENCES users (id);
ALTER TABLE supply_issuances ADD CONSTRAINT supply_issuances_ibfk_4 FOREIGN KEY (received_by) REFERENCES users (id);
ALTER TABLE system_alerts ADD CONSTRAINT system_alerts_ibfk_1 FOREIGN KEY (rule_id) REFERENCES alert_rules (id) ON DELETE SET NULL;
ALTER TABLE system_settings ADD CONSTRAINT system_settings_ibfk_1 FOREIGN KEY (updated_by) REFERENCES users (id);
ALTER TABLE training_facilitators ADD CONSTRAINT training_facilitators_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings (id) ON DELETE CASCADE;
ALTER TABLE training_facilitators ADD CONSTRAINT training_facilitators_ibfk_2 FOREIGN KEY (external_training_id) REFERENCES external_trainings (id) ON DELETE CASCADE;
ALTER TABLE training_facilitators ADD CONSTRAINT training_facilitators_ibfk_3 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE training_facilitators ADD CONSTRAINT training_facilitators_ibfk_4 FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE training_registrations ADD CONSTRAINT training_registrations_ibfk_1 FOREIGN KEY (training_id) REFERENCES external_trainings (id) ON DELETE CASCADE;
ALTER TABLE trainings ADD CONSTRAINT trainings_ibfk_1 FOREIGN KEY (area_id) REFERENCES areas (id) ON DELETE SET NULL;
ALTER TABLE trainings ADD CONSTRAINT trainings_ibfk_2 FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE user_alerts ADD CONSTRAINT user_alerts_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE user_alerts ADD CONSTRAINT user_alerts_ibfk_2 FOREIGN KEY (alert_id) REFERENCES alerts (id) ON DELETE CASCADE;
ALTER TABLE user_role_history ADD CONSTRAINT user_role_history_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE user_role_history ADD CONSTRAINT user_role_history_ibfk_2 FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_user_arsen FOREIGN KEY (scope_arsen_id) REFERENCES arsens (id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_user_group FOREIGN KEY (scope_group_id) REFERENCES groups (id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_user_squadron FOREIGN KEY (scope_squadron_id) REFERENCES squadron (id) ON DELETE SET NULL;
