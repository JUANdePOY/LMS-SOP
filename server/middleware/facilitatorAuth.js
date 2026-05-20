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

    const trainingId = req.params.trainingId || req.body.training_id || null;
    const externalTrainingId = req.params.externalTrainingId || req.body.external_training_id || null;

    const isFac = await attendanceModel.isFacilitator(trainingId, externalTrainingId, req.user.id);
    if (!isFac) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You must be an admin or assigned facilitator for this event.',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

module.exports = { authorizeFacilitator };
