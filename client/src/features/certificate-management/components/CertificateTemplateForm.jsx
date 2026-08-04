import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import api from '@/services/api';
import { CERTIFICATE_SECTIONS, normalizeSections } from '@/features/certificate-management/constants/certificateSections';
import CertificatePreviewCanvas from '@/features/certificate-management/components/CertificatePreviewCanvas';
import CertificateStepper from '@/features/certificate-management/components/CertificateStepper';
import CertificateSectionsAccordion from '@/features/certificate-management/components/CertificateSectionsAccordion';
import SignatureUploadModal from '@/features/certificate-management/components/SignatureUploadModal';
import { useSignatures } from '@/features/certificate-management/hooks/useSignatures';

const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'frame', label: 'Frame' },
  { key: 'sections', label: 'Content Sections' },
];

// True A4 dimensions at 96dpi (CSS px). Used as the default canvas size so
// the Live Preview and the final PDF are both actual A4 sheets unless the
// user deliberately overrides width/height.
const A4_LANDSCAPE = { width_px: 1123, height_px: 794 };
const A4_PORTRAIT = { width_px: 794, height_px: 1123 };

const isKnownA4Preset = (w, h) =>
  (w === A4_LANDSCAPE.width_px && h === A4_LANDSCAPE.height_px) ||
  (w === A4_PORTRAIT.width_px && h === A4_PORTRAIT.height_px);

const parseSections = (rawSections) => {
  if (typeof rawSections === 'string') {
    try {
      return JSON.parse(rawSections);
    } catch {
      return {};
    }
  }
  return rawSections || {};
};

