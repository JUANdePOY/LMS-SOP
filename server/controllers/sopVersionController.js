const sopVersionService = require('../services/sopVersionService');

function successResponse(data, message) {
  const response = { success: true, data };
  if (message) response.message = message;
  return response;
}

const versionController = {
  async list(req, res) {
    const result = await sopVersionService.listVersions(parseInt(req.params.sopId, 10));
    res.json({ success: true, data: result });
  },

  async create(req, res) {
    const result = await sopVersionService.createVersion(
      parseInt(req.params.sopId, 10),
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: result, message: 'Version created successfully' });
  },

  async restore(req, res) {
    const result = await sopVersionService.restoreVersion(
      parseInt(req.params.sopId, 10),
      parseInt(req.params.versionId, 10),
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Version restored successfully' });
  },
};

module.exports = versionController;