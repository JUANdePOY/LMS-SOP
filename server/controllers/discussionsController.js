const discussionModel = require('../models/discussionModel');
const courseModel = require('../models/courseModel');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  if (code === 500) console.error('[Discussions Controller Error]', err);
  return res.status(code).json(body);
}

function listDiscussions(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const { module_id, is_closed, page, limit } = req.query;
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '20', 10);

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return discussionModel.listDiscussions(courseId, { module_id, is_closed, page: pageNum, limit: limitNum })
        .then((discussions) => {
          res.json({ success: true, message: 'OK', data: discussions });
        });
    })
    .catch((err) => sendError(res, err, 'Failed to list discussions'));
}

function getDiscussion(req, res) {
  const discussionId = parseInt(req.params.discussionId, 10);

  discussionModel.findById(discussionId)
    .then((discussion) => {
      if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
      return discussionModel.listReplies(discussionId)
        .then((replies) => {
          res.json({ success: true, message: 'OK', data: { ...discussion, replies } });
        });
    })
    .catch((err) => sendError(res, err, 'Failed to load discussion'));
}

function createDiscussion(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user?.id;
  const { module_id, title, description, is_pinned } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Discussion title is required', code: 'VALIDATION_ERROR' });
  }

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return discussionModel.create({
        course_id: courseId,
        module_id,
        title: title.trim(),
        description,
        created_by: userId,
        is_pinned,
      });
    })
    .then((id) => {
      logAudit('discussion.create', userId, { discussionId: id, courseId });
      return res.status(201).json({ success: true, message: 'Discussion created successfully', data: { id } });
    })
    .catch((err) => sendError(res, err, 'Failed to create discussion'));
}

function updateDiscussion(req, res) {
  const discussionId = parseInt(req.params.discussionId, 10);
  const userId = req.user?.id;

  discussionModel.findById(discussionId)
    .then((discussion) => {
      if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
      const allowed = ['title', 'description', 'is_pinned', 'is_closed'];
      const updates = {};
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          updates[key] = req.body[key];
        }
      }
      if (!Object.keys(updates).length) {
        return res.status(400).json({ success: false, message: 'No changes provided', code: 'VALIDATION_ERROR' });
      }
      return discussionModel.update(discussionId, updates).then(() => {
        logAudit('discussion.update', userId, { discussionId, updates });
        return res.json({ success: true, message: 'Discussion updated successfully' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to update discussion'));
}

function deleteDiscussion(req, res) {
  const discussionId = parseInt(req.params.discussionId, 10);
  const userId = req.user?.id;

  discussionModel.findById(discussionId)
    .then((discussion) => {
      if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
      return discussionModel.softDelete(discussionId).then(() => {
        logAudit('discussion.delete', userId, { discussionId });
        return res.json({ success: true, message: 'Discussion deleted successfully' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to delete discussion'));
}

function createReply(req, res) {
  const discussionId = parseInt(req.params.discussionId, 10);
  const userId = req.user?.id;
  const { parent_reply_id, reply_text, is_instructor, is_pinned } = req.body;

  if (!reply_text || !reply_text.trim()) {
    return res.status(400).json({ success: false, message: 'Reply text is required', code: 'VALIDATION_ERROR' });
  }

  discussionModel.findById(discussionId)
    .then((discussion) => {
      if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
      if (discussion.is_closed) {
        return res.status(400).json({ success: false, message: 'Discussion is closed', code: 'DISCUSSION_CLOSED' });
      }
      return discussionModel.createReply({
        discussion_id: discussionId,
        parent_reply_id,
        user_id: userId,
        reply_text: reply_text.trim(),
        is_instructor,
        is_pinned,
      });
    })
    .then((replyId) => {
      discussionModel.incrementReplyCount(discussionId);
      logAudit('discussion.reply', userId, { discussionId, replyId });
      return res.status(201).json({ success: true, message: 'Reply created successfully', data: { id: replyId } });
    })
    .catch((err) => sendError(res, err, 'Failed to create reply'));
}

function pinDiscussion(req, res) {
  const discussionId = parseInt(req.params.discussionId, 10);
  const userId = req.user?.id;

  discussionModel.findById(discussionId)
    .then((discussion) => {
      if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
      return discussionModel.update(discussionId, { is_pinned: !discussion.is_pinned }).then(() => {
        logAudit('discussion.pin', userId, { discussionId, pinned: !discussion.is_pinned });
        return res.json({ success: true, message: discussion.is_pinned ? 'Discussion unpinned' : 'Discussion pinned' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to pin discussion'));
}

function closeDiscussion(req, res) {
  const discussionId = parseInt(req.params.discussionId, 10);
  const userId = req.user?.id;

  discussionModel.findById(discussionId)
    .then((discussion) => {
      if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
      return discussionModel.update(discussionId, { is_closed: !discussion.is_closed }).then(() => {
        logAudit('discussion.close', userId, { discussionId, closed: !discussion.is_closed });
        return res.json({ success: true, message: discussion.is_closed ? 'Discussion reopened' : 'Discussion closed' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to close discussion'));
}

module.exports = {
  listDiscussions,
  getDiscussion,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  createReply,
  pinDiscussion,
  closeDiscussion,
};
