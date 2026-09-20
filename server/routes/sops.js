const express = require('express');
const { authenticateToken, resolveScope } = require('../middleware/auth');
const { requirePermission, requirePermissionAction, requireBusinessScope, requireDepartmentScope, requireEntityTypeAccess, canAccessEntity } = require('../middleware/scope');
const { sopController, moduleController, attachmentController, versionController, workflowController, auditController, shareController, assignmentController, acknowledgementController, approvalWorkflowController, exportController } = require('../controllers/sopController');
const approvalController = require('../controllers/sopApprovalController');
const assignmentCascadeController = require('../controllers/assignmentCascadeController');
const { sopAttachmentUploadMiddleware } = require('../middleware/sopUpload');
const sopModel = require('../models/sopModel');

const router = express.Router();
router.use(authenticateToken);
// Resolve permissions + department scope so role/permission checks and
// department-scoped SOP queries work for department_head on this router.
router.use(resolveScope);

async function requireSopReadScope(req, res, next) {
  try {
    const sop = await sopModel.findById(parseInt(req.params.id || req.params.sopId, 10));
    if (!sop) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    }
    if (!canAccessEntity(req.user, 'sop', sop.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'ENTITY_ACCESS_DENIED', message: 'You do not have access to this SOP.' }
      });
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
    const sop = await sopModel.findByIdIncludingDeleted(parseInt(req.params.id || req.params.sopId, 10));
    if (!sop) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    }
    if (!canAccessEntity(req.user, 'sop', sop.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'ENTITY_ACCESS_DENIED', message: 'You do not have access to this SOP.' }
      });
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
  .get(requireEntityTypeAccess('sop'), requirePermission('manage_sops'), sopController.list)
  .post(requireEntityTypeAccess('sop'), requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), sopController.create);

router.route('/stats')
  .get(requirePermission('view_reports'), sopController.getStats);

router.route('/trashed')
  .get(requirePermission('manage_sops'), sopController.listTrashed);

router.route('/:id')
  .get(requireSopReadScope, sopController.getById)
  .put(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'edit'), requireSopWriteScope, sopController.update)
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), requireSopWriteScope, sopController.remove);

router.route('/:id/restore')
  .post(requirePermission('manage_sops'), requireSopWriteScope, sopController.restore);

router.route('/:id/permanent')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), requireSopWriteScope, sopController.permanentDelete);

router.route('/trashed')
  .get(requirePermission('manage_sops'), sopController.listTrashed);

router.route('/trashed/empty')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), sopController.emptyTrash);

router.route('/:id/restore')
  .post(requirePermission('manage_sops'), requireSopWriteScope, sopController.restore);

router.route('/:id/permanent')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), requireSopWriteScope, sopController.permanentDelete);

router.route('/trashed/empty')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), sopController.emptyTrash);

router.route('/:sopId/modules')
  .get(requirePermission('manage_sops'), requireSopReadScope, moduleController.list)
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), requireSopWriteScope, moduleController.create);

router.route('/modules/:moduleId')
  .put(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'edit'), moduleController.update)
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), moduleController.remove);

router.route('/modules/:moduleId/restore')
  .post(requirePermission('manage_sops'), moduleController.restore);

router.route('/modules/:moduleId/permanent')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), moduleController.permanentDelete);

router.route('/:sopId/modules/trashed')
  .get(requirePermission('manage_sops'), requireSopReadScope, moduleController.listTrashed);

router.route('/:sopId/modules/sort')
  .put(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'edit'), requireSopWriteScope, moduleController.updateSortOrder);

router.route('/modules/:moduleId/attachments')
  .get(requirePermission('manage_sops'), attachmentController.list)
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), sopAttachmentUploadMiddleware, attachmentController.upload);

router.route('/modules/:moduleId/links')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), attachmentController.createLink);

router.route('/attachments/:attachmentId')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), attachmentController.remove);

router.route('/attachments/:attachmentId/restore')
  .post(requirePermission('manage_sops'), attachmentController.restore);

router.route('/attachments/:attachmentId/permanent')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), attachmentController.permanentDelete);

router.route('/modules/:moduleId/attachments/trashed')
  .get(requirePermission('manage_sops'), attachmentController.listTrashed);

router.route('/:sopId/versions')
  .get(requirePermission('manage_sops'), requireSopReadScope, versionController.list)
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), requireSopWriteScope, versionController.create);

router.route('/:sopId/versions/:versionId')
  .get(requirePermission('manage_sops'), requireSopReadScope, versionController.getById);

router.route('/:sopId/versions/:versionId/restore')
  .post(requirePermission('manage_sops'), requireSopWriteScope, versionController.restore);

router.route('/:sopId/approvals')
  .get(requirePermission('manage_sops'), requireSopReadScope, approvalController.list)
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), requireSopWriteScope, approvalController.create);

router.route('/:sopId/approvals/:approvalId')
  .put(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'edit'), requireSopWriteScope, approvalController.update)
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'approve'), requireSopWriteScope, approvalController.approve);

router.route('/:sopId/approvals/:approvalId/reject')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'edit'), requireSopWriteScope, approvalController.reject);

router.route('/:sopId/workflow')
  .get(requirePermission('manage_sops'), requireSopReadScope, approvalWorkflowController.getInstance);

router.route('/:sopId/workflow/start')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), requireSopWriteScope, approvalWorkflowController.start);

router.route('/:sopId/transition')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'edit'), requireSopWriteScope, workflowController.transition);

router.route('/:sopId/submit')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'edit'), requireSopWriteScope, workflowController.submit);

router.route('/:sopId/approve')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'approve'), requireSopWriteScope, workflowController.approve);

router.route('/:sopId/reject')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'approve'), requireSopWriteScope, workflowController.reject);

router.route('/:sopId/publish')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'publish'), requireSopWriteScope, workflowController.publish);

router.route('/:sopId/audit')
  .get(requirePermission('manage_sops'), requireSopReadScope, auditController.list);

router.route('/:sopId/shares')
  .get(requirePermission('manage_sops'), requireSopReadScope, shareController.list)
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), requireSopWriteScope, shareController.create);

router.route('/:sopId/shares/link')
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), requireSopWriteScope, shareController.createLink);

router.route('/:sopId/shares/:shareId')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), requireSopWriteScope, shareController.revoke);

router.route('/assignment/departments').get(assignmentCascadeController.listDepartments);

router.route('/assignment/positions/:departmentId').get(assignmentCascadeController.listPositions);

router.route('/assignment/users/:departmentId').get(assignmentCascadeController.listUsers);

router.route('/:sopId/assignments')
  .get(requirePermission('manage_sops'), requireSopReadScope, assignmentController.list)
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), requireSopWriteScope, assignmentController.create);

router.route('/:sopId/assigned')
  .get(requirePermission('manage_sops'), requireSopReadScope, assignmentCascadeController.listAssigned);

router.route('/assignments/:id')
  .delete(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'delete'), assignmentController.remove);

router.route('/acknowledgements/my')
  .get(authenticateToken, acknowledgementController.listByUser);

router.route('/:sopId/acknowledgements')
  .get(requirePermission('manage_sops'), requireSopReadScope, acknowledgementController.list)
  .post(requirePermission('manage_sops'), requirePermissionAction('manage_sops', 'create'), requireSopWriteScope, acknowledgementController.create);

router.route('/:sopId/acknowledgements/:ackId/acknowledge')
  .post(requirePermission('manage_sops'), requireSopReadScope, acknowledgementController.acknowledge);

router.route('/:id/export')
  .get(requirePermission('manage_sops'), requireSopReadScope, exportController.exportPdf);

module.exports = router;