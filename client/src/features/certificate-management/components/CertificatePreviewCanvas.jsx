import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import api from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';
import { CERTIFICATE_SECTIONS } from '@/features/certificate-management/constants/certificateSections';
import useSectionResize from '@/features/certificate-management/hooks/useSectionResize';
import useSectionPositions from '@/features/certificate-management/hooks/useSectionPositions';

// const PRESENTED_TO_LABEL = 'This certificate is proudly presented to';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const VIEWPORT_MAX_HEIGHT_VH = 70;

/**
 * Renders the certificate frame with each filled section placed into a
 * fixed layout zone that matches a standard certificate structure.
 *
 * The inner "page" element is always sized to the template's real pixel
 * dimensions (widthPx x heightPx) — i.e. font sizes, section positions,
 * and image sizes render at genuine 1:1 scale, identical to what
 * renderCertificate.js draws in the final PDF. Display scaling is done
 * with a CSS transform on that page element, controlled by the zoom
 * controls below (Fit / 100% / manual +/-), rather than by shrinking the
 * page's actual box — so "100%" here really means true A4 (or whatever
 * width_px/height_px is) size on screen, scrollable if it's larger than
 * the viewport.
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
   widthPx,
  heightPx,
  onSectionPatch,
}) {
  const { toast } = useToast();

  // font_size values are authored against the template's native
  // width_px/height_px. Since the page element below is always rendered
  // at true 1:1 pixel size (zoom is applied via CSS transform on top of
  // that), font sizes are used as literal px 1-for-1 with what pdf-lib
  // draws — no separate scale factor is needed here.
  const fontScale = 1;

  const safeWidth = widthPx || (orientation === 'portrait' ? 794 : 1123);
  const safeHeight = heightPx || (orientation === 'portrait' ? 1123 : 794);

  const outerRef = useRef(null);
  const containerRef = useRef(null);
  const { resizingKey, startResize } = useSectionResize(containerRef, (key, patch) => {
    onSectionPatch?.(key, patch);
  });
  const { draggingKey, startDrag } = useSectionPositions(containerRef, (key, patch) => {
    onSectionPatch?.(key, patch);
  });

  // 'fit' auto-recalculates to the largest zoom that keeps the whole page
  // inside the visible box; a numeric value is a user-chosen manual zoom
  // that stays fixed until they click "Fit" again.
  const [zoomMode, setZoomMode] = useState('fit');
  const [fitZoom, setFitZoom] = useState(1);

  const recalcFit = useCallback(() => {
    const el = outerRef.current;
    if (!el) return;
    const availableWidth = el.clientWidth;
    const availableHeight = el.clientHeight;
    if (!availableWidth || !availableHeight) return;
    const next = Math.min(availableWidth / safeWidth, availableHeight / safeHeight);
    setFitZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)));
  }, [safeWidth, safeHeight]);

  useEffect(() => {
    recalcFit();
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => recalcFit());
    observer.observe(el);
    return () => observer.disconnect();
  }, [recalcFit]);

  const zoom = zoomMode === 'fit' ? fitZoom : zoomMode;

  const setManualZoom = (value) => {
    setZoomMode(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value)));
  };
  const zoomIn = () => setManualZoom(zoom + ZOOM_STEP);
  const zoomOut = () => setManualZoom(zoom - ZOOM_STEP);
  const zoomToActualSize = () => setManualZoom(1);
  const zoomToFit = () => setZoomMode('fit');

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
          toast.error(
            error.response?.data?.message ||
            `Failed to load signature image (id: ${id})`
          );
        });
    });
  }, [signatureItems.join(',')]);

  useEffect(() => {
    return () => {
      Object.values(signatureImageUrlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  const ZoomControls = (
    <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1 py-1 dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={zoomOut}
        disabled={zoom <= ZOOM_MIN}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
        aria-label="Zoom out"
      >
        −
      </button>
      <span className="w-11 text-center text-xs tabular-nums text-gray-600 dark:text-gray-300">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={zoomIn}
        disabled={zoom >= ZOOM_MAX}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
        aria-label="Zoom in"
      >
        +
      </button>
      <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
      <button
        type="button"
        onClick={zoomToActualSize}
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          zoomMode !== 'fit' && Math.abs(zoom - 1) < 0.001
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        100%
      </button>
      <button
        type="button"
        onClick={zoomToFit}
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          zoomMode === 'fit'
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        Fit
      </button>
    </div>
  );

  if (!framePreview) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">{ZoomControls}</div>
        <div
          ref={outerRef}
          style={{ height: `${VIEWPORT_MAX_HEIGHT_VH}vh` }}
          className="flex items-center justify-center overflow-auto rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
        >
          <p className="text-sm text-gray-400">Upload a frame image to see preview</p>
        </div>
      </div>
    );
  }

  const getTitleLines = (text) => {
    const [firstLine = '', secondLine = ''] = (text || '').split('\n');
    return [firstLine, secondLine];
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Actual size: {safeWidth} × {safeHeight}px
        </span>
        {ZoomControls}
      </div>

      {/* Viewport: fixed height, scrolls when the scaled page overflows it */}
      <div
        ref={outerRef}
        style={{ height: `${VIEWPORT_MAX_HEIGHT_VH}vh` }}
        className="overflow-auto rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
      >
        {/* Spacer: reserves the true scaled footprint so scrollbars appear
            correctly — a CSS transform on its own does not affect layout
            flow/scroll size, so without this the browser wouldn't know
            there's anything to scroll to at zoom > "fits in viewport". */}
        <div
          style={{
            width: safeWidth * zoom,
            height: safeHeight * zoom,
          }}
          className="relative mx-auto"
        >
          <div
            ref={containerRef}
            style={{
              width: safeWidth,
              height: safeHeight,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
            className="relative overflow-hidden bg-gray-50 shadow-sm dark:bg-gray-900"
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
                    fontSize: `${13 * fontScale}px`,
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
                const textAlign = section.defaultAlign || 'center';
                const fontFamily = data?.font_family || section.defaultFontFamily || 'inherit';
                const lineHeight = data?.line_height || section.defaultLineHeight || 1.4;
                const isBold = data?.font_weight === 'bold' || section.defaultWeight === 'bold';
                const hasText = Boolean(data?.text) || section.dynamic;
                const isResizing = resizingKey === section.key;

                let transform = 'translate(-50%, -50%)';
                if (textAlign === 'left') transform = 'translate(0, -50%)';
                else if (textAlign === 'right') transform = 'translate(-100%, -50%)';

                const [titleLine1, titleLine2] = getTitleLines(data?.text);

                // Special rendering for signatures band: each uploaded image, and
                // separately each image's signer-name/position text, is its own
                // independently-positioned element (own drag key, own patch
                // target). Moving the image never moves its text, and moving one
                // signer's image/text never touches another signer's or any
                // other section.
                if (section.key === 'signatures_seal') {
                  const items = sections.signatures_seal?.items || [];
                  if (items.length === 0) return null;

                  const defaultItemWidth = 18;
                  const slotSpacing = defaultItemWidth + 4;
                  const rowWidth = slotSpacing * items.length - 4;
                  const rowStartX = xPercent - rowWidth / 2;

                  return items.flatMap((item, idx) => {
                    const itemId = item.signature_id ?? idx;
                    const imgKey = `signatures_seal:img:${itemId}`;
                    const textKey = `signatures_seal:text:${itemId}`;
                    const defaultItemX = rowStartX + slotSpacing * idx + defaultItemWidth / 2;
                    const itemXPercent = item.x_percent ?? defaultItemX;
                    const itemYPercent = item.y_percent ?? yPercent;
                    const itemWidthPercent = item.width_percent ?? defaultItemWidth;
                    const isImgDragging = draggingKey === imgKey;
                    const isImgResizing = resizingKey === imgKey;

                    const hasSignerText = Boolean(item.signer_name || item.position_title || sections.signatures_seal?.signer_name || sections.signatures_seal?.position_title);
                    const textXPercent = item.text_x_percent ?? itemXPercent;
                    const textYPercent = item.text_y_percent ?? (itemYPercent + 8);
                    const textWidthPercent = item.text_width_percent ?? itemWidthPercent;
                    const isTextDragging = draggingKey === textKey;
                    const isTextResizing = resizingKey === textKey;

                    const elements = [
                      <div
                        key={`${itemId}-img`}
                        className={`group absolute z-10 rounded px-1 ${isImgResizing ? 'outline outline-1 outline-dashed outline-indigo-400' : ''} ${isImgDragging ? 'cursor-grabbing opacity-80' : 'cursor-grab'}`}
                        onPointerDown={startDrag(imgKey)}
                        style={{
                          left: `${itemXPercent}%`,
                          top: `${itemYPercent}%`,
                          width: `${itemWidthPercent}%`,
                          transform: 'translate(-50%, -50%)',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                        }}
                      >
                        {item.signature_id ? (
                          signatureImageUrls[item.signature_id] ? (
                            <img
                              src={signatureImageUrls[item.signature_id]}
                              alt={item.label || 'Signature image'}
                              className="mx-auto w-full object-contain pointer-events-none"
                              style={{ height: `${sections.signatures_seal?.image_size || 48}px` }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="mx-auto w-full rounded bg-gray-100" style={{ height: `${sections.signatures_seal?.image_size || 48}px` }} />
                          )
                        ) : (
                          <div style={{ height: `${sections.signatures_seal?.image_size || 48}px` }} />
                        )}

                        {onSectionPatch && (
                          <div
                            role="slider"
                            aria-label="Resize signature image"
                            onPointerDown={startResize(imgKey, itemWidthPercent)}
                            className={`absolute -bottom-2 -right-2 h-3.5 w-3.5 cursor-ew-resize rounded-sm border border-white bg-indigo-500 opacity-0 shadow transition-opacity group-hover:opacity-100 ${isImgResizing ? 'opacity-100' : ''}`}
                          />
                        )}
                      </div>,
                    ];

                    if (hasSignerText) {
                      elements.push(
                        <div
                          key={`${itemId}-text`}
                          className={`group absolute z-10 rounded px-1 text-center ${isTextResizing ? 'outline outline-1 outline-dashed outline-indigo-400' : ''} ${isTextDragging ? 'cursor-grabbing opacity-80' : 'cursor-grab'}`}
                          onPointerDown={startDrag(textKey)}
                          style={{
                            left: `${textXPercent}%`,
                            top: `${textYPercent}%`,
                            width: `${textWidthPercent}%`,
                            transform: 'translate(-50%, -50%)',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                          }}
                        >
                          {(item.signer_name || sections.signatures_seal?.signer_name) && (
                            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.35)', paddingBottom: 6 }}>
                              <span style={{ fontSize: `${fontSize * fontScale}px`, fontFamily, fontWeight: 600 }}>
                                {item.signer_name || sections.signatures_seal?.signer_name}
                              </span>
                            </div>
                          )}
                          {(item.position_title || sections.signatures_seal?.position_title) && (
                            <div
                              className="mt-1 text-gray-600"
                              style={{
                                fontSize: `${Math.max(Math.round(fontSize * fontScale * 0.75), 10)}px`,
                                fontFamily,
                              }}
                            >
                                {item.position_title || sections.signatures_seal?.position_title}
                            </div>
                          )}

                          {onSectionPatch && (
                            <div
                              role="slider"
                              aria-label="Resize signer name and position text"
                              onPointerDown={startResize(textKey, textWidthPercent)}
                              className={`absolute -bottom-2 -right-2 h-3.5 w-3.5 cursor-ew-resize rounded-sm border border-white bg-indigo-500 opacity-0 shadow transition-opacity group-hover:opacity-100 ${isTextResizing ? 'opacity-100' : ''}`}
                            />
                          )}
                        </div>
                      );
                    }

                    return elements;
                  });
                }
                const secondLineFontSize = data?.title_second_font_size || section.defaultSecondLineFontSize || Math.max(Math.round(fontSize * 0.75), 12);
                const secondLineFontWeight = data?.title_second_font_weight || section.defaultSecondLineWeight || 'normal';
                const secondLineFontStyle = data?.title_second_font_style || section.defaultSecondLineStyle || data?.font_style || 'normal';

                const isDragging = draggingKey === section.key;

                return (
                  <div
                    key={section.key}
                    className={`group absolute z-10 rounded px-1 ${isResizing ? 'outline outline-1 outline-dashed outline-indigo-400' : ''} ${isDragging ? 'cursor-grabbing opacity-80' : 'cursor-grab'}`}
                    onPointerDown={startDrag(section.key)}
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
                    {section.key === 'title' ? (
                      <div>
                        <span
                          style={{
                            fontSize: `${fontSize * fontScale}px`,
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
                              fontSize: `${secondLineFontSize * fontScale}px`,
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
                          fontSize: `${fontSize * fontScale}px`,
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
        </div>
      </div>
    </div>
  );
}