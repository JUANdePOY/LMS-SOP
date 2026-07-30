const sopModuleService = require('../services/sopModuleService');

function successResponse(data, message) {
  const response = { success: true, data };
  if (message) response.message = message;
  return response;
}

const moduleController = {
  async list(req, res) {
    const result = await sopModuleService.listModules(parseInt(req.params.sopId, 10));
    res.json({ success: true, data: result });
  },

  async create(req, res) {
    const result = await sopModuleService.createModule(
      parseInt(req.params.sopId, 10),
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: result, message: 'Module created successfully' });
  },

  async update(req, res) {
    const result = await sopModuleService.updateModule(
      parseInt(req.params.moduleId, 10),
      req.body,
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Module updated successfully' });
  },

  async remove(req, res) {
    const result = await sopModuleService.deleteModule(
      parseInt(req.params.moduleId, 10),
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Module deleted successfully' });
  },

  async updateSortOrder(req, res) {
    const result = await sopModuleService.updateSortOrder(
      parseInt(req.params.sopId, 10),
      req.body.moduleOrders,
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Sort order updated successfully' });
  },
};

module.exports = moduleController;