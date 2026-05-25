import { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export default function DocumentViewer({ blob, fileType, fileName }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [sheets, setSheets] = useState([]);

  useEffect(() => {
    if (!blob) return;

    const processFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await blob.arrayBuffer();

        if (fileType === 'docx') {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setContent(result.value);
        } else if (fileType === 'xlsx' || fileType === 'xls') {
          const workbook = XLSX.read(arrayBuffer, { cellStyles: true });
          const sheetNames = workbook.SheetNames;
          const parsedSheets = sheetNames.map((name) => {
            const sheet = workbook.Sheets[name];
            const jsonData = XLSX.utils.sheet_to_html(sheet, { id: name, editable: false });
            return { name, html: jsonData };
          });
          setSheets(parsedSheets);
          setActiveSheet(0);
          setContent(null);
        }
      } catch (err) {
        setError(err.message || 'Failed to process file');
      } finally {
        setLoading(false);
      }
    };

    processFile();
  }, [blob, fileType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-neutral-600 dark:text-neutral-400">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400 mb-2">Failed to preview document</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500">{error}</p>
      </div>
    );
  }

  if (fileType === 'docx' && content) {
    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert overflow-auto"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  if ((fileType === 'xlsx' || fileType === 'xls') && sheets.length > 0) {
    return (
      <div className="overflow-auto">
        {sheets.length > 1 && (
          <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 overflow-x-auto">
            {sheets.map((sheet, idx) => (
              <button
                key={sheet.name}
                onClick={() => setActiveSheet(idx)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  activeSheet === idx
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {sheet.name}
              </button>
            ))}
          </div>
        )}
        <div
          className="overflow-auto max-h-[60vh]"
          dangerouslySetInnerHTML={{ __html: sheets[activeSheet]?.html || '' }}
        />
      </div>
    );
  }

  return null;
}