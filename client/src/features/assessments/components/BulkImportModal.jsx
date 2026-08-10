import { useState, useRef, useEffect } from "react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { QUESTION_TYPE_LABELS, TYPE_BADGE } from "../constants/questionTypes";
import { validateBulkImport, parseCsv } from "../utils/bulkImportValidation";
import { Upload, X, CheckCircle2, AlertCircle, Download, FileText, Table2, Braces } from "lucide-react";

const CSV_TEMPLATE = `question_text,type,options,correct_answer,points,explanation
"What is the capital of France?","multiple_choice","Paris|London|Berlin|Madrid","Paris",2,"Paris is the capital."
"Select all prime numbers.","multiple_select","2|3|4|5","2|3|5",3,"2, 3, and 5 are prime."
"The Earth is round.","true_false","","true",1,"This is a scientific fact."
"What is 2+2?","short_answer","","4",1,"Basic arithmetic."`;

const JSON_TEMPLATE = JSON.stringify(
  [
    {
      type: "multiple_choice",
      question_text: "What is the capital of France?",
      options: ["Paris", "London", "Berlin", "Madrid"],
      correct_answer: "Paris",
      points: 2,
      explanation: "Paris is the capital.",
    },
  ],
  null,
  2
);

const SUPPORTED_FORMATS = [
  { value: "csv", label: "CSV", icon: Table2, desc: "Comma-separated values, familiar in Excel/Sheets" },
  { value: "json", label: "JSON", icon: Braces, desc: "Native JSON array of question objects" },
  { value: "xlsx", label: "Excel (.xlsx)", icon: FileText, desc: "Excel workbook (coming soon)", disabled: true },
];

