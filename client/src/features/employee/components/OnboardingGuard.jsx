import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getMyOnboarding } from "../api/employeeOnboarding.api";

export default function OnboardingGuard({ children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const exemptRoles = ['super_admin', 'admin', 'department_head'];

  useEffect(() => {
    if (!isAuthenticated || exemptRoles.includes(user?.role)) {
      setAllowed(true);
      setChecking(false);
      return;
    }

    let cancelled = false;
    getMyOnboarding()
      .then(res => {
        if (cancelled) return;
        setAllowed(res?.success && res?.data?.is_complete);
      })
      .catch(() => {
        if (cancelled) return;
        setAllowed(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, user?.role]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/my-learning/onboarding" replace state={{ from: location }} />;
  }

  return children;
}