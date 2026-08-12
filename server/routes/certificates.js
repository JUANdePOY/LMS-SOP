const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  certificateTemplateController,
} = require('../controllers/certificateTemplateController');
const {
  certificateSignatureController,
} = require('../controllers/certificateSignatureController');
const {
  certificateIssuanceController,
} = require('../controllers/certificateIssuanceController');
const {
  frameUploadMiddleware,
  optionalFrameUploadMiddleware,
  signatureUploadMiddleware,
} = require('../middleware/certificateUpload');

/* ─────────────────── Template Router ─────────────────── */
// Mounted at /api/certificate-templates
const templateRouter = express.Router();
templateRouter.use(authenticateToken, requireAdmin);

templateRouter.route('/')
  .get(certificateTemplateController.list)
  .post(frameUploadMiddleware, certificateTemplateController.create);

templateRouter.route('/stats')
  .get(certificateTemplateController.getStats);

templateRouter.route('/:id')
  .get(certificateTemplateController.getById)
  .put(optionalFrameUploadMiddleware, certificateTemplateController.update)
  .delete(certificateTemplateController.remove);

templateRouter.route('/:id/frame')
  .get(certificateTemplateController.getFrame);

templateRouter.route('/:id/download')
  .get(certificateTemplateController.download);

// Public frame route — certificate frame images are decorative and safe
// to expose publicly so that issued certificates can render previews
// without requiring admin authentication.
const templateFramePublicRouter = express.Router();
templateFramePublicRouter.route('/:id/frame')
  .get(certificateTemplateController.getFrame);

/* ─────────────────── Signature Router ─────────────────── */
// Mounted at /api/certificate-signatures
const signatureRouter = express.Router();
signatureRouter.use(authenticateToken, requireAdmin);

signatureRouter.route('/')
  .get(certificateSignatureController.list)
  .post(signatureUploadMiddleware, certificateSignatureController.create);

signatureRouter.route('/:id')
  .get(certificateSignatureController.getById)
  .put(certificateSignatureController.update)
  .delete(certificateSignatureController.remove);

// Public image route — signature images are embedded in certificates
// and should be viewable by any authenticated user, not just admins.
const signatureImageRouter = express.Router();
signatureImageRouter.use(authenticateToken);
signatureImageRouter.route('/:id/image')
  .get(certificateSignatureController.getImage);

/* ─────────────────── Issuance Router ─────────────────── */
// Mounted at /api/certificate-issuances
// The public verification route is defined BEFORE authenticateToken
// so it is accessible without a JWT.
const issuanceRouter = express.Router();

// Public verification — no auth required
// Must come before /user/:userId to avoid being shadowed, and /:id to
// avoid ambiguity. A single-segment path like /abc-123 hits this route.
issuanceRouter.get(
  '/:certificateNumber',
  certificateIssuanceController.getByCertificateNumber
);

// Protected routes — require auth
issuanceRouter.use(authenticateToken);

// Certificate stats (admin)
issuanceRouter.get('/stats', certificateIssuanceController.getStats);

// User's own certificates (ownership checked in controller)
issuanceRouter.get(
  '/user/:userId',
  certificateIssuanceController.listByUser
);

// Issue a new certificate (admin only)
issuanceRouter.post(
  '/',
  requireAdmin,
  certificateIssuanceController.issue
);

// Revoke an issuance (admin only)
issuanceRouter.delete(
  '/:id/revoke',
  requireAdmin,
  certificateIssuanceController.revoke
);

module.exports = {
  templateRouter,
  templateFramePublicRouter,
  signatureRouter,
  signatureImageRouter,
  issuanceRouter,
};
