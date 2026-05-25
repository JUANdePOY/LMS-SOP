import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Keyboard, ScanLine, QrCode, X, AlertCircle, CheckCircle2, Loader } from 'lucide-react';

export default function AttendanceScanner({ onScan, scanMethod: initialMethod = 'qr_scanner', disabled = false }) {
  const [scanMethod, setScanMethod] = useState(initialMethod);
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const inputRef = useRef(null);
  const bufferRef = useRef('');
  const bufferTimerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const codeReaderRef = useRef(null);

  const handleScan = useCallback(async (qrCode) => {
    if (!qrCode || scanning || disabled) return;
    setScanning(true);
    setError(null);
    setLastResult(null);
    try {
      const result = await onScan(qrCode.trim(), scanMethod);
      const scanResult = { success: true, message: result?.message || 'Scan successful', data: result, timestamp: Date.now() };
      setLastResult(scanResult);
      setRecentScans(prev => [scanResult, ...prev].slice(0, 10));
      setManualInput('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Scan failed';
      const scanResult = { success: false, message: msg, timestamp: Date.now() };
      setLastResult(scanResult);
      setRecentScans(prev => [scanResult, ...prev].slice(0, 10));
      setError(msg);
    } finally {
      setScanning(false);
    }
  }, [onScan, scanMethod, scanning, disabled]);

  useEffect(() => {
    if (scanMethod === 'qr_scanner' && !disabled) {
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

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch {}
      codeReaderRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      try {
        const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/library');
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);

          try {
            const result = codeReader.decodeFromCanvas(canvas);
            if (result?.text) {
              handleScan(result.text);
            }
          } catch (e) {
            if (!(e instanceof NotFoundException)) {
              // ignore scan errors
            }
          }
        }, 250);
      } catch (libErr) {
        setCameraError('Camera QR code scanning requires @zxing/library. Install it with: npm install @zxing/library');
        setCameraActive(false);
        stopCamera();
      }
    } catch (err) {
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions.'
        : 'Could not access camera. Ensure a camera is connected.');
      setCameraActive(false);
    }
  }, [handleScan, stopCamera]);

  useEffect(() => {
    if (scanMethod === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanMethod, startCamera, stopCamera]);

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
          onClick={() => setScanMethod('qr_scanner')}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
            scanMethod === 'qr_scanner'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={disabled}
        >
          <QrCode className="h-4 w-4" />
          QR Scanner
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

      {scanMethod === 'qr_scanner' && (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
          <QrCode className="h-12 w-12 text-indigo-400 mb-3" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Ready to scan
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Point QR scanner at reservist ID badge
          </p>
          {scanning && (
            <Loader className="h-6 w-6 text-indigo-500 animate-spin mt-3" />
          )}
        </div>
      )}

      {scanMethod === 'camera' && (
        <div className="space-y-3">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl bg-amber-50 dark:bg-amber-950/20">
              <Camera className="h-12 w-12 text-amber-400 mb-3" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Camera Unavailable
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 text-center max-w-xs">
                {cameraError}
              </p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full aspect-video object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-indigo-400 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-400/60 animate-pulse" />
                  </div>
                </div>
              )}
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
                  <Loader className="h-8 w-8 text-indigo-400 animate-spin" />
                </div>
              )}
            </div>
          )}
          {cameraActive && (
            <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
              Position QR code within the frame. Scanning happens automatically.
            </p>
          )}
        </div>
      )}

      {scanMethod === 'manual' && (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter QR code or service number..."
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

      {recentScans.length > 1 && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Recent Scans</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {recentScans.slice(1).map((scan, i) => (
              <div key={scan.timestamp + '-' + i} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${
                scan.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
              }`}>
                {scan.success ? (
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="truncate">{scan.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
