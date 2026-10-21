import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AdminUser } from '../context/AuthContext';
import {
  Lock,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  Briefcase,
  Scale,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { login, demoUsers, isLoading, error } = useAuth();

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleRedirectByRole = (loggedUser: AdminUser) => {
    if (loggedUser.rol === 'Jefe de Consultorio') {
      navigate('/admin/jefe');
    } else {
      navigate('/admin/asesor');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!numeroDocumento.trim()) {
      setLocalError('Ingresa tu número de documento.');
      return;
    }

    try {
      const loggedUser = await login({
        numero_documento: numeroDocumento.trim(),
        password: password.trim(),
      });
      handleRedirectByRole(loggedUser);
    } catch (err) {
      setLocalError((err as Error)?.message || 'Credenciales inválidas');
    }
  };

  const handleQuickLogin = async (demoUser: AdminUser) => {
    setLocalError(null);
    try {
      const loggedUser = await login({ usuario_id: demoUser.id });
      handleRedirectByRole(loggedUser);
    } catch (err) {
      setLocalError((err as Error)?.message || 'No se pudo iniciar sesión');
    }
  };

  return (
    <div className="py-5 space-y-6 flex-1">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-sm font-bold text-brand-900 hover:underline focus:outline-none"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al portal ciudadano</span>
      </button>

      <div className="bg-brand-950 text-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-900 text-emerald-200 text-xs font-bold uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          <span>Acceso Institucional</span>
        </div>
        <h2 className="text-xl font-black leading-tight">
          Portal de Consultorio Jurídico
        </h2>
        <p className="text-xs text-slate-200 leading-relaxed">
          Ingresa con tus credenciales para acceder al panel de{' '}
          <strong className="text-white">Jefe de Consultorio</strong> o de{' '}
          <strong className="text-white">Asesor Jurídico</strong>.
        </p>
      </div>

      {(localError || error) && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border-2 border-red-700 text-red-950 flex items-start gap-2.5 text-xs font-bold"
        >
          <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <span>{localError || error}</span>
        </div>
      )}

      {/* Formulario de Login Tradicional */}
      <form
        onSubmit={handleSubmit}
        className="p-5 rounded-2xl bg-white border-2 border-slate-300 shadow-sm space-y-4"
      >
        <div>
          <label
            htmlFor="login-documento"
            className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5"
          >
            Número de Documento
          </label>
          <input
            id="login-documento"
            type="text"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
            placeholder="Ej. 1000100100 (Jefe) o 1000200201 (Asesor)"
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border-2 border-slate-400 text-slate-950 font-semibold text-sm focus:outline-none focus:border-brand-900"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5"
          >
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ej. admin123 o asesor123"
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border-2 border-slate-400 text-slate-950 font-semibold text-sm focus:outline-none focus:border-brand-900"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-brand-900 hover:bg-brand-950 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 border-2 border-slate-950 shadow-sm"
        >
          <UserCheck className="w-5 h-5 text-emerald-300" />
          <span>{isLoading ? 'Verificando acceso...' : 'Iniciar Sesión'}</span>
        </button>
      </form>

      {/* Acceso Rápido por Rol (para Demo / Jurados) */}
      <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-300 space-y-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Acceso Rápido por Rol (Cuentas en Base de Datos)
          </h3>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Selecciona una cuenta real registrada en Supabase para ingresar directamente a su panel:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {demoUsers.map((u) => {
            const esJefe = u.rol === 'Jefe de Consultorio';
            return (
              <button
                key={u.id}
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin(u)}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-colors flex items-center justify-between gap-3 ${
                  esJefe
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-700 text-slate-950'
                    : 'bg-white hover:bg-emerald-50 border-slate-300 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      esJefe
                        ? 'bg-amber-800 text-white'
                        : 'bg-brand-900 text-emerald-300'
                    }`}
                  >
                    {esJefe ? (
                      <Briefcase className="w-5 h-5" />
                    ) : (
                      <Scale className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">
                      {u.nombre_completo}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600">
                      Doc: <span className="font-mono">{u.numero_documento}</span> • Rol:{' '}
                      <span className="font-bold text-slate-900">{u.rol}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-md bg-slate-900 text-white shrink-0">
                  Entrar
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
