const express = require('express');
const { optionalAuthenticateToken } = require('../middleware/auth');
const sopShareService = require('../services/sopShareService');
const sopModel = require('../models/sopModel');
const sopModuleService = require('../services/sopModuleService');
const sopVersionModel = require('../models/sopVersionModel');

const router = express.Router();

router.use(optionalAuthenticateToken);

// GET /api/sops/share/:token/modules
// Public/unauthenticated access to view SOP modules
router.get('/:token/modules', async (req, res) => {
  try {
    const share = await sopShareService.getSharedSop(req.params.token, req.user || null);

    // The SOP's modules are version-scoped (sop_modules.sop_version_id).
    // When no version is supplied, listModules() falls back to
    // sop_version_id IS NULL, which returns nothing for versioned modules.
    // Resolve the SOP's current version so the correct module set is served.
    // An explicit ?versionId= is honored for parity with the authenticated
    // editor; otherwise we resolve the current version from the shared SOP.
    const versionId = req.query.versionId
      ? parseInt(req.query.versionId, 10)
      : await sopVersionModel.getCurrentVersionId(share.sop_id);

    const result = await sopModuleService.listModules(share.sop_id, versionId);
    res.json({ success: true, data: result });
  } catch (error) {
    const code = error.code || 'INTERNAL_ERROR';
    const status =
      code === 'NOT_FOUND' ? 404 :
      code === 'AUTH_REQUIRED' ? 401 :
      code === 'FORBIDDEN' ? 403 :
      500;
    res.status(status).json({
      success: false,
      error: { code, message: error.message },
    });
  }
});

// GET /api/sops/share/:token
// Public/unauthenticated access to view a shared SOP
router.get('/:token', async (req, res) => {
  try {
    const share = await sopShareService.getSharedSop(req.params.token, req.user || null);

    const sop = await sopModel.findById(share.sop_id);
    if (!sop) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'SOP not found' },
      });
    }

    res.json({ success: true, data: sop });
  } catch (error) {
    const code = error.code || 'INTERNAL_ERROR';
    const status =
      code === 'NOT_FOUND' ? 404 :
      code === 'AUTH_REQUIRED' ? 401 :
      code === 'FORBIDDEN' ? 403 :
      500;
    res.status(status).json({
      success: false,
      error: { code, message: error.message },
    });
  }
});

module.exports = router;
