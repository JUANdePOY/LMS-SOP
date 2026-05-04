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
SELECT 'Cities', COUNT(*) FROM cities
UNION ALL
SELECT 'Areas', COUNT(*) FROM areas
UNION ALL
SELECT 'Supplies', COUNT(*) FROM supplies
UNION ALL
SELECT 'Alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'Trainings', COUNT(*) FROM trainings
UNION ALL
SELECT 'System Settings', COUNT(*) FROM system_settings;

-- Show sample data
SELECT id, email, role FROM users;
SELECT id, first_name, last_name, `rank`, service_number FROM reservists;
SELECT id, code, name FROM arsens;
SELECT id, code, name FROM `groups`;
