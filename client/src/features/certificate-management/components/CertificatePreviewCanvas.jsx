import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/services/api';
import { CERTIFICATE_SECTIONS } from '@/features/certificate-management/constants/certificateSections';
import useSectionResize from '@/features/certificate-management/hooks/useSectionResize';
import useSectionPositions from '@/features/certificate-management/hooks/useSectionPositions';

// const PRESENTED_TO_LABEL = 'This certificate is proudly presented to';

/**
 * Renders the certificate frame with each filled section placed into a
 * fixed layout zone that matches a standard certificate structure.
 *
 * Position is adjusted via the nudge controls in the sections accordion
 * (small fixed increments, not free drag). The handle that appears on
 * hover in the bottom-right corner of each section controls that
 * section's wrap width (how wide the text box is before it wraps) — it
 * does not change font size. Font size is adjusted via the accordion's
 * Size input.
 */
export default function CertificatePreviewCanvas({
  sections,
  framePreview,
  orientation,
  onSectionPatch,
}) {
  const aspectRatio = orientation === 'portrait' ? 'h-[60vh] w-auto' : 'h-auto w-full max-h-[60vh]';
  const containerRef = useRef(null);
  const { resizingKey, startResize } = useSectionResize(containerRef, (key, patch) => {
    onSectionPatch?.(key, patch);
  });
  const { draggingKey, startDrag } = useSectionPositions((key, patch) => {
    onSectionPatch?.(key, patch);
  });

  const recipientSection = CERTIFICATE_SECTIONS.find((s) => s.key === 'recipient_name');
  const recipientYPercent = sections.recipient_name?.y_percent ?? recipientSection?.yPercent ?? 47;

  const signatureItems = useMemo(
    () => (sections.signatures_seal?.items || []).map((item) => item.signature_id).filter(Boolean),
    [sections.signatures_seal?.items]
  );

  const [signatureImageUrls, setSignatureImageUrls] = useState({});
  const signatureImageUrlsRef = useRef({});

  useEffect(() => {
    const activeIds = signatureItems;

    const removedIds = Object.keys(signatureImageUrlsRef.current).filter((id) => !activeIds.includes(id));
    if (removedIds.length) {
      const next = { ...signatureImageUrlsRef.current };
      removedIds.forEach((id) => {
        URL.revokeObjectURL(next[id]);
        delete next[id];
      });
      signatureImageUrlsRef.current = next;
      setSignatureImageUrls(next);
    }

    activeIds.forEach((id) => {
      if (signatureImageUrlsRef.current[id]) return;
      api.get(`/certificate-signatures/${id}/image`, { responseType: 'blob' })
        .then((response) => {
          const url = URL.createObjectURL(response.data);
          signatureImageUrlsRef.current = { ...signatureImageUrlsRef.current, [id]: url };
          setSignatureImageUrls(signatureImageUrlsRef.current);
        })
        .catch((error) => {
          console.error('Failed to load certificate signature image', error);
        });
    });
  }, [signatureItems.join(',')]);

  useEffect(() => {
    return () => {
      Object.values(signatureImageUrlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  if (!framePreview) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900 ${aspectRatio}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-400">Upload a frame image to see preview</p>
        </div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '10% 10%' }} />
      </div>
    );
  }

  const getTitleLines = (text) => {
    const [firstLine = '', secondLine = ''] = (text || '').split('\n');
    return [firstLine, secondLine];
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 ${aspectRatio}`}
    >
      <img
        src={framePreview}
        alt="Certificate frame"
        className="pointer-events-none h-full w-full object-contain"
      />
      <div className="absolute inset-0">
        {/* Decorative "presented to" line above the recipient name. Purely
            visual — not tied to a data field, so it needs no backend change
            and always tracks wherever the name zone currently sits. */}
        <div
          className="pointer-events-none absolute z-10 text-center"
          style={{
            left: '50%',
            top: `${Math.max(recipientYPercent - 8, 0)}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              color: '#555',
              letterSpacing: '0.02em',
              textShadow: '0 0 3px rgba(255,255,255,0.85)',
            }}
          >
            {/* {PRESENTED_TO_LABEL} */}
          </span>
        </div>

        {CERTIFICATE_SECTIONS.map((section) => {
          const data = sections[section.key];
          if (!data?.text && section.key !== 'recipient_name' && section.key !== 'date' && section.key !== 'signatures_seal') return null;

          const xPercent = data?.x_percent ?? section.xPercent ?? 50;
          const yPercent = data?.y_percent ?? section.yPercent ?? 50;
          const widthPercent = data?.width_percent ?? section.defaultWidthPercent ?? 80;
          const fontSize = data?.font_size || section.defaultFontSize;
          const textAlign = data?.text_align || section.defaultAlign || 'center';
          const fontFamily = data?.font_family || section.defaultFontFamily || 'inherit';
          const lineHeight = data?.line_height || section.defaultLineHeight || 1.4;
          const isBold = data?.font_weight === 'bold' || section.defaultWeight === 'bold';
          const hasText = Boolean(data?.text) || section.dynamic;
          const isResizing = resizingKey === section.key;

          let transform = 'translate(-50%, -50%)';
          if (textAlign === 'left') transform = 'translate(0, -50%)';
          else if (textAlign === 'right') transform = 'translate(-100%, -50%)';

          const [titleLine1, titleLine2] = getTitleLines(data?.text);

          // Special rendering for signatures band: render uploaded images and signer labels
          if (section.key === 'signatures_seal') {
            const items = sections.signatures_seal?.items || [];
            if (items.length === 0) return null;

            return (
              <div
                key={section.key}
                className="absolute z-10 rounded px-1"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  width: `${widthPercent}%`,
                  transform,
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                }}
              >
                <div className="flex items-end justify-between w-full">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex-1 text-center px-2">
                      {item.signature_id ? (
                        signatureImageUrls[item.signature_id] ? (
                          <img
                            src={signatureImageUrls[item.signature_id]}
                            alt={item.label || item.signer_name || 'Signature image'}
                            className="mx-auto mb-2 h-16 w-auto object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="h-16 mx-auto mb-2 w-full rounded bg-gray-100" />
                        )
                      ) : (
                        <div className="h-16" />
                      )}
                      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.35)', paddingBottom: 6 }}>
                        <span style={{ fontSize: `${fontSize}px`, fontFamily, fontWeight: 600 }}>{item.signer_name || item.label || ''}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{item.position_title || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          const secondLineFontSize = data?.title_second_font_size || section.defaultSecondLineFontSize || Math.max(Math.round(fontSize * 0.75), 12);
          const secondLineFontWeight = data?.title_second_font_weight || section.defaultSecondLineWeight || 'normal';
          const secondLineFontStyle = data?.title_second_font_style || section.defaultSecondLineStyle || data?.font_style || 'normal';

          return (
            <div
              key={section.key}
              className={`group absolute z-10 rounded px-1 cursor-move ${isResizing ? 'outline outline-1 outline-dashed outline-indigo-400' : ''} ${draggingKey === section.key ? 'outline outline-2 outline-blue-400' : ''}`}
              style={{
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                width: `${widthPercent}%`,
                transform,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
              }}
              onPointerDown={startDrag(section.key)}
            >
              {section.key === 'title' ? (
                <div>
                  <span
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily,
                      fontWeight: 700,
                      fontStyle: data?.font_style === 'italic' ? 'italic' : 'normal',
                      color: '#1a1a1a',
                      textAlign,
                      textTransform: section.uppercase ? 'uppercase' : 'none',
                      letterSpacing: section.letterSpacing || 'normal',
                      lineHeight: lineHeight,
                      textShadow: '0 0 3px rgba(255,255,255,0.85)',
                      display: 'block',
                      whiteSpace: 'pre-wrap',
                      borderBottom: section.underline && titleLine1 ? '1px solid rgba(0,0,0,0.35)' : 'none',
                      paddingBottom: section.underline && titleLine1 ? '4px' : 0,
                    }}
                  >
                    {titleLine1 || (section.dynamic ? `[${section.label}]` : '')}
                  </span>
                  {titleLine2 ? (
                    <span
                      style={{
                        fontSize: `${secondLineFontSize}px`,
                        fontFamily,
                        fontWeight: secondLineFontWeight === 'bold' ? 700 : 400,
                        fontStyle: secondLineFontStyle === 'italic' ? 'italic' : 'normal',
                        color: '#1a1a1a',
                        textAlign,
                        textTransform: section.uppercase ? 'uppercase' : 'none',
                        letterSpacing: section.letterSpacing || 'normal',
                        lineHeight,
                        textShadow: '0 0 3px rgba(255,255,255,0.85)',
                        display: 'block',
                        whiteSpace: 'pre-wrap',
                        marginTop: '0.25em',
                      }}
                    >
                      {titleLine2}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily,
                    fontWeight: isBold ? 700 : 400,
                    fontStyle: data?.font_style === 'italic' ? 'italic' : 'normal',
                    color: '#1a1a1a',
                    textAlign,
                    textTransform: section.uppercase ? 'uppercase' : 'none',
                    letterSpacing: section.letterSpacing || 'normal',
                    lineHeight,
                    textShadow: '0 0 3px rgba(255,255,255,0.85)',
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    borderBottom: section.underline && hasText ? '1px solid rgba(0,0,0,0.35)' : 'none',
                    paddingBottom: section.underline ? '4px' : 0,
                  }}
                >
                  {data?.text || (section.dynamic ? `[${section.label}]` : '')}
                </span>
              )}

              {onSectionPatch && (
                <div
                  role="slider"
                  aria-label={`Resize ${section.label} text box width`}
                  onPointerDown={startResize(section.key, widthPercent)}
                  className={`absolute -bottom-2 -right-2 h-3.5 w-3.5 cursor-ew-resize rounded-sm border border-white bg-indigo-500 opacity-0 shadow transition-opacity group-hover:opacity-100 ${isResizing ? 'opacity-100' : ''}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}