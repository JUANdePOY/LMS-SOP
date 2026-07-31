const path = require('path');
const sopService = require('../services/sopService');
const sopModuleService = require('../services/sopModuleService');
const sopAttachmentService = require('../services/sopAttachmentService');
const sopVersionService = require('../services/sopVersionService');
const sopApprovalService = require('../services/sopApprovalService');
const sopWorkflowService = require('../services/sopWorkflowService');
const sopAuditLogService = require('../services/sopAuditLogService');
const sopShareService = require('../services/sopShareService');
const sopAssignmentService = require('../services/sopAssignmentService');
const sopAcknowledgementService = require('../services/sopAcknowledgementService');
const approvalWorkflowController = require('../controllers/approvalWorkflowController');

function handleError(res, error) {
  const code = error.code || 'INTERNAL_ERROR';
  const status = error.status || (
    code === 'NOT_FOUND' ? 404 :
    code === 'VALIDATION_ERROR' ? 400 :
    code === 'CODE_EXISTS' ? 409 :
    code === 'UNAUTHORIZED' ? 403 :
    code === 'FORBIDDEN' ? 403 :
    code === 'APPROVAL_PENDING' ? 400 :
    code === 'INVALID_TRANSITION' ? 400 :
    code === 'WORKFLOW_NOT_FOUND' ? 404 :
    code === 'DUPLICATE_ACKNOWLEDGEMENT' ? 409 :
    code === 'DUPLICATE_ASSIGNMENT' ? 409 :
    500
  );
  res.status(status).json({ success: false, error: { code, message: error.message } });
}

