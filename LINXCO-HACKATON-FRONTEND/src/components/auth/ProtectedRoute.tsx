import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, RolAdministrativo } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRole: RolAdministrativo;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRole,
  children,
}) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.rol !== allowedRole) {
    const targetPath =
      user.rol === 'Jefe de Consultorio' ? '/admin/jefe' : '/admin/asesor';
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};
