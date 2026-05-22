-- Migration 005: Readiness Score Computation (40/30/30 Model)
-- Training Participation 40%, Attendance Rate 30%, Active Status 30%
--
-- Creates views that compute readiness scores dynamically from:
--   1. Training Participation (40%): % of mandatory trainings attended vs assigned
--   2. Attendance Rate (30%): % of present+late vs total attendance records
--   3. Active Status (30%): is_active flag (100 or 0)

-- ── View: Per-reservist readiness score ──────────────────────────
DROP VIEW IF EXISTS v_overall_readiness;
DROP VIEW IF EXISTS v_arsen_readiness;
DROP VIEW IF EXISTS v_group_readiness;
DROP VIEW IF EXISTS v_squadron_readiness;
DROP VIEW IF EXISTS v_reservist_readiness;

CREATE VIEW v_reservist_readiness AS
SELECT
  r.id AS reservist_id,
  r.first_name,
  r.last_name,
  r.service_number,
  r.`rank`,
  r.is_active,
  r.specialization,
  ra.group_id,
  ra.squadron_id,
  g.arsen_id,

  -- Training Participation (40%): % of mandatory trainings where reservist was present
  COALESCE((
    SELECT ROUND(
      100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) /
      NULLIF(COUNT(*), 0), 2
    )
    FROM internal_training_participants itp
    JOIN trainings t ON itp.training_id = t.id
    LEFT JOIN attendance a ON a.training_id = t.id AND a.reservist_id = itp.reservist_id
    WHERE itp.reservist_id = r.id
      AND t.is_mandatory = TRUE
  ), 0) AS training_participation_pct,

  -- Attendance Rate (30%): % of present+late vs total attendance records
  COALESCE((
    SELECT ROUND(
      100.0 * SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) /
      NULLIF(COUNT(*), 0), 2
    )
    FROM attendance a
    WHERE a.reservist_id = r.id
  ), 0) AS attendance_rate_pct,

  -- Active Status (30%): 100 if active, 0 if not
  CASE WHEN r.is_active = TRUE THEN 100.00 ELSE 0.00 END AS active_status_pct,

  -- Overall Readiness Score (weighted)
  ROUND(
    COALESCE((
      SELECT 0.40 * 100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) /
        NULLIF(COUNT(*), 0)
      FROM internal_training_participants itp
      JOIN trainings t ON itp.training_id = t.id
      LEFT JOIN attendance a ON a.training_id = t.id AND a.reservist_id = itp.reservist_id
      WHERE itp.reservist_id = r.id
        AND t.is_mandatory = TRUE
    ), 0)
    +
    COALESCE((
      SELECT 0.30 * 100.0 * SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) /
        NULLIF(COUNT(*), 0)
      FROM attendance a
      WHERE a.reservist_id = r.id
    ), 0)
    +
    CASE WHEN r.is_active = TRUE THEN 30.00 ELSE 0.00 END
  , 2) AS readiness_score

FROM reservists r
LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
LEFT JOIN `groups` g ON ra.group_id = g.id;

-- ── View: Squadron-level aggregated readiness ─────────────────────
CREATE VIEW v_squadron_readiness AS
SELECT
  s.id AS squadron_id,
  s.name AS squadron_name,
  s.code AS squadron_code,
  s.group_id,
  g.name AS group_name,
  g.arsen_id,
  a.name AS arsen_name,
  COUNT(DISTINCT vr.reservist_id) AS total_reservists,
  COUNT(DISTINCT CASE WHEN vr.is_active = TRUE THEN vr.reservist_id END) AS active_reservists,
  ROUND(AVG(vr.readiness_score), 2) AS avg_readiness_score,
  ROUND(AVG(vr.training_participation_pct), 2) AS avg_training_participation,
  ROUND(AVG(vr.attendance_rate_pct), 2) AS avg_attendance_rate,
  ROUND(AVG(vr.active_status_pct), 2) AS avg_active_status,
  COUNT(DISTINCT CASE WHEN vr.readiness_score < 65 THEN vr.reservist_id END) AS below_threshold_count
