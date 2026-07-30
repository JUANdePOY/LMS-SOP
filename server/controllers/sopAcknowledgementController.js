const sopAcknowledgementService = require('../services/sopAcknowledgementService');

const acknowledgementController = {
  async list(req, res) {
    const result = await sopAcknowledgementService.listAcknowledgements(
      parseInt(req.params.sopId, 10),
      { status: req.query.status || undefined }
    );
    res.json({ success: true, data: result });
  },

  async create(req, res) {
    const result = await sopAcknowledgementService.createAcknowledgement(
      parseInt(req.params.sopId, 10),
      parseInt(req.body.user_id, 10),
      req.body.status || 'Pending'
    );
    res.status(201).json({ success: true, data: result, message: 'Acknowledgement created successfully' });
  },

  async acknowledge(req, res) {
    const result = await sopAcknowledgementService.acknowledgeSop(
      parseInt(req.params.sopId, 10),
      req.user.id
    );
    res.json({ success: true, data: result, message: 'SOP acknowledged successfully' });
  },
};

module.exports = acknowledgementController;