import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
