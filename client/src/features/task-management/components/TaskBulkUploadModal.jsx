import { useState, useRef, useEffect } from "react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { Upload, X, CheckCircle2, Download, FileText, Table2, Braces, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import { bulkUploadTasks } from "../services/taskService";

const CSV_TEMPLATE = `Task Title,Description,Priority,Status,Start Date & Time,Deadline,Assigned Users
"Onboarding Review","Complete onboarding checklist","Medium","Pending","2026-09-22 09:00","2026-09-29 17:00","John Doe"`;

const JSON_TEMPLATE = JSON.stringify(
  [
    {
      title: "Onboarding Review",
      description: "Complete onboarding checklist",
      priority: "Medium",
      status: "Pending",
      start_datetime: "2026-09-22 09:00",
      deadline_datetime: "2026-09-29 17:00",
      assigned_users: ["John Doe"],
    },
  ],
  null,
  2
);

const SUPPORTED_FORMATS = [
  { value: "xlsx", label: "Excel (.xlsx)", icon: FileText, desc: "Excel workbook with headers and sample row" },
  { value: "csv", label: "CSV", icon: Table2, desc: "Comma-separated values, familiar in Excel/Sheets" },
  { value: "json", label: "JSON", icon: Braces, desc: "Native JSON array of task objects" },
];

const HEADER_ALIASES = {
  'task title': 'title',
  'title': 'title',
  'description': 'description',
  'task description': 'description',
  'priority': 'priority',
  'task priority': 'priority',
  'status': 'status',
  'task status': 'status',
  'start date': 'start_datetime',
  'start datetime': 'start_datetime',
  'start date & time': 'start_datetime',
  'start_date': 'start_datetime',
  'start_datetime': 'start_datetime',
  'deadline': 'deadline_datetime',
  'due date': 'deadline_datetime',
  'due_date': 'deadline_datetime',
  'deadline_datetime': 'deadline_datetime',
  'category': 'category',
  'task category': 'category',
  'assigned users': 'assigned_users',
  'assigned_user': 'assigned_users',
  'assigned_users': 'assigned_users',
  'users': 'assigned_users',
  'user': 'assigned_users',
  'client': 'client',
  'client id': 'client_id',
  'client_id': 'client_id',
  'client name': 'client_name',
  'client_name': 'client_name',
  'business': 'business',
  'business id': 'business_id',
  'business_id': 'business_id',
  'business name': 'business_name',
  'business_name': 'business_name',
  'project': 'project',
  'project id': 'project_id',
  'project_id': 'project_id',
  'project name': 'project_name',
  'project_name': 'project_name',
  'parent task id': 'parent_task_id',
  'parent_task_id': 'parent_task_id',
  'parent': 'parent_task_id',
};

function normalizeHeader(header) {
  const key = String(header || '').trim().toLowerCase();
  return HEADER_ALIASES[key] || null;
}

function normalizeRow(rawRow) {
  const row = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const normalizedKey = normalizeHeader(key);
    if (normalizedKey) {
      row[normalizedKey] = value;
    }
  }
  return row;
}

