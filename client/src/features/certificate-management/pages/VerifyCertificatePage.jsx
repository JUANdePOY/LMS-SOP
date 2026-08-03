import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/components/ui/Toast';
import { useVerifyCertificate } from '@/features/certificate-management/hooks/useIssuances';
import { ISSUANCE_STATUSES } from '@/features/certificate-management/constants/certificateSections';

export default function VerifyCertificatePage() {
  const { certificateNumber } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { certificate, loading, error, verify } = useVerifyCertificate();
  const [inputNumber, setInputNumber] = useState(certificateNumber || searchParams.get('cert') || '');

  useEffect(() => {
    if (certificateNumber) {
      verify(certificateNumber);
    }
  }, [certificateNumber, verify]);

  const handleVerify = (e) => {
    e.preventDefault();
    if (!inputNumber.trim()) return;
    verify(inputNumber.trim());
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Certificate Verification</h1>
        <p className="text-sm text-gray-500">Verify the authenticity of a certificate</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleVerify} className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="cert-number">Certificate Number</Label>
            <Input
              id="cert-number"
              value={inputNumber}
              onChange={(e) => setInputNumber(e.target.value)}
              placeholder="Enter certificate UUID"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </Card>

      {error && !certificate && (
        <Card className="border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <h3 className="font-medium text-red-800 dark:text-red-200">Verification Failed</h3>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
        </Card>
      )}

      {certificate && (
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Certificate Verified</h3>
            <Badge className={ISSUANCE_STATUSES[certificate.status]?.color || ''}>
              {ISSUANCE_STATUSES[certificate.status]?.label || certificate.status}
            </Badge>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>Certificate #:</strong> {certificate.certificate_number}</p>
            <p><strong>Template:</strong> {certificate.template_name}</p>
            <p><strong>Recipient:</strong> {certificate.user_name}</p>
            <p><strong>Issued By:</strong> {certificate.issued_by_name || 'System'}</p>
            <p><strong>Issued At:</strong> {new Date(certificate.issued_at).toLocaleString()}</p>
            {certificate.expires_at && (
              <p><strong>Expires:</strong> {new Date(certificate.expires_at).toLocaleString()}</p>
            )}
            {certificate.revoked_at && (
              <p><strong>Revoked:</strong> {new Date(certificate.revoked_at).toLocaleString()}</p>
            )}
          </div>
          {certificate.resolved_sections && (
            <div className="mt-4">
              <p className="text-sm font-medium">Certificate Details:</p>
              <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800">
                {Object.entries(certificate.resolved_sections).map(([key, data]) => (
                  data.text && (
                    <div key={key} className="mb-1">
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                      {data.text}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
          {certificate.pdf_storage_path && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/uploads/${certificate.pdf_storage_path}`, '_blank')}
              >
                View PDF
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
