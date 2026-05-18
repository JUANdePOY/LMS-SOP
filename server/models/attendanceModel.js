const pool = require('../config/database');

async function findReservistByBarcode(barcode) {
  const [rows] = await pool.query(
    `SELECT r.id, r.first_name, r.last_name, r.rank, r.service_number, r.barcode, r.user_id
     FROM reservists r
     WHERE r.barcode = ? AND r.is_active = TRUE`,
    [barcode]
  );
  return rows[0] || null;
}

async function findReservistByServiceNumber(serviceNumber) {
  const [rows] = await pool.query(
    `SELECT r.id, r.first_name, r.last_name, r.rank, r.service_number, r.barcode, r.user_id
     FROM reservists r
     WHERE r.service_number = ? AND r.is_active = TRUE`,
    [serviceNumber]
  );
  return rows[0] || null;
}

async function isParticipantInInternalTraining(trainingId, reservistId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM internal_training_participants
     WHERE training_id = ? AND reservist_id = ? LIMIT 1`,
    [trainingId, reservistId]
  );
  return rows.length > 0;
}

async function isRegisteredForExternalTraining(externalTrainingId, reservistId) {
  const [rows] = await pool.query(
    `SELECT id FROM training_registrations
     WHERE training_id = ? AND
       (reservist_id = ? OR
        JSON_UNQUOTE(JSON_EXTRACT(participant_data, '$.reservist_id')) = ?)
     LIMIT 1`,
    [externalTrainingId, reservistId, reservistId]
  );
  return rows[0] || null;
}

async function getInternalTrainingParticipantIds(trainingId) {
  const [rows] = await pool.query(
    `SELECT itp.reservist_id, r.first_name, r.last_name, r.rank, r.service_number, r.barcode,
            s.name AS squadron_name, s.id AS squadron_id
     FROM internal_training_participants itp
     INNER JOIN reservists r ON r.id = itp.reservist_id
     INNER JOIN squadron s ON s.id = itp.squadron_id
     WHERE itp.training_id = ?
     ORDER BY s.name ASC, r.last_name ASC, r.first_name ASC`,
    [trainingId]
  );
  return rows;
}

async function getExternalTrainingRegistrations(externalTrainingId) {
  const [rows] = await pool.query(
    `SELECT tr.id AS registration_id, tr.participant_data, tr.registered_at,
            r.id AS reservist_id, r.first_name, r.last_name, r.rank, r.service_number, r.barcode
     FROM training_registrations tr
     LEFT JOIN reservists r ON r.id = tr.reservist_id
     WHERE tr.training_id = ?
     ORDER BY tr.registered_at ASC`,
    [externalTrainingId]
  );
  return rows;
}

async function upsertInternalAttendance(trainingId, reservistId, status, scanMethod, facilitatorId, conn) {
  const executor = conn || pool;
  const [existing] = await executor.query(
    `SELECT id, status FROM attendance WHERE training_id = ? AND reservist_id = ? AND event_type = 'internal'`,
    [trainingId, reservistId]
  );

  const checkInTime = ['present', 'late'].includes(status) ? new Date() : null;

  if (existing.length > 0) {
    const [result] = await executor.query(
      `UPDATE attendance SET
        status = ?,
        check_in_time = COALESCE(?, check_in_time),
        scan_method = ?,
        scan_timestamp = CURRENT_TIMESTAMP,
        recorded_by = ?,
        qr_code_used = NULL
       WHERE id = ?`,
      [status, checkInTime, scanMethod, facilitatorId, existing[0].id]
    );
    return { action: 'updated', previousStatus: existing[0].status, id: existing[0].id };
  }

  const [result] = await executor.query(
    `INSERT INTO attendance (reservist_id, training_id, event_type, status, check_in_time, scan_method, scan_timestamp, recorded_by)
     VALUES (?, ?, 'internal', ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    [reservistId, trainingId, status, checkInTime, scanMethod, facilitatorId]
  );
  return { action: 'created', previousStatus: null, id: result.insertId };
}

