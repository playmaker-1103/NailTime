import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { checkingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (checkingAuth) {
    return (
      <section className="content-shell section">
        <p className="status-message">Checking admin session...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
