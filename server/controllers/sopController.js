const path = require('path');
const PDFDocument = require('pdfkit');
const sopService = require('../services/sopService');
const sopModuleService = require('../services/sopModuleService');
const sopAttachmentService = require('../services/sopAttachmentService');
const sopModuleAttachmentModel = require('../models/sopModuleAttachmentModel');
const sopVersionService = require('../services/sopVersionService');
const sopWorkflowService = require('../services/sopWorkflowService');
const sopAuditLogService = require('../services/sopAuditLogService');
const sopShareService = require('../services/sopShareService');
const sopAssignmentService = require('../services/sopAssignmentService');
const sopAcknowledgementService = require('../services/sopAcknowledgementService');
const approvalWorkflowController = require('../controllers/approvalWorkflowController');
const { validateShareLinkPayload } = require('../validators/sopShareValidator');

function handleError(res, error) {
  const code = error.code || 'INTERNAL_ERROR';
  const status = error.status || (
    code === 'NOT_FOUND' ? 404 :
    code === 'VALIDATION_ERROR' ? 400 :
    code === 'CODE_EXISTS' ? 409 :
    code === 'UNAUTHORIZED' ? 403 :
    code === 'FORBIDDEN' ? 403 :
    code === 'APPROVAL_PENDING' ? 400 :
    code === 'INVALID_TRANSITION' ? 400 :
    code === 'INVALID_SOP_STATUS' ? 400 :
    code === 'WORKFLOW_NOT_FOUND' ? 404 :
    code === 'DUPLICATE_ACKNOWLEDGEMENT' ? 409 :
    code === 'DUPLICATE_ASSIGNMENT' ? 409 :
    500
  );
  res.status(status).json({ success: false, error: { code, message: error.message } });
}

