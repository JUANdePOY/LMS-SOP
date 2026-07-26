import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function AttachmentModal({ open, onClose, onUpload, saving }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  if (!open) return null;

  const allowedTypes = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'mp4', 'xls', 'xlsx'];

  const validateFile = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && validateFile(file)) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      onClose();
    } catch (err) {
      setError(err?.message || 'Upload failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Upload Attachment</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragOver ? 'border-primary bg-primary/10' : 'border-[var(--border)] bg-muted'
          }`}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Drag & drop a file here, or{' '}
            <label className="text-primary cursor-pointer hover:underline" htmlFor="modal-file-input">browse</label>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Max 50MB. Allowed: {allowedTypes.join(', ')}</p>
          <input id="modal-file-input" ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        {selectedFile && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--border)] bg-muted p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => setSelectedFile(null)} className="p-1 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleUpload} disabled={!selectedFile || saving}>
            {saving ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
}