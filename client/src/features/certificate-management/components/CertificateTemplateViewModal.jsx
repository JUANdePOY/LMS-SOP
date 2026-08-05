import { useEffect, useMemo, useCallback, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { useToast } from '@/shared/components/ui/Toast';
import CertificatePreviewCanvas from '@/features/certificate-management/components/CertificatePreviewCanvas';
import {
  getCertificateTemplate,
  downloadTemplatePdf,
} from '@/features/certificate-management/services/certificateService';
import {
  CERTIFICATE_SECTIONS,
  CERTIFICATE_STATUSES,
} from '@/features/certificate-management/constants/certificateSections';
import api from '@/services/api';

function formatBytes(bytes) {
  if (!bytes || Number(bytes) < 1) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(dateString) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/** Compact label/value row for the metadata card. */
function InfoRow({ label, value, mono, capitalize }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-gray-900 dark:text-gray-100 text-right ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

/** Left-column details: header, template info, frame thumbnail, sections summary. */
function CertificateTemplateDetails({
  template,
  framePreview,
  frameError,
  sectionSummary,
  statusConfig,
}) {
  const infoRows = [
    { label: 'Orientation', value: template.orientation, capitalize: true },
    { label: 'Dimensions', value: `${template.width_px} × ${template.height_px}px`, mono: true },
    { label: 'Department', value: template.department_name },
    { label: 'Created', value: formatDate(template.created_at) || '—' },
    { label: 'Created by', value: template.created_by_name },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {template.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Public ID: {template.public_id || `#${template.id}`}
          </p>
        </div>
        <Badge className={statusConfig.color || 'bg-gray-100 text-gray-800'}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Template info */}
      <Card className="p-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Template Info
        </h4>
        <Separator className="-mx-4" />
        <div className="space-y-0.5">
          {infoRows.map((row) => (
            <InfoRow
              key={row.label}
              label={row.label}
              value={row.value}
              mono={row.mono}
              capitalize={row.capitalize}
            />
          ))}
        </div>
      </Card>

      {/* Frame thumbnail */}
      <Card className="p-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Frame Image
        </h4>
        {framePreview ? (
          <img
            src={framePreview}
            alt="Frame thumbnail"
            className="h-16 w-auto rounded border border-gray-200 object-contain dark:border-gray-700"
          />
        ) : (
          <div className="flex h-16 w-full items-center justify-center rounded border border-dashed border-gray-300 dark:border-gray-600">
            <span className="text-xs text-gray-400">
              {frameError ? 'Frame unavailable' : 'No frame attached'}
            </span>
          </div>
        )}
        {template.frame_original_name && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {template.frame_original_name}
            {template.frame_size && ` (${formatBytes(template.frame_size)})`}
          </p>
        )}
      </Card>

      {/* Sections summary */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Content Sections
          </h4>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {sectionSummary.filter((s) => s.filled).length}/{sectionSummary.length} filled
          </span>
        </div>
        <Separator className="-mx-4" />
        <div className="space-y-1.5">
          {sectionSummary.map((section) => (
            <div key={section.key} className="flex items-start gap-2">
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                  section.filled
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-gray-300 text-transparent dark:border-gray-600'
                }`}
                aria-label={section.filled ? 'Filled' : 'Empty'}
              >
                ✓
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {section.label}
                </p>
                {section.filled && section.text && (
                  <p
                    className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400"
                    title={section.text}
                  >
                    {section.text}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function CertificateTemplateViewModal({ open, onClose, templateId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState(null);
  const [framePreview, setFramePreview] = useState(null);
  const [frameError, setFrameError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ─── Template fetch ──────────────────────────────────────────────
  const doFetch = useCallback(() => {
    if (!templateId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTemplate(null);
    setFramePreview(null);
    setFrameError(false);

    getCertificateTemplate(templateId)
      .then(({ data }) => {
        if (cancelled) return;
        setTemplate(data?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.error?.message || 'Failed to load template');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [templateId]);

  useEffect(() => {
    if (!open) return;
    const cleanup = doFetch();
    return () => cleanup();
  }, [open, doFetch]);

  // ─── Frame image ─────────────────────────────────────────────────
  useEffect(() => {
    if (!template?.id) return;
    let cancelled = false;
    let objectUrl = null;

    api
      .get(`/certificate-templates/${template.id}/frame`, {
        responseType: 'blob',
        headers: { Accept: 'image/png, image/jpeg, image/jpg, image/webp, */*' },
      })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setFramePreview(objectUrl);
        setFrameError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFrameError(true);
        setFramePreview(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [template]);

  // ─── Derived data ────────────────────────────────────────────────
  const sectionSummary = useMemo(() => {
    if (!template?.sections) return [];
    return CERTIFICATE_SECTIONS.map((section) => {
      const data = template.sections[section.key];
      if (section.key === 'signatures_seal') {
        const items = data?.items || [];
        return {
          key: section.key,
          label: section.label,
          filled: items.length > 0,
          text: items.length
            ? items.map((i) => i.signer_name || i.label || '').filter(Boolean).join(', ')
            : '',
        };
      }
      return {
        key: section.key,
        label: section.label,
        filled: Boolean(data?.text),
        text: data?.text || '',
      };
    });
  }, [template?.sections]);

  const statusConfig =
    CERTIFICATE_STATUSES[template?.status] || {
      label: template?.status || 'Unknown',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
    };

  // ─── Actions ─────────────────────────────────────────────────────
  const handleRetry = () => doFetch();

  const handleDownload = async () => {
    if (!template) return;
    setDownloading(true);
    try {
      const blob = await downloadTemplatePdf(template.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name || 'certificate'}-${template.public_id || template.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Certificate template PDF downloaded');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const footerContent = template ? (
    <div className="flex items-center justify-end gap-3">
      <Button variant="outline" size="sm" onClick={onClose}>
        Close
      </Button>
      <Button variant="default" size="sm" onClick={handleDownload} disabled={downloading}>
        {downloading ? 'Downloading…' : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </>
        )}
      </Button>
    </div>
  ) : null;

  // ─── Loading state ───────────────────────────────────────────────
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="View Template" size="4xl" footer={null}>
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading template…</span>
          </div>
        </div>
      </Modal>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template?.name || 'View Template'}
      size="4xl"
      footer={footerContent}
    >
      {error ? (
        <div className="py-12 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <p className="max-w-md text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        </div>
      ) : template ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr] lg:gap-8">
          {/* Left: Details */}
          <CertificateTemplateDetails
            template={template}
            framePreview={framePreview}
            frameError={frameError}
            sectionSummary={sectionSummary}
            statusConfig={statusConfig}
          />

          {/* Right: Live Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Live Preview
              </span>
              {frameError && (
                <Badge variant="outline" className="text-xs">
                  Frame image unavailable
                </Badge>
              )}
            </div>
            <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
              <CertificatePreviewCanvas
                sections={template.sections || {}}
                framePreview={framePreview}
                orientation={template.orientation}
                widthPx={template.width_px}
                heightPx={template.height_px}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          No template data
        </div>
      )}
    </Modal>
  );
}
