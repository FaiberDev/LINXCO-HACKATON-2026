import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import {
  PlusCircle,
  MagnifyingGlass,
  ArrowLeft,
  SpinnerGap,
  WarningCircle,
} from '@phosphor-icons/react';

import veredaValleImg from '../assets/images/vereda-valle-lg.webp';

export const ContinuationPortal: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loadCaseByCode, clearWizardDraft } = useCase();

  const [showCodeInput, setShowCodeInput] = useState<boolean>(false);
  const [codeInput, setCodeInput] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Si llega con parámetro en la URL (?caso=CASO-XXX o ?codigo=CASO-XXX), redirigir directamente a /estado/:codigo
  useEffect(() => {
    const paramCode = searchParams.get('caso') || searchParams.get('codigo');
    if (paramCode) {
      const clean = paramCode.trim().toUpperCase();
      loadCaseByCode(clean)
        .then(() => {
          navigate(`/estado/${encodeURIComponent(clean)}`);
        })
        .catch(() => {
          setCodeInput(clean);
          setShowCodeInput(true);
        });
    }
  }, [searchParams, loadCaseByCode, navigate]);

  const handleCreateNew = () => {
    clearWizardDraft();
    navigate('/wizard');
  };

  const handleSearchCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeInput.trim().toUpperCase();
    if (!clean) {
      setSearchError('Por favor ingresa un código de seguimiento');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      await loadCaseByCode(clean);
      navigate(`/estado/${encodeURIComponent(clean)}`);
    } catch (err: unknown) {
      setSearchError(
        (err as Error)?.message ||
          `No se encontró el caso ${clean}. Verifica el código e intenta de nuevo.`
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 py-8">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-charcoal-800 hover:text-institucional-600 py-2 px-3.5 rounded-xl hover:bg-olive-100 transition"
        >
          <ArrowLeft weight="bold" className="w-4 h-4" />
          Volver al inicio
        </button>
      </div>

      {/* Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-charcoal-900 p-8 sm:p-12 text-white shadow-md">
        <img
          src={veredaValleImg}
          alt="Valle rural colombiano"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-charcoal-950/95 via-charcoal-900/85 to-institucional-950/70"
        />
        <div className="relative z-10 max-w-2xl space-y-2.5">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight font-editorial">
            ¿Qué deseas hacer hoy?
          </h2>
          <p className="text-sm sm:text-base text-olive-100 leading-relaxed">
            Inicia una solicitud paso a paso o consulta un trámite que ya tengas con tu código.
          </p>
        </div>
      </div>

      {/* Responsive 2-column action cards on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1: Crear nueva solicitud */}
        <button
          type="button"
          onClick={handleCreateNew}
          className="w-full min-h-[120px] p-6 sm:p-8 rounded-3xl bg-institucional-500 hover:bg-institucional-600 text-white font-bold text-base flex items-center justify-between border-2 border-charcoal-950 shadow-md transition active:scale-[0.99] focus:ring-4 focus:ring-aqua-400"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-charcoal-900 flex items-center justify-center shrink-0 border border-aqua-400">
              <PlusCircle weight="duotone" className="w-8 h-8 text-aqua-400" />
            </div>
            <div>
              <span className="block text-xl font-black font-editorial">
                Crear nueva solicitud
              </span>
              <span className="block text-xs sm:text-sm font-normal text-aqua-100 mt-1">
                Iniciar formulario paso a paso
              </span>
            </div>
          </div>
        </button>

        {/* Option 2: Continuar trámite */}
        <button
          type="button"
          onClick={() => {
            setShowCodeInput(true);
            setSearchError(null);
          }}
          className={`w-full min-h-[120px] p-6 sm:p-8 rounded-3xl text-charcoal-900 font-bold text-base flex items-center justify-between border-2 border-charcoal-800 shadow-sm transition active:scale-[0.99] ${
            showCodeInput
              ? 'bg-olive-100 ring-2 ring-institucional-500'
              : 'bg-white hover:bg-olive-50'
          }`}
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-olive-200 flex items-center justify-center shrink-0 border border-olive-400">
              <MagnifyingGlass weight="duotone" className="w-8 h-8 text-charcoal-900" />
            </div>
            <div>
              <span className="block text-xl font-black font-editorial">
                Consultar o continuar trámite
              </span>
              <span className="block text-xs sm:text-sm font-normal text-charcoal-600 mt-1">
                Tengo un código previo (SMS o WhatsApp)
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Code Input Form (revealed when 'Continuar trámite' is selected) */}
      {showCodeInput && (
        <form
          onSubmit={handleSearchCode}
          className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-charcoal-800 shadow-md flex flex-col gap-4 animate-fadeIn max-w-3xl"
        >
          <label
            htmlFor="codigoInput"
            className="block text-xs sm:text-sm font-black text-charcoal-900 uppercase tracking-wider"
          >
            Ingresa tu código de trámite
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="codigoInput"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Ej: CASO-SJH"
              maxLength={12}
              autoFocus
              className="flex-1 min-h-[52px] px-4 py-2.5 text-base font-mono font-bold uppercase tracking-wider rounded-xl border-2 border-charcoal-400 bg-olive-50/40 text-charcoal-950 focus:border-institucional-500 focus:ring-institucional-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="min-h-[52px] px-8 py-2.5 rounded-xl bg-charcoal-900 hover:bg-institucional-600 text-white font-black text-sm flex items-center justify-center gap-2 border-2 border-charcoal-950 disabled:opacity-50 transition"
            >
              {isSearching ? (
                <>
                  <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <span>Consultar trámite</span>
              )}
            </button>
          </div>

          {searchError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border-2 border-red-400 text-xs font-bold text-red-900 flex items-start gap-2"
            >
              <WarningCircle weight="duotone" className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{searchError}</span>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
