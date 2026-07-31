const sopWorkflowService = require('../services/sopWorkflowService');

function successResponse(data, message) {
  const response = { success: true, data };
  if (message) response.message = message;
  return response;
}

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
    500
  );
  res.status(status).json({ success: false, error: { code, message: error.message } });
}

const workflowController = {
  async transition(req, res) {
    try {
      const result = await sopWorkflowService.transitionSop(
        parseInt(req.params.sopId, 10),
        req.body.status,
        req.user.id,
        { comment: req.body.comment || null }
      );
      res.json({ success: true, data: result, message: 'Workflow transition completed' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = workflowController;