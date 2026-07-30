const sopApprovalService = require('../services/sopApprovalService');

function successResponse(data, message) {
  const response = { success: true, data };
  if (message) response.message = message;
  return response;
}

const approvalController = {
  async list(req, res) {
    const result = await sopApprovalService.listApprovals(parseInt(req.params.sopId, 10));
    res.json({ success: true, data: result });
  },

  async create(req, res) {
    const result = await sopApprovalService.createApproval(
      parseInt(req.params.sopId, 10),
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: result, message: 'Approval created successfully' });
  },

  async update(req, res) {
    const result = await sopApprovalService.updateApproval(
      parseInt(req.params.approvalId, 10),
      req.body,
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Approval updated successfully' });
  },

  async approve(req, res) {
    const result = await sopApprovalService.approveApproval(
      parseInt(req.params.approvalId, 10),
      req.user.id,
      req.body.comments || null
    );
    res.json({ success: true, data: result, message: 'Approval recorded' });
  },

  async reject(req, res) {
    const result = await sopApprovalService.rejectApproval(
      parseInt(req.params.approvalId, 10),
      req.user.id,
      req.body.comments
    );
    res.json({ success: true, data: result, message: 'Rejection recorded' });
  },
};

module.exports = approvalController;