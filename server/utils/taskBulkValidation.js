const db = require('../config/database');
const ExcelJS = require('exceljs');
const { validateAssignmentPayload } = require('../validators/taskValidator');

const HEADER_ALIASES = {
  'task title': 'title',
  'title': 'title',
  'description': 'description',
  'task description': 'description',
  'priority': 'priority',
  'task priority': 'priority',
  'status': 'status',
  'task status': 'status',
  'start date': 'start_datetime',
  'start datetime': 'start_datetime',
  'start_date': 'start_datetime',
  'start_datetime': 'start_datetime',
  'deadline': 'deadline_datetime',
  'due date': 'deadline_datetime',
  'due_date': 'deadline_datetime',
  'deadline_datetime': 'deadline_datetime',
  'estimated hours': 'estimated_hours',
  'estimated_hours': 'estimated_hours',
  'hours': 'estimated_hours',
  'category': 'category',
  'task category': 'category',
  'assigned users': 'assigned_users',
  'assigned_user': 'assigned_users',
  'assigned_users': 'assigned_users',
  'users': 'assigned_users',
  'user': 'assigned_users',
  'assigned departments': 'assigned_departments',
  'assigned_department': 'assigned_departments',
  'assigned_departments': 'assigned_departments',
  'departments': 'assigned_departments',
  'department': 'assigned_departments',
  'client': 'client',
  'client id': 'client_id',
  'client_id': 'client_id',
  'client name': 'client_name',
  'client_name': 'client_name',
  'business': 'business',
  'business id': 'business_id',
  'business_id': 'business_id',
  'business name': 'business_name',
  'business_name': 'business_name',
  'project': 'project',
  'project id': 'project_id',
  'project_id': 'project_id',
  'project name': 'project_name',
  'project_name': 'project_name',
  'parent task id': 'parent_task_id',
  'parent_task_id': 'parent_task_id',
  'parent': 'parent_task_id',
};

function normalizeHeader(header) {
  const key = String(header || '').trim().toLowerCase();
  return HEADER_ALIASES[key] || null;
}

function normalizeRow(rawRow) {
  const row = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const normalizedKey = normalizeHeader(key);
    if (normalizedKey) {
      row[normalizedKey] = value;
    }
  }
  return row;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) return [];
  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim();
  });
  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        obj[header] = cell.value != null ? String(cell.value) : '';
      }
    });
    rows.push(obj);
  });
  return rows;
}

function parseHumanDate(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)$/);
  if (isoMatch) {
    return `${isoMatch[1]} ${isoMatch[2].slice(0, 8)}`;
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (usMatch) {
    const [, m, d, yyyy, hh = '00', min = '00', ss = '00'] = usMatch;
    return `${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${hh.padStart(2, '0')}:${min.padStart(2, '0')}:${ss.padStart(2, '0')}`;
  }

  const euMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (euMatch) {
    const [, part1, part2, yyyy, hh = '00', min = '00', ss = '00'] = euMatch;
    const p1 = parseInt(part1, 10);
    const p2 = parseInt(part2, 10);
    let m, d;
    if (p1 > 12) {
      d = part1; m = part2;
    } else if (p2 > 12) {
      m = part1; d = part2;
    } else {
      m = part1; d = part2;
    }
    return `${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${hh.padStart(2, '0')}:${min.padStart(2, '0')}:${ss.padStart(2, '0')}`;
  }

  const native = new Date(trimmed);
  if (!isNaN(native.getTime())) {
    return native.toISOString().slice(0, 19).replace('T', ' ');
  }

  return null;
}

function splitAssignmentArray(value) {
  if (!value) return [];
  const str = String(value).trim();
  if (!str) return [];
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {}
  }
  const parts = str.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  return parts;
}

