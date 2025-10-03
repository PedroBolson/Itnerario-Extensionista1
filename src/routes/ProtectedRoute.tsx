import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60svh] grid place-items-center text-theme-secondary">
        Carregando...
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/admin" replace state={{ from: location }} />;
  }

  if (!profile.isActive) {
    return <Navigate to="/admin" replace state={{ from: location, reason: 'inactive' }} />;
  }

  return <Outlet />;
}