export default function CertificateTemplateForm({
  initialSections,
  onSubmit,
  onCancel,
  saving = false,
  submitLabel = 'Save Template',
}) {
  const [sections, setSections] = useState(() => normalizeSections(parseSections(initialSections?.sections || initialSections || {})));
  const [orientation, setOrientation] = useState(initialSections?.orientation || 'landscape');
  const [widthPx, setWidthPx] = useState(initialSections?.width_px || A4_LANDSCAPE.width_px);
  const [heightPx, setHeightPx] = useState(initialSections?.height_px || A4_LANDSCAPE.height_px);
  const [framePreview, setFramePreview] = useState(null);
  const [frameFile, setFrameFile] = useState(null);
  const [templateName, setTemplateName] = useState(initialSections?.name || '');
  const fileInputRef = useRef(null);

  const [showSignatureUpload, setShowSignatureUpload] = useState(false);
  const { handleCreate: uploadSignature } = useSignatures();

  const [currentStep, setCurrentStep] = useState(0);
  const [openSectionKey, setOpenSectionKey] = useState(CERTIFICATE_SECTIONS[0]?.key || null);
  const [isDraggingFrame, setIsDraggingFrame] = useState(false);

  useEffect(() => {
    let mounted = true;
    let objectUrl = null;

    async function loadExistingFrame() {
      try {
        const response = await api.get(`/certificate-templates/${initialSections.id}/frame`, {
          responseType: 'blob',
        });
        if (!mounted) return;
        objectUrl = URL.createObjectURL(response.data);
        setFramePreview(objectUrl);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load certificate frame', err);
        setFramePreview(null);
      }
    }

    if (initialSections) {
      setSections(normalizeSections(parseSections(initialSections.sections || initialSections)));
      setOrientation(initialSections.orientation || 'landscape');
      setWidthPx(initialSections.width_px || A4_LANDSCAPE.width_px);
      setHeightPx(initialSections.height_px || A4_LANDSCAPE.height_px);
      setTemplateName(initialSections.name || '');
      setFramePreview(null);

      if (initialSections.id) {
        loadExistingFrame();
      } else {
        setFramePreview(initialSections.frame_storage_path || null);
      }
    }

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [initialSections]);

  // Switching orientation only auto-swaps width/height when the current
  // dimensions are still one of the known A4 presets — i.e. the user
  // hasn't typed in a custom size. This keeps "New Template" defaults
  // correctly matching A4 in either orientation, without silently
  // clobbering a size someone deliberately customized.
  const handleOrientationChange = (nextOrientation) => {
    setOrientation(nextOrientation);
    if (isKnownA4Preset(widthPx, heightPx)) {
      const preset = nextOrientation === 'portrait' ? A4_PORTRAIT : A4_LANDSCAPE;
      setWidthPx(preset.width_px);
      setHeightPx(preset.height_px);
    }
  };

  // Patch one or more fields on a section at once (font controls, nudge
  // controls, and the canvas width-resize handle all use this).
  const handleSectionPatch = (key, patch) => {
    setSections(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleSectionChange = (key, field, value) => handleSectionPatch(key, { [field]: value });

  const applyFrameFile = (file) => {
    if (!file) return;
    setFrameFile(file);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
    setFramePreview(URL.createObjectURL(file));
  };

  const handleFrameChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    applyFrameFile(e.target.files?.[0]);
  };

  const handleFrameDrop = (e) => {
    e.preventDefault();
    setIsDraggingFrame(false);
    const file = e.dataTransfer.files?.[0];
    if (file && /^image\/(png|jpe?g)$/.test(file.type)) applyFrameFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentStep < STEPS.length - 1) {
      goNext();
      return;
    }

    const formData = new FormData();
    formData.append('name', templateName || 'Untitled Template');
    formData.append('orientation', orientation);
    formData.append('width_px', String(widthPx));
    formData.append('height_px', String(heightPx));
    formData.append('sections', JSON.stringify(sections));
    formData.append('status', 'active');

    if (frameFile) formData.append('frame', frameFile);

    onSubmit(formData);
  };

  const stepComplete = useMemo(() => ({
    basics: Boolean(templateName.trim()),
    frame: Boolean(framePreview),
    sections: CERTIFICATE_SECTIONS.some((s) => sections[s.key]?.text),
  }), [templateName, framePreview, sections]);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSignatureUpload = async (formData) => {
    const data = await uploadSignature(formData);
    setShowSignatureUpload(false);
    return data;
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Wizard */}
        <div className="space-y-5">
          <CertificateStepper
            steps={STEPS}
            currentStep={currentStep}
            stepComplete={stepComplete}
            onStepClick={setCurrentStep}
          />

          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  name="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Completion Certificate"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orientation">Orientation</Label>
                  <select
                    id="orientation"
                    value={orientation}
                    onChange={(e) => handleOrientationChange(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="width_px">Width (px)</Label>
                  <Input
                    id="width_px"
                    type="number"
                    value={widthPx}
                    onChange={(e) => setWidthPx(Number(e.target.value))}
                    min={100}
                  />
                </div>
                <div>
                  <Label htmlFor="height_px">Height (px)</Label>
                  <Input
                    id="height_px"
                    type="number"
                    value={heightPx}
                    onChange={(e) => setHeightPx(Number(e.target.value))}
                    min={100}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Defaults to A4 ({A4_LANDSCAPE.width_px}×{A4_LANDSCAPE.height_px} landscape / {A4_PORTRAIT.width_px}×{A4_PORTRAIT.height_px} portrait, 96dpi). The Live Preview and downloaded PDF are both sized exactly to these dimensions.
              </p>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-3">
              <Label>Frame Image</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFrame(true); }}
                onDragLeave={() => setIsDraggingFrame(false)}
                onDrop={handleFrameDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  isDraggingFrame
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-gray-300 hover:border-indigo-400 dark:border-gray-600'
                }`}
              >
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Drop a PNG or JPG here, or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Recommended aspect ratio matches your {orientation} setting ({widthPx}×{heightPx})
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  name="frame"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFrameChange}
                  className="hidden"
                />
              </div>
              {framePreview && (
                <div className="flex items-center gap-3">
                  <img
                    src={framePreview}
                    alt="Frame preview"
                    className="h-16 w-auto rounded border border-gray-200 object-contain"
                  />
                  <span className="text-xs text-gray-500">Frame attached — the preview uses fixed certificate zones for a cleaner layout.</span>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <CertificateSectionsAccordion
              sections={sections}
              openSectionKey={openSectionKey}
              onToggle={(key) => setOpenSectionKey(openSectionKey === key ? null : key)}
              onSectionChange={handleSectionChange}
              onSectionPatch={handleSectionPatch}
              onUploadSignature={handleSignatureUpload}
            />
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={goBack} disabled={currentStep === 0}>
              Back
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleSubmit}>
                Next
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : submitLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Live Preview</Label>
            {framePreview && <span className="text-xs text-gray-400">Drag a section's corner handle to widen or narrow its text box</span>}
          </div>
          <CertificatePreviewCanvas
            sections={sections}
            framePreview={framePreview}
            orientation={orientation}
            widthPx={widthPx}
            heightPx={heightPx}
            onSectionPatch={handleSectionPatch}
          />
        </div>
      </div>
      </form>
      <SignatureUploadModal
        open={showSignatureUpload}
        onClose={() => setShowSignatureUpload(false)}
        onSubmit={handleSignatureUpload}
      />
    </>
  );
}