const assignmentCascadeService = require('../services/assignmentCascadeService');

async function listDepartments(req, res) {
  try {
    const departments = await assignmentCascadeService.getDepartments();
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: error.message } });
  }
}

async function listPositions(req, res) {
  try {
    const departmentId = parseInt(req.params.departmentId, 10);
    if (!departmentId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'departmentId is required' } });
    }
    const positions = await assignmentCascadeService.getPositionsForDepartment(departmentId);
    res.json({ success: true, data: positions });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: error.message } });
  }
}

async function listUsers(req, res) {
  try {
    const departmentId = parseInt(req.params.departmentId, 10);
    if (!departmentId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'departmentId is required' } });
    }
    const users = await assignmentCascadeService.getUsersForDepartment(departmentId, {
      positionName: req.query.position || undefined,
      search: req.query.search || undefined,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: error.message } });
  }
}

async function listAssigned(req, res) {
  try {
    const sopId = parseInt(req.params.sopId, 10);
    if (!sopId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'sopId is required' } });
    }
    const assignments = await assignmentCascadeService.getAssignedAssignments(sopId);
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: error.message } });
  }
}

module.exports = { listDepartments, listPositions, listUsers, listAssigned };