const sopController = {
  async list(req, res) {
    try {
      const result = await sopService.listSops(req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getById(req, res) {
    try {
      const result = await sopService.getSopById(parseInt(req.params.id, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const { title, department_id } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } });
      }
      const result = await sopService.createSop(req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'SOP created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req, res) {
    try {
      const result = await sopService.updateSop(parseInt(req.params.id, 10), req.body, req.user.id);
      res.json({ success: true, data: result, message: 'SOP updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await sopService.deleteSop(parseInt(req.params.id, 10), req.user.id);
      res.json({ success: true, data: result, message: 'SOP deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getStats(req, res) {
    try {
      const result = await sopService.getSopStats();
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listTrashed(req, res) {
    try {
      const result = await sopService.listTrashedSops(req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async restore(req, res) {
    try {
      const result = await sopService.restoreSop(parseInt(req.params.id, 10), req.user.id);
      res.json({ success: true, data: result, message: 'SOP restored successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async permanentDelete(req, res) {
    try {
      const result = await sopService.permanentDeleteSop(parseInt(req.params.id, 10), req.user.id);
      res.json({ success: true, data: result, message: 'SOP permanently deleted' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async emptyTrash(req, res) {
    try {
      const result = await sopService.emptyTrash(req.user.id);
      res.json({ success: true, data: result, message: 'Trash emptied successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const moduleController = {
  async list(req, res) {
    try {
      const result = await sopModuleService.listModules(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopModuleService.createModule(parseInt(req.params.sopId, 10), req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'Module created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req, res) {
    try {
      const result = await sopModuleService.updateModule(parseInt(req.params.moduleId, 10), req.body, req.user.id);
      res.json({ success: true, data: result, message: 'Module updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await sopModuleService.deleteModule(parseInt(req.params.moduleId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Module deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateSortOrder(req, res) {
    try {
      const result = await sopModuleService.updateSortOrder(parseInt(req.params.sopId, 10), req.body.moduleOrders, req.user.id);
      res.json({ success: true, data: result, message: 'Sort order updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listTrashed(req, res) {
    try {
      const result = await sopModuleService.listTrashedModules(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async restore(req, res) {
    try {
      const result = await sopModuleService.restoreModule(parseInt(req.params.moduleId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Module restored successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async permanentDelete(req, res) {
    try {
      const result = await sopModuleService.permanentDeleteModule(parseInt(req.params.moduleId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Module permanently deleted' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const attachmentController = {
  async list(req, res) {
    try {
      const result = await sopAttachmentService.listAttachments(parseInt(req.params.moduleId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async upload(req, res) {
    try {
      const file = req.file;
      const result = await sopAttachmentService.uploadAttachment(
        parseInt(req.params.moduleId, 10),
        {
          file_name: file.filename,
          original_name: file.originalname,
          mime_type: file.mimetype,
          file_size: file.size,
          file_extension: path.extname(file.originalname).toLowerCase(),
          file_data: file.buffer,
        },
        req.user.id
      );
      res.status(201).json({ success: true, data: result, message: 'Attachment uploaded successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await sopAttachmentService.deleteAttachment(parseInt(req.params.attachmentId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Attachment deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listTrashed(req, res) {
    try {
      const result = await sopAttachmentService.listTrashedAttachments(parseInt(req.params.moduleId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async restore(req, res) {
    try {
      const result = await sopAttachmentService.restoreAttachment(parseInt(req.params.attachmentId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Attachment restored successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async permanentDelete(req, res) {
    try {
      const result = await sopAttachmentService.permanentDeleteAttachment(parseInt(req.params.attachmentId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Attachment permanently deleted' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const versionController = {
  async getById(req, res) {
    try {
      const result = await sopVersionService.getVersionById(parseInt(req.params.versionId, 10));
      if (!result) {
        const error = new Error('Version not found');
        error.code = 'NOT_FOUND';
        throw error;
      }
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async list(req, res) {
    try {
      const result = await sopVersionService.listVersions(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopVersionService.createVersion(parseInt(req.params.sopId, 10), req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'Version created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async restore(req, res) {
    try {
      const result = await sopVersionService.restoreVersion(parseInt(req.params.sopId, 10), parseInt(req.params.versionId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Version restored successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const approvalController = {
  async list(req, res) {
    try {
      const result = await sopApprovalService.listApprovals(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopApprovalService.createApproval(parseInt(req.params.sopId, 10), req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'Approval created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req, res) {
    try {
      const result = await sopApprovalService.updateApproval(parseInt(req.params.approvalId, 10), req.body, req.user.id);
      res.json({ success: true, data: result, message: 'Approval updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async approve(req, res) {
    try {
      const result = await sopApprovalService.approveApproval(
        parseInt(req.params.approvalId, 10),
        req.user.id,
        req.body.comments || null
      );
      res.json({ success: true, data: result, message: 'Approval recorded' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async reject(req, res) {
    try {
      const result = await sopApprovalService.rejectApproval(
        parseInt(req.params.approvalId, 10),
        req.user.id,
        req.body.comments
      );
      res.json({ success: true, data: result, message: 'Rejection recorded' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const workflowController = {
  async transition(req, res) {
    try {
      const body = req.body || {};
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), body.status, req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'Workflow transition completed' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async submit(req, res) {
    try {
      const body = req.body || {};
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), 'For Review', req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'SOP submitted for review' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async approve(req, res) {
    try {
      const body = req.body || {};
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), 'Approved', req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'SOP approved' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async reject(req, res) {
    try {
      const body = req.body || {};
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), 'Draft', req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'SOP rejected and returned to draft' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async publish(req, res) {
    try {
      const body = req.body || {};
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), 'Published', req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'SOP published successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const auditController = {
  async list(req, res) {
    try {
      const result = await sopAuditLogService.listAuditLogs(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const shareController = {
  async list(req, res) {
    try {
      const result = await sopShareService.listShares(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopShareService.createShare(parseInt(req.params.sopId, 10), req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'Share created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const assignmentController = {
  async list(req, res) {
    try {
      const result = await sopAssignmentService.listAssignments(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopAssignmentService.createAssignment(parseInt(req.params.sopId, 10), req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'Assignment created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await sopAssignmentService.deleteAssignment(parseInt(req.params.id, 10));
      res.json({ success: true, data: result, message: 'Assignment deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const acknowledgementController = {
  async list(req, res) {
    try {
      const result = await sopAcknowledgementService.listAcknowledgements(parseInt(req.params.sopId, 10), { status: req.query.status || undefined });
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopAcknowledgementService.createAcknowledgement(parseInt(req.params.sopId, 10), parseInt(req.body.user_id, 10), req.body.status || 'Pending');
      res.status(201).json({ success: true, data: result, message: 'Acknowledgement created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async acknowledge(req, res) {
    try {
      const result = await sopAcknowledgementService.acknowledgeSop(parseInt(req.params.sopId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'SOP acknowledged successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = {
  sopController,
  moduleController,
  attachmentController,
  versionController,
  approvalController,
  workflowController,
  auditController,
  shareController,
  assignmentController,
  acknowledgementController,
  approvalWorkflowController,
};