const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireBusinessScope, requireDepartmentScope } = require('../middleware/scope');
const { sopController, moduleController, attachmentController, versionController, workflowController, auditController, shareController, assignmentController, acknowledgementController, approvalWorkflowController, exportController } = require('../controllers/sopController');
const approvalController = require('../controllers/sopApprovalController');
const assignmentCascadeController = require('../controllers/assignmentCascadeController');
const { sopAttachmentUploadMiddleware } = require('../middleware/sopUpload');
const sopModel = require('../models/sopModel');

const router = express.Router();
router.use(authenticateToken);

async function requireSopReadScope(req, res, next) {
  try {
    const sop = await sopModel.findById(parseInt(req.params.id || req.params.sopId, 10));
    if (!sop) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    }
    const { enforceSopScope } = require('../services/sopService');
    await enforceSopScope(sop, req.user);
    next();
  } catch (err) {
    handleSopError(res, err);
  }
}

async function requireSopWriteScope(req, res, next) {
  try {
    const sop = await sopModel.findById(parseInt(req.params.id || req.params.sopId, 10));
    if (!sop) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    }
    const { enforceSopWriteScope } = require('../services/sopService');
    await enforceSopWriteScope(sop, req.user);
    next();
  } catch (err) {
    handleSopError(res, err);
  }
}

function handleSopError(res, error) {
  const code = error.code || 'INTERNAL_ERROR';
  const status = error.status || (
    code === 'NOT_FOUND' ? 404 :
    code === 'VALIDATION_ERROR' ? 400 :
    code === 'FORBIDDEN' ? 403 :
    500
  );
  res.status(status).json({ success: false, error: { code, message: error.message } });
}

router.route('/')
  .get(requirePermission('manage_sops'), sopController.list)
  .post(requirePermission('manage_sops'), sopController.create);

router.route('/stats')
  .get(requirePermission('view_reports'), sopController.getStats);

router.route('/trashed')
  .get(requirePermission('manage_sops'), sopController.listTrashed);

router.route('/:id')
  .get(requireSopReadScope, sopController.getById)
  .put(requireSopWriteScope, sopController.update)
  .delete(requireSopWriteScope, sopController.remove);

router.route('/:id/restore')
  .post(requireSopWriteScope, sopController.restore);

router.route('/:id/permanent')
  .delete(requireSopWriteScope, sopController.permanentDelete);

router.route('/trashed/empty')
  .delete(requirePermission('manage_sops'), sopController.emptyTrash);

router.route('/:sopId/modules')
  .get(requireSopReadScope, moduleController.list)
  .post(requireSopWriteScope, moduleController.create);

router.route('/modules/:moduleId')
  .put(moduleController.update)
  .delete(moduleController.remove);

router.route('/modules/:moduleId/restore')
  .post(moduleController.restore);

router.route('/modules/:moduleId/permanent')
  .delete(moduleController.permanentDelete);

router.route('/:sopId/modules/trashed')
  .get(requireSopReadScope, moduleController.listTrashed);

router.route('/:sopId/modules/sort')
  .put(requireSopWriteScope, moduleController.updateSortOrder);

router.route('/modules/:moduleId/attachments')
  .get(attachmentController.list)
  .post(sopAttachmentUploadMiddleware, attachmentController.upload);

router.route('/modules/:moduleId/links')
  .post(attachmentController.createLink);

router.route('/attachments/:attachmentId')
  .delete(attachmentController.remove);

router.route('/attachments/:attachmentId/restore')
  .post(attachmentController.restore);

router.route('/attachments/:attachmentId/permanent')
  .delete(attachmentController.permanentDelete);

router.route('/modules/:moduleId/attachments/trashed')
  .get(attachmentController.listTrashed);

router.route('/:sopId/versions')
  .get(requireSopReadScope, versionController.list)
  .post(requireSopWriteScope, versionController.create);

router.route('/:sopId/versions/:versionId')
  .get(requireSopReadScope, versionController.getById);

router.route('/:sopId/versions/:versionId/restore')
  .post(requireSopWriteScope, versionController.restore);

router.route('/:sopId/approvals')
  .get(requireSopReadScope, approvalController.list)
  .post(requireSopWriteScope, approvalController.create);

router.route('/:sopId/approvals/:approvalId')
  .put(requireSopWriteScope, approvalController.update)
  .post(requireSopWriteScope, approvalController.approve);

router.route('/:sopId/approvals/:approvalId/reject')
  .post(requireSopWriteScope, approvalController.reject);

router.route('/:sopId/workflow')
  .get(requireSopReadScope, approvalWorkflowController.getInstance);

router.route('/:sopId/workflow/start')
  .post(requireSopWriteScope, approvalWorkflowController.start);

router.route('/:sopId/transition')
  .post(requireSopWriteScope, workflowController.transition);

router.route('/:sopId/submit')
  .post(requireSopWriteScope, workflowController.submit);

router.route('/:sopId/approve')
  .post(requirePermission('manage_sops'), requireSopWriteScope, workflowController.approve);

router.route('/:sopId/reject')
  .post(requirePermission('manage_sops'), requireSopWriteScope, workflowController.reject);

router.route('/:sopId/publish')
  .post(requirePermission('manage_sops'), requireSopWriteScope, workflowController.publish);

router.route('/:sopId/audit')
  .get(requireSopReadScope, auditController.list);

router.route('/:sopId/shares')
  .get(requireSopReadScope, shareController.list)
  .post(requireSopWriteScope, shareController.create);

router.route('/:sopId/shares/link')
  .post(requireSopWriteScope, shareController.createLink);

router.route('/:sopId/shares/:shareId')
  .delete(requireSopWriteScope, shareController.revoke);

router.route('/assignment/departments').get(assignmentCascadeController.listDepartments);

router.route('/assignment/positions/:departmentId').get(assignmentCascadeController.listPositions);

router.route('/assignment/users/:departmentId').get(assignmentCascadeController.listUsers);

router.route('/:sopId/assignments')
  .get(requireSopReadScope, assignmentController.list)
  .post(requireSopWriteScope, assignmentController.create);

router.route('/:sopId/assigned')
  .get(requireSopReadScope, assignmentCascadeController.listAssigned);

router.route('/assignments/:id')
  .delete(requireSopWriteScope, assignmentController.remove);

router.route('/:sopId/acknowledgements')
  .get(requireSopReadScope, acknowledgementController.list)
  .post(requireSopWriteScope, acknowledgementController.create);

router.route('/:sopId/acknowledgements/:ackId/acknowledge')
  .post(requireSopReadScope, acknowledgementController.acknowledge);

router.route('/:id/export')
  .get(requireSopReadScope, exportController.exportPdf);

module.exports = router;