const approvalWorkflowService = require('../services/approvalWorkflowService');

function successResponse(data, message) {
  const response = { success: true, data };
  if (message) response.message = message;
  return response;
}

const approvalWorkflowController = {
  async list(req, res) {
    try {
      const result = await approvalWorkflowService.listWorkflows(req.query);
      res.json(successResponse(result));
    } catch (error) {
      handleError(res, error);
    }
  },

  async getById(req, res) {
    try {
      const result = await approvalWorkflowService.getWorkflowById(parseInt(req.params.id, 10));
      res.json(successResponse(result));
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await approvalWorkflowService.createWorkflow(req.body, req.user.id);
      res.status(201).json(successResponse(result, 'Workflow created successfully'));
    } catch (error) {
      handleError(res, error);
    }
  },

  async start(req, res) {
    try {
      const result = await approvalWorkflowService.startWorkflow(
        parseInt(req.params.sopId, 10),
        req.user.id
      );
      res.status(201).json(successResponse(result, 'Workflow started'));
    } catch (error) {
      handleError(res, error);
    }
  },

  async advance(req, res) {
    try {
      const { instanceId, stepId, action, comments } = req.body;
      const result = await approvalWorkflowService.advanceStep(
        parseInt(instanceId, 10),
        parseInt(stepId, 10),
        req.user.id,
        action,
        comments
      );
      res.json(successResponse(result, 'Step advanced'));
    } catch (error) {
      handleError(res, error);
    }
  },

  async getInstance(req, res) {
    try {
      const result = await approvalWorkflowService.getWorkflowStatus(
        parseInt(req.params.sopId, 10)
      );
      res.json(successResponse(result));
    } catch (error) {
      handleError(res, error);
    }
  }
};

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
    500
  );
  res.status(status).json({ success: false, error: { code, message: error.message } });
}

module.exports = approvalWorkflowController;
