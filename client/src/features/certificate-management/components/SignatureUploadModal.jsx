import { useState, useRef } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { SIGNATURE_TYPES } from '@/features/certificate-management/constants/certificateSections';

export default function SignatureUploadModal({ open, onClose, onSubmit }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('signature');
  const [isDefault, setIsDefault] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('signature', file);
      formData.append('label', label);
      formData.append('type', type);
      formData.append('is_default', String(isDefault));
      await onSubmit(formData);
      handleClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setLabel('');
    setType('signature');
    setIsDefault(false);
    setFile(null);
    setPreview(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Upload Signature / Seal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="sig-label">Label</Label>
          <Input
            id="sig-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Training Director"
            required
          />
        </div>
        <div>
          <Label htmlFor="sig-type">Type</Label>
          <select
            id="sig-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            {Object.entries(SIGNATURE_TYPES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="sig-default"
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="sig-default" className="text-sm">Set as default</Label>
        </div>
        <div>
          <Label>Image File (PNG with transparency recommended)</Label>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileChange}
            required
          />
          {preview && (
            <div className="mt-2">
              <img src={preview} alt="Signature preview" className="h-16 w-auto rounded border border-gray-200 object-contain" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !file}>
            {saving ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
