const crypto = require('crypto');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs/promises');
const path = require('path');
const { CERTIFICATE_SECTIONS } = require('../shared/certificateSections');
const { absolutePathFromRelative, certificateRoot } = require('../config/uploads');

const FONT_MAP = {
  "'Playfair Display', Georgia, 'Times New Roman', serif": StandardFonts.TimesRoman,
  'Georgia, "Times New Roman", serif': StandardFonts.TimesRoman,
  "'Merriweather', Georgia, serif": StandardFonts.TimesRoman,
  'Inter, system-ui, -apple-system, sans-serif': StandardFonts.Helvetica,
  'Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif': StandardFonts.Helvetica,
  "'Helvetica Neue', Arial, sans-serif": StandardFonts.Helvetica,
  'Montserrat, sans-serif': StandardFonts.Helvetica,
  "'Brush Script MT', 'Segoe Script', cursive": StandardFonts.Helvetica,
  "'Dancing Script', cursive": StandardFonts.Helvetica,
  "'Courier New', monospace": StandardFonts.Courier,
  'inherit': StandardFonts.Helvetica,
};

function resolveFont(fontFamily) {
  return FONT_MAP[fontFamily] || StandardFonts.Helvetica;
}

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
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const fontCache = {};

  function getFont(fontFamily, weight) {
    const cacheKey = `${fontFamily}-${weight}`;
    if (fontCache[cacheKey]) return fontCache[cacheKey];

    const baseFont = resolveFont(fontFamily);
    let font = baseFont;
    if (weight === 'bold') {
      if (baseFont === StandardFonts.Helvetica) font = boldFont;
      else if (baseFont === StandardFonts.TimesRoman) font = timesBoldFont;
      else if (baseFont === StandardFonts.Courier) font = courierFont;
    }
    fontCache[cacheKey] = font;
    return font;
  }

  for (const section of CERTIFICATE_SECTIONS) {
    if (section.key === 'signatures_seal') continue;
    const data = resolvedSections?.[section.key];
    if (!data?.text) continue;

    const fontFamily = data.font_family || section.defaultFontFamily || 'inherit';
    const fontWeight = data.font_weight || section.defaultWeight || 'normal';
    const font = getFont(fontFamily, fontWeight);
    const size = data.font_size ?? section.defaultFontSize;
    const lineHeight = data.line_height || section.defaultLineHeight || 1.4;
    const xPercent = data.x_percent ?? section.xPercent ?? 50;
    const textAlign = data.text_align || section.defaultAlign || 'center';
    const widthPercent = data.width_percent ?? section.defaultWidthPercent ?? 80;

    const lines = data.text.split('\n');
    const totalHeight = lines.length * size * lineHeight;
    let yPos = template.height_px - (section.yPercent / 100) * template.height_px - totalHeight + size;

    const maxWidth = (widthPercent / 100) * template.width_px;

    for (const line of lines) {
      const trimmed = String(line || '').trim();
      if (!trimmed) {
        yPos += size * lineHeight;
        continue;
      }

      const textWidth = font.widthOfTextAtSize(trimmed, size);
      let x;
      if (textAlign === 'left') {
        x = (xPercent / 100) * template.width_px;
      } else if (textAlign === 'right') {
        x = (xPercent / 100) * template.width_px - textWidth;
      } else {
        x = (xPercent / 100) * template.width_px - textWidth / 2;
      }

      page.drawText(trimmed, {
        x: Math.max(0, Math.min(x, template.width_px - textWidth)),
        y: yPos,
        size,
        font,
        color: rgb(0, 0, 0),
        maxWidth,
      });
      yPos += size * lineHeight;
    }
  }

  // signatures & seal
  const sigSection = CERTIFICATE_SECTIONS.find(s => s.key === 'signatures_seal');
  const sigData = resolvedSections?.signatures_seal;
  const items = sigData?.items || [];
  if (items.length > 0) {
    const bandY = template.height_px - (sigSection.yPercent / 100) * template.height_px;
    const slotWidth = template.width_px / items.length;
    const xPercent = sigData?.x_percent ?? sigSection.xPercent ?? 84;
    const startX = (xPercent / 100) * template.width_px - (slotWidth * items.length) / 2;

    for (let i = 0; i < signatures.length; i++) {
      const sigBytes = await fs.readFile(
        path.resolve(certificateRoot(), signatures[i].storage_path)
      );
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const x = startX + slotWidth * i + slotWidth / 2 - 90;
      page.drawImage(sigImage, {
        x: Math.max(0, x),
        y: bandY,
        width: 180,
        height: 60,
      });
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
