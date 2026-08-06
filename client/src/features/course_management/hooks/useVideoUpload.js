import { useCallback, useRef, useState } from "react";

/**
 * Upload a file with progress reporting, cancel, and retry support.
 * Uses XMLHttpRequest so upload progress is observable (fetch does not
 * expose upload progress in all browsers). The returned promise resolves
 * with the parsed JSON response.
 */
export function useVideoUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const xhrRef = useRef(null);

  const upload = useCallback((endpoint, file, extra = {}) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      setUploading(true);
      setError(null);
      setProgress(0);

      xhr.open("POST", endpoint, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({});
          }
        } else {
          let message = "Upload failed";
          try {
            const body = JSON.parse(xhr.responseText);
            if (body?.message) message = body.message;
          } catch {
            /* keep default */
          }
          setError(message);
          reject(new Error(message));
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setError("Network error during upload");
        reject(new Error("Network error during upload"));
      };

      xhr.onabort = () => {
        setUploading(false);
        reject(new Error("Upload cancelled"));
      };

      const form = new FormData();
      form.append("file", file);
      Object.entries(extra).forEach(([k, v]) => form.append(k, v));

      xhr.send(form);
    });
  }, []);

  const cancel = useCallback(() => {
    if (xhrRef.current) xhrRef.current.abort();
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setUploading(false);
    setError(null);
  }, []);

  return { upload, cancel, reset, progress, uploading, error };
}
