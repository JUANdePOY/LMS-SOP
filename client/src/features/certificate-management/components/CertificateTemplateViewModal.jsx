import { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import CertificatePreviewCanvas from '@/features/certificate-management/components/CertificatePreviewCanvas';
import { getCertificateTemplate } from '@/features/certificate-management/services/certificateService';
import api from '@/services/api';

export default function CertificateTemplateViewModal({ open, onClose, templateId }) {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState(null);
  const [framePreview, setFramePreview] = useState(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setTemplate(null);
    setFramePreview(null);
    (async () => {
      try {
        const { data } = await getCertificateTemplate(templateId);
        if (!mounted) return;
        setTemplate(data?.data || null);
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.error?.message || 'Failed to load template');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, templateId]);

  useEffect(() => {
    if (!template?.id) return;
    let mounted = true;
    let objectUrl = null;

    (async () => {
      try {
        const response = await api.get(`/certificate-templates/${template.id}/frame`, {
          responseType: 'blob',
          headers: { Accept: 'image/png, image/jpeg, image/jpg, image/webp, */*' },
        });
        if (!mounted) return;
        objectUrl = URL.createObjectURL(response.data);
        setFramePreview(objectUrl);
      } catch (err) {
        if (!mounted) return;
        setError('Failed to load frame image');
        setFramePreview(null);
      }
    })();

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [template]);

  return (
    <Modal open={open} onClose={onClose} title={template?.name || 'View Template'} footer={null}>
      {loading ? (
        <div className="py-8 text-center">Loading…</div>
      ) : error ? (
        <div className="py-8 text-center text-red-600">{error}</div>
      ) : template ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <h3 className="text-lg font-medium">{template.name}</h3>
              {template.department_name && <p className="text-sm text-gray-500">Dept: {template.department_name}</p>}
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <div>Orientation: {template.orientation}</div>
                <div>Size: {template.width_px} × {template.height_px}</div>
                <div>Status: {template.status}</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm text-gray-500">Live Preview</div>
              <div className="rounded border border-gray-200 overflow-hidden">
                <CertificatePreviewCanvas sections={template.sections || {}} framePreview={framePreview} orientation={template.orientation} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">No template data</div>
      )}
    </Modal>
  );
}