async function upsertExternalAttendance(externalTrainingId, registrationId, reservistId, participantName, status, scanMethod, facilitatorId, conn) {
  const executor = conn || pool;
  const [existing] = await executor.query(
    `SELECT id, status FROM external_training_attendance
     WHERE external_training_id = ? AND (reservist_id = ? OR registration_id = ?)`,
    [externalTrainingId, reservistId, registrationId]
  );

  const checkInTime = ['present', 'late'].includes(status) ? new Date() : null;

  if (existing.length > 0) {
    const [result] = await executor.query(
      `UPDATE external_training_attendance SET
        status = ?,
        check_in_time = COALESCE(?, check_in_time),
        scan_method = ?,
        recorded_by = ?
       WHERE id = ?`,
      [status, checkInTime, scanMethod, facilitatorId, existing[0].id]
    );
    return { action: 'updated', previousStatus: existing[0].status, id: existing[0].id };
  }

  const [result] = await executor.query(
    `INSERT INTO external_training_attendance
      (external_training_id, registration_id, reservist_id, participant_name, status, check_in_time, scan_method, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [externalTrainingId, registrationId, reservistId, participantName, status, checkInTime, scanMethod, facilitatorId]
  );
  return { action: 'created', previousStatus: null, id: result.insertId };
}

async function logScanAudit(data) {
  const {
    trainingId, externalTrainingId, eventType, barcodeScanned, reservistId,
    scanResult, scanMethod, deviceInfo, facilitatorId, errorMessage
  } = data;

  await pool.query(
    `INSERT INTO scan_audit_log
      (training_id, external_training_id, event_type, barcode_scanned, reservist_id,
       scan_result, scan_method, device_info, facilitator_id, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [trainingId, externalTrainingId, eventType, barcodeScanned, reservistId,
     scanResult, scanMethod, deviceInfo, facilitatorId, errorMessage]
  );
}

async function getAttendanceByInternalTraining(trainingId) {
  const [rows] = await pool.query(
    `SELECT a.id, a.reservist_id, a.training_id, a.status, a.check_in_time, a.check_out_time,
            a.scan_method, a.scan_timestamp, a.notes, a.recorded_by, a.created_at, a.updated_at,
            r.first_name, r.last_name, r.rank, r.service_number, r.barcode,
            s.name AS squadron_name, s.id AS squadron_id
     FROM attendance a
     INNER JOIN reservists r ON r.id = a.reservist_id
     LEFT JOIN internal_training_participants itp ON itp.training_id = a.training_id AND itp.reservist_id = a.reservist_id
     LEFT JOIN squadron s ON s.id = itp.squadron_id
     WHERE a.training_id = ? AND a.event_type = 'internal'
     ORDER BY s.name ASC, r.last_name ASC, r.first_name ASC`,
    [trainingId]
  );
  return rows;
}

async function getAttendanceByExternalTraining(externalTrainingId) {
  const [rows] = await pool.query(
    `SELECT eta.id, eta.external_training_id, eta.registration_id, eta.reservist_id,
            eta.participant_name, eta.participant_data, eta.status, eta.check_in_time,
            eta.check_out_time, eta.scan_method, eta.barcode_scanned, eta.notes,
            eta.recorded_by, eta.created_at, eta.updated_at,
            r.first_name, r.last_name, r.rank, r.service_number, r.barcode
     FROM external_training_attendance eta
     LEFT JOIN reservists r ON r.id = eta.reservist_id
     WHERE eta.external_training_id = ?
     ORDER BY eta.check_in_time ASC, r.last_name ASC`,
    [externalTrainingId]
  );
  return rows;
}

async function getInternalTrainingStats(trainingId) {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_participants,
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
       SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
       SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excused_count,
       SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) AS pending_count
     FROM internal_training_participants itp
     LEFT JOIN attendance a ON a.training_id = itp.training_id
       AND a.reservist_id = itp.reservist_id AND a.event_type = 'internal'
     WHERE itp.training_id = ?`,
    [trainingId]
  );
  return rows[0] || { total_participants: 0, present_count: 0, absent_count: 0, late_count: 0, excused_count: 0, pending_count: 0 };
}

async function getExternalTrainingStats(externalTrainingId) {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_attendees,
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
       SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
       SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late_count,
       SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) AS excused_count,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count
     FROM external_training_attendance
     WHERE external_training_id = ?`,
    [externalTrainingId]
  );
  return rows[0] || { total_attendees: 0, present_count: 0, absent_count: 0, late_count: 0, excused_count: 0, pending_count: 0 };
}

