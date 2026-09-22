import { useState, useRef, useEffect } from "react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { Upload, X, CheckCircle2, Download, FileText, Table2, Braces } from "lucide-react";
import * as XLSX from "xlsx";
import { bulkUploadClients } from "@/features/task-management/api/client.api";
import { createPortal } from "react-dom";

const CSV_TEMPLATE = `Client Name,Businesses
"Acme Corp","SOP Business 1,SOP Business 2"`;

const JSON_TEMPLATE = JSON.stringify(
  [
    {
      client_name: "Acme Corp",
      businesses: ["SOP Business 1", "SOP Business 2"],
    },
  ],
  null,
  2
);

const SUPPORTED_FORMATS = [
  { value: "xlsx", label: "Excel (.xlsx)", icon: FileText, desc: "Excel workbook with headers and sample row" },
  { value: "csv", label: "CSV", icon: Table2, desc: "Comma-separated values, familiar in Excel/Sheets" },
  { value: "json", label: "JSON", icon: Braces, desc: "Native JSON array of client objects" },
];

function parseClientPreview(rows) {
  return rows
    .map((raw, idx) => {
      const name = String(raw.client_name || raw.Client_Name || raw.Client || raw.CLIENT || raw.client || raw.CLIENT_NAME || raw['Client Name'] || raw['CLIENT NAME'] || '').trim();
      const businessesRaw = raw.businesses || raw.Businesses || raw.BUSINESSES || raw.business || raw.Business || raw.BUSINESS || '';
      const businesses = String(businessesRaw)
        .split(/[;,]/)
        .map((b) => String(b).trim())
        .filter((b) => b.length > 0);
      return {
        _index: idx + 1,
        client_name: name || '(no name)',
        businesses: businesses.length > 0 ? businesses.join(', ') : '—',
      };
    })
    .filter((p) => p.client_name !== '(no name)' || p.businesses !== '—');
}

