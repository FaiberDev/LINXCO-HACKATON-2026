import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { useAuth } from '../../context/AuthContext';
import {
  Scales,
  WifiSlash,
  LockKey,
  Gauge,
  SignOut,
  X,
} from '@phosphor-icons/react';

export const Header: React.FC = () => {
  const { activeCode, isOffline, resetSession } = useCase();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthOrAdmin =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/admin');

  const showActiveCodeBadge = !user && !isAuthOrAdmin && Boolean(activeCode);

  const adminPanelPath =
    user?.rol === 'Jefe de Consultorio' ? '/admin/jefe' : '/admin/asesor';

  const handleLogoutHeader = () => {
    logout();
    resetSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className="py-4 border-b border-olive-200 bg-[#F8FAF6]/95 backdrop-blur-sm sticky top-0 z-30 -mx-4 sm:-mx-8 lg:-mx-14 2xl:-mx-20 px-4 sm:px-8 lg:px-14 2xl:px-20">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 p-2.5 bg-amber-100 border border-amber-500 rounded-xl flex items-center justify-between text-xs font-semibold text-amber-950"
        >
          <div className="flex items-center gap-2">
            <WifiSlash weight="duotone" className="w-4 h-4 text-amber-800 shrink-0" aria-hidden="true" />
            <span>Modo sin conexión — datos guardados localmente</span>
          </div>
          <span className="bg-amber-200 px-2.5 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold text-amber-900">
            Offline
          </span>
        </div>
      )}

      {/* Brand Identity & Minimalist Institutional Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none rounded-xl group"
        >
          <div className="w-11 h-11 rounded-2xl bg-charcoal-900 group-hover:bg-institucional-600 transition-colors flex items-center justify-center text-white shrink-0">
            <Scales weight="duotone" className="w-6 h-6 text-aqua-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-charcoal-900 leading-tight font-editorial">
              Justicia para todos
            </h1>
            <p className="text-[11px] font-bold text-institucional-600 uppercase tracking-widest">
              Justicia en tu Vereda
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {showActiveCodeBadge && activeCode && (
            <div className="flex items-center rounded-xl bg-white border border-olive-300 hover:border-institucional-500 transition shadow-sm overflow-hidden">
              <Link
                to={`/estado/${encodeURIComponent(activeCode)}`}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-olive-50 transition"
                title="Ver estado de este código"
              >
                <span className="text-[11px] font-semibold text-charcoal-600 hidden sm:inline">
                  Código activo:
                </span>
                <span className="font-mono text-xs font-bold text-charcoal-950">
                  {activeCode}
                </span>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  resetSession();
                }}
                className="px-2 py-1.5 text-charcoal-400 hover:text-red-600 hover:bg-red-50 border-l border-olive-200 transition"
                title="Quitar código activo"
                aria-label="Quitar código activo"
              >
                <X weight="bold" className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to={adminPanelPath}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white text-xs font-bold transition"
              >
                <Gauge weight="duotone" className="w-4 h-4 text-aqua-300" />
                <span>
                  Mi Panel ({user.rol === 'Jefe de Consultorio' ? 'Jefe' : 'Asesor'})
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogoutHeader}
                title="Cerrar sesión segura"
                aria-label="Cerrar sesión"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-charcoal-800 hover:text-red-900 text-xs font-bold border border-charcoal-300 transition"
              >
                <SignOut weight="bold" className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-charcoal-900 hover:bg-institucional-600 text-white text-xs font-bold transition"
            >
              <LockKey weight="duotone" className="w-4 h-4 text-aqua-400" />
              <span>Funcionarios</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
