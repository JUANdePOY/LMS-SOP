import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Modal } from '@/shared/components/ui/modal';
import { useToast } from '@/shared/components/ui/Toast';
import { useIssuances } from '@/features/certificate-management/hooks/useIssuances';
import { ISSUANCE_STATUSES } from '@/features/certificate-management/constants/certificateSections';
import * as session from '@/services/session';
import { Download, Award } from 'lucide-react';
import CertificatePreviewCanvas from '@/features/certificate-management/components/CertificatePreviewCanvas';
import { StaggerList, MotionItem } from "@/shared/motion";

export default function MyCertificatesPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { issuances, loading, fetchByUser } = useIssuances();

  const currentUser = session.getCurrentUser();
  const resolvedUserId = userId ? parseInt(userId, 10) : (currentUser?.id || 1);

  const [selectedIssuance, setSelectedIssuance] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchByUser(resolvedUserId);
  }, [resolvedUserId, fetchByUser]);

  const handleCardClick = (issuance) => {
    setSelectedIssuance(issuance);
    setIsModalOpen(true);
  };

  const handleViewPdf = (pdfPath) => {
    if (pdfPath) {
      window.open(`/uploads/${pdfPath}`, '_blank');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIssuance(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Certificates</h1>
          <p className="text-sm text-gray-500">Certificates issued to user ID: {resolvedUserId}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : issuances.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No certificates found for this user.</p>
        </Card>
      ) : (
        <StaggerList className="grid gap-4">
          {issuances.map((issuance) => (
            <MotionItem key={issuance.id}>
              <Card
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleCardClick(issuance)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Award size={18} className="text-indigo-600" />
                      <h3 className="font-medium">{issuance.template_name}</h3>
                      <Badge className={ISSUANCE_STATUSES[issuance.status]?.color || ''}>
                        {ISSUANCE_STATUSES[issuance.status]?.label || issuance.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Certificate #: {issuance.certificate_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      Recipient: {(() => {
                        const resolved = typeof issuance.resolved_sections === 'string'
                          ? JSON.parse(issuance.resolved_sections)
                          : issuance.resolved_sections;
                        const overrideName = resolved?.recipient_name?.text;
                        return overrideName || issuance.user_name || '—';
                      })()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Issued: {new Date(issuance.issued_at).toLocaleString()}
                    </p>
                    <div className="mt-2 text-xs text-indigo-600">
                      Click to preview
                    </div>
                  </div>
                </div>
              </Card>
            </MotionItem>
          ))}
        </StaggerList>
      )}

      <Modal open={isModalOpen} onClose={handleCloseModal} title="Certificate Preview" size="xl" footer={selectedIssuance && selectedIssuance.pdf_storage_path ? (
        <div className="flex w-full justify-end gap-3">
          <Button
            size="sm"
            onClick={() => handleViewPdf(selectedIssuance.pdf_storage_path)}
            className="flex items-center gap-1"
          >
            <Download size={14} />
            Download PDF
          </Button>
        </div>
      ) : null}>
        {selectedIssuance && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
              {(() => {
                try {
                  const sections = typeof selectedIssuance.resolved_sections === 'string'
                    ? JSON.parse(selectedIssuance.resolved_sections)
                    : selectedIssuance.resolved_sections;
                  if (!sections) return <p className="text-sm text-gray-500 p-4">No preview available.</p>;
                  return (
                    <CertificatePreviewCanvas
                      sections={sections}
                       framePreview={selectedIssuance.template_public_id ? `/api/certificate-templates/${selectedIssuance.template_public_id}/frame` : null}
                      orientation={selectedIssuance.template_orientation || 'landscape'}
                      widthPx={selectedIssuance.template_width_px}
                      heightPx={selectedIssuance.template_height_px}
                    />
                  );
                } catch {
                  return <p className="text-sm text-gray-500 p-4">Unable to render preview.</p>;
                }
              })()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
