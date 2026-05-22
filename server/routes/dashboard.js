const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getUserScopeFilter } = require('../middleware/rbac');

/**
 * GET /api/dashboard
 * Aggregated dashboard data: KPIs, readiness, attendance, training, alerts.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Build scope conditions for unit admins
    let scopeWhereReservists = '';
    let scopeWhereAssignments = '';
    let scopeParams = [];
    if (req.user.role !== 'admin') {
      const { conditions, params } = getUserScopeFilter(req.user);
      if (conditions.length > 0) {
        scopeWhereReservists = ' AND (' + conditions.join(' OR ') + ')';
        scopeWhereAssignments = ' AND (' + conditions.map(c => c.replace('squadron_id', 'ra.squadron_id').replace('group_id', 'ra.group_id').replace('arsen_id', 'g.arsen_id')).join(' OR ') + ')';
        scopeParams = params;
      }
    }

    // ── KPI Summary ──────────────────────────────────────────────
    const [[overallReadiness]] = await db.query('SELECT * FROM v_overall_readiness');

    const [[reservistCount]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN r.is_active = TRUE THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN r.reserve_status = 'Ready Reserve' THEN 1 ELSE 0 END) AS ready,
        SUM(CASE WHEN r.reserve_status = 'Standby Reserve' THEN 1 ELSE 0 END) AS standby
      FROM reservists r
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      WHERE 1=1 ${scopeWhereReservists}
    `, scopeParams);

    const [[trainingCount]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) AS ongoing,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS upcoming
      FROM trainings
    `);

    const [[attendanceStats]] = await db.query(`
      SELECT
        COUNT(*) AS total_records,
        SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present_count,
        ROUND(100.0 * SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS attendance_rate
      FROM attendance a
      JOIN reservist_assignments ra ON a.reservist_id = ra.reservist_id AND ra.is_primary = TRUE
      JOIN \`groups\` g ON ra.group_id = g.id
      WHERE 1=1 ${scopeWhereAssignments}
    `, scopeParams);

    // ── Readiness by Arsen (for ranking chart) ───────────────────
    const [arsenReadiness] = await db.query(`
      SELECT arsen_id AS id, arsen_name AS name, avg_readiness_score AS score,
        avg_training_participation, avg_attendance_rate, avg_active_status
      FROM v_arsen_readiness
      ${req.user.role !== 'admin' && scopeParams.length > 0 ? 'WHERE arsen_id = ?' : ''}
      ORDER BY avg_readiness_score DESC
    `, req.user.role !== 'admin' && scopeParams.length > 0 ? [req.user.scope_arsen_id || req.user.scope_group_id || req.user.scope_squadron_id] : []);

    // ── Readiness by Group (for group comparison) ────────────────
    const [groupReadiness] = await db.query(`
      SELECT group_id AS id, group_name AS name, arsen_name, avg_readiness_score AS score,
        avg_training_participation, avg_attendance_rate, avg_active_status
      FROM v_group_readiness
      ${req.user.role === 'admin' ? '' : 'WHERE arsen_id = ? OR group_id = ? OR group_id IN (SELECT id FROM `groups` WHERE arsen_id = ?)'}
      ORDER BY avg_readiness_score DESC
    `, req.user.role === 'admin' ? [] : [req.user.scope_arsen_id, req.user.scope_group_id, req.user.scope_arsen_id]);

    // ── Readiness by Squadron ─────────────────────────────────────
    const [squadronReadiness] = await db.query(`
      SELECT squadron_id AS id, squadron_name AS name, group_name, avg_readiness_score AS score,
        avg_training_participation, avg_attendance_rate, avg_active_status
      FROM v_squadron_readiness
      ${req.user.role === 'admin' ? '' : 'WHERE squadron_id = ? OR group_id = ? OR arsen_id = ?'}
      ORDER BY avg_readiness_score DESC
    `, req.user.role === 'admin' ? [] : [req.user.scope_squadron_id, req.user.scope_group_id, req.user.scope_arsen_id]);

    // ── Low performing areas (arsen-level, score < 65) ───────────
    const [lowPerforming] = await db.query(`
      SELECT arsen_name AS name, avg_readiness_score AS readiness,
        avg_attendance_rate AS attendance, below_threshold_count
      FROM v_arsen_readiness
      WHERE (avg_readiness_score < 65 OR avg_readiness_score IS NULL)
      ${req.user.role !== 'admin' ? 'AND arsen_id = ?' : ''}
      ORDER BY avg_readiness_score ASC
      LIMIT 5
    `, req.user.role !== 'admin' ? [req.user.scope_arsen_id || 0] : []);

    // ── Attendance timeline (last 8 weeks) ────────────────────────
    const [attendanceTimeline] = await db.query(`
      SELECT
        DATE_FORMAT(a.created_at, '%b %d') AS date,
        ROUND(100.0 * SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS rate
      FROM attendance a
      JOIN reservist_assignments ra ON a.reservist_id = ra.reservist_id AND ra.is_primary = TRUE
      JOIN \`groups\` g ON ra.group_id = g.id
      WHERE 1=1 ${scopeWhereAssignments}
      GROUP BY DATE_FORMAT(a.created_at, '%Y-%m-%d')
      ORDER BY MIN(a.created_at) DESC
      LIMIT 8
    `, scopeParams);

    // ── Top / bottom squadrons by attendance rate (real) ─────────
    const [topSquadronsByAttendance] = await db.query(`
      SELECT squadron_name AS name, ROUND(avg_attendance_rate, 1) AS rate
      FROM v_squadron_readiness
      ${req.user.role === 'admin' ? '' : 'WHERE squadron_id = ? OR group_id = ? OR arsen_id = ?'}
      ORDER BY avg_attendance_rate DESC
      LIMIT 5
    `, req.user.role === 'admin' ? [] : [req.user.scope_squadron_id, req.user.scope_group_id, req.user.scope_arsen_id]);

    const [bottomSquadronsByAttendance] = await db.query(`
      SELECT squadron_name AS name, ROUND(avg_attendance_rate, 1) AS rate
      FROM v_squadron_readiness
      ${req.user.role === 'admin' ? '' : 'WHERE squadron_id = ? OR group_id = ? OR arsen_id = ?'}
      ORDER BY avg_attendance_rate ASC
      LIMIT 3
    `, req.user.role === 'admin' ? [] : [req.user.scope_squadron_id, req.user.scope_group_id, req.user.scope_arsen_id]);

    // ── Attendance rate distribution buckets (squadron counts) ───
    const [attendanceDist] = await db.query(`
      SELECT
        SUM(CASE WHEN avg_attendance_rate >= 90 THEN 1 ELSE 0 END) AS excellent,
        SUM(CASE WHEN avg_attendance_rate >= 80 AND avg_attendance_rate < 90 THEN 1 ELSE 0 END) AS good,
        SUM(CASE WHEN avg_attendance_rate >= 70 AND avg_attendance_rate < 80 THEN 1 ELSE 0 END) AS fair,
        SUM(CASE WHEN avg_attendance_rate < 70 THEN 1 ELSE 0 END) AS needs_attention
      FROM v_squadron_readiness
      ${req.user.role === 'admin' ? '' : 'WHERE squadron_id = ? OR group_id = ? OR arsen_id = ?'}
    `, req.user.role === 'admin' ? [] : [req.user.scope_squadron_id, req.user.scope_group_id, req.user.scope_arsen_id]);

    // ── Training activity by area ─────────────────────────────────
    const [trainingByArea] = await db.query(`
      SELECT a.name AS area, COUNT(t.id) AS trainings
      FROM trainings t
      LEFT JOIN areas a ON t.area_id = a.id
      GROUP BY a.name
      ORDER BY trainings DESC
      LIMIT 10
    `);

    // ── Force distribution ────────────────────────────────────────
    const [forceDistribution] = await db.query(`
      SELECT
        a.name AS area,
        COUNT(r.id) AS total,
        SUM(CASE WHEN r.is_active = TRUE THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN r.reserve_status = 'Standby Reserve' THEN 1 ELSE 0 END) AS standby
      FROM reservists r
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN arsens a ON g.arsen_id = a.id
      WHERE 1=1 ${scopeWhereAssignments}
      GROUP BY a.name
      ORDER BY total DESC
    `, scopeParams);

    // ── Rank distribution ─────────────────────────────────────────
    const [rankDistribution] = await db.query(`
      SELECT \`rank\`, COUNT(*) AS \`count\`
      FROM reservists r
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      WHERE 1=1 ${scopeWhereReservists}
      GROUP BY \`rank\`
      ORDER BY \`count\` DESC
    `, scopeParams);

    // ── Profession / Occupation distribution ───────────────────────
    const [rawOccupations] = await db.query(`
      SELECT occupation FROM reservists r
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      WHERE 1=1 ${scopeWhereReservists}
    `, scopeParams);

    function categorizeOccupation(occ) {
      if (!occ || !occ.trim()) return 'Others';
      const o = occ.toLowerCase();
      if (/engineer|technician|mechanic|electric|architect/.test(o)) return 'Engineering';
      if (/it |computer|programmer|developer|software|network|cyber|communicat|telecom/.test(o)) return 'IT / Communications';
      if (/nurse|doctor|medical|health|paramedic|pharma|dentist|therap/.test(o)) return 'Medical / Health';
      if (/security|police|guard|enforc|law|patrol|military|officer/.test(o)) return 'Security Personnel';
      if (/admin|clerk|secretar|office|account|finance|hr |human|manager|logistics|operations/.test(o)) return 'Administrative';
      return 'Others';
    }

    const profCounts = {};
    for (const row of rawOccupations || []) {
      const cat = categorizeOccupation(row.occupation);
      profCounts[cat] = (profCounts[cat] || 0) + 1;
    }
    const professionDistribution = [
      "Security Personnel",
      "Engineering",
      "IT / Communications",
      "Medical / Health",
      "Administrative",
      "Others"
    ].map(cat => ({ name: cat, count: profCounts[cat] || 0 }));

    // ── Active alerts ─────────────────────────────────────────────
    const [alerts] = await db.query(`
      SELECT id, title, message, target_role, created_at
      FROM alerts
      WHERE is_active = TRUE AND (end_date IS NULL OR end_date >= CURDATE())
      ${req.user.role === 'admin' ? '' : 'AND (target_area_id IS NULL OR target_area_id = ? OR target_group_id = ? OR target_squadron_id = ?)'}
      ORDER BY created_at DESC
      LIMIT 10
    `, req.user.role === 'admin' ? [] : [req.user.scope_arsen_id, req.user.scope_group_id, req.user.scope_squadron_id]);

    // ── Readiness distribution buckets ────────────────────────────
    const [readinessDistribution] = await db.query(`
      SELECT
        SUM(CASE WHEN readiness_score >= 90 THEN 1 ELSE 0 END) AS excellent,
        SUM(CASE WHEN readiness_score >= 80 AND readiness_score < 90 THEN 1 ELSE 0 END) AS good,
        SUM(CASE WHEN readiness_score >= 70 AND readiness_score < 80 THEN 1 ELSE 0 END) AS fair,
        SUM(CASE WHEN readiness_score >= 60 AND readiness_score < 70 THEN 1 ELSE 0 END) AS poor,
        SUM(CASE WHEN readiness_score < 60 THEN 1 ELSE 0 END) AS critical
      FROM v_reservist_readiness vr
      ${req.user.role === 'admin' ? '' : 'WHERE vr.squadron_id = ? OR vr.group_id = ? OR vr.arsen_id = ?'}
    `, req.user.role === 'admin' ? [] : [req.user.scope_squadron_id, req.user.scope_group_id, req.user.scope_arsen_id]);

    // ── Real computed composition weights from overall readiness view ─
    const tp = Number(overallReadiness?.avg_training_participation || 0);
    const ar = Number(overallReadiness?.avg_attendance_rate || 0);
    const as = Number(overallReadiness?.avg_active_status || 0);
    const totalW = tp + ar + as || 1;
    const realComposition = [
      { name: 'Training Participation', value: Math.round((tp / totalW) * 100), color: '#6366f1' },
      { name: 'Attendance Rate', value: Math.round((ar / totalW) * 100), color: '#10b981' },
      { name: 'Active Status Weight', value: Math.round((as / totalW) * 100), color: '#f59e0b' },
    ];

    res.json({
      status: 'success',
      data: {
        kpis: {
          total_reservists: reservistCount.total || 0,
          active_reservists: reservistCount.active || 0,
          ready_reservists: reservistCount.ready || 0,
          standby_reservists: reservistCount.standby || 0,
          avg_readiness_score: overallReadiness?.avg_readiness_score || 0,
          avg_training_participation: overallReadiness?.avg_training_participation || 0,
          avg_attendance_rate: overallReadiness?.avg_attendance_rate || 0,
          avg_active_status: overallReadiness?.avg_active_status || 0,
          total_trainings: trainingCount.total || 0,
          completed_trainings: trainingCount.completed || 0,
          ongoing_trainings: trainingCount.ongoing || 0,
          upcoming_trainings: trainingCount.upcoming || 0,
          overall_attendance_rate: attendanceStats?.attendance_rate || 0,
          below_threshold_count: overallReadiness?.below_threshold_count || 0,
        },
        readiness: {
          by_arsen: arsenReadiness,
          by_group: groupReadiness,
          by_squadron: squadronReadiness,
          distribution: readinessDistribution?.[0] || { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 },
          composition: realComposition
        },
        attendance: {
          timeline: attendanceTimeline?.reverse() || [],
          top_squadrons: topSquadronsByAttendance || [],
          bottom_squadrons: bottomSquadronsByAttendance || [],
          distribution: attendanceDist?.[0] || { excellent: 0, good: 0, fair: 0, needs_attention: 0 },
        },
        trainings: {
          by_area: trainingByArea,
        },
        force_distribution: forceDistribution,
        rank_distribution: rankDistribution,
        profession_distribution: professionDistribution,
        low_performing: lowPerforming,
        alerts: alerts,
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
