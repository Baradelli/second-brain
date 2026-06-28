import { isAuthenticated } from '@cerebro/shared/client';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Guarda de rota: sem token, manda para /login. Com token, renderiza a rota
 * protegida (via <Outlet/>).
 */
export function RequireAuth() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
