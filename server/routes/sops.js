const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { sopController, moduleController, attachmentController, versionController, workflowController, auditController, shareController, assignmentController, acknowledgementController, approvalWorkflowController } = require('../controllers/sopController');
const approvalController = require('../controllers/sopApprovalController');
const assignmentCascadeController = require('../controllers/assignmentCascadeController');
const { sopAttachmentUploadMiddleware } = require('../middleware/sopUpload');

const router = express.Router();
router.use(authenticateToken);

router.route('/')
  .get(sopController.list)
  .post(sopController.create);

router.route('/stats')
  .get(sopController.getStats);

router.route('/trashed')
  .get(sopController.listTrashed);

router.route('/:id')
  .get(sopController.getById)
  .put(sopController.update)
  .delete(sopController.remove);

router.route('/:id/restore')
  .post(sopController.restore);

router.route('/:id/permanent')
  .delete(sopController.permanentDelete);

router.route('/trashed/empty')
  .delete(sopController.emptyTrash);

router.route('/:sopId/modules')
  .get(moduleController.list)
  .post(moduleController.create);

router.route('/modules/:moduleId')
  .put(moduleController.update)
  .delete(moduleController.remove);

router.route('/modules/:moduleId/restore')
  .post(moduleController.restore);

router.route('/modules/:moduleId/permanent')
  .delete(moduleController.permanentDelete);

router.route('/:sopId/modules/trashed')
  .get(moduleController.listTrashed);

router.route('/:sopId/modules/sort')
  .put(moduleController.updateSortOrder);

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
  .get(versionController.list)
  .post(versionController.create);

router.route('/:sopId/versions/:versionId')
  .get(versionController.getById);

router.route('/:sopId/versions/:versionId/restore')
  .post(versionController.restore);

router.route('/:sopId/approvals')
  .get(approvalController.list)
  .post(approvalController.create);

router.route('/:sopId/approvals/:approvalId')
  .put(approvalController.update)
  .post(approvalController.approve);

router.route('/:sopId/approvals/:approvalId/reject')
  .post(approvalController.reject);

router.route('/:sopId/workflow')
  .get(approvalWorkflowController.getInstance);

router.route('/:sopId/workflow/start')
  .post(approvalWorkflowController.start);

router.route('/:sopId/transition')
  .post(workflowController.transition);

router.route('/:sopId/submit')
  .post(workflowController.submit);

router.route('/:sopId/approve')
  .post(workflowController.approve);

router.route('/:sopId/reject')
  .post(workflowController.reject);

router.route('/:sopId/publish')
  .post(workflowController.publish);

router.route('/:sopId/audit')
  .get(auditController.list);

router.route('/:sopId/shares')
  .get(shareController.list)
  .post(shareController.create);

router.route('/:sopId/shares/link')
  .post(shareController.createLink);

router.route('/:sopId/shares/:shareId')
  .delete(shareController.revoke);

router.route('/assignment/departments').get(assignmentCascadeController.listDepartments);

router.route('/assignment/positions/:departmentId').get(assignmentCascadeController.listPositions);

router.route('/assignment/users/:departmentId').get(assignmentCascadeController.listUsers);

router.route('/:sopId/assignments')
  .get(assignmentController.list)
  .post(assignmentController.create);

router.route('/:sopId/assigned')
  .get(assignmentCascadeController.listAssigned);

router.route('/assignments/:id')
  .delete(assignmentController.remove);

router.route('/:sopId/acknowledgements')
  .get(acknowledgementController.list)
  .post(acknowledgementController.create);

router.route('/:sopId/acknowledgements/:ackId/acknowledge')
  .post(acknowledgementController.acknowledge);

module.exports = router;