import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AdminUser } from '../context/AuthContext';
import {
  LockKey,
  UserCheck,
  WarningOctagon,
  ArrowLeft,
  Briefcase,
  Scales,
  IdentificationBadge,
  Key,
} from '@phosphor-icons/react';

import montanasImg from '../assets/images/montanas-cafeteras-lg.webp';
import balconImg from '../assets/images/balcon-colonial-sm.webp';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, login, demoUsers, isLoading, error } = useAuth();

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleRedirectByRole = (loggedUser: AdminUser) => {
    if (loggedUser.rol === 'Jefe de Consultorio') {
      navigate('/admin/jefe', { replace: true });
    } else {
      navigate('/admin/asesor', { replace: true });
    }
  };

  // Si ya hay sesión activa, redirigir reemplazando el historial
  useEffect(() => {
    if (user && token) {
      if (user.rol === 'Jefe de Consultorio') {
        navigate('/admin/jefe', { replace: true });
      } else {
        navigate('/admin/asesor', { replace: true });
      }
    }
  }, [user, token, navigate]);

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
    <div className="py-6 space-y-6 flex-1">
      <div>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-charcoal-800 hover:text-institucional-600 py-1.5 px-3 rounded-xl hover:bg-olive-100 border border-transparent hover:border-olive-300 transition"
        >
          <ArrowLeft weight="bold" className="w-4 h-4" />
          <span>Volver al portal ciudadano</span>
        </button>
      </div>

      {/* Responsive Split Grid: Hero Rural a la izquierda en Desktop, Formulario a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Hero Image Panel con Overlay Oscuro */}
        <div className="lg:col-span-5 relative rounded-3xl overflow-hidden border-2 border-charcoal-900 shadow-lg min-h-[260px] lg:min-h-[540px] flex flex-col justify-between p-6 sm:p-8 text-white">
          <img
            src={montanasImg}
            alt="Paisaje montañoso de veredas colombianas"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-charcoal-950/90 via-charcoal-900/80 to-institucional-950/95"
          />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-olive-300 text-charcoal-950 text-xs font-black uppercase tracking-wider">
              <LockKey weight="duotone" className="w-4 h-4" />
              <span>Acceso Institucional RBAC</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight font-editorial text-white">
              Portal de Consultorio Jurídico
            </h2>
            <p className="text-xs sm:text-sm text-olive-100 leading-relaxed">
              Ingresa con tus credenciales para acceder a la vista exclusiva de{' '}
              <strong className="text-aqua-300">Jefe de Consultorio</strong> (supervisión y asignación) o de{' '}
              <strong className="text-olive-300">Asesor Jurídico</strong> (gestión de casos y estados).
            </p>
          </div>

          <div className="relative z-10 mt-6 pt-4 border-t border-white/20 flex items-center gap-3">
            <img
              src={balconImg}
              alt="Arquitectura tradicional rural"
              className="w-12 h-12 rounded-xl object-cover border border-olive-300 shrink-0"
            />
            <div className="text-[11px] text-charcoal-100 leading-snug">
              <span className="font-bold text-white block">
                Arquitectura Segura por Rol
              </span>
              Cada cuenta es redirigida automáticamente a su entorno de trabajo aislado.
            </div>
          </div>
        </div>

        {/* Columna de Formularios y Acceso Rápido */}
        <div className="lg:col-span-7 flex flex-col gap-5 justify-between">
          {(localError || error) && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-red-50 border-2 border-red-700 text-red-950 flex items-start gap-3 text-xs font-bold"
            >
              <WarningOctagon weight="duotone" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Formulario de Login Tradicional */}
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-3xl bg-white border-2 border-charcoal-800 shadow-md space-y-4"
          >
            <div className="border-b border-charcoal-100 pb-3">
              <h3 className="text-base font-black text-charcoal-950 font-editorial">
                Autenticación de Funcionarios y Judicantes
              </h3>
              <p className="text-xs text-charcoal-600 mt-0.5">
                Verifica tu identidad con tu documento registrado en el Consultorio Jurídico.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="login-documento"
                  className="block text-xs font-black uppercase tracking-wider text-charcoal-800 mb-1.5"
                >
                  Número de Documento
                </label>
                <div className="relative">
                  <IdentificationBadge
                    weight="duotone"
                    className="w-5 h-5 text-institucional-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    id="login-documento"
                    type="text"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Ej. 1000100100"
                    className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-charcoal-300 text-charcoal-950 font-semibold text-sm focus:outline-none focus:border-institucional-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-black uppercase tracking-wider text-charcoal-800 mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Key
                    weight="duotone"
                    className="w-5 h-5 text-institucional-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ej. admin123 o asesor123"
                    className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-charcoal-300 text-charcoal-950 font-semibold text-sm focus:outline-none focus:border-institucional-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-institucional-500 hover:bg-institucional-600 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 border-2 border-charcoal-950 shadow-sm transition"
            >
              <UserCheck weight="duotone" className="w-5 h-5 text-aqua-300" />
              <span>{isLoading ? 'Verificando acceso...' : 'Iniciar Sesión'}</span>
            </button>
          </form>

          {/* Acceso Rápido por Rol (para Demo / Jurados) */}
          <div className="p-5 rounded-3xl bg-olive-50 border-2 border-olive-400 space-y-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-charcoal-900">
                Acceso Rápido por Rol (Cuentas en Base de Datos)
              </h3>
              <p className="text-[11px] text-charcoal-700 mt-0.5">
                Selecciona una cuenta real registrada en Supabase para ingresar directamente a su panel:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoUsers.map((u) => {
                const esJefe = u.rol === 'Jefe de Consultorio';
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleQuickLogin(u)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition flex items-center justify-between gap-2.5 ${
                      esJefe
                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-700 text-charcoal-950 sm:col-span-2'
                        : 'bg-white hover:bg-olive-100 border-charcoal-300 text-charcoal-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          esJefe
                            ? 'bg-charcoal-900 text-amber-300'
                            : 'bg-institucional-500 text-aqua-300'
                        }`}
                      >
                        {esJefe ? (
                          <Briefcase weight="duotone" className="w-5 h-5" />
                        ) : (
                          <Scales weight="duotone" className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">
                          {u.nombre_completo}
                        </p>
                        <p className="text-[11px] font-semibold text-charcoal-600 truncate">
                          Doc: <span className="font-mono">{u.numero_documento}</span> •{' '}
                          <span className="font-bold text-charcoal-900">{u.rol}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-charcoal-900 text-white shrink-0">
                      Entrar
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
