-- Verify seed data
USE pafr;

SELECT 'Users' as Table_Name, COUNT(*) as Record_Count FROM users
UNION ALL
SELECT 'Reservists', COUNT(*) FROM reservists
UNION ALL
SELECT 'ARSENs', COUNT(*) FROM arsens
UNION ALL
SELECT 'Groups', COUNT(*) FROM `groups`
UNION ALL
SELECT 'Areas', COUNT(*) FROM areas
UNION ALL
SELECT 'Squadrons', COUNT(*) FROM squadron
UNION ALL
SELECT 'Reservist Assignments', COUNT(*) FROM reservist_assignments
UNION ALL
SELECT 'Trainings', COUNT(*) FROM trainings
UNION ALL
SELECT 'Activities', COUNT(*) FROM activities
UNION ALL
SELECT 'Attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'Readiness', COUNT(*) FROM readiness
UNION ALL
SELECT 'Supplies', COUNT(*) FROM supplies
UNION ALL
SELECT 'Supply Issuances', COUNT(*) FROM supply_issuances
UNION ALL
SELECT 'Alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'User Alerts', COUNT(*) FROM user_alerts
UNION ALL
SELECT 'System Settings', COUNT(*) FROM system_settings
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs;

-- Show sample users
SELECT id, email, role, is_active FROM users;

-- Show sample reservists
SELECT id, first_name, last_name, `rank`, service_number, reserve_status FROM reservists;

-- Show sample ARSENs
SELECT id, code, name, location FROM arsens;

-- Show sample groups
SELECT id, code, name, arsen_id FROM `groups`;

-- Show sample squadrons
SELECT id, name, code, group_id FROM squadron;

-- Show sample assignments
SELECT r.first_name, r.last_name, g.name as group_name, s.name as squadron_name
FROM reservist_assignments ra
JOIN reservists r ON ra.reservist_id = r.id
JOIN `groups` g ON ra.group_id = g.id
JOIN squadron s ON ra.squadron_id = s.id
WHERE ra.is_primary = TRUE;

-- Show sample trainings
SELECT id, title, status, start_datetime, venue FROM trainings;

-- Show readiness summary
SELECT r.first_name, r.last_name, rd.assessment_date, rd.medical_status, rd.physical_score, rd.weapons_qualification, rd.overall_score
FROM readiness rd
JOIN reservists r ON rd.reservist_id = r.id
ORDER BY rd.assessment_date DESC;

-- Show low stock supplies
SELECT name, category, quantity_available, reorder_level
FROM supplies
WHERE quantity_available <= reorder_level;