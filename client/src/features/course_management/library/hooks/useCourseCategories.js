import { useEffect, useState } from "react";
import { getCourseLibraryCategories } from "../services/library.api";

export function useCourseCategories(params = {}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    getCourseLibraryCategories(JSON.parse(paramsKey))
      .then((res) => {
        if (!cancel) setCategories(res.data || []);
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

  return { categories, loading, error };
}

export default useCourseCategories;
