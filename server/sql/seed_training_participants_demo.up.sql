-- Dev seed: hierarchy + reservists for testing internal training squadron / participant targeting.
-- Prerequisites: schema loaded (arsens, `groups`, squadron, users, reservists, reservist_assignments).
-- Safe to run repeatedly (uses fixed codes / emails and NOT EXISTS guards).
-- Usage: mysql -u root pafr < server/sql/seed_training_participants_demo.up.sql

SET @seed_arsen_code  = 'SEED-TNG-ARCEN';
SET @seed_group_code  = 'SEED-TNG-GRP';
SET @seed_squad_a     = 'SEED-SQ-A';
SET @seed_squad_b     = 'SEED-SQ-B';

-- 1) ARCEN
INSERT INTO arsens (code, name, location, is_active)
SELECT @seed_arsen_code, 'Training Demo ARCEN', 'Surigao', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM arsens WHERE code = @seed_arsen_code);

SET @arsen_id := (SELECT id FROM arsens WHERE code = @seed_arsen_code LIMIT 1);

-- 2) Group (under ARCEN)
INSERT INTO `groups` (arsen_id, code, name, commander_name, is_active)
SELECT @arsen_id, @seed_group_code, 'Training Demo Group', 'LTC Demo Commander', 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `groups` g WHERE g.arsen_id = @arsen_id AND g.code = @seed_group_code
);

SET @group_id := (SELECT id FROM `groups` WHERE arsen_id = @arsen_id AND code = @seed_group_code LIMIT 1);

-- 3) Two squadrons
INSERT INTO squadron (group_id, name, code, location, specialization, is_active)
SELECT @group_id, 'Alpha Flight Squadron', @seed_squad_a, 'Main base', 'Aviation support', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM squadron WHERE group_id = @group_id AND code = @seed_squad_a);

INSERT INTO squadron (group_id, name, code, location, specialization, is_active)
SELECT @group_id, 'Bravo Logistics Squadron', @seed_squad_b, 'Annex', 'Logistics', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM squadron WHERE group_id = @group_id AND code = @seed_squad_b);

SET @sq_a := (SELECT id FROM squadron WHERE group_id = @group_id AND code = @seed_squad_a LIMIT 1);
SET @sq_b := (SELECT id FROM squadron WHERE group_id = @group_id AND code = @seed_squad_b LIMIT 1);

-- 4) Reservist user accounts (password is bcrypt for literal "password" — demo only)
INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r1@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r1@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r2@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r2@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r3@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r3@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r4@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r4@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r5@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r5@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r6@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r6@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r7@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r7@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r8@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r8@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r9@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r9@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r10@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r10@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r11@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r11@demo.local');

INSERT INTO users (email, password_hash, role, is_active)
SELECT 'seed-tng-r12@demo.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'reservist', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seed-tng-r12@demo.local');

-- 5) Reservist profiles
INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Ana', 'Reyes', 'CPL', 'SEED-TNG-00001', 1 FROM users u
WHERE u.email = 'seed-tng-r1@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Juan', 'Cruz', 'Sgt', 'SEED-TNG-00002', 1 FROM users u
WHERE u.email = 'seed-tng-r2@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Liza', 'Gomez', 'Cpl', 'SEED-TNG-00003', 1 FROM users u
WHERE u.email = 'seed-tng-r3@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Mark', 'Diaz', 'PFC', 'SEED-TNG-00004', 1 FROM users u
WHERE u.email = 'seed-tng-r4@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Nina', 'Ramos', 'CPL', 'SEED-TNG-00005', 1 FROM users u
WHERE u.email = 'seed-tng-r5@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Paolo', 'Mendoza', 'SGT', 'SEED-TNG-00006', 1 FROM users u
WHERE u.email = 'seed-tng-r6@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Karen', 'Torres', 'PFC', 'SEED-TNG-00007', 1 FROM users u
WHERE u.email = 'seed-tng-r7@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Ethan', 'Villanueva', 'CPL', 'SEED-TNG-00008', 1 FROM users u
WHERE u.email = 'seed-tng-r8@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Sofia', 'Fernandez', 'CPL', 'SEED-TNG-00009', 1 FROM users u
WHERE u.email = 'seed-tng-r9@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Carlo', 'Bautista', 'SSG', 'SEED-TNG-00010', 1 FROM users u
WHERE u.email = 'seed-tng-r10@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Rica', 'Navarro', 'PFC', 'SEED-TNG-00011', 1 FROM users u
WHERE u.email = 'seed-tng-r11@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, is_active)
SELECT u.id, 'Diego', 'Castillo', 'SGT', 'SEED-TNG-00012', 1 FROM users u
WHERE u.email = 'seed-tng-r12@demo.local'
  AND NOT EXISTS (SELECT 1 FROM reservists r WHERE r.user_id = u.id);

-- 6) Assignments (Alpha: r1,r2,r5–r7,r11 · Bravo: r3,r4,r8–r10,r12)
INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_a, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r1@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_a
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_a, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r2@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_a
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_a, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r5@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_a
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_a, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r6@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_a
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_a, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r7@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_a
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_a, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r11@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_a
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_b, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r3@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_b
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_b, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r4@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_b
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_b, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r8@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_b
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_b, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r9@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_b
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_b, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r10@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_b
);

INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary)
SELECT r.id, @group_id, @sq_b, '2025-01-01', 1 FROM reservists r
JOIN users u ON u.id = r.user_id AND u.email = 'seed-tng-r12@demo.local'
WHERE NOT EXISTS (
  SELECT 1 FROM reservist_assignments ra WHERE ra.reservist_id = r.id AND ra.squadron_id = @sq_b
);

SELECT 'seed_training_participants_demo' AS script, @sq_a AS squadron_alpha_id, @sq_b AS squadron_bravo_id;
