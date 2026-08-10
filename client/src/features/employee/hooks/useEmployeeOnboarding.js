import { useState, useCallback, useEffect } from "react";
import { getMyOnboarding, acknowledgeOnboardingSop } from "../api/employeeOnboarding.api";

export function useEmployeeOnboarding() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOnboarding = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyOnboarding();
      if (res?.success) {
        setData(res.data);
      } else {
        throw new Error(res?.message || "Failed to load onboarding status");
      }
    } catch (err) {
      setError(err.message || "Failed to load onboarding status");
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledge = useCallback(async (ackId) => {
    const res = await acknowledgeOnboardingSop(ackId);
    if (!res?.success) {
      throw new Error(res?.message || "Failed to acknowledge SOP");
    }
    await fetchOnboarding();
  }, [fetchOnboarding]);

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);

  return { data, loading, error, refetch: fetchOnboarding, acknowledge };
}