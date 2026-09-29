import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Gate a route subtree to signed-in users, optionally restricted to specific roles. */
export default function ProtectedRoute({ roles }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;

  if (!user) {
    const role = location.pathname.split("/")[1] || "admin";
    return <Navigate to={`/login/${role}`} replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <Outlet />;
}
