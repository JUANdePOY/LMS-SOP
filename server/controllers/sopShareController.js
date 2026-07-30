const sopShareService = require('../services/sopShareService');

const shareController = {
  async list(req, res) {
    const result = await sopShareService.listShares(parseInt(req.params.sopId, 10));
    res.json({ success: true, data: result });
  },

  async create(req, res) {
    const result = await sopShareService.createShare(
      parseInt(req.params.sopId, 10),
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: result, message: 'Share created successfully' });
  },
};

module.exports = shareController;