import React from 'react';
import { Link } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, WifiOff, Lock, LayoutDashboard } from 'lucide-react';

export const Header: React.FC = () => {
  const { activeCode, isOffline } = useCase();
  const { user } = useAuth();

  const adminPanelPath =
    user?.rol === 'Jefe de Consultorio' ? '/admin/jefe' : '/admin/asesor';

  return (
    <header className="pt-4 pb-3 border-b-2 border-slate-200 bg-white">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 p-2 bg-amber-100 border-2 border-amber-600 rounded-lg flex items-center justify-between text-xs font-semibold text-amber-900"
        >
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span>Modo sin conexión — datos guardados localmente</span>
          </div>
          <span className="bg-amber-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-amber-800">
            Offline
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Link
          to="/"
          className="flex items-center gap-2 group text-left focus:outline-none focus:ring-2 focus:ring-brand-900 rounded-lg p-1"
          aria-label="Ir al inicio de Justicia para todos"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-900 flex items-center justify-center text-white shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
              Justicia para todos
            </h1>
            <p className="text-xs font-semibold text-brand-900 uppercase tracking-wider">
              Justicia en tu Vereda
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {activeCode && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-slate-600">
                Tu código
              </span>
              <span className="font-mono text-xs font-black bg-brand-100 text-brand-900 px-2.5 py-1 rounded-md border border-brand-300">
                {activeCode}
              </span>
            </div>
          )}

          {user ? (
            <Link
              to={adminPanelPath}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-900 hover:bg-brand-950 text-white text-[11px] font-black border border-slate-950"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-300" />
              <span>Mi Panel ({user.rol === 'Jefe de Consultorio' ? 'Jefe' : 'Asesor'})</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-bold border border-slate-300"
            >
              <Lock className="w-3.5 h-3.5 text-brand-900" />
              <span>Funcionarios</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
