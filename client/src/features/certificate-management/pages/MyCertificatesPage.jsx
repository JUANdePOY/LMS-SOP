import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/components/ui/Toast';
import { useIssuances } from '@/features/certificate-management/hooks/useIssuances';
import { ISSUANCE_STATUSES } from '@/features/certificate-management/constants/certificateSections';

export default function MyCertificatesPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { issuances, loading, fetchByUser, handleRevoke } = useIssuances();

  const resolvedUserId = userId || 1; // fallback for demo

  useEffect(() => {
    fetchByUser(resolvedUserId);
  }, [resolvedUserId, fetchByUser]);

  const handleRevokeClick = async (id) => {
    if (!confirm('Are you sure you want to revoke this certificate?')) return;
    try {
      await handleRevoke(id);
    } catch (err) {
      // error handled in hook
    }
  };

  const handleViewPdf = (pdfPath) => {
    if (pdfPath) {
      window.open(`/uploads/${pdfPath}`, '_blank');
    }
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
        <div className="grid gap-4">
          {issuances.map((issuance) => (
            <Card key={issuance.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{issuance.template_name}</h3>
                    <Badge className={ISSUANCE_STATUSES[issuance.status]?.color || ''}>
                      {ISSUANCE_STATUSES[issuance.status]?.label || issuance.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Certificate #: {issuance.certificate_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    Recipient: {issuance.user_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Issued: {new Date(issuance.issued_at).toLocaleString()}
                  </p>
                  {issuance.pdf_storage_path && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2 p-0 text-indigo-600"
                      onClick={() => handleViewPdf(issuance.pdf_storage_path)}
                    >
                      Download PDF
                    </Button>
                  )}
                </div>
                {issuance.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeClick(issuance.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
