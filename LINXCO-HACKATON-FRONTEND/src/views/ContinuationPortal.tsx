import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { PlusCircle, Search, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export const ContinuationPortal: React.FC = () => {
  const navigate = useNavigate();
  const { loadCaseByCode, clearWizardDraft } = useCase();

  const [showCodeInput, setShowCodeInput] = useState<boolean>(false);
  const [codeInput, setCodeInput] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
      const caso = await loadCaseByCode(clean);
      if (caso.estado === 'BORRADOR') {
        navigate('/wizard');
      } else {
        navigate(`/estado/${encodeURIComponent(clean)}`);
      }
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
    <div className="flex flex-col gap-5 py-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 py-1 px-2 rounded-md hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </button>
      </div>

      <div className="text-left">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Portal de acceso y radicación
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          ¿Deseas radicar una nueva solicitud o consultar el avance de un trámite existente?
        </p>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        {/* Option 1: Crear nueva solicitud */}
        <button
          type="button"
          onClick={handleCreateNew}
          className="w-full min-h-[56px] px-5 py-4 rounded-xl bg-brand-900 hover:bg-brand-950 text-white font-bold text-base flex items-center justify-between border-2 border-brand-950 shadow-md transition active:scale-[0.99] focus:ring-4 focus:ring-brand-700"
        >
          <div className="flex items-center gap-3 text-left">
            <PlusCircle className="w-6 h-6 text-emerald-300 shrink-0" />
            <div>
              <span className="block text-base font-black">Crear nueva solicitud</span>
              <span className="block text-xs font-normal text-emerald-200">
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
          className={`w-full min-h-[52px] px-5 py-3.5 rounded-xl text-slate-900 font-bold text-base flex items-center justify-between border-2 border-slate-700 shadow-sm transition active:scale-[0.99] ${
            showCodeInput ? 'bg-slate-100 ring-2 ring-slate-900' : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3 text-left">
            <Search className="w-5 h-5 text-slate-700 shrink-0" />
            <div>
              <span className="block text-base font-black">Continuar trámite</span>
              <span className="block text-xs font-normal text-slate-600">
                Tengo un código previo (SMS o WhatsApp)
              </span>
            </div>
          </div>
        </button>

        {/* Code Input Form (revealed when 'Continuar trámite' is selected) */}
        {showCodeInput && (
          <form
            onSubmit={handleSearchCode}
            className="p-4 rounded-xl bg-slate-50 border-2 border-slate-300 flex flex-col gap-3 mt-1 animate-fadeIn"
          >
            <label htmlFor="codigoInput" className="block text-xs font-black text-slate-800 uppercase tracking-wider">
              Ingresa tu código de trámite
            </label>
            <div className="flex flex-col gap-2">
              <input
                id="codigoInput"
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="Ej: CASO-SJH"
                maxLength={12}
                autoFocus
                className="w-full min-h-[48px] px-3 py-2 text-base font-mono font-bold uppercase tracking-wider rounded-lg border-2 border-slate-600 bg-white text-slate-900 focus:border-brand-900 focus:ring-brand-900"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 border-2 border-slate-900 disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
                className="p-2.5 rounded-lg bg-red-50 border border-red-300 text-xs text-red-800 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{searchError}</span>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
