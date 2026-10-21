import React from 'react';
import { Link } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { Wifi, WifiOff } from 'lucide-react';

export const Footer: React.FC = () => {
  const { isOffline } = useCase();

  return (
    <footer className="mt-auto pt-8 pb-4 border-t-2 border-slate-200 text-xs text-slate-700">
      <div className="flex flex-col gap-3">
        {/* Network status indicator */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 border border-slate-300">
          <span className="font-semibold text-slate-800">Estado del servicio:</span>
          <div className="flex items-center gap-1.5 font-bold">
            {isOffline ? (
              <>
                <WifiOff className="w-4 h-4 text-amber-700" />
                <span className="text-amber-800">Modo local (Sin conexión)</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-brand-700" />
                <span className="text-brand-900">En línea con juzgados</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation & Help Links */}
        <nav aria-label="Enlaces institucionales" className="flex flex-wrap gap-x-4 gap-y-2 py-2">
          <Link
            to="/"
            className="hover:text-brand-900 underline font-medium focus:ring-1 focus:ring-brand-900"
          >
            Inicio
          </Link>
          <Link
            to="/aprender"
            className="hover:text-brand-900 underline font-medium focus:ring-1 focus:ring-brand-900"
          >
            Aprende tus derechos
          </Link>
          <Link
            to="/asesor"
            className="hover:text-brand-900 underline font-medium focus:ring-1 focus:ring-brand-900"
          >
            Habla con un asesor
          </Link>
          <Link
            to="/portal"
            className="hover:text-brand-900 underline font-medium focus:ring-1 focus:ring-brand-900"
          >
            Consultar trámite
          </Link>
        </nav>

        <div className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
          <p className="font-bold text-slate-800">Justicia en tu Vereda — Consultorio Jurídico</p>
          <p>
            Plataforma comunitaria de orientación constitucional y derecho de petición para el
            campo colombiano.
          </p>
        </div>
      </div>
    </footer>
  );
};
