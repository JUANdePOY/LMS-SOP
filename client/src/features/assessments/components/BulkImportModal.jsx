import { useState, useRef, useEffect } from "react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { QUESTION_TYPE_LABELS } from "../constants/questionTypes";
import { validateBulkImport, parseCsv } from "../utils/bulkImportValidation";
import { Upload, X, CheckCircle, AlertCircle, Download } from "lucide-react";

const CSV_TEMPLATE = `question_text,type,options,correct_answer,points,explanation
"What is the capital of France?","multiple_choice","Paris|London|Berlin|Madrid","Paris",2,"Paris is the capital."
"Select all prime numbers.","multiple_select","2|3|4|5","2|3|5",3,"2, 3, and 5 are prime."
"The Earth is round.","true_false","","true",1,"This is a scientific fact."
"What is 2+2?","short_answer","","4",1,"Basic arithmetic."`;

const JSON_TEMPLATE = JSON.stringify([
  {
    type: "multiple_choice",
    question_text: "What is the capital of France?",
    options: ["Paris", "London", "Berlin", "Madrid"],
    correct_answer: "Paris",
    points: 2,
    explanation: "Paris is the capital.",
  },
], null, 2);

const SUPPORTED_FORMATS = [
  { value: "csv", label: "CSV", desc: "Comma-separated values, familiar in Excel/Sheets" },
  { value: "json", label: "JSON", desc: "Native JSON array of question objects" },
  { value: "xlsx", label: "Excel (.xlsx)", desc: "Excel workbook (optional, coming soon)", disabled: true },
];

export default function BulkImportModal({ open, onClose, quizId, toast, refetch }) {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("csv");
  const [rawContent, setRawContent] = useState("");
  const [validation, setValidation] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  function resetState() {
    setStep("upload");
    setFile(null);
    setFormat("csv");
    setRawContent("");
    setValidation(null);
    setImporting(false);
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawContent(ev.target.result);
    };
    reader.readAsText(f);
  }

  function handleParse() {
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Import Questions"
      size="4xl"
      footer={
        step === "upload" ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleParse} disabled={!rawContent.trim() || !format}>
              Parse &amp; Validate
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={importing || !validation || validation.valid.length === 0}
            >
              {importing ? "Importing…" : `Import ${validation?.valid?.length || 0} Questions`}
            </Button>
          </div>
        )
      }
    >
      {step === "upload" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">File Format</label>
            <div className="flex gap-3 flex-wrap">
              {SUPPORTED_FORMATS.map((opt) => (
                <label key={opt.value} className={`flex items-center gap-2 text-sm cursor-pointer ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <input
                    type="radio"
                    name="format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => !opt.disabled && setFormat(opt.value)}
                    disabled={opt.disabled}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} accept=".csv,.json,.xlsx" onChange={handleFileChange} className="hidden" />
            <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{file ? file.name : "Click to upload file or drag & drop"}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">Supports CSV, JSON (max 10MB)</p>
          </div>

          <div className="flex justify-between items-center">
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">Or edit raw content</label>
            <Button size="sm" variant="ghost" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Download Template
            </Button>
          </div>
          <textarea
            className="w-full h-48 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-mono text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            placeholder={format === "csv" ? "Paste CSV content here..." : "Paste JSON array here..."}
          />
        </div>
      )}

      {step === "preview" && validation && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" /> {validation.summary.valid} valid
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-4 w-4" /> {validation.summary.invalid} invalid
            </span>
            <span className="text-neutral-500">Total: {validation.summary.total}</span>
          </div>

          {validation.errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Validation Errors</h4>
              <ul className="space-y-1 text-xs text-red-700 dark:text-red-400">
                {validation.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>Row {e.row} ({e.field}): {e.message}</li>
                ))}
                {validation.errors.length > 20 && <li>...and {validation.errors.length - 20} more errors</li>}
              </ul>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-800">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Question</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Options</th>
                  <th className="text-left px-3 py-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {validation.valid.slice(0, 50).map((q) => (
                  <tr key={q.row} className="border-t border-neutral-200 dark:border-neutral-700">
                    <td className="px-3 py-2">{q.row}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{q.question_text}</td>
                    <td className="px-3 py-2">{QUESTION_TYPE_LABELS[q.type] || q.type}</td>
                    <td className="px-3 py-2 text-neutral-500">{q.options ? q.options.length : "-"} opts</td>
                    <td className="px-3 py-2">{q.points}</td>
                  </tr>
                ))}
                {validation.valid.length > 50 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-neutral-500">
                      ...and {validation.valid.length - 50} more valid questions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {validation.invalid.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h4 className="bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">Invalid Questions</h4>
              <table className="w-full text-xs">
                <thead className="bg-neutral-100 dark:bg-neutral-800">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Question</th>
                    <th className="text-left px-3 py-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.invalid.slice(0, 30).map((entry) => (
                    <tr key={entry.question.row} className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2">{entry.question.row}</td>
                      <td className="px-3 py-2 max-w-xs truncate text-red-600">{entry.question.question_text || "(empty)"}</td>
                      <td className="px-3 py-2 text-red-600">
                        {entry.errors.map((e) => e.message).join("; ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
