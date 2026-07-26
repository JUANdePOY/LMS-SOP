import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function SOPAttachmentForm({ onUpload, saving, allowedTypes = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'mp4'] }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const validateFile = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
    } catch (err) {
      setError(err?.message || 'Upload failed');
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition ${
          dragOver ? 'border-primary bg-primary/10' : 'border-input bg-muted'
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Drag & drop a file here, or{' '}
          <label className="text-primary cursor-pointer hover:underline" htmlFor="attachment-input">
            browse
          </label>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Allowed: {allowedTypes.join(', ')}
        </p>
        <input
          id="attachment-input"
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {selectedFile && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-[var(--bg-surface)] p-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
<div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
            <Button variant="default" onClick={handleUpload} disabled={saving}>
              {saving ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}