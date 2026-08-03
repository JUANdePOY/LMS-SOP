import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/components/ui/Toast';
import CertificateTemplateForm from '@/features/certificate-management/components/CertificateTemplateForm';
import CertificateTemplateViewModal from '@/features/certificate-management/components/CertificateTemplateViewModal';
import SignatureUploadModal from '@/features/certificate-management/components/SignatureUploadModal';
import IssueCertificateModal from '@/features/certificate-management/components/IssueCertificateModal';
import { CERTIFICATE_STATUSES, ISSUANCE_STATUSES } from '@/features/certificate-management/constants/certificateSections';
import { useCertificates } from '@/features/certificate-management/hooks/useCertificates';
import { useSignatures } from '@/features/certificate-management/hooks/useSignatures';

const TABS = [
  { key: 'templates', label: 'Templates' },
  { key: 'issue', label: 'Issue Certificate' },
  { key: 'my-certificates', label: 'My Certificates' },
  { key: 'verify', label: 'Verify' },
];

export default function CertificatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    templates,
    stats,
    loading,
    saving,
    fetchTemplates,
    fetchStats,
    handleCreate,
    handleUpdate,
    handleDelete,
    defaultSections,
  } = useCertificates();

  const { fetchSignatures } = useSignatures();

  const [activeTab, setActiveTab] = useState('templates');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTemplateId, setViewTemplateId] = useState(null);
  const [showSignatureUpload, setShowSignatureUpload] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verifiedCert, setVerifiedCert] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchStats();
    fetchSignatures();
  }, [fetchTemplates, fetchStats, fetchSignatures]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('my-certificates')) setActiveTab('my-certificates');
    else if (path.includes('verify')) setActiveTab('verify');
    else if (path.includes('issue')) setActiveTab('issue');
    else setActiveTab('templates');
  }, [location.pathname]);

  const handleCreateSubmit = async (formData) => {
    await handleCreate(formData);
    setShowForm(false);
    fetchTemplates();
    fetchStats();
  };

  const handleUpdateSubmit = async (id, formData) => {
    await handleUpdate(id, formData);
    setEditingTemplate(null);
    fetchTemplates();
  };

  const handleLocalDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    await handleDelete(id);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleView = (template) => {
    setViewTemplateId(template.id);
    setShowViewModal(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyNumber.trim()) return;
    setVerifyLoading(true);
    try {
      const { getIssuanceByCertificateNumber } = await import('@/features/certificate-management/services/certificateService');
      const { data } = await getIssuanceByCertificateNumber(verifyNumber.trim());
      setVerifiedCert(data?.data || null);
    } catch (err) {
      setVerifiedCert(null);
      toast.error(err.response?.data?.message || 'Certificate not found');
    } finally {
      setVerifyLoading(false);
    }
  };

  const renderTemplatesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Certificate Templates</h2>
          <p className="text-sm text-gray-500">Create and manage certificate templates</p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }}>
          New Template
        </Button>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.status} className="p-4">
              <p className="text-sm text-gray-500">{CERTIFICATE_STATUSES[stat.status]?.label || stat.status}</p>
              <p className="text-2xl font-bold">{stat.count}</p>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No templates found. Create your first template to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="p-4 cursor-pointer" onClick={() => handleView(template)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{template.name}</h3>
                    <Badge className={CERTIFICATE_STATUSES[template.status]?.color || ''}>
                      {CERTIFICATE_STATUSES[template.status]?.label || template.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {template.width_px}x{template.height_px} • {template.orientation}
                  </p>
                  {template.department_name && (
                    <p className="text-sm text-gray-500">Dept: {template.department_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(template); }}>
                    Edit
                  </Button>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleLocalDelete(template.id); }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {editingTemplate ? 'Edit Template' : 'New Template'}
          </h3>
          <CertificateTemplateForm
            initialSections={editingTemplate || defaultSections}
            onSubmit={editingTemplate ? (data) => handleUpdateSubmit(editingTemplate.id, data) : handleCreateSubmit}
            onCancel={handleFormClose}
            saving={saving}
            submitLabel={editingTemplate ? 'Update Template' : 'Create Template'}
          />
        </Card>
      )}

      <CertificateTemplateViewModal
        open={showViewModal}
        onClose={() => { setShowViewModal(false); setViewTemplateId(null); }}
        templateId={viewTemplateId}
      />
    </div>
  );

  const renderIssueTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Issue Certificate</h2>
      <Card className="p-6">
        {!showIssueModal ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-4">Select a template and recipient to issue a new certificate.</p>
            <Button onClick={() => setShowIssueModal(true)}>
              Issue New Certificate
            </Button>
          </div>
        ) : (
          <IssueCertificateModal
            open={showIssueModal}
            onClose={() => setShowIssueModal(false)}
            onSuccess={() => {
              fetchTemplates();
              setShowIssueModal(false);
            }}
          />
        )}
      </Card>
    </div>
  );

  const renderMyCertificatesTab = () => {
    // In a real app, get user ID from auth context
    const currentUserId = 1; // placeholder
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Certificates</h2>
        <Card className="p-6">
          <p className="text-sm text-gray-500">
            Viewing certificates for current user (ID: {currentUserId}).
            In production, this uses the authenticated user's ID.
          </p>
          {/* This would use useIssuances hook in production */}
          <div className="mt-4">
            <Button onClick={() => navigate('/certificates/my-certificates')}>
              View Full Page
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const renderVerifyTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Verify Certificate</h2>
      <Card className="p-6">
        <form onSubmit={handleVerify} className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="verify-number">Certificate Number / QR Code</Label>
            <Input
              id="verify-number"
              value={verifyNumber}
              onChange={(e) => setVerifyNumber(e.target.value)}
              placeholder="Enter certificate UUID"
            />
          </div>
          <Button type="submit" disabled={verifyLoading}>
            {verifyLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>

        {verifiedCert && (
          <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <h4 className="font-medium text-green-800 dark:text-green-200">Certificate Verified</h4>
            <div className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-300">
              <p><strong>Certificate #:</strong> {verifiedCert.certificate_number}</p>
              <p><strong>Template:</strong> {verifiedCert.template_name}</p>
              <p><strong>Recipient:</strong> {verifiedCert.user_name}</p>
              <p><strong>Status:</strong> {ISSUANCE_STATUSES[verifiedCert.status]?.label || verifiedCert.status}</p>
              <p><strong>Issued:</strong> {new Date(verifiedCert.issued_at).toLocaleString()}</p>
              {verifiedCert.resolved_sections && (
                <div className="mt-2">
                  <p className="font-medium">Resolved Sections:</p>
                  <pre className="mt-1 overflow-auto rounded bg-white/50 p-2 text-xs">
                    {JSON.stringify(verifiedCert.resolved_sections, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Certificates</h1>
          <p className="text-sm text-gray-500">Manage certificate templates, issue certificates, and verify authenticity</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'templates' && renderTemplatesTab()}
      {activeTab === 'issue' && renderIssueTab()}
      {activeTab === 'my-certificates' && renderMyCertificatesTab()}
      {activeTab === 'verify' && renderVerifyTab()}

      <SignatureUploadModal
        open={showSignatureUpload}
        onClose={() => setShowSignatureUpload(false)}
        onSubmit={async (formData) => {
          const { createSignature } = await import('@/features/certificate-management/services/certificateService');
          const { data } = await createSignature(formData);
          toast.success('Signature uploaded');
          fetchSignatures();
          return data;
        }}
      />
    </div>
  );
}
