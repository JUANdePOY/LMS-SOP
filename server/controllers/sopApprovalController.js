const sopApprovalService = require('../services/sopApprovalService');

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

const approvalController = {
  async list(req, res) {
    try {
      const result = await sopApprovalService.listApprovals(parseInt(req.params.sopId, 10));
      res.json(successResponse(result));
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopApprovalService.createApproval(
        parseInt(req.params.sopId, 10),
        req.body,
        req.user.id
      );
      res.status(201).json(successResponse(result, 'Approval created successfully'));
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req, res) {
    try {
      const result = await sopApprovalService.updateApproval(
        parseInt(req.params.approvalId, 10),
        req.body,
        req.user.id
      );
      res.json(successResponse(result, 'Approval updated successfully'));
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
      res.json(successResponse(result, 'Approval recorded'));
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
      res.json(successResponse(result, 'Rejection recorded'));
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = approvalController;
