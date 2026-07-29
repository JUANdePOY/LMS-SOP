const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const contentModel = require('../models/sopContentModel');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
router.use(authenticateToken);

router.get('/:sopId/sections', async (req, res) => {
  try {
    const sections = await contentModel.getSections(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: sections });
  } catch (error) {
    console.error('List sections error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch sections', code: 'DB_ERROR' });
  }
});

// Real column: sop_sections.section_type ENUM('Purpose','Scope','Objectives',
// 'Responsibilities','Definitions','Safety Notes','References','Appendix')
// NOT NULL — there is no 'custom' member and no default, so it must be
// validated against this exact list rather than defaulted.
const SECTION_TYPES = ['Purpose', 'Scope', 'Objectives', 'Responsibilities', 'Definitions', 'Safety Notes', 'References', 'Appendix'];

router.post('/:sopId/sections', [
  body('title').trim().isLength({ min: 2 }).withMessage('Section title is required'),
  body('section_type').isIn(SECTION_TYPES).withMessage(`section_type must be one of: ${SECTION_TYPES.join(', ')}`),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }
    const id = await contentModel.createSection({
      sop_id: parseInt(req.params.sopId, 10),
      title: req.body.title,
      section_type: req.body.section_type,
      content: req.body.content || '',
      order_index: req.body.order_index ?? 0,
    });
    const created = await contentModel.getSectionById(id);
    logAudit({ user_id: req.user.id, action: 'sop.section.created', entity_type: 'sop_section', entity_id: id, metadata: { sop_id: req.params.sopId } });
    res.status(201).json({ status: 'success', message: 'Section created', data: created });
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create section', code: 'DB_ERROR' });
  }
});

router.put('/sections/:id', [
  body('title').optional().trim().isLength({ min: 2 }),
  body('section_type').optional().isIn(SECTION_TYPES).withMessage(`section_type must be one of: ${SECTION_TYPES.join(', ')}`),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }
    await contentModel.updateSection(parseInt(req.params.id, 10), req.body);
    res.json({ status: 'success', message: 'Section updated' });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update section', code: 'DB_ERROR' });
  }
});

router.delete('/sections/:id', async (req, res) => {
  try {
    await contentModel.deleteSection(parseInt(req.params.id, 10));
    res.json({ status: 'success', message: 'Section deleted' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete section', code: 'DB_ERROR' });
  }
});

router.get('/:sopId/steps', async (req, res) => {
  try {
    const steps = await contentModel.getSteps(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: steps });
  } catch (error) {
    console.error('List steps error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch steps', code: 'DB_ERROR' });
  }
});

router.post('/:sopId/steps', [
  body('title').trim().isLength({ min: 2 }).withMessage('Step title is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }
    const id = await contentModel.createStep({
      sop_id: parseInt(req.params.sopId, 10),
      section_id: req.body.section_id || null,
      title: req.body.title,
      description: req.body.description || '',
      instruction: req.body.instruction || req.body.description || '',
      step_number: req.body.step_number || 1,
      order_index: req.body.order_index ?? 0,
      sort_order: req.body.sort_order,
    });
    const created = await contentModel.getStepById(id);
    logAudit({ user_id: req.user.id, action: 'sop.step.created', entity_type: 'sop_step', entity_id: id, metadata: { sop_id: req.params.sopId } });
    res.status(201).json({ status: 'success', message: 'Step created', data: created });
  } catch (error) {
    console.error('Create step error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create step', code: 'DB_ERROR' });
  }
});

router.put('/steps/:id', [
  body('title').optional().trim().isLength({ min: 2 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }
    await contentModel.updateStep(parseInt(req.params.id, 10), req.body);
    res.json({ status: 'success', message: 'Step updated' });
  } catch (error) {
    console.error('Update step error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update step', code: 'DB_ERROR' });
  }
});

router.delete('/steps/:id', async (req, res) => {
  try {
    await contentModel.deleteStep(parseInt(req.params.id, 10));
    res.json({ status: 'success', message: 'Step deleted' });
  } catch (error) {
    console.error('Delete step error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete step', code: 'DB_ERROR' });
  }
});

module.exports = router;