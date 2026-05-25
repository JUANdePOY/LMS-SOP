import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import DocumentViewer from './DocumentViewer';
import { getFileTypeCategory } from '../../lib/trainingUtils';

export default function ViewAttachmentModal({ isOpen, onClose, file, fileName, fileType }) {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      return;
    }

    if (file instanceof Blob) {
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
    } else if (typeof file === 'string') {
      setObjectUrl(file);
    }
  }, [isOpen, file]);

  if (!isOpen) return null;

  const normalizedType = (fileType || '').toLowerCase();
  const fileCategory = getFileTypeCategory(normalizedType);
  const isImage = fileCategory === 'image';
  const isPdf = fileCategory === 'pdf';
  const isDocx = fileCategory === 'docx';
  const isXlsx = fileCategory === 'xlsx';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 truncate">
            {fileName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {isImage && objectUrl && (
            <img src={objectUrl} alt={fileName} className="max-w-full h-auto mx-auto" />
          )}
          {isPdf && objectUrl && (
            <iframe src={objectUrl} className="w-full h-[70vh]" title={fileName} />
          )}
          {isDocx && file && (
            <DocumentViewer blob={file} fileType="docx" fileName={fileName} />
          )}
          {isXlsx && file && (
            <DocumentViewer blob={file} fileType="xlsx" fileName={fileName} />
          )}
          {!isImage && !isPdf && !isDocx && !isXlsx && (
            <div className="text-center py-8">
              <p className="text-neutral-600 dark:text-neutral-400">
                Preview not available for this file type.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}