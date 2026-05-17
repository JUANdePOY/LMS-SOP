import { useState, useRef, useEffect } from "react";
import { X, Upload, AlertCircle, CheckCircle, Loader, FileText, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { bulkUploadReservists, getArcens, getGroupsList } from "@/services/api";

export default function BulkUploadModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stage, setStage] = useState("upload");
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [arsens, setArsens] = useState([]);
  const [selectedArsen, setSelectedArsen] = useState(null);
  const [loadingArsens, setLoadingArsens] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    loadArsensAndGroups();
  }, []);

  const loadArsensAndGroups = async () => {
    try {
      setLoadingArsens(true);
      setLoadingGroups(true);
      const [arsenRes, groupRes] = await Promise.all([
        getArcens({ is_active: true }),
        getGroupsList({ is_active: true })
      ]);
      if (arsenRes.data.status === 'success') {
        const arsenList = arsenRes.data.data || [];
        setArsens(arsenList);
      }
      if (groupRes.data.status === 'success') {
        setGroups(groupRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load ARSENs or Groups:', err);
    } finally {
      setLoadingArsens(false);
      setLoadingGroups(false);
    }
  };

  const filteredGroups = groups.filter(g => {
    if (!selectedArsen) return false;
    const arsenId = g.arsen_id != null ? parseInt(g.arsen_id, 10) : null;
    return arsenId === selectedArsen;
  });

  const parseExcelFile = (excelFile) => {
    try {
      setParseError(null);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheets = workbook.SheetNames;
          setSheetNames(sheets);

          const firstSheet = sheets[0];
          const worksheet = workbook.Sheets[firstSheet];
          
          // Get raw data as array of arrays to detect header row
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Find the header row index by looking for expected column names
          // The header row should contain cells like "DESCRIPTION/POSITION", "GRADE", "AFSC", "REQUIRED", "NAME"
          let headerRowIndex = 0;
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell => 
              cell && typeof cell === 'string' && 
              (cell === 'DESCRIPTION/POSITION' || cell === 'GRADE' || cell === 'AFSC' || 
               cell === 'REQUIRED' || cell === 'NAME' || cell === 'Position' || cell === 'Name')
            )) {
              headerRowIndex = i;
              break;
            }
          }

          // Extract header names from the detected header row and build data rows manually
          const headers = rawData[headerRowIndex] || [];
          const dataRows = rawData.slice(headerRowIndex + 1);
          const jsonData = dataRows.map(row => {
            const obj = {};
            headers.forEach((key, idx) => {
              if (key != null) obj[key] = row[idx];
            });
            return obj;
          });
          
          // Filter out non-data rows (section headers, totals, etc.)
          const filteredData = jsonData.filter(row => {
            const position = (row["DESCRIPTION/POSITION"] || row["Position"] || "").trim();
            const name = (row["NAME"] || row["Name"] || "").trim();
            if (!name || name.length < 3) return false;
            const nameUpper = name.toUpperCase();
            if (nameUpper === 'VACANT' || nameUpper.includes('VACANT')) return false;
            const posUpper = position.toUpperCase();
            if (posUpper.includes("TOTAL") || posUpper === "SAFETY" || posUpper.includes("BRANCH")) return false;
            return true;
          });

          const preview = filteredData.slice(0, 3).map((row, idx) => ({
            sheetName: firstSheet,
            sheetIndex: 0,
            rowIndex: idx + 1,
            data: {
              position: row["DESCRIPTION/POSITION"] || row["Position"] || "",
              grade: row["GRADE"] || "",
              afsc: row["AFSC"] || "",
              required: row["REQUIRED"] || row["Required"] || "",
              name: row["NAME"] || row["Name"] || "",
            },
          }));

          setPreviewData(preview);
          setStage("preview");
          setPreviewing(false);
        } catch (err) {
          setParseError(`Error parsing Excel file: ${err.message}`);
          setPreviewing(false);
        }
      };

      reader.onerror = () => {
        setParseError("Error reading file");
        setPreviewing(false);
      };

      reader.readAsArrayBuffer(excelFile);
    } catch (err) {
      setParseError(`Error processing file: ${err.message}`);
      setPreviewing(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls") &&
      !selectedFile.name.endsWith(".csv")
    ) {
      setError("Please select a valid Excel file (.xlsx, .xls, or .csv)");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setPreviewing(true);
    parseExcelFile(selectedFile);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file || !selectedArsen) {
      setError("Please select an ARSEN first");
      return;
    }

    setLoading(true);
    setError(null);
    setStage("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("arsen_id", selectedArsen);
      if (selectedGroup) {
        formData.append("group_id", selectedGroup);
      }

      const response = await bulkUploadReservists(formData);

      if (response.status === "success") {
        setSuccessMessage(
          `Successfully uploaded ${response.data.successful} reservist(s). ${
            response.data.failed > 0 ? `${response.data.failed} failed.` : ""
          }`
        );
        setStage("success");
        setUploadProgress(100);

        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 3000);
      } else {
        setError(response.message || "Upload failed");
        setStage("preview");
      }
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
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
    setPreviewData(null);
    setSheetNames([]);
    setParseError(null);
    setUploadProgress(0);
    setSelectedArsen(null);
    setSelectedGroup(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <div className={cn(
        "relative z-10 w-full rounded-2xl shadow-2xl max-w-2xl",
        "bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "animate-in fade-in zoom-in-95 duration-150"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              Bulk Upload Reservists
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Upload Excel file with position data for multiple reservists
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
              {/* Instructions */}
              <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-4">
                <h3 className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                  File Format Requirements
                </h3>
                <ul className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1 ml-4 list-disc">
                  <li>
                    <strong>First sheet:</strong> Group positions (unit manning document)
                  </li>
                  <li>Other sheets: Squadron positions</li>
                  <li>
                    <strong>Required columns:</strong> DESCRIPTION/POSITION, GRADE, AFSC, REQUIRED, NAME
                  </li>
                </ul>
              </div>

              {/* ARSEN Selection */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                  Select ARSEN (Air Reserve Squadron Center) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedArsen || ""}
                  onChange={(e) => setSelectedArsen(parseInt(e.target.value))}
                  disabled={loadingArsens}
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-1.5 text-sm",
                    "border-neutral-200 dark:border-neutral-700",
                    "bg-white dark:bg-neutral-800",
                    "text-neutral-800 dark:text-neutral-200",
                    "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
                    "transition-all duration-150 cursor-pointer",
                    loadingArsens && "cursor-not-allowed opacity-60"
                  )}
                >
                  <option value="">
                    {loadingArsens ? "Loading ARSENs..." : "Select an ARSEN..."}
                  </option>
                  {arsens.map((arsen) => (
                    <option key={arsen.id} value={arsen.id}>
                      {arsen.name} {arsen.code ? `(${arsen.code})` : ""}
                    </option>
                  ))}
                </select>
                {arsens.length === 0 && !loadingArsens && (
                  <p className="text-[11px] text-red-600">
                    ⚠️ No active ARSENs available. Please create one first.
                  </p>
                )}
              </div>

              {/* Group Selection */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                  Select Group (Optional)
                </label>
                <select
                  value={selectedGroup || ""}
                  onChange={(e) => setSelectedGroup(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!selectedArsen || loadingGroups}
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-1.5 text-sm",
                    "border-neutral-200 dark:border-neutral-700",
                    "bg-white dark:bg-neutral-800",
                    "text-neutral-800 dark:text-neutral-200",
                    "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
                    "transition-all duration-150 cursor-pointer",
                    (!selectedArsen || loadingGroups) && "cursor-not-allowed opacity-60"
                  )}
                >
                  <option value="">
                    {!selectedArsen ? "Select an ARSEN first..." : loadingGroups ? "Loading groups..." : "Select a Group..."}
                  </option>
                  {filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {selectedArsen && filteredGroups.length === 0 && !loadingGroups && (
                  <p className="text-[11px] text-amber-600">
                    No active groups available for this ARSEN.
                  </p>
                )}
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

          {stage === "preview" && previewData && (
            <>
              {/* Selection Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3">
                  <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide mb-1">
                    Selected ARSEN
                  </p>
                  <p className="text-[12px] font-medium text-emerald-900 dark:text-emerald-200">
                    {arsens.find(a => a.id === selectedArsen)?.name || "Unknown"}
                    {arsens.find(a => a.id === selectedArsen)?.code && (
                      <span className="text-neutral-600 dark:text-neutral-400"> ({arsens.find(a => a.id === selectedArsen)?.code})</span>
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3">
                  <p className="text-[10px] font-semibold text-violet-800 dark:text-violet-300 uppercase tracking-wide mb-1">
                    Selected Group
                  </p>
                  <p className="text-[12px] font-medium text-violet-900 dark:text-violet-200">
                    {selectedGroup
                      ? groups.find(g => g.id === selectedGroup)?.name || "Unknown"
                      : "None (will use ARSEN default)"}
                  </p>
                </div>
              </div>

              {/* Sheet Names */}
              {sheetNames.length > 0 && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3">
                  <p className="text-[10px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-2">
                    Sheets/Squadrons Found ({sheetNames.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sheetNames.map((name, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium",
                          idx === 0
                            ? "bg-blue-500 text-white"
                            : "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300"
                        )}
                      >
                        {idx === 0 ? "🏢 " : "🛩️ "}
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Data Table */}
              <div>
                <h3 className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
                  Preview (First 3 Records from First Sheet)
                </h3>
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Position</th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Grade</th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">AFSC</th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Required</th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {previewData.map((item, idx) => (
                        <tr key={idx} className="bg-white dark:bg-neutral-900">
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.position}</td>
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.grade}</td>
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.afsc}</td>
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.required}</td>
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">{parseError}</p>
                </div>
              )}

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
                Uploading and processing your Excel file...
              </p>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
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
                  disabled={!file || loading}
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