const crypto = require('crypto');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs/promises');
const path = require('path');
const { CERTIFICATE_SECTIONS } = require('../shared/certificateSections');
const { absolutePathFromRelative, certificateRoot } = require('../config/uploads');

async function renderCertificate({ template, resolvedSections, signatures }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([template.width_px, template.height_px]);

  const frameBytes = await fs.readFile(
    path.resolve(certificateRoot(), template.frame_storage_path)
  );
  const frameImage = template.frame_storage_path.toLowerCase().endsWith('.png')
    ? await pdfDoc.embedPng(frameBytes)
    : await pdfDoc.embedJpg(frameBytes);
  page.drawImage(frameImage, { x: 0, y: 0, width: template.width_px, height: template.height_px });

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const section of CERTIFICATE_SECTIONS) {
    if (section.key === 'signatures_seal') continue;
    const data = resolvedSections?.[section.key];
    if (!data?.text) continue;

    const font = data.font_weight === 'bold' ? boldFont : regularFont;
    const size = data.font_size ?? section.defaultFontSize;
    const lineHeight = data.line_height || section.defaultLineHeight || 1.4;

    // Basic multiline handling: split on \n and draw each line with lineHeight spacing.
    const lines = data.text.split('\n');
    // Start drawing from the nominal Y position and move down per line
    let yPos = template.height_px - (section.yPercent / 100) * template.height_px;

    // Center each line horizontally within the page or use x_percent if provided in data
    for (const line of lines) {
      const trimmed = String(line || '').trim();
      if (!trimmed) {
        yPos -= size * lineHeight;
        continue;
      }
      const textWidth = font.widthOfTextAtSize(trimmed, size);
      const x = (template.width_px - textWidth) / 2;
      page.drawText(trimmed, {
        x,
        y: yPos,
        size,
        font,
        color: rgb(0, 0, 0),
      });
      yPos -= size * lineHeight;
    }
  }

  // signatures & seal — evenly spaced across a fixed band
  const sigSection = CERTIFICATE_SECTIONS.find(s => s.key === 'signatures_seal');
  const bandY = template.height_px - (sigSection.yPercent / 100) * template.height_px;
  const slotWidth = template.width_px / Math.max(signatures.length, 1);

  for (let i = 0; i < signatures.length; i++) {
    const sigBytes = await fs.readFile(
      path.resolve(certificateRoot(), signatures[i].storage_path)
    );
    const sigImage = await pdfDoc.embedPng(sigBytes);
    page.drawImage(sigImage, {
      x: slotWidth * i + slotWidth / 2 - 90,
      y: bandY,
      width: 180,
      height: 60,
    });
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
