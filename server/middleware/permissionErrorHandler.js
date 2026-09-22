function permissionErrorHandler(err, req, res, next) {
  if (err && err.code === 'PERMISSION_DENIED') {
    return res.status(403).json({
      status: 'error',
      message: err.message || 'You don\'t have permission to perform this action.',
      code: 'PERMISSION_DENIED',
    });
  }

  if (err && err.code === 'ENTITY_ACCESS_DENIED') {
    return res.status(403).json({
      status: 'error',
      message: err.message || 'You don\'t have access to this resource.',
      code: 'ENTITY_ACCESS_DENIED',
    });
  }

  next(err);
}

module.exports = { permissionErrorHandler };
