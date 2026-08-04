import { useState, useEffect, useRef } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import api from '@/services/api';
import {
  CERTIFICATE_SECTIONS,
  FONT_FAMILY_OPTIONS,
} from '@/features/certificate-management/constants/certificateSections';
import { CheckIcon, ChevronIcon } from '@/features/certificate-management/utils/icons';

const NUDGE_STEP = 0.5; // percent per click
const clampPercent = (value) => Math.min(100, Math.max(0, value));

/**
 * Collapsible list of certificate content sections with text, typography,
 * font-family, and fine position (nudge) controls. Position is adjusted in
 * small fixed increments here rather than free drag. The section's wrap
 * width is adjusted directly on the canvas via its corner handle; font
 * size is adjusted with the Size input below.
 */
export default function CertificateSectionsAccordion({
  sections,
  openSectionKey,
  onToggle,
  onSectionChange,
  onSectionPatch,
  onUploadSignature,
}) {
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadType, setUploadType] = useState('signature');
  const [uploadSignerName, setUploadSignerName] = useState('');
  const [uploadPositionTitle, setUploadPositionTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  const [signatureImageUrls, setSignatureImageUrls] = useState({});
  const signatureImageUrlsRef = useRef({});

  useEffect(() => {
    const items = sections.signatures_seal?.items || [];
    const activeIds = items.map((item) => item.signature_id).filter(Boolean);

    const removedIds = Object.keys(signatureImageUrlsRef.current)
      .map(Number)
      .filter((id) => !activeIds.includes(id));

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
          setSignatureImageUrls({ ...signatureImageUrlsRef.current });
        })
        .catch((error) => {
          console.error('Failed to load signature image in accordion', error);
        });
    });
  }, [JSON.stringify(sections.signatures_seal?.items)]);

  useEffect(() => {
    return () => {
      Object.values(signatureImageUrlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  const filledSectionCount = CERTIFICATE_SECTIONS.filter((s) => sections[s.key]?.text || (s.key === 'signatures_seal' && sections[s.key]?.items?.length)).length;

  const getSectionTextLines = (sectionKey) => {
    const text = sections[sectionKey]?.text || '';
    const [firstLine = '', secondLine = ''] = text.split('\n');
    return [firstLine, secondLine];
  };

  const setSectionTextLine = (sectionKey, lineIndex, value) => {
    const [firstLine, secondLine] = getSectionTextLines(sectionKey);
    const nextLines = lineIndex === 0 ? [value, secondLine] : [firstLine, value];
    onSectionChange(sectionKey, 'text', nextLines.filter(Boolean).join('\n'));
  };

  const nudge = (section, axis, direction) => {
    const current = sections[section.key]?.[axis] ?? (axis === 'x_percent' ? section.xPercent : section.yPercent) ?? 50;
    const next = clampPercent(current + direction * NUDGE_STEP);
    onSectionPatch(section.key, { [axis]: next });
  };

  const resetPosition = (section) => {
    onSectionPatch(section.key, {
      x_percent: section.xPercent ?? 50,
      y_percent: section.yPercent ?? 50,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Content Sections</Label>
        <span className="text-xs text-gray-400">
          {filledSectionCount}/{CERTIFICATE_SECTIONS.length} filled
        </span>
      </div>

      {CERTIFICATE_SECTIONS.map((section) => {
        const isOpen = openSectionKey === section.key;
        const isFilled = Boolean(sections[section.key]?.text);
        const currentX = sections[section.key]?.x_percent ?? section.xPercent ?? 50;
        const currentY = sections[section.key]?.y_percent ?? section.yPercent ?? 50;

        return (
          <Card key={section.key} className="overflow-hidden p-0">
            <button
              type="button"
              onClick={() => onToggle(section.key)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                    isFilled
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-gray-300 text-transparent dark:border-gray-600'
                  }`}
                >
                  <CheckIcon className="h-3 w-3" />
                </span>
                <span className="text-sm font-medium">{section.label}</span>
                {section.dynamic && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">Dynamic</span>
                )}
              </span>
              <ChevronIcon open={isOpen} />
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-gray-100 px-3 pb-3 pt-3 dark:border-gray-700">
                {section.key === 'title' ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Title line 1 (e.g. CERTIFICATE)"
                      value={getSectionTextLines(section.key)[0]}
                      onChange={(e) => setSectionTextLine(section.key, 0, e.target.value)}
                    />
                    <Input
                      placeholder="Title line 2 (e.g. of Completion)"
                      value={getSectionTextLines(section.key)[1]}
                      onChange={(e) => setSectionTextLine(section.key, 1, e.target.value)}
                    />
                  </div>
                ) : (
                  <Input
                    placeholder={`${section.label} text`}
                    value={sections[section.key]?.text || ''}
                    onChange={(e) => onSectionChange(section.key, 'text', e.target.value)}
                  />
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">
                      Size ({section.minFontSize || 8}–{section.maxFontSize || 120}px)
                    </Label>
                    <Input
                      type="number"
                      value={sections[section.key]?.font_size || section.defaultFontSize}
                      onChange={(e) => {
                        const min = section.minFontSize || 8;
                        const max = section.maxFontSize || 120;
                        const next = Math.min(max, Math.max(min, Number(e.target.value)));
                        onSectionChange(section.key, 'font_size', next);
                      }}
                      min={section.minFontSize || 8}
                      max={section.maxFontSize || 120}
                      className="h-8 text-xs"
                    />
                  </div>
                  {section.defaultWeight && (
                    <div className="flex-1">
                      <Label className="text-xs">Weight</Label>
                      <select
                        value={sections[section.key]?.font_weight || section.defaultWeight}
                        onChange={(e) => onSectionChange(section.key, 'font_weight', e.target.value)}
                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-600 dark:bg-gray-800"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  )}
                  {section.defaultStyle && (
                    <div className="flex-1">
                      <Label className="text-xs">Style</Label>
                      <select
                        value={sections[section.key]?.font_style || section.defaultStyle}
                        onChange={(e) => onSectionChange(section.key, 'font_style', e.target.value)}
                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-600 dark:bg-gray-800"
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Font Family</Label>
                  <select
                    value={sections[section.key]?.font_family || section.defaultFontFamily}
                    onChange={(e) => onSectionChange(section.key, 'font_family', e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-600 dark:bg-gray-800"
                  >
                    {FONT_FAMILY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {section.key === 'signatures_seal' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Position X</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={sections[section.key]?.x_percent ?? section.xPercent ?? 50}
                        onChange={(e) => onSectionChange(section.key, 'x_percent', Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Position Y</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={sections[section.key]?.y_percent ?? section.yPercent ?? 50}
                        onChange={(e) => onSectionChange(section.key, 'y_percent', Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
                {section.key === 'signatures_seal' && (
                  <div className="space-y-3">
                    {(sections[section.key]?.items || []).map((item, idx) => (
                      <div key={idx} className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{item.label || 'Signature'}</p>
                          <span className="text-xs text-gray-500">{item.type === 'seal' ? 'Seal' : 'Signature'}</span>
                        </div>
                        {item.signature_id && (
                          <div className="mt-3">
                            {signatureImageUrls[item.signature_id] ? (
                              <img
                                src={signatureImageUrls[item.signature_id]}
                                alt={item.label || item.signer_name || 'Signature'}
                                className="mx-auto h-12 w-auto object-contain"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="h-12 mx-auto w-full max-w-[120px] rounded bg-gray-100" />
                            )}
                          </div>
                        )}
                        <div className="mt-3">
                          <Label className="text-xs">Signer Name</Label>
                          <Input
                            value={item.signer_name || ''}
                            onChange={(e) => {
                              const next = (sections[section.key]?.items || []).map((it, i) => i === idx ? { ...it, signer_name: e.target.value } : it);
                              onSectionChange(section.key, 'items', next);
                            }}
                            placeholder="Signer Name"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="border-b border-gray-300 mt-3 mb-3" />
                        <div>
                          <Label className="text-xs">Position</Label>
                          <Input
                            value={item.position_title || ''}
                            onChange={(e) => {
                              const next = (sections[section.key]?.items || []).map((it, i) => i === idx ? { ...it, position_title: e.target.value } : it);
                              onSectionChange(section.key, 'items', next);
                            }}
                            placeholder="Position title"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    ))}

                    <div className="rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-600">
                      <Label className="text-xs">Upload New Signature / Seal</Label>
                      <div className="grid grid-cols-1 gap-2 mt-2 sm:grid-cols-2">
                        <Input
                          value={uploadLabel}
                          onChange={(e) => setUploadLabel(e.target.value)}
                          placeholder="Label (e.g. Manager)"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={uploadSignerName}
                          onChange={(e) => setUploadSignerName(e.target.value)}
                          placeholder="Signer Name"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={uploadPositionTitle}
                          onChange={(e) => setUploadPositionTitle(e.target.value)}
                          placeholder="Position title"
                          className="h-8 text-xs"
                        />
                        <select
                          value={uploadType}
                          onChange={(e) => setUploadType(e.target.value)}
                          className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-600 dark:bg-gray-800"
                        >
                          <option value="signature">Signature</option>
                          <option value="seal">Seal</option>
                        </select>
                      </div>
                      <div className="mt-2">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="text-sm"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!uploadFile}
                          onClick={async () => {
                            if (!uploadFile) return;
                            const formData = new FormData();
                            formData.append('signature', uploadFile);
                            formData.append('label', uploadLabel || 'Signature');
                            formData.append('type', uploadType);
                            formData.append('is_default', 'false');
                            try {
                              const created = await onUploadSignature?.(formData);
                              const next = [...(sections[section.key]?.items || []), {
                                signature_id: created.id,
                                label: created.label,
                                type: created.type,
                                filename: created.filename,
                                storage_path: created.storage_path,
                                signer_name: uploadSignerName,
                                position_title: uploadPositionTitle,
                              }];
                              onSectionChange(section.key, 'items', next);
                              setUploadLabel('');
                              setUploadSignerName('');
                              setUploadPositionTitle('');
                              setUploadFile(null);
                            } catch (err) {
                              // parent will handle toast/errors
                            }
                          }}
                        >
                          Upload
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {section.key === 'description' && (
                  <div className="mt-3">
                    <Label className="text-xs">Line Spacing (line-height)</Label>
                    <Input
                      type="number"
                      step={0.05}
                      min={0.5}
                      max={3}
                      value={sections[section.key]?.line_height || section.defaultLineHeight}
                      onChange={(e) => onSectionChange(section.key, 'line_height', Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                    <p className="mt-1 text-xs text-gray-400">Smaller values reduce spacing between lines.</p>
                  </div>
                )}
                {section.key === 'title' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Line 2 Size</Label>
                      <Input
                        type="number"
                        value={sections[section.key]?.title_second_font_size || section.defaultSecondLineFontSize}
                        onChange={(e) => onSectionChange(section.key, 'title_second_font_size', Number(e.target.value))}
                        min={10}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Line 2 Weight</Label>
                      <select
                        value={sections[section.key]?.title_second_font_weight || section.defaultSecondLineWeight}
                        onChange={(e) => onSectionChange(section.key, 'title_second_font_weight', e.target.value)}
                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs dark:border-gray-600 dark:bg-gray-800"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Position (fine-tune)</Label>
                    <span className="text-[10px] text-gray-400">
                      x: {currentX.toFixed(1)}% · y: {currentY.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <div className="grid grid-cols-3 gap-1">
                      <div />
                      <button
                        type="button"
                        onClick={() => nudge(section, 'y_percent', -1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        aria-label="Nudge up"
                      >
                        ↑
                      </button>
                      <div />
                      <button
                        type="button"
                        onClick={() => nudge(section, 'x_percent', -1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        aria-label="Nudge left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => resetPosition(section)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-[10px] text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        aria-label="Reset position"
                        title="Reset to default position"
                      >
                        ⟲
                      </button>
                      <button
                        type="button"
                        onClick={() => nudge(section, 'x_percent', 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        aria-label="Nudge right"
                      >
                        →
                      </button>
                      <div />
                      <button
                        type="button"
                        onClick={() => nudge(section, 'y_percent', 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        aria-label="Nudge down"
                      >
                        ↓
                      </button>
                      <div />
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-xs text-gray-400">
                    Drag the handle on a section in the live preview to widen or narrow its text box.
                  </span>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}