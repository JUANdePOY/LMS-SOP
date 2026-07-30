const sopWorkflowService = require('../services/sopWorkflowService');

function successResponse(data, message) {
  const response = { success: true, data };
  if (message) response.message = message;
  return response;
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