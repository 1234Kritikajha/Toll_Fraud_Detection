import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <div className="p-6 text-sm text-slate-500">Checking authentication...</div>;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

