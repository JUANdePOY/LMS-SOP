function permissionErrorHandler(err, req, res, next) {
  if (err && err.code === 'PERMISSION_DENIED') {
    return res.status(403).json({
      status: 'error',
      message: err.message || 'You do not have permission to perform this action.',
      code: 'PERMISSION_DENIED',
    });
  }

  if (err && err.code === 'ENTITY_ACCESS_DENIED') {
    return res.status(403).json({
      status: 'error',
      message: err.message || 'Your access to this resource has been restricted by an administrator.',
      code: 'ENTITY_ACCESS_DENIED',
    });
  }

  next(err);
}

module.exports = { permissionErrorHandler };
