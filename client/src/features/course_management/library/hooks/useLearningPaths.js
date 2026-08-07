import { useEffect, useState } from "react";
import { getLearningPaths, getLearningPath } from "../services/library.api";

export function useLearningPaths(params = {}) {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    getLearningPaths(JSON.parse(paramsKey))
      .then((res) => {
        if (!cancel) setPaths(res.data || []);
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [paramsKey]);

  return { paths, loading, error };
}

export function useLearningPathDetail(id) {
  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    setLoading(true);
    setError(null);
    getLearningPath(id)
      .then((res) => {
        if (!cancel) setPath(res.data || null);
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [id]);

  return { path, loading, error };
}

export default useLearningPaths;
