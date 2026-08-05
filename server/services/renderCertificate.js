const crypto = require('crypto');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs/promises');
const path = require('path');
const { CERTIFICATE_SECTIONS } = require('../shared/certificateSections');
const { absolutePathFromRelative, certificateRoot } = require('../config/uploads');

function wrapLine(text, font, size, maxWidth) {
  if (!text) return [''];
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(test, size);
    if (testWidth > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function xForAlign(align, xPercent, pageWidth, textWidth) {
  const anchorX = (xPercent / 100) * pageWidth;
  if (align === 'left') return anchorX;
  if (align === 'right') return anchorX - textWidth;
  return anchorX - textWidth / 2;
}

function pickFont(fonts, weight, style) {
  const isBold = weight === 'bold';
  const isItalic = style === 'italic';
  if (isBold && isItalic) return fonts.boldItalic;
  if (isBold) return fonts.bold;
  if (isItalic) return fonts.italic;
  return fonts.regular;
}

/**
 * @param {object} params
 * @param {object} params.template
 * @param {object} params.resolvedSections
 * @param {object[]} params.signatures - matched signature DB rows (image
 *   bytes/storage_path source only — see note below on why text does NOT
 *   come from here)
 * @param {boolean} [params.isPreview] - true for a raw template download
 *   (no recipient has been resolved yet). When true, dynamic sections
 *   (recipient_name, date) that have no text render a bracketed
 *   placeholder — e.g. "[Recipient Name]" — and still draw their
 *   underline, matching what CertificatePreviewCanvas.jsx shows in the
 *   editor. Never pass true for an actual issued certificate — a real
 *   PDF handed to a recipient should never show a placeholder bracket.
 */
async function renderCertificate({ template, resolvedSections, signatures, isPreview = false }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([template.width_px, template.height_px]);

  let frameBytes;
  if (template.frame_data) {
    frameBytes = template.frame_data;
  } else {
    const frameAbsPath = absolutePathFromRelative(template.frame_storage_path)
      || path.resolve(certificateRoot(), template.frame_storage_path);
    frameBytes = await fs.readFile(frameAbsPath);
  }
  const isPng = (template.frame_mime_type === 'image/png') ||
    (template.frame_filename || '').toLowerCase().endsWith('.png') ||
    (template.frame_storage_path || '').toLowerCase().endsWith('.png');
  const frameImage = isPng
    ? await pdfDoc.embedPng(frameBytes)
    : await pdfDoc.embedJpg(frameBytes);
  page.drawImage(frameImage, { x: 0, y: 0, width: template.width_px, height: template.height_px });

  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  // NOTE: pdf-lib's StandardFonts only cover Helvetica/Times/Courier —
  // custom web fonts (Playfair Display, Brush Script MT, Dancing Script,
  // etc.) still can't be matched here without embedding real .ttf/.otf
  // files via pdf-lib + fontkit.

  // ── Text sections ─────────────────────────────────────────────
  for (const section of CERTIFICATE_SECTIONS) {
    if (section.key === 'signatures_seal') continue;

    const data = resolvedSections?.[section.key];
    const showPlaceholder = isPreview && section.dynamic && !data?.text;

    if (!data?.text && !showPlaceholder) continue;

    const xPercent = data?.x_percent ?? section.xPercent ?? 50;
    const yPercent = data?.y_percent ?? section.yPercent ?? 50;
    const widthPercent = data?.width_percent ?? section.defaultWidthPercent ?? 80;
    const align = section.defaultAlign || 'center';
    const boxWidthPx = (widthPercent / 100) * template.width_px;

    let yPos = template.height_px - (yPercent / 100) * template.height_px;

    const displayText = data?.text || (showPlaceholder ? `[${section.label}]` : '');
    const rawLines = displayText.split('\n');

    rawLines.forEach((rawLine, idx) => {
      const isSecondTitleLine = section.key === 'title' && idx === 1;

      const size = isSecondTitleLine
        ? (data?.title_second_font_size || Math.round((data?.font_size ?? section.defaultFontSize) * 0.75))
        : (data?.font_size ?? section.defaultFontSize);

      const weight = isSecondTitleLine
        ? (data?.title_second_font_weight || 'normal')
        : (data?.font_weight || 'normal');

      const style = isSecondTitleLine
        ? (data?.title_second_font_style || 'normal')
        : (data?.font_style || 'normal');

      const font = pickFont(fonts, weight, style);
      const lineHeight = data?.line_height || section.defaultLineHeight || 1.4;

      const wrapped = wrapLine(rawLine.trim(), font, size, boxWidthPx);

      wrapped.forEach((line, lineIdx) => {
        const isLastRenderedLine = idx === rawLines.length - 1 && lineIdx === wrapped.length - 1;

        if (!line) {
          yPos -= size * lineHeight;
          return;
        }

        const textWidth = font.widthOfTextAtSize(line, size);
        const x = xForAlign(align, xPercent, template.width_px, textWidth);

        page.drawText(line, {
          x,
          y: yPos,
          size,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });

        // Matches the frontend's borderBottom under recipient_name.
        if (section.underline && isLastRenderedLine) {
          page.drawLine({
            start: { x, y: yPos - 4 },
            end: { x: x + textWidth, y: yPos - 4 },
            thickness: 0.75,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        yPos -= size * lineHeight;
      });
    });
  }

  // ── Signatures & seal ─────────────────────────────────────────
  // Iterate resolvedSections.signatures_seal.items (the per-template
  // slots configured in the editor) rather than the independently
  // fetched `signatures` array — `items` carries each slot's own
  // signer_name/position_title and its intended order, which
  // `signatures` alone does not. `signatures` is used only as a lookup
  // for image bytes, keyed by signature_id.
  const sigSection = CERTIFICATE_SECTIONS.find((s) => s.key === 'signatures_seal');
  const sigData = resolvedSections?.signatures_seal;
  const items = Array.isArray(sigData?.items) ? sigData.items : [];

  if (items.length > 0) {
    const sigXPercent = sigData?.x_percent ?? sigSection.xPercent ?? 84;
    const sigYPercent = sigData?.y_percent ?? sigSection.yPercent ?? 85;
    const sigWidthPercent = sigData?.width_percent ?? sigSection.defaultWidthPercent ?? 32;

    const bandY = template.height_px - (sigYPercent / 100) * template.height_px;
    const bandWidthPx = (sigWidthPercent / 100) * template.width_px;
    const bandRightX = (sigXPercent / 100) * template.width_px;
    const bandStartX = bandRightX - bandWidthPx;

    const slotWidth = bandWidthPx / items.length;
    const imgWidth = Math.min(100, slotWidth - 10);
    const imgHeight = imgWidth * 0.4;
    const labelFont = fonts.regular;
    const sigFontSize = sigData?.font_size ?? sigSection.defaultFontSize ?? 13;
    const labelSize = sigFontSize;
    const subLabelSize = Math.max(Math.round(sigFontSize * 0.75), 10);

    // Coerce to string on both sides — DB driver / JSON round-trip can
    // leave one side as a number and the other as a string, which would
    // otherwise silently drop every slot from matching (the bug you hit).
    const signaturesById = new Map((signatures || []).map((s) => [String(s.id), s]));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const slotCenterX = bandStartX + slotWidth * i + slotWidth / 2;
      const sigRecord = item.signature_id ? signaturesById.get(String(item.signature_id)) : null;

      if (sigRecord) {
        try {
          // Prefer BLOB data stored in the DB; fall back to the file on disk
          // so signatures whose file was lost (or never persisted to disk)
          // still render in the PDF.
          let sigBytes;
          if (sigRecord.signature_data) {
            sigBytes = sigRecord.signature_data;
          } else if (sigRecord.storage_path) {
            const sigAbsPath = absolutePathFromRelative(sigRecord.storage_path)
              || path.resolve(certificateRoot(), sigRecord.storage_path);
            sigBytes = await fs.readFile(sigAbsPath);
          }

          if (sigBytes) {
            const sigImage = await pdfDoc.embedPng(sigBytes);
            page.drawImage(sigImage, {
              x: slotCenterX - imgWidth / 2,
              y: bandY,
              width: imgWidth,
              height: imgHeight,
            });
          }
        } catch (err) {
          // A missing/corrupt signature image shouldn't take down the
          // whole PDF — skip just the image, still render the name/title
          // below so the slot isn't silently and totally blank.
          console.error(`Failed to embed signature image (signature_id=${item.signature_id}):`, err.message);
        }
      }

      const name = item.signer_name || item.label || sigRecord?.label || '';
      if (name) {
        const nameWidth = labelFont.widthOfTextAtSize(name, labelSize);
        page.drawText(name, {
          x: slotCenterX - nameWidth / 2,
          y: bandY - 14,
          size: labelSize,
          font: labelFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        page.drawLine({
          start: { x: slotCenterX - imgWidth / 2, y: bandY - 20 },
          end: { x: slotCenterX + imgWidth / 2, y: bandY - 20 },
          thickness: 0.75,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      const positionTitle = item.position_title || '';
      if (positionTitle) {
        const posWidth = labelFont.widthOfTextAtSize(positionTitle, subLabelSize);
        page.drawText(positionTitle, {
          x: slotCenterX - posWidth / 2,
          y: bandY - 34,
          size: subLabelSize,
          font: labelFont,
          color: rgb(0.35, 0.35, 0.35),
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();

  const pdfFilename = `certificate-${crypto.randomUUID()}.pdf`;
  const pdfDir = path.join(certificateRoot(), 'issuances');
  await fs.mkdir(pdfDir, { recursive: true });
  const pdfAbsPath = path.join(pdfDir, pdfFilename);
  const pdfRelativePath = path.posix.join('certificates', 'issuances', pdfFilename);

  await fs.writeFile(pdfAbsPath, pdfBytes);

  return {
    pdf_storage_path: pdfRelativePath,
    pdf_bytes: pdfBytes,
  };
}

module.exports = { renderCertificate };