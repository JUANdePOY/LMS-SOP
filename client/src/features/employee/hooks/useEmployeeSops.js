import { useState, useEffect, useCallback, useRef } from "react";
import { getEmployeeSops } from "../api/employeeSop.api";

function serializeParams(params) {
  if (!params) return "";
  return JSON.stringify(
    Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {})
  );
}

export function useEmployeeSops(params = {}) {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const cancelRef = useRef(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchSops = useCallback(async (p) => {
    const queryParams = p || paramsRef.current;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const result = await getEmployeeSops(queryParams);
      if (!cancelRef.current) {
        const data = result.data?.rows || result.data || [];
        setSops(Array.isArray(data) ? data : []);
        setPagination({
          page: result.pagination?.page || queryParams.page || 1,
          limit: result.pagination?.limit || queryParams.limit || 20,
          total: result.pagination?.total || (Array.isArray(data) ? data.length : 0),
          totalPages: result.pagination?.totalPages || 1,
        });
      }
    } catch (err) {
      if (!cancelRef.current) setError(err.message || "Failed to load SOPs");
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  const paramsKey = serializeParams(params);

  useEffect(() => {
    fetchSops();
    return () => { cancelRef.current = true; };
  }, [fetchSops, paramsKey]);

  return { sops, loading, error, pagination, refetch: fetchSops };
}

export default useEmployeeSops;
