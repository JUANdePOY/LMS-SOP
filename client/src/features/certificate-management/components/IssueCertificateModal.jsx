import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import {
  getCertificateTemplates,
  issueCertificate,
} from '@/features/certificate-management/services/certificateService';
import { useToast } from '@/shared/components/ui/Toast';

export default function IssueCertificateModal({ open, onClose, onSuccess }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [userId, setUserId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      setFetching(true);
      getCertificateTemplates({ status: 'active', limit: 100 })
        .then(res => {
          setTemplates(res.data?.data?.rows || []);
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!templateId || !userId) {
      toast.error('Please select a template and a user');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        template_id: Number(templateId),
        user_id: Number(userId),
        overrides: {
          recipient_name: recipientName,
          date: date,
        },
      };
      if (verificationCode.trim()) {
        payload.verification_code = verificationCode.trim();
      }
      const { data } = await issueCertificate(payload);
      toast.success('Certificate issued successfully');
      onSuccess?.(data);
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to issue certificate';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTemplateId('');
    setUserId('');
    setRecipientName('');
    setDate(new Date().toISOString().split('T')[0]);
    setVerificationCode('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Issue Certificate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="template">Template</Label>
          <select
            id="template"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            required
            disabled={fetching}
          >
            <option value="">Select a template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="user">Recipient User ID</Label>
          <Input
            id="user"
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            required
          />
          <p className="mt-1 text-xs text-gray-500">For demo: try user ID 2 (Jane S.)</p>
        </div>
        <div>
          <Label htmlFor="recipient">Recipient Name (override)</Label>
          <Input
            id="recipient"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Auto-filled from user if blank"
          />
        </div>
        <div>
          <Label htmlFor="date">Date (override)</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="verificationCode">Verification Code (override)</Label>
          <Input
            id="verificationCode"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Optional custom code"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={loading || fetching}>
            {loading ? 'Issuing...' : 'Issue Certificate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
