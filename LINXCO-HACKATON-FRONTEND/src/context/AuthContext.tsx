import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

export type RolAdministrativo = 'Jefe de Consultorio' | 'Asesor Jurídico';

export interface AdminUser {
  id: string;
  numero_documento: string;
  nombre_completo: string;
  rol: RolAdministrativo;
  telefono?: string;
}

interface LoginCredentials {
  numero_documento?: string;
  password?: string;
  usuario_id?: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  demoUsers: AdminUser[];
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<AdminUser>;
  logout: () => void;
}

const STORAGE_KEY = 'linxco_admin_auth_v1';

export const FALLBACK_ADMIN_USERS: AdminUser[] = [
  {
    id: '4481df48-b9ca-40ef-8529-be92c2075850',
    numero_documento: '1000100100',
    nombre_completo: 'Dr. Carlos Mendoza (Jefe de Consultorio)',
    rol: 'Jefe de Consultorio',
  },
  {
    id: '2560932a-26be-4c20-88bd-074e5389f29b',
    numero_documento: '1000200201',
    nombre_completo: 'Laura Valentina Ríos (Asesora Jurídica)',
    rol: 'Asesor Jurídico',
  },
  {
    id: '5a2771b9-d6b7-4688-9e6a-3c9a9188d0c0',
    numero_documento: '1000200202',
    nombre_completo: 'Andrés Felipe Morales (Asesor Jurídico)',
    rol: 'Asesor Jurídico',
  },
  {
    id: 'a9ac8d87-69c5-462d-9924-6c8ceaded534',
    numero_documento: '1000200203',
    nombre_completo: 'Camila Andrea Soto (Asesora Jurídica)',
    rol: 'Asesor Jurídico',
  },
];

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.user || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.token || null;
    } catch {
      return null;
    }
  });

  const [demoUsers, setDemoUsers] = useState<AdminUser[]>(FALLBACK_ADMIN_USERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiFetch<{ usuarios?: AdminUser[] }>('/auth/usuarios-demo')
      .then((res) => {
        if (mounted && res?.usuarios && res.usuarios.length > 0) {
          setDemoUsers(res.usuarios);
        }
      })
      .catch(() => {
        // Mantiene FALLBACK_ADMIN_USERS si el servidor está apagado
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AdminUser> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{
        success: boolean;
        token: string;
        user: AdminUser;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      setUser(response.user);
      setToken(response.token);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: response.user, token: response.token })
      );
      return response.user;
    } catch (err) {
      // Fallback local si el backend está offline y coincide con un usuario semilla
      const found = demoUsers.find(
        (u) =>
          (credentials.usuario_id && u.id === credentials.usuario_id) ||
          (credentials.numero_documento &&
            u.numero_documento === credentials.numero_documento.trim())
      );

      const errMsg = (err as Error)?.message || 'Error al iniciar sesión';
      const isOfflineErr =
        errMsg.includes('conexión') ||
        errMsg.includes('tiempo de espera') ||
        errMsg.includes('HTTP error 5');

      if (found && isOfflineErr) {
        const offlineToken = `offline-token-${found.id}`;
        setUser(found);
        setToken(offlineToken);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: found, token: offlineToken })
        );
        return found;
      }

      setError(errMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        demoUsers,
        isLoading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      token: null,
      demoUsers: FALLBACK_ADMIN_USERS,
      isLoading: false,
      error: null,
      login: async () => FALLBACK_ADMIN_USERS[0],
      logout: () => {},
    };
  }
  return ctx;
}