const sopController = {
  async list(req, res) {
    try {
      const result = await sopService.listSops({ ...req.query, user: req.user });
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getById(req, res) {
    try {
      const result = await sopService.getSopById(parseInt(req.params.id, 10), req.user);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const { title, department_id } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } });
      }
      const result = await sopService.createSop(req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'SOP created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req, res) {
    try {
      const result = await sopService.updateSop(parseInt(req.params.id, 10), req.body, req.user.id);
      res.json({ success: true, data: result, message: 'SOP updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await sopService.deleteSop(parseInt(req.params.id, 10), req.user.id);
      res.json({ success: true, data: result, message: 'SOP deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getStats(req, res) {
    try {
      const result = await sopService.getSopStats();
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listTrashed(req, res) {
    try {
      const result = await sopService.listTrashedSops(req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async restore(req, res) {
    try {
      const result = await sopService.restoreSop(parseInt(req.params.id, 10), req.user.id);
      res.json({ success: true, data: result, message: 'SOP restored successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async permanentDelete(req, res) {
    try {
      const result = await sopService.permanentDeleteSop(parseInt(req.params.id, 10), req.user.id);
      res.json({ success: true, data: result, message: 'SOP permanently deleted' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async emptyTrash(req, res) {
    try {
      const result = await sopService.emptyTrash(req.user.id);
      res.json({ success: true, data: result, message: 'Trash emptied successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const moduleController = {
  async list(req, res) {
    try {
      const versionIdParam = req.query.versionId;
      const versionId = versionIdParam ? parseInt(versionIdParam, 10) : null;
      const result = await sopModuleService.listModules(
        parseInt(req.params.sopId, 10),
        versionId
      );
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopModuleService.createModule(parseInt(req.params.sopId, 10), req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'Module created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req, res) {
    try {
      const result = await sopModuleService.updateModule(
        parseInt(req.params.moduleId, 10),
        req.body,
        req.user.id
      );
      res.json({ success: true, data: result, message: 'Module updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await sopModuleService.deleteModule(parseInt(req.params.moduleId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Module deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateSortOrder(req, res) {
    try {
      const result = await sopModuleService.updateSortOrder(parseInt(req.params.sopId, 10), req.body.moduleOrders, req.user.id);
      res.json({ success: true, data: result, message: 'Sort order updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listTrashed(req, res) {
    try {
      const result = await sopModuleService.listTrashedModules(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async restore(req, res) {
    try {
      const result = await sopModuleService.restoreModule(parseInt(req.params.moduleId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Module restored successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async permanentDelete(req, res) {
    try {
      const result = await sopModuleService.permanentDeleteModule(parseInt(req.params.moduleId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Module permanently deleted' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const attachmentController = {
  async list(req, res) {
    try {
      const result = await sopAttachmentService.listAttachments(parseInt(req.params.moduleId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async upload(req, res) {
    try {
      const file = req.file;
      const result = await sopAttachmentService.uploadAttachment(
        parseInt(req.params.moduleId, 10),
        {
          file_name: file.filename,
          original_name: file.originalname,
          mime_type: file.mimetype,
          file_size: file.size,
          file_extension: path.extname(file.originalname).toLowerCase(),
          file_data: file.buffer,
        },
        req.user.id,
        req
      );
      res.status(201).json({ success: true, data: result, message: 'Attachment uploaded successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async createLink(req, res) {
    try {
      const { link_url, link_title } = req.body;
      if (!link_url || !link_url.trim()) {
        return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Link URL is required" } });
      }
      const result = await sopAttachmentService.createLink(
        parseInt(req.params.moduleId, 10),
        { link_url, link_title },
        req.user.id
      );
      res.status(201).json({ success: true, data: result, message: 'Link added successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await sopAttachmentService.deleteAttachment(parseInt(req.params.attachmentId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Attachment deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listTrashed(req, res) {
    try {
      const result = await sopAttachmentService.listTrashedAttachments(parseInt(req.params.moduleId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async restore(req, res) {
    try {
      const result = await sopAttachmentService.restoreAttachment(parseInt(req.params.attachmentId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Attachment restored successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async permanentDelete(req, res) {
    try {
      const result = await sopAttachmentService.permanentDeleteAttachment(parseInt(req.params.attachmentId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Attachment permanently deleted' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const versionController = {
  async getById(req, res) {
    try {
      const result = await sopVersionService.getVersionById(parseInt(req.params.versionId, 10));
      if (!result) {
        const error = new Error('Version not found');
        error.code = 'NOT_FOUND';
        throw error;
      }
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async list(req, res) {
    try {
      const result = await sopVersionService.listVersions(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopVersionService.createVersion(parseInt(req.params.sopId, 10), req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'Version created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async restore(req, res) {
    try {
      const result = await sopVersionService.restoreVersion(parseInt(req.params.sopId, 10), parseInt(req.params.versionId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'Version restored successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const workflowController = {
  async transition(req, res) {
    try {
      const body = req.body || {};
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), body.status, req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'Workflow transition completed' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async submit(req, res) {
    try {
      const body = req.body || {};
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), 'For Review', req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'SOP submitted for review' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async approve(req, res) {
    try {
      const body = req.body || {};
      // Only admin or super_admin can approve
      if (!['admin', 'super_admin'].includes(req.user?.role)) {
        const error = new Error('Only admin or super_admin can approve SOPs');
        error.code = 'UNAUTHORIZED';
        throw error;
      }
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), 'Approved', req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'SOP approved' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async reject(req, res) {
    try {
      const body = req.body || {};
      // Only admin or super_admin can reject
      if (!['admin', 'super_admin'].includes(req.user?.role)) {
        const error = new Error('Only admin or super_admin can reject SOPs');
        error.code = 'UNAUTHORIZED';
        throw error;
      }
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), 'Draft', req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'SOP rejected and returned to draft' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async publish(req, res) {
    try {
      const body = req.body || {};
      const result = await sopWorkflowService.transitionSop(parseInt(req.params.sopId, 10), 'Published', req.user.id, { comment: body.comment || null });
      res.json({ success: true, data: result, message: 'SOP published successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const auditController = {
  async list(req, res) {
    try {
      const result = await sopAuditLogService.listAuditLogs(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const shareController = {
  async list(req, res) {
    try {
      const result = await sopShareService.listShares(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopShareService.createShare(
        parseInt(req.params.sopId, 10),
        req.body,
        req.user.id
      );
      res.status(201).json({ success: true, data: result, message: 'Share created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async createLink(req, res) {
    try {
      const validation = validateShareLinkPayload(req.body);
      if (!validation.valid) {
        const error = new Error(validation.message);
        error.code = 'VALIDATION_ERROR';
        error.details = validation.details;
        throw error;
      }

      const result = await sopShareService.createShareLink(
        parseInt(req.params.sopId, 10),
        validation,
        req.user
      );
      res.status(201).json({ success: true, data: result, message: 'Share link created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async revoke(req, res) {
    try {
      const result = await sopShareService.revokeShare(
        parseInt(req.params.shareId, 10),
        req.user.id
      );
      res.json({ success: true, data: result, message: 'Share link revoked' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const assignmentController = {
  async list(req, res) {
    try {
      const result = await sopAssignmentService.listAssignments(parseInt(req.params.sopId, 10));
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopAssignmentService.createAssignment(parseInt(req.params.sopId, 10), req.body, req.user.id);
      res.status(201).json({ success: true, data: result, message: 'Assignment created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await sopAssignmentService.deleteAssignment(parseInt(req.params.id, 10));
      res.json({ success: true, data: result, message: 'Assignment deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

const acknowledgementController = {
  async list(req, res) {
    try {
      const result = await sopAcknowledgementService.listAcknowledgements(parseInt(req.params.sopId, 10), { status: req.query.status || undefined });
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await sopAcknowledgementService.createAcknowledgement(parseInt(req.params.sopId, 10), parseInt(req.body.user_id, 10), req.body.status || 'Pending');
      res.status(201).json({ success: true, data: result, message: 'Acknowledgement created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async acknowledge(req, res) {
    try {
      const result = await sopAcknowledgementService.acknowledgeSop(parseInt(req.params.sopId, 10), req.user.id);
      res.json({ success: true, data: result, message: 'SOP acknowledged successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

/**
 * ---- PDF export styling constants ----
 */
const PDF_COLORS = {
  accent: '#1F4E8C',
  accentDark: '#173D6E',
  text: '#1A1A1A',
  muted: '#6B7280',
  border: '#E2E8F0',
  lightBg: '#F1F5F9',
  white: '#FFFFFF',
};

const STATUS_COLORS = {
  Draft: '#9CA3AF',
  'In Review': '#D97706',
  Active: '#16A34A',
  Approved: '#16A34A',
  Archived: '#6B7280',
  Deprecated: '#DC2626',
};

function getStatusColor(status) {
  return STATUS_COLORS[status] || PDF_COLORS.muted;
}

function contentWidthOf(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

/** Keeps a block of content from being orphaned at the bottom of a page. */
function ensureSpace(doc, minHeight) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + minHeight > bottom) {
    doc.addPage();
  }
}

/**
 * Draws the full-width cover header (title, code, status pill) used at the
 * top of the first page.
 */
function drawCoverHeader(doc, sop) {
  const bandHeight = 96;
  const pageWidth = doc.page.width;

  doc.rect(0, 0, pageWidth, bandHeight).fill(PDF_COLORS.accent);

  doc.fillColor(PDF_COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(sop.title || 'SOP', doc.page.margins.left, 26, {
      width: pageWidth - doc.page.margins.left - doc.page.margins.right - 110,
    });

  if (sop.code) {
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor('#D6E4F5')
      .text(sop.code, doc.page.margins.left, 58);
  }

  if (sop.status) {
    const label = String(sop.status);
    doc.font('Helvetica-Bold').fontSize(9);
    const pillPaddingX = 10;
    const pillWidth = doc.widthOfString(label) + pillPaddingX * 2;
    const pillHeight = 20;
    const pillX = pageWidth - doc.page.margins.right - pillWidth;
    const pillY = 28;
    doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 10).fill(getStatusColor(sop.status));
    doc.fillColor(PDF_COLORS.white).text(label, pillX, pillY + 5, {
      width: pillWidth,
      align: 'center',
    });
  }

  doc.fillColor(PDF_COLORS.text);
  doc.y = bandHeight + 24;
  doc.x = doc.page.margins.left;
}

/** Slim continuation header drawn on every page after the first. */
function drawContinuationHeader(doc, sop) {
  const pageWidth = doc.page.width;
  doc.rect(0, 0, pageWidth, 6).fill(PDF_COLORS.accent);

  doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.muted)
    .text(sop.code || '', doc.page.margins.left, 18, { continued: false });

  doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.muted)
    .text(sop.title || 'SOP', doc.page.margins.left, 18, {
      width: pageWidth - doc.page.margins.left - doc.page.margins.right,
      align: 'right',
    });

  doc.fillColor(PDF_COLORS.text);
  doc.y = 40;
  doc.x = doc.page.margins.left;
}

/** Renders SOP metadata as a bordered two-column info box. */
function drawMetadataBox(doc, metaFields) {
  if (!metaFields.length) return;

  const startX = doc.page.margins.left;
  const width = contentWidthOf(doc);
  const colWidth = width / 2;
  const rowHeight = 32;
  const padding = 14;
  const rows = Math.ceil(metaFields.length / 2);
  const boxHeight = rows * rowHeight + padding * 2;

  ensureSpace(doc, boxHeight + 20);
  const startY = doc.y;

  doc.roundedRect(startX, startY, width, boxHeight, 4).fill(PDF_COLORS.lightBg);
  doc.roundedRect(startX, startY, width, boxHeight, 4).lineWidth(1).stroke(PDF_COLORS.border);

  metaFields.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + padding + col * colWidth;
    const y = startY + padding + row * rowHeight;
    const colInnerWidth = colWidth - padding * 2;

    doc.fillColor(PDF_COLORS.muted).font('Helvetica-Bold').fontSize(8)
      .text(label.toUpperCase(), x, y, { width: colInnerWidth });
    doc.fillColor(PDF_COLORS.text).font('Helvetica').fontSize(10)
      .text(String(value), x, y + 12, { width: colInnerWidth });
  });

  doc.fillColor(PDF_COLORS.text);
  doc.x = startX;
  doc.y = startY + boxHeight + 20;
}

/** Section heading with a small accent underline. */
function drawSectionHeading(doc, label) {
  ensureSpace(doc, 40);
  const startX = doc.page.margins.left;
  doc.fillColor(PDF_COLORS.text).font('Helvetica-Bold').fontSize(13).text(label, startX, doc.y);
  const lineY = doc.y + 4;
  doc.moveTo(startX, lineY).lineTo(startX + 36, lineY).lineWidth(2).stroke(PDF_COLORS.accent);
  doc.moveDown(1.2);
  doc.x = startX;
  doc.fillColor(PDF_COLORS.text);
}

/**
 * Render SOP module HTML content into a PDF document, embedding images
 * from the imageCache (Map of attachmentId -> { data, mime }).
 * Returns true if any content was rendered, false otherwise.
 */
function renderModuleContentForPdf(html, imageCache, doc) {
  // Split HTML into text segments and <img> tags
  const imgTagRegex = /(<img[^>]+>)/g;
  const parts = html.split(imgTagRegex);
  let hasContent = false;
  const startX = doc.page.margins.left;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check if this part is an <img> tag
    const imgMatch = trimmed.match(/<img[^>]+src="([^"]+)"[^>]*>/);
    if (imgMatch) {
      const src = imgMatch[1];
      const idMatch = src.match(/\/api\/sops\/attachments\/(\d+)\/file/);
      if (idMatch) {
        const attId = parseInt(idMatch[1], 10);
        const image = imageCache.get(attId);
        if (image) {
          try {
            const maxWidth = contentWidthOf(doc);
            const maxHeight = 300;

            // doc.image()/{fit:...} does NOT auto-paginate — it just draws
            // at the current y, so a tall image can run straight through
            // the bottom margin and overlap the footer/next content. Work
            // out the actual scaled height up front so ensureSpace can
            // trigger a real page break when it won't fit.
            let renderHeight = maxHeight;
            try {
              const dims = doc.openImage(image.data);
              if (dims && dims.width && dims.height) {
                const scale = Math.min(maxWidth / dims.width, maxHeight / dims.height, 1);
                renderHeight = dims.height * scale;
              }
            } catch {
              // Unknown dims — fall back to the worst-case (max) height.
            }

            ensureSpace(doc, renderHeight + 16);
            doc.image(image.data, {
              fit: [maxWidth, maxHeight],
              align: 'center',
            });
            doc.x = startX;
            doc.moveDown(0.5);
            hasContent = true;
          } catch {
            // Skip images that can't be embedded
          }
        }
      }
      continue;
    }

    // Plain text segment — strip remaining HTML tags
    const text = trimmed
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    if (text) {
      doc.fillColor(PDF_COLORS.text).fontSize(10).font('Helvetica')
        .text(text, startX, doc.y, { width: contentWidthOf(doc), align: 'justify', lineGap: 4 });
      doc.x = startX;
      hasContent = true;
    }
  }

  return hasContent;
}

/** Draws the "Page X of Y" / generated-on footer on the given (already active) page. */
function drawFooter(doc, sop, pageNumber, totalPages) {
  const pageWidth = doc.page.width;
  const bottomY = doc.page.height - doc.page.margins.bottom + 14;
  const startX = doc.page.margins.left;
  const width = contentWidthOf(doc);

  doc.moveTo(startX, bottomY - 8).lineTo(startX + width, bottomY - 8)
    .lineWidth(0.5).stroke(PDF_COLORS.border);

  // Text placed in the footer sits below the normal content margin, which
  // would otherwise make pdfkit think the text overflows the page and
  // silently insert a new blank page. Widen the bottom margin for the
  // duration of these two calls, then restore it.
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.muted)
    .text(`Generated ${new Date().toLocaleDateString()}`, startX, bottomY, {
      width: width / 2,
      lineBreak: false,
    });

  doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.muted)
    .text(`Page ${pageNumber} of ${totalPages}`, startX, bottomY, {
      width,
      align: 'right',
      lineBreak: false,
    });

  doc.page.margins.bottom = originalBottomMargin;
  doc.fillColor(PDF_COLORS.text);
}

const exportController = {
  async exportPdf(req, res) {
    try {
      const sopId = parseInt(req.params.id, 10);
      const sop = await sopService.getSopById(sopId, req.user);
      if (!sop) {
        const error = new Error('SOP not found');
        error.code = 'NOT_FOUND';
        throw error;
      }

      const versionId = req.query.versionId
        ? parseInt(req.query.versionId, 10)
        : (sop.current_version_id || null);
      const modules = await sopModuleService.listModules(sopId, versionId);

      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      const filename = `SOP-${sop.code || sop.id}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      doc.pipe(res);

      // The constructor already created page 1 before this listener is
      // attached, so every 'pageAdded' event from here on is page 2+ —
      // each of those gets the slim continuation header.
      doc.on('pageAdded', () => {
        drawContinuationHeader(doc, sop);
      });

      drawCoverHeader(doc, sop);

      // Metadata box
      const metaFields = [];
      if (sop.status) metaFields.push(['Status', sop.status]);
      if (sop.department_name) metaFields.push(['Department', sop.department_name]);
      if (sop.category_name) metaFields.push(['Category', sop.category_name]);
      if (sop.owner_name) metaFields.push(['Owner', sop.owner_name]);
      if (sop.created_at) metaFields.push(['Created', new Date(sop.created_at).toLocaleDateString()]);
      if (sop.updated_at) metaFields.push(['Updated', new Date(sop.updated_at).toLocaleDateString()]);
      drawMetadataBox(doc, metaFields);

      // Description
      if (sop.description) {
        drawSectionHeading(doc, 'Description');
        doc.fillColor(PDF_COLORS.text).fontSize(10).font('Helvetica')
          .text(sop.description, doc.page.margins.left, doc.y, {
            width: contentWidthOf(doc),
            align: 'justify',
          });
        doc.x = doc.page.margins.left;
        doc.moveDown(1.5);
      }

      // Pre-fetch all images referenced in module content
      const imageCache = new Map();
      const imgSrcRegex = /<img[^>]+src="([^"]+)"/g;
      const attachmentIdRegex = /\/api\/sops\/attachments\/(\d+)\/file/;

      if (modules && modules.length > 0) {
        const attachmentIds = new Set();
        modules.forEach((module) => {
          if (!module.content) return;
          let match;
          while ((match = imgSrcRegex.exec(module.content)) !== null) {
            const src = match[1];
            const idMatch = src.match(attachmentIdRegex);
            if (idMatch) {
              attachmentIds.add(parseInt(idMatch[1], 10));
            }
          }
        });

        for (const attId of attachmentIds) {
          try {
            const attachment = await sopModuleAttachmentModel.getById(attId);
            if (attachment && attachment.file_data && attachment.mime_type) {
              imageCache.set(attId, {
                data: attachment.file_data,
                mime: attachment.mime_type,
              });
            }
          } catch {
            // Skip attachments that can't be loaded
          }
        }
      }

      // Modules
      drawSectionHeading(doc, 'Modules');

      if (modules && modules.length > 0) {
        modules.forEach((module, index) => {
          ensureSpace(doc, 70);

          const startX = doc.page.margins.left;
          const width = contentWidthOf(doc);
          const badgeSize = 22;
          const titleY = doc.y;

          doc.fillColor(PDF_COLORS.accent)
            .circle(startX + badgeSize / 2, titleY + badgeSize / 2, badgeSize / 2)
            .fill();
          doc.fillColor(PDF_COLORS.white).font('Helvetica-Bold').fontSize(10)
            .text(String(index + 1), startX, titleY + 6, { width: badgeSize, align: 'center' });

          doc.fillColor(PDF_COLORS.text).font('Helvetica-Bold').fontSize(11.5)
            .text(module.title || 'Untitled', startX + badgeSize + 10, titleY + 4, {
              width: width - badgeSize - 10,
            });

          doc.x = startX;
          doc.y = Math.max(doc.y, titleY + badgeSize) + 10;

          if (module.content) {
            const rendered = renderModuleContentForPdf(module.content, imageCache, doc);
            if (!rendered) {
              doc.fillColor(PDF_COLORS.muted).fontSize(9).font('Helvetica')
                .text('(No text content)', startX, doc.y, { width, align: 'center' });
              doc.x = startX;
            }
          }

          if (index < modules.length - 1) {
            doc.moveDown(1);
            ensureSpace(doc, 20);
            doc.moveTo(startX, doc.y).lineTo(startX + width, doc.y)
              .lineWidth(0.5).stroke(PDF_COLORS.border);
            doc.moveDown(1.5);
          }
          doc.fillColor(PDF_COLORS.text);
        });
      } else {
        doc.fillColor(PDF_COLORS.muted).fontSize(9).font('Helvetica')
          .text('No modules in this SOP.', { align: 'center' });
        doc.fillColor(PDF_COLORS.text);
      }

      // Stamp page numbers / footer on every page now that content is final.
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        drawFooter(doc, sop, i + 1, range.count);
      }

      doc.end();
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = {
  sopController,
  moduleController,
  attachmentController,
  versionController,
  workflowController,
  auditController,
  shareController,
  assignmentController,
  acknowledgementController,
  approvalWorkflowController,
  exportController,
};