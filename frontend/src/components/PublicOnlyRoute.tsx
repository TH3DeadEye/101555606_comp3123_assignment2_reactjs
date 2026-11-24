import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Login and signup make no sense for someone who is already logged in.
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/employees" replace />;
  return <Outlet />;
}
