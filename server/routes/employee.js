const express = require('express');
const router = express.Router();
const employeeSopController = require('../controllers/employeeSopController');
const employeeOnboardingController = require('../controllers/employeeOnboardingController')
const { authenticateToken } = require('../middleware/auth');
const { requireOnboardingComplete } = require('../middleware/onboarding');

router.use(authenticateToken);

// Onboarding endpoints (no onboarding gate - employee need these to complete onboarding)
router.get('/onboarding', employeeOnboardingController.getMyOnboarding);
router.post('/onboarding/:ackId/acknowledge', employeeOnboardingController.acknowledgeOnboardingSop);

// Employee SOP access - gated by onboarding completion
router.use(requireOnboardingComplete);
router.get('/sops/:id',employeeSopController.getSop);

module.exports = router;