function TypeBadge({ type }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${TYPE_BADGE}`}>
      {QUESTION_TYPE_LABELS[type] || type}
    </span>
  );
}

export default function BulkImportModal({ open, onClose, quizId, toast, refetch }) {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("csv");
  const [rawContent, setRawContent] = useState("");
  const [validation, setValidation] = useState(null);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function resetState() {
    setStep("upload");
    setFile(null);
    setFormat("csv");
    setRawContent("");
    setValidation(null);
    setImporting(false);
    setDragActive(false);
  }

  function readFile(f) {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setRawContent(ev.target.result || "");
    reader.readAsText(f);
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

  const lineCount = rawContent && rawContent.trim() ? rawContent.trim().split(/\r?\n/).length : 0;

  function handleParse() {
    if (!rawContent.trim()) {
      toast.error("Please provide content or upload a file first");
      return;
    }
    let questions;
    if (format === "json") {
      try {
        questions = JSON.parse(rawContent);
      } catch {
        toast.error("Invalid JSON format");
        return;
      }
    } else if (format === "csv") {
      questions = parseCsv(rawContent);
    } else {
      toast.error("This format is not yet supported");
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      toast.error("No questions found in the input");
      return;
    }

    const result = validateBulkImport(questions);
    setValidation(result);
    setStep("preview");
  }

  async function handleImport() {
    if (!validation || validation.valid.length === 0) {
      toast.error("No valid questions to import. Please fix the errors.");
      return;
    }
    setImporting(true);
    try {
      const { importQuestions } = await import("../api/quiz.api");
      const res = await importQuestions(quizId, validation.valid);
      const count = res?.data?.imported || validation.valid.length;
      if (res?.data?.errors?.length > 0) {
        toast.warning(`${count} questions imported, but some had errors`);
      } else {
        toast.success(`${count} questions imported successfully`);
      }
      if (typeof refetch === "function") refetch();
      handleClose();
    } catch (err) {
      toast.error(err.message || "Failed to import questions");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function downloadTemplate() {
    const content = format === "csv" ? CSV_TEMPLATE : JSON_TEMPLATE;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "csv" ? "quiz_questions_template.csv" : "quiz_questions_template.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const StepIndicator = (
    <div className="flex items-center gap-2 mb-4 text-xs font-medium">
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${step === "upload" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>
        <span className="h-4 w-4 rounded-full bg-current opacity-20" /> 1. Upload
      </span>
      <span className="text-neutral-300">→</span>
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${step === "preview" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>
        2. Review & Import
      </span>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={importing ? () => {} : handleClose}
      title="Bulk Import Questions"
      size="4xl"
      footer={
        step === "upload" ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={importing}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleParse} disabled={!rawContent.trim() || importing}>
              Parse &amp; Validate
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("upload")} disabled={importing}>
              Back
            </Button>
            <Button size="sm" onClick={handleImport} disabled={importing || !validation || validation.valid.length === 0}>
              {importing ? "Importing…" : `Import ${validation?.valid?.length || 0} Questions`}
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
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && setFormat(opt.value)}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                    } ${opt.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-neutral-500"}`} />
                      <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{opt.label}</span>
                      {opt.disabled && <span className="text-[10px] text-neutral-400">soon</span>}
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
            <input type="file" ref={fileInputRef} accept=".csv,.json" onChange={handleFileChange} className="hidden" />
            <Upload className={`h-9 w-9 mx-auto mb-2 ${dragActive ? "text-blue-600" : "text-neutral-400"}`} />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {file ? file.name : "Click to upload, or drag & drop a file here"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">Supports CSV and JSON</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-xs text-neutral-400">or paste content</span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Raw content {lineCount > 0 && <span className="text-neutral-400">({lineCount} lines)</span>}
              </label>
              <Button size="sm" variant="ghost" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1" /> Template
              </Button>
            </div>
            <textarea
              className="w-full h-48 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-mono text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-y"
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder={format === "csv" ? "Paste CSV content here…" : "Paste JSON array here…"}
            />
          </div>
        </div>
      )}

      {step === "preview" && validation && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium">
              <CheckCircle2 className="h-4 w-4" /> {validation.summary.valid} valid
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-medium">
              <AlertCircle className="h-4 w-4" /> {validation.summary.invalid} invalid
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">Total: {validation.summary.total}</span>
          </div>

          {validation.valid.length > 0 && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="bg-neutral-50 dark:bg-neutral-800/60 px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Valid Questions ({validation.valid.length})
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {validation.valid.slice(0, 50).map((q) => {
                  const answerText = Array.isArray(q.correct_answer)
                    ? q.correct_answer.join(", ")
                    : q.correct_answer != null
                    ? String(q.correct_answer)
                    : "—";
                  return (
                    <div key={q.row} className="flex items-center gap-3 px-3 py-2 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-neutral-400 w-8 shrink-0">#{q.row}</span>
                      <TypeBadge type={q.type} />
                      <span className="flex-1 truncate text-neutral-700 dark:text-neutral-200">{q.question_text || "(empty)"}</span>
                      <span className="text-neutral-400 shrink-0 max-w-[40%] truncate" title={answerText}>
                        {q.options ? `${q.options.length} opts` : "—"} · ✓ {answerText} · {q.points}pt
                      </span>
                    </div>
                  );
                })}
                {validation.valid.length > 50 && (
                  <div className="px-3 py-2 text-center text-xs text-neutral-500">…and {validation.valid.length - 50} more valid questions</div>
                )}
              </div>
            </div>
          )}

          {validation.invalid.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
                Invalid Questions ({validation.invalid.length}) — will be skipped
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/40">
                {validation.invalid.slice(0, 30).map((entry) => (
                  <div key={entry.question.row} className="flex items-start gap-3 px-3 py-2 text-xs">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 w-8 shrink-0">#{entry.question.row}</span>
                        <TypeBadge type={entry.question.type} />
                        <span className="truncate text-red-700 dark:text-red-300 font-medium">{entry.question.question_text || "(empty)"}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-red-600 dark:text-red-400">
                        {entry.errors.map((e, i) => (
                          <li key={i}>• {e.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
                {validation.invalid.length > 30 && (
                  <div className="px-3 py-2 text-center text-xs text-neutral-500">…and {validation.invalid.length - 30} more</div>
                )}
              </div>
            </div>
          )}

          {validation.valid.length === 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No valid questions to import</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">Fix the errors above and parse again.</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
