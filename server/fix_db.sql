INSERT IGNORE INTO reservists (id, user_id, first_name, last_name, rank, service_number, date_of_birth, age, sex, is_active) VALUES
(1, 1, 'Admin', 'User', 'Captain', 'ADMIN-001', '1980-01-01', 45, 'Male', 1),
(2, 2, 'Reservist', 'One', 'Airman', 'RES-001', '1995-01-01', 31, 'Male', 1),
(3, 3, 'Reservist', 'Two', 'Airman First Class', 'RES-002', '1993-01-01', 33, 'Male', 1),
(4, 4, 'Reservist', 'Three', 'Sergeant', 'RES-003', '1990-01-01', 36, 'Male', 1),
(5, 5, 'Reservist', 'Four', 'Corporal', 'RES-004', '1998-01-01', 28, 'Female', 1),
(6, 6, 'Reservist', 'Five', 'Private First Class', 'RES-005', '1996-01-01', 30, 'Male', 1),
(7, 7, 'Reservist', 'Six', 'Lieutenant Colonel', 'RES-006', '1985-01-01', 41, 'Male', 1),
(8, 8, 'Reservist', 'Seven', 'Major', 'RES-008', '1988-01-01', 38, 'Male', 1),
(9, 9, 'Reservist', 'Eight', 'Colonel', 'RES-007', '1979-01-01', 47, 'Male', 1),
(10, 10, 'Reservist', 'Nine', 'Lieutenant Colonel', 'RES-009', '1987-01-01', 39, 'Male', 1),
(11, 11, 'Reservist', 'Ten', 'Colonel', 'RES-010', '1982-01-01', 44, 'Male', 1),
(12, 12, 'Reservist', 'Eleven', 'Master Sergeant', 'RES-011', '2000-01-01', 26, 'Male', 1);

UPDATE users SET password_hash = '$2b$12$0FM.BWfgZvVsaGBN9qf2COz7B7HpqnXfpQdpLgel58lZv3/tHiP2m' WHERE email = 'ADMIN-001';

SELECT COUNT(*) as reservist_count FROM reservists;
SELECT u.email, r.service_number FROM users u JOIN reservists r ON u.id = r.user_id LIMIT 3;
