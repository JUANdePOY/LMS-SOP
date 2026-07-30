const sopAssignmentService = require('../services/sopAssignmentService');

const assignmentController = {
  async list(req, res) {
    const result = await sopAssignmentService.listAssignments(parseInt(req.params.sopId, 10));
    res.json({ success: true, data: result });
  },

  async create(req, res) {
    const result = await sopAssignmentService.createAssignment(
      parseInt(req.params.sopId, 10),
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: result, message: 'Assignment created successfully' });
  },

  async remove(req, res) {
    const result = await sopAssignmentService.deleteAssignment(parseInt(req.params.id, 10));
    res.json({ success: true, data: result, message: 'Assignment deleted successfully' });
  },
};

module.exports = assignmentController;