export default function BulkUploadWizardModal({ open, onClose, toast, refetchClients, businessId, businessName, departments }) {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("xlsx");
  const [rawContent, setRawContent] = useState("");
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [xlsxPreview, setXlsxPreview] = useState({ headers: [], rows: [] });
  const fileInputRef = useRef(null);
  const xlsxBufferRef = useRef(null);

  useEffect(() => {
    if (!open) resetState();
  }, [open]);

  function resetState() {
    setStep("upload");
    setFile(null);
    setFormat("xlsx");
    setRawContent("");
    setPreview([]);
    setImporting(false);
    setDragActive(false);
    setImportResult(null);
    setXlsxPreview({ headers: [], rows: [] });
  }

  function readFile(f) {
    setFile(f);
    if (format === "xlsx") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const buf = ev.target.result;
        xlsxBufferRef.current = buf;
        try {
          const wb = XLSX.read(buf, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" });
          const headers = Object.keys(jsonData[0] || {});
          setXlsxPreview({ headers, rows: jsonData });
          setRawContent("");
        } catch {
          setXlsxPreview({ headers: [], rows: [] });
          setRawContent("");
        }
      };
      reader.readAsArrayBuffer(f);
    } else {
      setXlsxPreview({ headers: [], rows: [] });
      const reader = new FileReader();
      reader.onload = (ev) => setRawContent(ev.target.result || "");
      reader.readAsText(f);
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) readFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleParse() {
    if (!rawContent.trim() && !file) {
      toast.error("Please provide content or upload a file first");
      return;
    }
    let rows;
    try {
      if (format === "json") {
        rows = JSON.parse(rawContent);
      } else if (format === "csv") {
        const wb = XLSX.read(rawContent, { type: "string" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
      } else if (format === "xlsx") {
        const buf = xlsxBufferRef.current || file?.arrayBuffer?.();
        if (!buf) {
          toast.error("Please upload an Excel file first");
          return;
        }
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
      } else {
        toast.error("Unsupported format");
        return;
      }
    } catch {
      toast.error("Failed to parse content. Please check the format.");
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      toast.error("No rows found in the input");
      return;
    }

    const parsed = parseClientPreview(rows);
    setPreview(parsed);
    setStep("preview");
  }

  async function handleImport() {
    if (!file) {
      toast.error("Please upload a file first");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const payload = await bulkUploadClients(file, format, businessId);
      setImportResult(payload || {});
      toast.success(payload?.message || 'Import completed');
      if (typeof refetchClients === 'function') refetchClients();
    } catch (err) {
      setImportResult({ success: false, data: {}, message: err.message || 'Import failed' });
      toast.error(err.message || 'Failed to import clients');
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function downloadTemplate() {
    if (format === "xlsx") {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Client Name", "Businesses"],
        ["Acme Corp", "SOP Business 1, SOP Business 2"],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      XLSX.writeFile(wb, "clients_template.xlsx");
      return;
    }

    const content = format === "csv" ? CSV_TEMPLATE : JSON_TEMPLATE;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "csv" ? "clients_template.csv" : "clients_template.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const StepIndicator = (
    <div className="flex items-center gap-2 mb-4 text-xs font-medium">
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${step === "upload" || step === "preview" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>
        <span className="h-4 w-4 rounded-full bg-current opacity-20" /> 1. Upload Clients
      </span>
    </div>
  );

  return createPortal(
    <Modal
      open={open}
      onClose={importing ? () => {} : handleClose}
      title="Bulk Upload Clients"
      size="5xl"
      footer={
        step === "upload" ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={importing}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleParse} disabled={!rawContent.trim() && !file || importing}>
              Parse &amp; Preview
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStep("upload"); setImportResult(null); }} disabled={importing}>
              Back
            </Button>
            {!importResult && (
              <Button size="sm" onClick={handleImport} disabled={importing || preview.length === 0}>
                {importing ? "Importing…" : `Import ${preview.length} Clients`}
              </Button>
            )}
            <Button size="sm" onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        )
      }
    >
      {StepIndicator}

      {(step === "upload" || step === "preview") && (
        <>
          {step === "upload" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">File Format</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SUPPORTED_FORMATS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = format === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormat(opt.value)}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
                          isActive
                            ? "border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-neutral-500"}`} />
                          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{opt.label}</span>
                        </div>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-900/20"
                    : "border-neutral-300 dark:border-neutral-600 hover:border-blue-500 dark:hover:border-blue-400"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={`.${format}`}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className={`h-9 w-9 mx-auto mb-2 ${dragActive ? "text-blue-600" : "text-neutral-400"}`} />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {file ? file.name : "Click to upload, or drag & drop a file here"}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">Supports {format.toUpperCase()} files</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-xs text-neutral-400">or paste content</span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Raw content
                  </label>
                  <Button size="sm" variant="ghost" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-1" /> Template
                  </Button>
                </div>
                {format === "xlsx" && xlsxPreview.rows.length > 0 ? (
                  <div className="rounded-lg border border-neutral-300 dark:border-neutral-600 overflow-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        <tr>
                          {xlsxPreview.headers.map((h) => (
                            <th key={h} className="px-2 py-1 text-left whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {xlsxPreview.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                            {xlsxPreview.headers.map((h) => (
                              <td key={h} className="px-2 py-1 text-neutral-700 dark:text-neutral-200 whitespace-nowrap">{row[h] ?? ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <textarea
                    className="w-full h-48 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-mono text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-y"
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    placeholder={format === "csv" ? "Paste CSV content here…" : format === "json" ? "Paste JSON array here…" : "Upload an Excel file to see its contents here"}
                  />
                )}
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {importResult ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> {importResult?.data?.created ?? 0} imported
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">Failed: {importResult?.data?.failed ?? 0}</span>
                  </div>
                  {importResult?.data?.failed > 0 && (
                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-300">
                      {importResult.data.failed} row(s) had errors. Please review and retry.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium">
                    <Table2 className="h-4 w-4" /> {preview.length} rows ready to import
                  </span>
                </div>
              )}

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="bg-neutral-50 dark:bg-neutral-800/60 px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  Preview (first 50 rows)
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      <tr>
                        <th className="px-3 py-2 text-left w-12">#</th>
                        <th className="px-3 py-2 text-left">Client Name</th>
                        <th className="px-3 py-2 text-left">Businesses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {preview.slice(0, 50).map((row) => (
                        <tr key={row._index} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="px-3 py-2 text-neutral-400">{row._index}</td>
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-100 font-medium truncate max-w-[200px]">{row.client_name}</td>
                          <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{row.businesses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 50 && (
                    <div className="px-3 py-2 text-center text-xs text-neutral-500">…and {preview.length - 50} more rows</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>,
    document.body
  );
}
