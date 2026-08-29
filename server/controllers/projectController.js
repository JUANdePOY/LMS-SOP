const db = require('../config/database');
const projectModel = require('../models/projectModel');
const { validateProjectPayload, validateFieldDefPayload } = require('../validators/projectValidator');

function handleError(res, error) {
  const code = error.code || 'INTERNAL_ERROR';
  const status =
    code === 'NOT_FOUND' ? 404 :
    code === 'VALIDATION_ERROR' ? 400 :
    code === 'DUPLICATE' ? 409 :
    500;

  if (status === 500) console.error('[ProjectController Error]', error);
  return res.status(status).json({ success: false, message: error.message, code });
}

const EMPTY_ROLLUP = {
  total: 0,
  by_status: { pending: 0, in_progress: 0, review: 0, overdue: 0, completed: 0, cancelled: 0 },
  active: 0,
  at_risk: 0,
  aggregate_progress: 0,
  earliest_due: null,
};

const projectController = {
  async listProjects(req, res) {
    try {
      const { client_business_id } = req.query;
      if (client_business_id) {
        const rows = await projectModel.findByClientBusiness(parseInt(client_business_id, 10));
        return res.json({ success: true, data: rows, message: 'Projects retrieved successfully' });
      }
      const [rows] = await db.query(
        'SELECT p.*, cb.business_name AS client_business_name, cb.client_id, c.client_name FROM projects p LEFT JOIN client_businesses cb ON p.client_business_id = cb.id LEFT JOIN clients c ON cb.client_id = c.id ORDER BY p.name ASC'
      );
      return res.json({ success: true, data: rows, message: 'Projects retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listByBusiness(req, res) {
    try {
      const businessId = parseInt(req.params.id, 10);
      if (!Number.isFinite(businessId) || businessId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid business id', code: 'VALIDATION_ERROR' });
      }
      const projects = await projectModel.findByClientBusiness(businessId);
      if (projects.length > 0) {
        const ids = projects.map((p) => p.id);
        const rollups = await projectModel.getRollupsForProjects(ids);
        projects.forEach((p) => {
          p.rollup = rollups[p.id] || EMPTY_ROLLUP;
        });
      }
      return res.json({ success: true, data: projects, message: 'Projects retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getTree(req, res) {
    try {
      const tree = await projectModel.getTree();
      res.json({ success: true, data: tree, message: 'Project tree retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getProject(req, res) {
    try {
      const project = await projectModel.findById(parseInt(req.params.id, 10));
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found', code: 'NOT_FOUND' });
      }
      res.json({ success: true, data: project, message: 'Project retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async createProject(req, res) {
    try {
      const validation = validateProjectPayload(req.body, true);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.errors[0], errors: validation.errors, code: 'VALIDATION_ERROR' });
      }
      const projectId = await projectModel.create({ ...validation.value, created_by: req.user.id });
      const project = await projectModel.findById(projectId);
      res.status(201).json({ success: true, data: project, message: 'Project created successfully' });
    } catch (error) {
      if (/ER_NO_REFERENCED_ROW/.test(error.message)) {
        return res.status(400).json({ success: false, message: 'Selected client business does not exist', code: 'VALIDATION_ERROR' });
      }
      handleError(res, error);
    }
  },

  async updateProject(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await projectModel.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Project not found', code: 'NOT_FOUND' });
      }
      const validation = validateProjectPayload(req.body, false);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.errors[0], errors: validation.errors, code: 'VALIDATION_ERROR' });
      }
      await projectModel.update(id, validation.value);
      const project = await projectModel.findById(id);
      res.json({ success: true, data: project, message: 'Project updated successfully' });
    } catch (error) {
      if (/ER_NO_REFERENCED_ROW/.test(error.message)) {
        return res.status(400).json({ success: false, message: 'Selected client business does not exist', code: 'VALIDATION_ERROR' });
      }
      handleError(res, error);
    }
  },

  async deleteProject(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const affected = await projectModel.remove(id);
      if (affected === 0) {
        return res.status(404).json({ success: false, message: 'Project not found', code: 'NOT_FOUND' });
      }
      res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listFields(req, res) {
    try {
      const fields = await projectModel.listFieldDefs(parseInt(req.params.id, 10));
      res.json({ success: true, data: fields, message: 'Custom fields retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async createField(req, res) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const existing = await projectModel.findById(projectId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Project not found', code: 'NOT_FOUND' });
      }
      const validation = validateFieldDefPayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.errors[0], errors: validation.errors, code: 'VALIDATION_ERROR' });
      }
      await projectModel.createFieldDef({ project_id: projectId, ...validation.value });
      const fields = await projectModel.listFieldDefs(projectId);
      res.status(201).json({ success: true, data: fields, message: 'Custom field created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateField(req, res) {
    try {
      const validation = validateFieldDefPayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.errors[0], errors: validation.errors, code: 'VALIDATION_ERROR' });
      }
      await projectModel.updateFieldDef(parseInt(req.params.fieldId, 10), validation.value);
      const fields = await projectModel.listFieldDefs(parseInt(req.params.id, 10));
      res.json({ success: true, data: fields, message: 'Custom field updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async deleteField(req, res) {
    try {
      await projectModel.removeFieldDef(parseInt(req.params.fieldId, 10));
      const fields = await projectModel.listFieldDefs(parseInt(req.params.id, 10));
      res.json({ success: true, data: fields, message: 'Custom field deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = { projectController };
