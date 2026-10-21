import React from 'react';
import { Link } from 'react-router-dom';
import { useCase } from '../../context/CaseContext';
import { WifiHigh, WifiSlash, Plant } from '@phosphor-icons/react';

export const Footer: React.FC = () => {
  const { isOffline } = useCase();

  return (
    <footer className="mt-auto pt-6 pb-4 border-t border-olive-200 text-xs text-charcoal-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Network status indicator */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-olive-50 border border-olive-300 self-start lg:self-auto">
          <Plant weight="duotone" className="w-4 h-4 text-olive-700 shrink-0" />
          <span className="font-bold text-charcoal-900">Estado del servicio:</span>
          <span className="inline-flex items-center gap-1.5 font-bold">
            {isOffline ? (
              <>
                <WifiSlash weight="duotone" className="w-4 h-4 text-amber-700" />
                <span className="text-amber-900">Modo local (Sin conexión)</span>
              </>
            ) : (
              <>
                <WifiHigh weight="duotone" className="w-4 h-4 text-institucional-600" />
                <span className="text-institucional-900">En línea con juzgados</span>
              </>
            )}
          </span>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Enlaces institucionales" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            to="/"
            className="hover:text-institucional-600 underline font-bold text-charcoal-800"
          >
            Inicio
          </Link>
          <Link
            to="/aprender"
            className="hover:text-institucional-600 underline font-bold text-charcoal-800"
          >
            Aprende tus derechos
          </Link>
          <Link
            to="/asesor"
            className="hover:text-institucional-600 underline font-bold text-charcoal-800"
          >
            Habla con un asesor
          </Link>
          <Link
            to="/portal"
            className="hover:text-institucional-600 underline font-bold text-charcoal-800"
          >
            Consultar trámite
          </Link>
        </nav>

        <p className="text-[11px] text-charcoal-600 font-medium">
          Justicia en tu Vereda — Orientación constitucional gratuita
        </p>
      </div>
    </footer>
  );
};
