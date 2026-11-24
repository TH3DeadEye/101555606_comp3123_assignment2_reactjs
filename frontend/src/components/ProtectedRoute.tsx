import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Wraps every page that needs a login. A visitor without a session is sent to
// /login, whichever URL they typed or bookmarked.
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