async function isFacilitator(trainingId, externalTrainingId, userId) {
  if (trainingId) {
    const [rows] = await pool.query(
      `SELECT 1 FROM training_facilitators WHERE training_id = ? AND user_id = ? LIMIT 1`,
      [trainingId, userId]
    );
    return rows.length > 0;
  }
  if (externalTrainingId) {
    const [rows] = await pool.query(
      `SELECT 1 FROM training_facilitators WHERE external_training_id = ? AND user_id = ? LIMIT 1`,
      [externalTrainingId, userId]
    );
    return rows.length > 0;
  }
  return false;
}

async function addFacilitator(trainingId, externalTrainingId, userId, assignedBy) {
  if (trainingId) {
    await pool.query(
      `INSERT IGNORE INTO training_facilitators (training_id, user_id, assigned_by) VALUES (?, ?, ?)`,
      [trainingId, userId, assignedBy]
    );
  } else if (externalTrainingId) {
    await pool.query(
      `INSERT IGNORE INTO training_facilitators (external_training_id, user_id, assigned_by) VALUES (?, ?, ?)`,
      [externalTrainingId, userId, assignedBy]
    );
  }
}

async function getFacilitators(trainingId, externalTrainingId) {
  if (trainingId) {
    const [rows] = await pool.query(
      `SELECT tf.user_id, tf.assigned_at, r.first_name, r.last_name, r.service_number
       FROM training_facilitators tf
       INNER JOIN users u ON u.id = tf.user_id
       LEFT JOIN reservists r ON r.user_id = u.id
       WHERE tf.training_id = ?`,
      [trainingId]
    );
    return rows;
  }
  if (externalTrainingId) {
    const [rows] = await pool.query(
      `SELECT tf.user_id, tf.assigned_at, r.first_name, r.last_name, r.service_number
       FROM training_facilitators tf
       INNER JOIN users u ON u.id = tf.user_id
       LEFT JOIN reservists r ON r.user_id = u.id
       WHERE tf.external_training_id = ?`,
      [externalTrainingId]
    );
    return rows;
  }
  return [];
}

async function updateAttendanceStatus(id, eventType, status, facilitatorId) {
  const table = eventType === 'internal' ? 'attendance' : 'external_training_attendance';
  const checkInTime = ['present', 'late'].includes(status) ? new Date() : null;

  const [result] = await pool.query(
    `UPDATE ${table} SET status = ?, check_in_time = COALESCE(?, check_in_time), recorded_by = ? WHERE id = ?`,
    [status, checkInTime, facilitatorId, id]
  );
  return result.affectedRows;
}

async function getScanAuditLog(trainingId, externalTrainingId, limit = 50) {
  let sql = `
    SELECT sal.*, r.first_name, r.last_name, r.service_number
    FROM scan_audit_log sal
    LEFT JOIN reservists r ON r.id = sal.reservist_id
    WHERE 1 = 1
  `;
  const params = [];

  if (trainingId) {
    sql += ' AND sal.training_id = ?';
    params.push(trainingId);
  }
  if (externalTrainingId) {
    sql += ' AND sal.external_training_id = ?';
    params.push(externalTrainingId);
  }

  sql += ' ORDER BY sal.scanned_at DESC LIMIT ?';
  params.push(limit);

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getExternalRegistrationCount(externalTrainingId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM training_registrations WHERE training_id = ?`,
    [externalTrainingId]
  );
  return rows[0]?.total ?? 0;
}

module.exports = {
  pool,
  findReservistByBarcode,
  findReservistByServiceNumber,
  isParticipantInInternalTraining,
  isRegisteredForExternalTraining,
  getInternalTrainingParticipantIds,
  getExternalTrainingRegistrations,
  upsertInternalAttendance,
  upsertExternalAttendance,
  logScanAudit,
  getAttendanceByInternalTraining,
  getAttendanceByExternalTraining,
  getInternalTrainingStats,
  getExternalTrainingStats,
  isFacilitator,
  addFacilitator,
  getFacilitators,
  updateAttendanceStatus,
  getScanAuditLog,
  getExternalRegistrationCount,
};