export default function TaskBulkUploadModal({ open, onClose, toast, refetch, businessId, businessName, clientId, clientName, departments }) {
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

  const contextDepartments = Array.isArray(departments) ? departments : [];

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

  function parsePreview(rows) {
    return rows
      .map((raw, idx) => {
        const row = normalizeRow(raw);
        const title = row.title != null ? String(row.title).trim() : '';
        const start = row.start_datetime != null ? String(row.start_datetime).trim() : null;
        const deadline = row.deadline_datetime != null ? String(row.deadline_datetime).trim() : null;
        return {
          _index: idx + 1,
          title: title || '(no title)',
          priority: row.priority != null ? String(row.priority).trim() : null,
          status: row.status != null ? String(row.status).trim() : null,
          start_datetime: start,
          deadline_datetime: deadline,
          assigned_users: null,
          client_name: clientName || null,
          business_name: businessName || null,
        };
      })
      .filter((p) => p.title !== '(no title)' || Object.values(p).some((v, i) => i > 0 && v));
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
        const sourceRows = xlsxPreview.rows.length > 0 ? xlsxPreview.rows : (() => {
          const buf = xlsxBufferRef.current || file?.arrayBuffer?.();
          if (!buf) {
            toast.error("Please upload an Excel file first");
            return [];
          }
          const wb = XLSX.read(buf, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          return XLSX.utils.sheet_to_json(ws);
        })();
        if (!sourceRows.length) {
          toast.error("No rows found in the input");
          return;
        }
        rows = sourceRows;
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

    const parsed = parsePreview(rows);
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
      const data = await bulkUploadTasks(file, format, {
        client_id: clientId,
        client_business_id: businessId,
        assigned_departments: contextDepartments.map((d) => d.id || d.department_id),
      });
      setImportResult(data);
      toast.success(data?.message || "Import completed");
      if (typeof refetch === "function") refetch();
    } catch (err) {
      setImportResult(err.message || "Import failed");
      toast.error(err.message || "Failed to import tasks");
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
        ["Task Title", "Description", "Priority", "Status", "Start Date & Time", "Deadline", "Assigned Users"],
        ["Onboarding Review", "Complete onboarding checklist", "Medium", "Pending", "2026-09-22 09:00", "2026-09-29 17:00", "John Doe"],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tasks");
      XLSX.writeFile(wb, "tasks_template.xlsx");
      return;
    }

    const content = format === "csv" ? CSV_TEMPLATE : JSON_TEMPLATE;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "csv" ? "tasks_template.csv" : "tasks_template.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const StepIndicator = (
    <div className="flex items-center gap-2 mb-4 text-xs font-medium">
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${step !== "upload" || importResult ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>
        <span className="h-4 w-4 rounded-full bg-current opacity-20" /> 1. Upload
      </span>
      <span className="text-neutral-300">→</span>
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${step === "preview" || importResult ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>
        <span className="h-4 w-4 rounded-full bg-current opacity-20" /> 2. Preview
      </span>
      <span className="text-neutral-300">→</span>
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${importResult ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>
        <span className="h-4 w-4 rounded-full bg-current opacity-20" /> 3. Import
      </span>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={importing ? () => {} : handleClose}
      title="Bulk Upload Tasks"
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
                {importing ? "Importing…" : `Import ${preview.length} Tasks`}
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
                    {format === "xlsx" ? "Spreadsheet" : "Raw content"}
                  </label>
                  <Button size="sm" variant="ghost" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-1" /> Template
                  </Button>
                </div>
                {format === "xlsx" && xlsxPreview.headers.length > 0 ? (
                  <div>
                    <div className="flex justify-end mb-1">
                      <Button size="sm" variant="ghost" onClick={() => setXlsxPreview((prev) => ({ ...prev, rows: [...prev.rows, {}] }))}>
                        <Plus className="h-4 w-4 mr-1" /> Add Row
                      </Button>
                    </div>
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
                                <td key={h} className="px-2 py-1">
                                  <input
                                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-neutral-700 dark:text-neutral-200 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-800"
                                    value={row[h] ?? ''}
                                    onChange={(e) => {
                                      const next = [...xlsxPreview.rows];
                                      next[idx] = { ...next[idx], [h]: e.target.value };
                                      setXlsxPreview((prev) => ({ ...prev, rows: next }));
                                    }}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="w-full h-48 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-mono text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-2 focus:border-blue-500/20 outline-none resize-y"
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
                  <CheckCircle2 className="h-4 w-4" /> {importResult?.imported ?? 0} imported
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">Total: {importResult?.summary?.total ?? preview.length}</span>
              </div>
              {importResult?.summary?.invalid > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-300">
                  {importResult.summary.invalid} row(s) had errors. Import was rolled back.
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
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Start</th>
                    <th className="px-3 py-2 text-left">Deadline</th>
                    <th className="px-3 py-2 text-left">Assigned Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {preview.slice(0, 50).map((row) => (
                    <tr key={row._index} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-3 py-2 text-neutral-400">{row._index}</td>
                      <td className="px-3 py-2 text-neutral-800 dark:text-neutral-100 font-medium truncate max-w-[200px]">{row.title}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{row.priority || '—'}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{row.status || '—'}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{row.start_datetime || '—'}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{row.deadline_datetime || '—'}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{row.assigned_users || '—'}</td>
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
    </Modal>
  );
}
