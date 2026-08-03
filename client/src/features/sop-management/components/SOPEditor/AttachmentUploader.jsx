import { useState } from 'react';
import { useToast } from '@/shared/components/Toast';
import AttachmentIcon from '@/shared/components/ui/AttachmentIcon';
import { formatFileSize } from '@/lib/dateUtils';
import { Trash2, Link } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function AttachmentUploader({ attachments, onUpload, onAddLink, onDelete, loading = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const toast = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');

    // Client-side file size validation
    if (file.size > MAX_FILE_SIZE) {
      const message = `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
      setError(message);
      toast.error(message);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await onUpload(formData);
      toast.success('File uploaded successfully');
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to upload file';
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) {
      toast.error('Please enter a valid link URL');
      return;
    }

    // Basic URL validation
    try {
      const url = new URL(linkUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        toast.error('Link must be a valid HTTP or HTTPS URL');
        return;
      }
    } catch {
      toast.error('Invalid URL format');
      return;
    }

    setAddingLink(true);
    setError('');
    try {
      await onAddLink({
        link_url: linkUrl,
        link_title: linkTitle || undefined,
      });
      toast.success('Link added successfully');
      setLinkUrl('');
      setLinkTitle('');
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to add link';
      setError(message);
      toast.error(message);
    } finally {
      setAddingLink(false);
    }
  };

  return (
    <div className="attachment-uploader">
      <div className="flex items-center gap-3 mb-4">
        <label className={`flex-1 cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${uploading || loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {uploading ? 'Uploading...' : 'Choose File'}
          <input
            type="file"
            onChange={handleFileChange}
            disabled={uploading || loading}
            className="hidden"
          />
        </label>
        {uploading && (
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Link (optional)</label>
        <div className="space-y-3">
          <input
            type="url"
            placeholder="https://example.com/resource"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            disabled={addingLink || loading}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 placeholder:text-neutral-500 dark:placeholder-neutral-500 disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Link title (optional)"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            disabled={addingLink || loading}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 placeholder:text-neutral-500 dark:placeholder-neutral-500 disabled:opacity-50"
          />
          <button
            onClick={handleAddLink}
            disabled={addingLink || loading || !linkUrl.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {addingLink ? 'Adding...' : (
              <>
                <Link size={16} />
                Add Link
              </>
            )}
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 dark:text-red-400 text-xs mb-3">{error}</p>}
      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((att) => {
            const fileName = att.original_name || att.file_name || '';
            const fileExt = att.file_extension || (fileName.includes('.') ? fileName.split('.').pop() : '');
            const isLink = att.link_url;
            const displayName = isLink ? att.original_name || att.link_url : fileName;
            return (
              <li key={att.id} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                <div className="flex-shrink-0">
                  {isLink ? (
                    <Link size={24} className="text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <AttachmentIcon fileType={fileExt} size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate" title={displayName}>
                    {displayName}
                  </p>
                  {!isLink && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatFileSize(att.file_size)}
                    </p>
                  )}
                  {isLink && (
                    <a
                      href={att.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {att.link_url}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => onDelete(att.id)}
                  disabled={loading}
                  className="flex-shrink-0 p-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50 transition-colors"
                  title="Delete attachment"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default AttachmentUploader;
