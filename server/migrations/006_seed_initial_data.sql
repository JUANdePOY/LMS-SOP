-- ============================================================
-- Seed: 006_seed_initial_data.sql
-- Description: Inserts initial ARCEN, Group, Squadron data
--              matching the frontend hierarchyData.js
-- ============================================================

-- ── ARCENs ───────────────────────────────────────────────────
INSERT INTO arcens (name, full_name, code, commander, location, status) VALUES
  ('1st ARCEN', '1st Air Reserve Center',  '1ARCEN', 'Brig. Gen. Antonio Reyes',  'Villamor Air Base, Pasay City',             'active'),
  ('2nd ARCEN', '2nd Air Reserve Center',  '2ARCEN', 'Brig. Gen. Maria Cruz',      'Basa Air Base, Pampanga',                   'active'),
  ('7th ARCEN', '7th Air Reserve Center',  '7ARCEN', 'Brig. Gen. Roberto Torres',  'Mactan Air Base, Cebu',                     'active'),
  ('8th ARCEN', '8th Air Reserve Center',  '8ARCEN', 'Brig. Gen. Eduardo Morales', 'Laguindingan Airport, Misamis Oriental',    'active');

-- ── Groups ───────────────────────────────────────────────────
INSERT INTO `groups` (arcen_id, name, code, type, commander, status) VALUES
  -- 1st ARCEN groups
  (1, '101st Reserve Wing', '101RW', 'Combat Support', 'Col. Ricardo Santos', 'active'),
  (1, '102nd Reserve Wing', '102RW', 'Logistics',      'Col. Elena Flores',   'active'),
  -- 2nd ARCEN groups
  (2, '201st Reserve Wing', '201RW', 'Air Defense',    'Col. Jose Dela Cruz',  'active'),
  (2, '202nd Reserve Wing', '202RW', 'Intelligence',   'Col. Carmen Lopez',    'active'),
  -- 7th ARCEN groups
  (3, '701st Reserve Wing', '701RW', 'Combat Support', 'Col. Victor Lim',      'active'),
  (3, '702nd Reserve Wing', '702RW', 'Medical',        'Col. Teresa Castillo', 'active'),
  -- 8th ARCEN groups
  (4, '509',     '509RG',  'Combat Support', 'Col. Marcos Dela Torre', 'active'),
  (4, 'TOGR 10', 'TOGR10', 'Logistics',      'Col. Natividad Ocampo',  'active');

-- ── Squadrons ─────────────────────────────────────────────────
INSERT INTO squadrons (group_id, name, code, location, specialization, status) VALUES
  -- 101st Reserve Wing (group 1)
  (1, 'Manila',       'MNL-SQ',  'Manila, NCR',              'Security',        'active'),
  (1, 'Quezon City',  'QC-SQ',   'Quezon City, NCR',         'Engineering',     'active'),
  (1, 'Caloocan',     'CLN-SQ',  'Caloocan, NCR',            'Communications',  'active'),
  (1, 'Pasay',        'PSY-SQ',  'Pasay, NCR',               'Medical',         'standby'),
  (1, 'Makati',       'MKT-SQ',  'Makati, NCR',              'Intelligence',    'active'),
  -- 102nd Reserve Wing (group 2)
  (2, 'Malabon',      'MLB-SQ',  'Malabon, NCR',             'Supply',          'active'),
  (2, 'Marikina',     'MRK-SQ',  'Marikina, NCR',            'Transport',       'active'),
  (2, 'Muntinlupa',   'MNP-SQ',  'Muntinlupa, NCR',          'Maintenance',     'standby'),
  (2, 'Paranaque',    'PRQ-SQ',  'Paranaque, NCR',           'Administrative',  'active'),
  (2, 'Taguig',       'TGG-SQ',  'Taguig, NCR',              'Cyber',           'active'),
  -- 201st Reserve Wing (group 3)
  (3, 'Pampanga',     'PMP-SQ',  'Angeles City, Pampanga',   'Air Defense',     'active'),
  (3, 'Bulacan',      'BLC-SQ',  'Malolos, Bulacan',         'Radar Ops',       'active'),
  (3, 'Bataan',       'BTN-SQ',  'Balanga, Bataan',          'Security',        'active'),
  (3, 'Zambales',     'ZMB-SQ',  'Olongapo, Zambales',       'Engineering',     'standby'),
  (3, 'Nueva Ecija',  'NEC-SQ',  'Cabanatuan, Nueva Ecija',  'Communications',  'active'),
  -- 202nd Reserve Wing (group 4)
  (4, 'Tarlac',       'TRC-SQ',  'Tarlac City, Tarlac',      'Intelligence',    'active'),
  (4, 'Pangasinan',   'PGS-SQ',  'Dagupan, Pangasinan',      'Surveillance',    'active'),
  (4, 'La Union',     'LUN-SQ',  'San Fernando, La Union',   'Cyber',           'active'),
  (4, 'Ilocos Norte', 'ILN-SQ',  'Laoag, Ilocos Norte',      'Medical',         'standby'),
  (4, 'Ilocos Sur',   'ILS-SQ',  'Vigan, Ilocos Sur',        'Supply',          'active'),
  -- 701st Reserve Wing (group 5)
  (5, 'Cebu',         'CBU-SQ',  'Cebu City, Cebu',          'Security',        'active'),
  (5, 'Bohol',        'BHL-SQ',  'Tagbilaran, Bohol',        'Engineering',     'active'),
  (5, 'Negros Occ.',  'NGO-SQ',  'Bacolod, Negros Occidental','Medical',        'active'),
  (5, 'Negros Or.',   'NGR-SQ',  'Dumaguete, Negros Oriental','Communications', 'standby'),
  -- 702nd Reserve Wing (group 6)
  (6, 'Leyte',        'LYT-SQ',  'Tacloban, Leyte',          'Medical',         'active'),
  (6, 'Samar',        'SMR-SQ',  'Catbalogan, Samar',        'Nursing',         'active'),
  (6, 'Biliran',      'BLR-SQ',  'Naval, Biliran',           'Dental',          'active'),
  (6, 'Eastern Samar','ESM-SQ',  'Borongan, Eastern Samar',  'Medical',         'standby'),
  -- 509 Group (group 7)
  (7, 'Cagayan de Oro','CDO-SQ', 'Cagayan de Oro, Misamis Oriental','Security', 'active'),
  (7, 'Iligan',       'ILG-SQ',  'Iligan City, Lanao del Norte','Engineering',  'active'),
  (7, 'Camiguin',     'CMG-SQ',  'Mambajao, Camiguin',       'Communications',  'active'),
  (7, 'Lanao Norte',  'LNN-SQ',  'Tubod, Lanao del Norte',   'Medical',         'standby'),
  -- TOGR 10 Group (group 8)
  (8, 'Butuan',       'BTN2-SQ', 'Butuan City, Agusan del Norte','Supply',      'active'),
  (8, 'Surigao',      'SRG-SQ',  'Surigao City, Surigao del Norte','Transport', 'active'),
  (8, 'Tandag',       'TDG-SQ',  'Tandag City, Surigao del Sur','Maintenance',  'active'),
  (8, 'Bayugan',      'BYG-SQ',  'Bayugan City, Agusan del Sur','Administrative','active');
