import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, RolAdministrativo, AUTH_STORAGE_KEY } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRole: RolAdministrativo;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRole,
  children,
}) => {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Protección activa contra uso de flecha "Atrás" del navegador (bfcache / popstate) tras logout
  useEffect(() => {
    const verifyActiveSession = () => {
      try {
        const stored =
          localStorage.getItem(AUTH_STORAGE_KEY) ||
          sessionStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) {
          logout();
          navigate('/login', { replace: true });
        }
      } catch {
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener('popstate', verifyActiveSession);
    window.addEventListener('pageshow', verifyActiveSession);

    return () => {
      window.removeEventListener('popstate', verifyActiveSession);
      window.removeEventListener('pageshow', verifyActiveSession);
    };
  }, [logout, navigate]);

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.rol !== allowedRole) {
    const targetPath =
      user.rol === 'Jefe de Consultorio' ? '/admin/jefe' : '/admin/asesor';
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};

/**
 * Controlador de Enrutamiento por Rol (RBAC Dispatcher):
 * Evalúa la sesión activa y dirige automáticamente al usuario a la vista exclusiva de su rol
 * sin mezclar componentes:
 * - Jefe de Consultorio -> /admin/jefe (Métricas y supervisión)
 * - Asesor Jurídico -> /admin/asesor (Gestión de casos asignados)
 * - Ciudadano / Sin sesión -> /portal (Solicitudes ciudadanas) o /login
 */
export const RoleRouterController: React.FC<{ fallbackToLogin?: boolean }> = ({
  fallbackToLogin = true,
}) => {
  const { user, token } = useAuth();

  if (!user || !token) {
    return <Navigate to={fallbackToLogin ? '/login' : '/portal'} replace />;
  }

  if (user.rol === 'Jefe de Consultorio') {
    return <Navigate to="/admin/jefe" replace />;
  }

  if (user.rol === 'Asesor Jurídico') {
    return <Navigate to="/admin/asesor" replace />;
  }

  return <Navigate to="/portal" replace />;
};
