import { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { X, Plus, Award } from "lucide-react";

export default function CourseCertificatesSection({
  courseId,
  certificates,
  onUpdate,
  saving,
  onLink,
  onUnlink,
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    setLoadingTemplates(true);
    fetch("/api/certificate-templates?status=active&limit=50")
      .then((res) => res.json())
      .then((json) => {
        const rows = json?.data?.rows || json?.data || [];
        setTemplates(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [courseId]);

  const handleLink = () => {
    if (!selectedTemplateId) return;
    onLink(parseInt(selectedTemplateId, 10), { is_default: true, display_order: certificates.length });
    setSelectedTemplateId("");
  };

  const availableTemplates = templates.filter(
    (t) => !certificates.some((c) => c.certificate_template_id === t.id)
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          <Award size={14} />
          Completion Certificates
        </h3>
        {certificates.length > 0 && (
          <span className="text-xs text-neutral-500">{certificates.length} linked</span>
        )}
      </div>

      {certificates.length > 0 && (
        <div className="space-y-2">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cert.template_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {cert.is_default && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Default</Badge>
                  )}
                  <span className="text-[10px] text-neutral-500">Order: {cert.display_order}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnlink(cert.certificate_template_id)}
                disabled={saving}
                className="h-7 w-7 p-0 text-neutral-500 hover:text-red-600"
              >
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {availableTemplates.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="cert-template" className="text-xs text-neutral-600 dark:text-neutral-400">
              Link certificate template
            </Label>
            <select
              id="cert-template"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-100"
            >
              <option value="">Select template...</option>
              {availableTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={handleLink}
            disabled={!selectedTemplateId || saving}
            className="mb-0.5"
          >
            <Plus size={14} />
            Link
          </Button>
        </div>
      )}

      {loadingTemplates && (
        <p className="text-xs text-neutral-500">Loading templates...</p>
      )}
    </Card>
  );
}