async function resolveClientBusiness(row, actorId) {
  let clientId = row.client_id != null && row.client_id !== '' ? Number(row.client_id) : null;
  let businessId = row.business_id != null && row.business_id !== '' ? Number(row.business_id) : null;
  let clientBusinessId = row.client_business_id != null && row.client_business_id !== '' ? Number(row.client_business_id) : null;

  if (!clientId && row.client_name) {
    const [clients] = await db.query(
      'SELECT id FROM clients WHERE LOWER(client_name) = LOWER(?) LIMIT 1',
      [String(row.client_name).trim()]
    );
    clientId = clients[0]?.id || null;
  }

  if (!clientBusinessId && row.business_name) {
    const [biz] = await db.query(
      'SELECT id FROM client_businesses WHERE LOWER(business_name) = LOWER(?) LIMIT 1',
      [String(row.business_name).trim()]
    );
    clientBusinessId = biz[0]?.id || null;
  }

  if (!clientId && clientBusinessId) {
    const [biz] = await db.query(
      'SELECT client_id FROM client_businesses WHERE id = ? LIMIT 1',
      [clientBusinessId]
    );
    clientId = biz[0]?.client_id || null;
  }

  if (!clientBusinessId && clientId && row.business_name) {
    const [biz] = await db.query(
      'SELECT cb.id FROM client_businesses cb WHERE cb.client_id = ? AND LOWER(cb.business_name) = LOWER(?) LIMIT 1',
      [clientId, String(row.business_name).trim()]
    );
    clientBusinessId = biz[0]?.id || null;
  }

  return { clientId, businessId, clientBusinessId };
}