FROM squadron s
JOIN `groups` g ON s.group_id = g.id
JOIN arsens a ON g.arsen_id = a.id
LEFT JOIN v_reservist_readiness vr ON vr.squadron_id = s.id
GROUP BY s.id, s.name, s.code, s.group_id, g.name, g.arsen_id, a.name;

-- ── View: Group-level aggregated readiness ────────────────────────
CREATE VIEW v_group_readiness AS
SELECT
  g.id AS group_id,
  g.name AS group_name,
  g.code AS group_code,
  g.arsen_id,
  a.name AS arsen_name,
  COUNT(DISTINCT sr.squadron_id) AS total_squadrons,
  COUNT(DISTINCT sr.total_reservists) AS total_reservists,
  SUM(sr.active_reservists) AS active_reservists,
  ROUND(AVG(sr.avg_readiness_score), 2) AS avg_readiness_score,
  ROUND(AVG(sr.avg_training_participation), 2) AS avg_training_participation,
  ROUND(AVG(sr.avg_attendance_rate), 2) AS avg_attendance_rate,
  ROUND(AVG(sr.avg_active_status), 2) AS avg_active_status,
  SUM(sr.below_threshold_count) AS below_threshold_count
FROM `groups` g
JOIN arsens a ON g.arsen_id = a.id
LEFT JOIN v_squadron_readiness sr ON sr.group_id = g.id
GROUP BY g.id, g.name, g.code, g.arsen_id, a.name;

-- ── View: Arsen-level aggregated readiness ────────────────────────
CREATE VIEW v_arsen_readiness AS
SELECT
  a.id AS arsen_id,
  a.name AS arsen_name,
  a.code AS arsen_code,
  COUNT(DISTINCT gr.group_id) AS total_groups,
  SUM(gr.total_squadrons) AS total_squadrons,
  SUM(gr.total_reservists) AS total_reservists,
  SUM(gr.active_reservists) AS active_reservists,
  ROUND(AVG(gr.avg_readiness_score), 2) AS avg_readiness_score,
  ROUND(AVG(gr.avg_training_participation), 2) AS avg_training_participation,
  ROUND(AVG(gr.avg_attendance_rate), 2) AS avg_attendance_rate,
  ROUND(AVG(gr.avg_active_status), 2) AS avg_active_status,
  SUM(gr.below_threshold_count) AS below_threshold_count
FROM arsens a
LEFT JOIN v_group_readiness gr ON gr.arsen_id = a.id
GROUP BY a.id, a.name, a.code;

-- ── View: Overall readiness summary ───────────────────────────────
CREATE VIEW v_overall_readiness AS
SELECT
  COUNT(DISTINCT reservist_id) AS total_reservists,
  COUNT(DISTINCT CASE WHEN is_active = TRUE THEN reservist_id END) AS active_reservists,
  ROUND(AVG(readiness_score), 2) AS avg_readiness_score,
  ROUND(AVG(training_participation_pct), 2) AS avg_training_participation,
  ROUND(AVG(attendance_rate_pct), 2) AS avg_attendance_rate,
  ROUND(AVG(active_status_pct), 2) AS avg_active_status,
  COUNT(DISTINCT CASE WHEN readiness_score < 65 THEN reservist_id END) AS below_threshold_count,
  COUNT(DISTINCT CASE WHEN readiness_score >= 80 THEN reservist_id END) AS high_readiness_count,
  COUNT(DISTINCT CASE WHEN readiness_score >= 65 AND readiness_score < 80 THEN reservist_id END) AS medium_readiness_count,
  COUNT(DISTINCT CASE WHEN readiness_score < 65 AND readiness_score > 0 THEN reservist_id END) AS low_readiness_count
FROM v_reservist_readiness;
