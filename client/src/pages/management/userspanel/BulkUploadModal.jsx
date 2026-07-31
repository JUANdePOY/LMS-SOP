import { useState, useRef, useEffect } from "react";
import { X, Upload, AlertCircle, CheckCircle, Loader, FileText, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { bulkUploadUsers } from "@/services/api";

const USER_COLUMNS = [
  'Full Name', 'Employee ID', 'Department', 'Position/Job Title',
  'Email Address', 'Contact Number', 'Employment Status',
  'Date Hired', 'Birthdate', 'Address'
];

export default function BulkUploadModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("upload");
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [previewData, setPreviewData] = useState([]);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [defaultRole, setDefaultRole] = useState('employee');

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setStage("upload");
      setError(null);
      setSuccessMessage("");
      setPreviewData([]);
      setDefaultPassword('');
      setDefaultRole('employee');
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  const parseUserExcel = (excelFile) => {
    try {
      setError(null);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheets = workbook.SheetNames;

          const firstSheet = sheets[0];
          const worksheet = workbook.Sheets[firstSheet];

          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

          let headerRowIndex = 0;
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell =>
              cell && typeof cell === 'string' &&
              /full\s*name|email|employee\s*id|department/i.test(cell)
            )) {
              headerRowIndex = i;
              break;
            }
          }

          const headers = (rawData[headerRowIndex] || []).map(h => h != null ? String(h).trim() : h);
          const dataRows = rawData.slice(headerRowIndex + 1);

          const headerIndexMap = {};
          headers.forEach((h, idx) => {
            if (h != null) {
              if (!headerIndexMap[h]) headerIndexMap[h] = [];
              headerIndexMap[h].push(idx);
              const lower = h.toLowerCase();
              if (!headerIndexMap[lower]) headerIndexMap[lower] = [];
              headerIndexMap[lower].push(idx);
              const stripped = h.replace(/[\s/()]+/g, '').toLowerCase();
              if (!headerIndexMap[stripped]) headerIndexMap[stripped] = [];
              headerIndexMap[stripped].push(idx);
            }
          });

          const getVal = (rowArr, ...possibleNames) => {
            for (const name of possibleNames) {
              const candidates = [name, name.toLowerCase(), name.replace(/[\s/()]+/g, '').toLowerCase()];
              for (const c of candidates) {
                if (headerIndexMap[c] && headerIndexMap[c].length) {
                  const idx = headerIndexMap[c][0];
                  return rowArr[idx] != null ? String(rowArr[idx]).trim() : '';
                }
              }
            }
            return '';
          };

          const parsed = dataRows.map((row, idx) => {
            const fullName = getVal(row, 'Full Name', 'Fullname', 'Name');
            const email = getVal(row, 'Email Address', 'Email');
            const employeeId = getVal(row, 'Employee ID', 'EmployeeID');
            const department = getVal(row, 'Department');
            const positionTitle = getVal(row, 'Position/Job Title', 'Position Title', 'Position');
            const contactNumber = getVal(row, 'Contact Number', 'Contact');
            const employmentStatus = getVal(row, 'Employment Status', 'Status');
            const dateHired = getVal(row, 'Date Hired', 'DateHired');
            const birthdate = getVal(row, 'Birthdate', 'Birth Date');
            const address = getVal(row, 'Address');

            return {
              rowIndex: idx + headerRowIndex + 2,
              fullName,
              email,
              employeeId,
              department,
              positionTitle,
              contactNumber,
              employmentStatus,
              dateHired,
              birthdate,
              address,
              valid: !!fullName && !!email,
            };
          }).filter(p => p.fullName || p.email);

          setPreviewData(parsed.slice(0, 10));
          setStage("preview");
        } catch (err) {
          setError(`Error parsing Excel file: ${err.message}`);
        }
      };

      reader.onerror = () => {
        setError("Error reading file");
      };

      reader.readAsArrayBuffer(excelFile);
    } catch (err) {
      setError(`Error processing file: ${err.message}`);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError("Please select a valid Excel file (.xlsx, .xls, or .csv)");
      return;
    }

    setFile(selectedFile);
    setError(null);
    parseUserExcel(selectedFile);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    if (!defaultPassword || defaultPassword.length < 8) {
      setError("Default password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setStage("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", defaultPassword);
      formData.append("role", defaultRole);

      const response = await bulkUploadUsers(formData);

      if (response.data.status === "success") {
        setSuccessMessage(
          `Successfully created ${response.data.data.successful} user(s). ${
            response.data.data.failed > 0
              ? `${response.data.data.failed} failed.`
              : ""
          }`
        );
        setStage("success");
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 3000);
      } else {
        setError(response.data.message || "Upload failed");
        setStage("preview");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Upload failed. Please try again.");
      setStage("preview");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setStage("upload");
    setError(null);
    setSuccessMessage("");
    setPreviewData([]);
    setDefaultPassword('');
    setDefaultRole('employee');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className={cn(
        "relative z-10 w-full rounded-2xl shadow-2xl max-w-3xl",
        "bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "animate-in fade-in zoom-in-95 duration-150"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              Bulk Upload Users
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Upload an Excel file to create multiple user accounts at once
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {stage === "upload" && (
            <>
              {/* Default Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Default Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    placeholder="Temporary password for all users"
                    className="w-full rounded-lg border px-2.5 py-1.5 text-sm border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Default Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defaultRole}
                    onChange={(e) => setDefaultRole(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 text-sm border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="department_head">Department Head</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-4">
                <h3 className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                  Expected Columns
                </h3>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mb-2">
                  The Excel file should contain the following columns. Column headers are case-insensitive.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {USER_COLUMNS.map((col) => (
                    <span key={col} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Upload Area */}
              <div
                onClick={handleFileClick}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer",
                  "border-neutral-300 dark:border-neutral-700",
                  "hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5",
                  "transition-all duration-200"
                )}
              >
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-xl mb-3",
                    "bg-indigo-50 dark:bg-indigo-500/10",
                    "border border-indigo-200 dark:border-indigo-500/20"
                  )}>
                    <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Excel files (.xlsx, .xls, .csv) up to 10MB
                  </p>
                  {file && (
                    <div className="mt-3 flex items-center gap-2 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {file.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </>
          )}

          {stage === "preview" && (
            <>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3">
                <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-1">
                  Preview ({previewData.length} shown)
                </p>
                <p className="text-[10px] text-blue-700 dark:text-blue-400">
                  Default Role: <span className="font-semibold">{defaultRole}</span>
                </p>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-neutral-50 dark:bg-neutral-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Full Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Employee ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Department</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Role</th>
                      <th className="px-3 py-2 text-center font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {previewData.map((item, idx) => (
                      <tr key={idx} className="bg-white dark:bg-neutral-900">
                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.fullName}</td>
                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.email}</td>
                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.employeeId || '—'}</td>
                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.department || '—'}</td>
                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{defaultRole}</td>
                        <td className="px-3 py-2 text-center">
                          {item.valid ? (
                            <span className="text-emerald-600 dark:text-emerald-400">&#10003;</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">&#10007;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </>
          )}

          {stage === "uploading" && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-4">
                <Loader className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                Uploading and creating user accounts...
              </p>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `50%` }}
                />
              </div>
            </div>
          )}

          {stage === "success" && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{successMessage}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                The modal will close automatically...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(stage === "upload" || stage === "preview") && (
          <div className="flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
            <div className="flex gap-2">
              {stage === "preview" && (
                <button
                  onClick={() => setStage("upload")}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium",
                    "border-neutral-200 dark:border-neutral-700",
                    "text-neutral-600 dark:text-neutral-400",
                    "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    "transition-colors duration-150",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ChevronLeft className="w-3 h-3" />
                  Back
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                disabled={loading}
                className={cn(
                  "rounded-lg border px-4 py-1.5 text-[11px] font-medium",
                  "border-neutral-200 dark:border-neutral-700",
                  "bg-white dark:bg-neutral-900",
                  "text-neutral-600 dark:text-neutral-400",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                  "transition-colors duration-150",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                Cancel
              </button>
              {stage === "upload" && (
                <button
                  onClick={() => file && setStage("preview")}
                  disabled={!file || loading || !defaultPassword || defaultPassword.length < 8}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-4 py-1.5 text-[11px] font-semibold",
                    "bg-indigo-600 text-white",
                    "hover:bg-indigo-700 active:bg-indigo-800",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-150"
                  )}
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
              {stage === "preview" && (
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-4 py-1.5 text-[11px] font-semibold",
                    "bg-indigo-600 text-white",
                    "hover:bg-indigo-700 active:bg-indigo-800",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-150"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader className="w-3 h-3 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
