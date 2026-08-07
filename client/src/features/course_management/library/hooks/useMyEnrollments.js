import { useEffect, useState } from "react";
import { getEnrollments } from "@/features/course_management/api/enrollment.api";
import * as session from "@/services/session";

export function useMyEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = session.getCurrentUser();
    if (!user) {
      setEnrollments([]);
      return;
    }

    let cancel = false;
    setLoading(true);
    setError(null);

    getEnrollments({ user_id: user.id, limit: 200 })
      .then((res) => {
        if (cancel) return;
        const rows = res.data || [];
        const map = {};
        rows.forEach((e) => {
          map[e.course_id] = {
            progress: e.progress_percentage || 0,
            status: e.status,
            enrollmentId: e.id,
          };
        });
        setEnrollments(map);
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
  }, []);

  return { myEnrollments: enrollments, loading, error };
}

export default useMyEnrollments;
