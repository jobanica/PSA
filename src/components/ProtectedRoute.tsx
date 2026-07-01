import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!session) return <Navigate to="/staff/login" replace />;
  return <>{children}</>;
}
