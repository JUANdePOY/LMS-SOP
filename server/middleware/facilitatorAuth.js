const attendanceModel = require('../models/attendanceModel');

const authorizeFacilitator = () => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - No user information',
        code: 'UNAUTHORIZED'
      });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    // Get training/event IDs from various sources
    const trainingId = req.params.trainingId || req.params.id || req.body.training_id || null;
    const externalTrainingId = req.params.externalTrainingId || req.body.external_training_id || null;
    const eventType = req.params.eventType;

    // For /:eventType/:id routes, determine which table to check based on eventType
    if (eventType === 'internal' && trainingId) {
      const isFac = await attendanceModel.isFacilitator(trainingId, null, req.user.id);
      if (!isFac) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You must be an admin or assigned facilitator for this event.',
          code: 'FORBIDDEN'
        });
      }
    } else if (eventType === 'external' && externalTrainingId) {
      const isFac = await attendanceModel.isFacilitator(null, externalTrainingId, req.user.id);
      if (!isFac) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You must be an admin or assigned facilitator for this event.',
          code: 'FORBIDDEN'
        });
      }
    } else {
      // Legacy check for routes with trainingId or externalTrainingId params
      const isFac = await attendanceModel.isFacilitator(trainingId, externalTrainingId, req.user.id);
      if (!isFac) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You must be an admin or assigned facilitator for this event.',
          code: 'FORBIDDEN'
        });
      }
    }

    next();
  };
};

module.exports = { authorizeFacilitator };
