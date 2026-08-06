const crypto = require('crypto');
const certificateIssuanceModel = require('../models/certificateIssuanceModel');
const certificateTemplateModel = require('../models/certificateTemplateModel');
const certificateSignatureModel = require('../models/certificateSignatureModel');
const { resolveDynamicSections } = require('../shared/certificateSections');
const { logAudit } = require('../utils/auditLogger');
const { validateIssuancePayload } = require('../validators/certificateIssuanceValidator');
const { renderCertificate } = require('./renderCertificate');

async function listIssuancesByUser(userId, filters = {}) {
  const { status, page = 1, limit = 20 } = filters;
  return certificateIssuanceModel.findAll({
    user_id: userId,
    status,
    page,
    limit,
  });
}

async function getIssuanceByCertificateNumber(certificateNumber) {
  const issuance = certificateIssuanceModel.findByCertificateNumber(certificateNumber);
  if (!issuance) {
    const error = new Error('Certificate not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return issuance;
}

async function issueCertificate(payload, actorId) {
  const validation = validateIssuancePayload(payload);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  const { template_id, user_id, overrides } = validation.value;

  const template = await certificateTemplateModel.findByIdentifier(template_id);
  if (!template) {
    const error = new Error('Certificate template not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (template.status !== 'active') {
    const error = new Error('Template is not active. Only active templates can be issued.');
    error.code = 'TEMPLATE_INACTIVE';
    throw error;
  }

  if (template.is_deleted) {
    const error = new Error('Template has been deleted');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const sections = typeof template.sections === 'string'
    ? JSON.parse(template.sections)
    : template.sections;

  const resolvedSections = resolveDynamicSections(sections, overrides || {});

  const signatureIds = sections.signatures_seal?.items?.map(item => item.signature_id).filter(Boolean) || [];
  const signatures = await certificateSignatureModel.findAll({});
  const matchedSignatures = signatures.filter(s => signatureIds.includes(s.id));

  const certificateNumber = crypto.randomUUID();

  let renderResult;
  try {
    renderResult = await renderCertificate({
      template,
      resolvedSections,
      signatures: matchedSignatures,
      certificateNumber,
    });
  } catch (err) {
    console.error('Certificate render error:', err);
    const error = new Error('Failed to render certificate PDF');
    error.code = 'RENDER_ERROR';
    throw error;
  }

  const issuanceId = await certificateIssuanceModel.create({
    certificate_number: certificateNumber,
    template_id: template.id,
    user_id,
    resolved_sections: resolvedSections,
    pdf_storage_path: renderResult.pdf_storage_path,
    status: 'active',
    issued_by: actorId,
    title: template.name,
    data_snapshot: resolvedSections,
  });

  logAudit({
    user_id: actorId,
    action: 'certificate.issued',
    entity_type: 'certificate_issuance',
    entity_id: issuanceId,
    metadata: {
      certificate_number: certificateNumber,
      template_id: template.id,
      user_id,
    },
  });

  return await certificateIssuanceModel.findById(issuanceId);
}

async function revokeIssuance(id, actorId) {
  const issuance = await certificateIssuanceModel.findById(id);
  if (!issuance) {
    const error = new Error('Certificate issuance not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (issuance.status === 'revoked') {
    const error = new Error('Certificate is already revoked');
    error.code = 'INVALID_TRANSITION';
    throw error;
  }

  certificateIssuanceModel.updateStatus(id, 'revoked', new Date());

  logAudit({
    user_id: actorId,
    action: 'certificate.revoked',
    entity_type: 'certificate_issuance',
    entity_id: id,
    metadata: { certificate_number: issuance.certificate_number },
  });

  return await certificateIssuanceModel.findById(id);
}

module.exports = {
  listIssuancesByUser,
  getIssuanceByCertificateNumber,
  issueCertificate,
  revokeIssuance,
};
