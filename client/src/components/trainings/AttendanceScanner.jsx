import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Keyboard, ScanLine, X, AlertCircle, CheckCircle2, Loader } from 'lucide-react';

export default function AttendanceScanner({ onScan, scanMethod: initialMethod = 'barcode_scanner', disabled = false }) {
  const [scanMethod, setScanMethod] = useState(initialMethod);
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const bufferRef = useRef('');
  const bufferTimerRef = useRef(null);

  const handleScan = useCallback(async (barcode) => {
    if (!barcode || scanning || disabled) return;
    setScanning(true);
    setError(null);
    setLastResult(null);
    try {
      const result = await onScan(barcode.trim(), scanMethod);
      setLastResult({ success: true, message: result?.message || 'Scan successful', data: result });
      setManualInput('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Scan failed';
      setLastResult({ success: false, message: msg });
      setError(msg);
    } finally {
      setScanning(false);
    }
  }, [onScan, scanMethod, scanning, disabled]);

  useEffect(() => {
    if (scanMethod === 'barcode_scanner' && !disabled) {
      const handleKeyDown = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
        if (e.key === 'Enter' && bufferRef.current.length > 0) {
          handleScan(bufferRef.current);
          bufferRef.current = '';
          return;
        }
        if (e.key.length === 1) {
          bufferRef.current += e.key;
          bufferTimerRef.current = setTimeout(() => {
            if (bufferRef.current.length > 0) {
              handleScan(bufferRef.current);
              bufferRef.current = '';
            }
          }, 100);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
      };
    }
  }, [scanMethod, handleScan, disabled]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScan(manualInput);
    }
  };

  const clearResult = () => {
    setLastResult(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setScanMethod('barcode_scanner')}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
            scanMethod === 'barcode_scanner'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={disabled}
        >
          <ScanLine className="h-4 w-4" />
          Barcode Scanner
        </button>
        <button
          type="button"
          onClick={() => setScanMethod('camera')}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
            scanMethod === 'camera'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={disabled}
        >
          <Camera className="h-4 w-4" />
          Camera
        </button>
        <button
          type="button"
          onClick={() => setScanMethod('manual')}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
            scanMethod === 'manual'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={disabled}
        >
          <Keyboard className="h-4 w-4" />
          Manual Input
        </button>
      </div>

      {scanMethod === 'barcode_scanner' && (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
          <ScanLine className="h-12 w-12 text-indigo-400 mb-3" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Ready to scan
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Point barcode scanner at reservist ID badge
          </p>
          {scanning && (
            <Loader className="h-6 w-6 text-indigo-500 animate-spin mt-3" />
          )}
        </div>
      )}

      {scanMethod === 'camera' && (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
          <Camera className="h-12 w-12 text-indigo-400 mb-3" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Camera scanning
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Position barcode within camera view
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Camera barcode scanning requires a compatible library (e.g., @zxing/library)
          </p>
        </div>
      )}

      {scanMethod === 'manual' && (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter barcode or service number..."
            className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            disabled={scanning || disabled}
            autoFocus
          />
          <button
            type="submit"
            disabled={scanning || disabled || !manualInput.trim()}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {scanning ? <Loader className="h-4 w-4 animate-spin" /> : 'Submit'}
          </button>
        </form>
      )}

      {lastResult && (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          lastResult.success
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
        }`}>
          {lastResult.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              lastResult.success
                ? 'text-emerald-800 dark:text-emerald-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {lastResult.message}
            </p>
            {lastResult.success && lastResult.data?.reservist && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {lastResult.data.reservist.name} · {lastResult.data.reservist.service_number}
              </p>
            )}
          </div>
          <button onClick={clearResult} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