async function resolveAssignmentNames(assignments) {
  if (!Array.isArray(assignments)) return [];
  const results = [];
  const errors = [];
  const seen = new Set();

  for (const assignment of assignments) {
    const type = String(assignment.assignment_type || '').trim();
    const name = String(assignment.reference_name || assignment.reference_id || '').trim();
    if (!name) continue;

    const key = `${type}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let referenceId = null;

    if (type === 'User') {
      const [users] = await db.query(
        'SELECT id FROM users WHERE LOWER(full_name) = LOWER(?) LIMIT 2',
        [name]
      );
      if (users.length === 0) {
        errors.push({ row: assignment._row, message: `User not found: ${name}` });
        continue;
      }
      if (users.length > 1) {
        errors.push({ row: assignment._row, message: `Duplicate user: ${name}` });
        continue;
      }
      referenceId = users[0].id;
    } else if (type === 'Department') {
      const [depts] = await db.query(
        'SELECT id FROM departments WHERE LOWER(name) = LOWER(?) LIMIT 2',
        [name]
      );
      if (depts.length === 0) {
        errors.push({ row: assignment._row, message: `Department not found: ${name}` });
        continue;
      }
      if (depts.length > 1) {
        errors.push({ row: assignment._row, message: `Duplicate department: ${name}` });
        continue;
      }
      referenceId = depts[0].id;
    } else if (type === 'Position') {
      referenceId = name;
    } else {
      errors.push({ row: assignment._row, message: `Invalid assignment type: ${type}` });
      continue;
    }

    if (referenceId != null) {
      results.push({ assignment_type: type, reference_id: referenceId });
    }
  }

  return { results, errors };
}

async function checkDuplicateTitles(titles, actorId) {
  if (!titles || titles.length === 0) return new Set();

  const normalizedTitles = titles.map((t) => String(t || '').trim()).filter(Boolean);
  if (normalizedTitles.length === 0) return new Set();

  const existing = new Set();

  const isAdmin = await (async () => {
    const [users] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [actorId]);
    const user = users[0];
    return user && ['super_admin', 'admin', 'department_head'].includes(user.role);
  })();

  if (!isAdmin) {
    return existing;
  }

  const [actor] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [actorId]);
  const role = actor?.[0]?.role;

  const CHUNK = 5000;
  const titleChunks = [];
  for (let i = 0; i < normalizedTitles.length; i += CHUNK) {
    titleChunks.push(normalizedTitles.slice(i, i + CHUNK));
  }

  if (role === 'super_admin') {
    for (const chunk of titleChunks) {
      const [rows] = await db.query(
        'SELECT title FROM tasks WHERE title IN (?)',
        [chunk]
      );
      for (const r of rows) existing.add(r.title);
    }
    return existing;
  }

  let scopedTaskIds;
  if (role === 'department_head') {
    const [users] = await db.query('SELECT department_id FROM users WHERE id = ? LIMIT 1', [actorId]);
    const deptId = users[0]?.department_id;
    if (!deptId) return existing;
    const [rows] = await db.query(
      `SELECT DISTINCT t.id AS task_id
       FROM tasks t
       LEFT JOIN task_assignments ta ON ta.task_id = t.id
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE (
         (ta.assignment_type = 'Department' AND ta.reference_id = ?)
         OR (ta.assignment_type = 'User' AND ta.reference_id IN (
           SELECT u.id FROM users u WHERE u.department_id = ?
         ))
         OR (c.department_id = ?)
       )`,
      [deptId, deptId, deptId]
    );
    scopedTaskIds = rows.map((r) => r.task_id);
  } else {
    const [users] = await db.query('SELECT business_id FROM users WHERE id = ? LIMIT 1', [actorId]);
    const businessId = users[0]?.business_id;
    if (!businessId) return existing;
    const [rows] = await db.query(
      `SELECT task_id FROM (
         SELECT DISTINCT t.id AS task_id FROM tasks t
         INNER JOIN users u ON t.created_by = u.id
         WHERE u.business_id = ?
         UNION
         SELECT DISTINCT t.id AS task_id FROM tasks t
         INNER JOIN users u ON t.created_by = u.id
         WHERE u.role = 'department_head'
           AND u.department_id IN (SELECT d.id FROM departments d WHERE d.business_id = ?)
         UNION
         SELECT DISTINCT t.id AS task_id FROM tasks t
         INNER JOIN task_assignments ta ON ta.task_id = t.id
         WHERE ta.assignment_type = 'Department'
           AND ta.reference_id IN (SELECT d.id FROM departments d WHERE d.business_id = ?)
         UNION
         SELECT DISTINCT t.id AS task_id FROM tasks t
         INNER JOIN clients c ON t.client_id = c.id
         WHERE c.business_id = ?
       ) scoped`,
      [businessId, businessId, businessId, businessId]
    );
    scopedTaskIds = rows.map((r) => r.task_id);
  }

  if (scopedTaskIds.length === 0) return existing;

  const idChunks = [];
  for (let i = 0; i < scopedTaskIds.length; i += CHUNK) {
    idChunks.push(scopedTaskIds.slice(i, i + CHUNK));
  }

  for (const idChunk of idChunks) {
    for (const titleChunk of titleChunks) {
      const [rows] = await db.query(
        'SELECT title FROM tasks WHERE id IN (?) AND title IN (?)',
        [idChunk, titleChunk]
      );
      for (const r of rows) existing.add(r.title);
    }
  }

  return existing;
}

async function parseFile(buffer, format) {
  const normalizedFormat = String(format || '').trim().toLowerCase();
  if (normalizedFormat === 'json') {
    const text = buffer.toString('utf-8');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array of objects');
    }
    return parsed.map((item, idx) => ({ ...item, _rawIndex: idx + 2 }));
  }

  if (normalizedFormat === 'xlsx' || normalizedFormat === 'xls') {
    const rows = await parseXlsx(buffer);
    return rows.map((item, idx) => ({ ...item, _rawIndex: idx + 2 }));
  }

  if (normalizedFormat === 'csv') {
    const text = buffer.toString('utf-8');
    const rows = parseCsv(text);
    return rows.map((item, idx) => ({ ...item, _rawIndex: idx + 2 }));
  }

  throw new Error(`Unsupported format: ${format}`);
}

async function validateRows(rows, actorId, overrides = {}) {
  const valid = [];
  const invalid = [];
  const seenTitles = new Set();
  const duplicateTitles = await checkDuplicateTitles(rows.map((r) => r.title), actorId);

  const [actor] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [actorId]);

  for (const rawRow of rows) {
    const row = normalizeRow(rawRow);
    const rowIndex = rawRow._rawIndex || (valid.length + invalid.length + 2);
    const errors = [];

    const title = row.title != null ? String(row.title).trim() : '';
    if (!title) {
      errors.push('Title is required');
    } else if (title.length > 255) {
      errors.push('Title must not exceed 255 characters');
    }

    const startDatetime = row.start_datetime != null ? parseHumanDate(row.start_datetime) : null;
    const deadlineDatetime = row.deadline_datetime != null ? parseHumanDate(row.deadline_datetime) : null;

    if (row.start_datetime != null && !startDatetime) {
      errors.push('Invalid start date format');
    }
    if (row.deadline_datetime != null && !deadlineDatetime) {
      errors.push('Invalid deadline format');
    }
    if (startDatetime && deadlineDatetime && new Date(deadlineDatetime) <= new Date(startDatetime)) {
      errors.push('Deadline must be after start date and time');
    }

    let priority = row.priority != null ? String(row.priority).trim() : '';
    if (priority) {
      const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
      const normalized = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
      if (!TASK_PRIORITIES.includes(normalized)) {
        errors.push(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}`);
      }
    }

    let status = row.status != null ? String(row.status).trim() : '';
    if (status) {
      const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];
      const normalized = status.replace(/\b\w/g, (c) => c.toUpperCase());
      if (!TASK_STATUSES.includes(normalized)) {
        errors.push(`Status must be one of: ${TASK_STATUSES.join(', ')}`);
      }
    }

    let estimatedHours = null;
    if (row.estimated_hours != null && row.estimated_hours !== '') {
      estimatedHours = parseInt(row.estimated_hours, 10);
      if (!Number.isFinite(estimatedHours) || estimatedHours < 0) {
        errors.push('Estimated hours must be a non-negative integer');
      }
    }

    const category = row.category != null ? String(row.category).trim() : null;
    if (category && category.length > 100) {
      errors.push('Category must not exceed 100 characters');
    }

    let parentTaskId = null;
    if (row.parent_task_id != null && row.parent_task_id !== '') {
      parentTaskId = parseInt(row.parent_task_id, 10);
      if (!Number.isFinite(parentTaskId) || parentTaskId <= 0) {
        errors.push('Parent task ID must be a positive integer');
      }
    }

    let clientId = null;
    let businessId = null;
    let clientBusinessId = null;

    if (!parentTaskId) {
      if (overrides.client_id && overrides.client_business_id) {
        clientId = overrides.client_id;
        clientBusinessId = overrides.client_business_id;
      } else {
        const scope = await resolveClientBusiness(row, actorId);
        clientId = scope.clientId;
        businessId = scope.businessId;
        clientBusinessId = scope.clientBusinessId;
      }

      if (!clientId && !row.client_id && !row.client_name) {
        errors.push('Client is required');
      } else if (!clientId) {
        errors.push('Client not found');
      }

      if (!clientBusinessId && !row.business_id && !row.business_name && !row.client_business_id) {
        errors.push('Business is required');
      } else if (!clientBusinessId) {
        errors.push('Business not found');
      }
    }

    const rawAssignments = [];
    if (!overrides.assigned_departments) {
      if (row.assigned_users) {
        const names = splitAssignmentArray(row.assigned_users);
        for (const name of names) {
          rawAssignments.push({ assignment_type: 'User', reference_name: name, _row: rowIndex });
        }
      }
      if (row.assigned_departments) {
        const names = splitAssignmentArray(row.assigned_departments);
        for (const name of names) {
          rawAssignments.push({ assignment_type: 'Department', reference_name: name, _row: rowIndex });
        }
      }
    } else {
      for (const deptId of overrides.assigned_departments) {
        rawAssignments.push({ assignment_type: 'Department', reference_id: Number(deptId), _row: rowIndex });
      }
    }
    if (Array.isArray(row.assignments)) {
      for (const a of row.assignments) {
        rawAssignments.push({ ...a, _row: rowIndex });
      }
    }

    const assignmentResult = await resolveAssignmentNames(rawAssignments);
    const assignmentErrors = assignmentResult.errors;
    if (assignmentErrors.length > 0) {
      errors.push(...assignmentErrors.map((e) => e.message));
    }

    const normalizedAssignments = assignmentResult.results;

    for (const assignment of normalizedAssignments) {
      try {
        const validation = validateAssignmentPayload({ ...assignment, task_id: 0 });
        if (!validation.valid) {
          errors.push(`Invalid assignment: ${validation.errors.join(', ')}`);
        }
      } catch {
        errors.push('Invalid assignment');
      }
    }

    if (title && duplicateTitles.has(title)) {
      errors.push('A task with this title already exists in your scope');
    }

    const payload = {
      title,
      description: row.description != null ? String(row.description).trim() : null,
      priority: priority ? (priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()) : null,
      status: status ? status.replace(/\b\w/g, (c) => c.toUpperCase()) : null,
      start_datetime: startDatetime,
      deadline_datetime: deadlineDatetime,
      estimated_hours: estimatedHours,
      category: category || null,
      parent_task_id: parentTaskId,
      client_id: clientId,
      client_business_id: clientBusinessId,
      business_id: businessId,
      project_id: row.project_id != null && row.project_id !== '' ? Number(row.project_id) : null,
      assignments: normalizedAssignments,
    };

    if (errors.length > 0) {
      invalid.push({ row: rowIndex, raw: rawRow, errors, payload: null });
    } else {
      valid.push({ row: rowIndex, raw: rawRow, payload, title });
      if (title) seenTitles.add(title);
    }
  }

  return { valid, invalid, summary: { total: rows.length, valid: valid.length, invalid: invalid.length } };
}

module.exports = {
  parseFile,
  normalizeHeader,
  normalizeRow,
  parseHumanDate,
  splitAssignmentArray,
  resolveClientBusiness,
  resolveAssignmentNames,
  checkDuplicateTitles,
  validateRows,
};
