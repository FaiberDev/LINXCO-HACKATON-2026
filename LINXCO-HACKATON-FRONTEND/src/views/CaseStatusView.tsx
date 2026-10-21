import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { ESTADOS_CASO, EstadoCaso } from '../types';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  FileText,
  Search,
  Loader2,
} from 'lucide-react';

export const CaseStatusView: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const { activeCase, activeCode, loadCaseByCode, isLoading, error } = useCase();

  const [inputCode, setInputCode] = useState<string>(codigo || activeCode || '');
  const [localSearchError, setLocalSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (codigo && (!activeCase || activeCase.codigo_sms !== codigo.toUpperCase())) {
      loadCaseByCode(codigo).catch((err: unknown) => {
        setLocalSearchError((err as Error)?.message || 'No se pudo cargar el caso');
      });
    }
  }, [codigo, activeCase, loadCaseByCode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;
    setLocalSearchError(null);
    try {
      await loadCaseByCode(clean);
      navigate(`/estado/${encodeURIComponent(clean)}`);
    } catch (err: unknown) {
      setLocalSearchError((err as Error)?.message || 'No se encontró el caso indicado');
    }
  };

  const getStatusIndex = (estado?: EstadoCaso): number => {
    if (!estado) return 0;
    const idx = ESTADOS_CASO.indexOf(estado);
    return idx >= 0 ? idx : 0;
  };

  const activeIndex = getStatusIndex(activeCase?.estado);

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
          Estado de tu trámite
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Sigue la evolución de tu solicitud ante entidades públicas y juzgados.
        </p>
      </div>

      {/* Lookup Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          placeholder="Código (Ej: CASO-SJH)"
          className="flex-1 min-h-[48px] px-3 py-2 text-sm font-mono font-bold uppercase rounded-lg border-2 border-slate-400 bg-white text-slate-900 focus:border-brand-900"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="min-h-[48px] px-4 py-2 bg-brand-900 hover:bg-brand-950 text-white font-bold rounded-lg border-2 border-brand-950 flex items-center justify-center gap-1.5 text-xs uppercase"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </>
          )}
        </button>
      </form>

      {(error || localSearchError) && (
        <div
          role="alert"
          className="p-3 bg-red-50 border-2 border-red-300 rounded-lg text-xs text-red-800 flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error || localSearchError}</span>
        </div>
      )}

      {/* Case Details Card */}
      {activeCase && (
        <div className="flex flex-col gap-5">
          <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-300 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase">Código radicado</span>
              <span className="font-mono text-sm font-black text-brand-900 bg-brand-100 px-2 py-0.5 rounded border border-brand-300">
                {activeCase.codigo_sms}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-800">
                {activeCase.tipo_problema}
              </span>
              {activeCase.created_at && (
                <span className="text-[11px] text-slate-500">
                  Registrado el {new Date(activeCase.created_at).toLocaleDateString('es-CO')}
                </span>
              )}
            </div>
          </div>

          {/* 5 Exact Status Progression Stepper */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Línea de progreso legal
            </h3>

            <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm">
              {ESTADOS_CASO.map((statusName: EstadoCaso, idx: number) => {
                const isCompleted = idx < activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                  <div key={statusName} className="flex items-start gap-3 relative">
                    {/* Connecting line between stages */}
                    {idx < ESTADOS_CASO.length - 1 && (
                      <div
                        className={`absolute left-3.5 top-7 bottom-0 w-0.5 -mb-3 ${
                          idx < activeIndex ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      />
                    )}

                    {/* Step Icon */}
                    <div className="relative z-10 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-700 fill-emerald-100" />
                      ) : isCurrent ? (
                        <div className="w-7 h-7 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-xs ring-4 ring-emerald-200">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <Circle className="w-7 h-7 text-slate-300" />
                      )}
                    </div>

                    {/* Step Details & Exact Label */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-black ${
                            isCurrent
                              ? 'text-brand-950 underline decoration-brand-600 decoration-2 underline-offset-4'
                              : isCompleted
                              ? 'text-emerald-900 font-bold'
                              : 'text-slate-400 font-medium'
                          }`}
                        >
                          {statusName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-100 text-brand-900 border border-brand-300">
                            Estado actual
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                        {statusName === 'BORRADOR' &&
                          'Solicitud en proceso de edición o recién recibida por la plataforma.'}
                        {statusName === 'VALIDADO' &&
                          'Solicitud revisada y validada por el equipo jurídico.'}
                        {statusName === 'ENVIADO' &&
                          'Documento legal despachado a la entidad o juzgado competente.'}
                        {statusName === 'RADICADO' &&
                          'Radicación formal confirmada con número de radicado oficial.'}
                        {statusName === 'RESPUESTA RECIBIDA' &&
                          'Respuesta formal emitida por la entidad o fallo del juez.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generated Document Download if available */}
          {Boolean(activeCase.ruta_documento || activeCase.formulario_web?.ruta_documento) && (
            <a
              href={String(activeCase.ruta_documento || activeCase.formulario_web?.ruta_documento)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm flex items-center justify-center gap-2 border-2 border-emerald-950"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar Documento Generado (.docx)</span>
            </a>
          )}

          {/* Action to edit/resume if in BORRADOR */}
          {activeCase.estado === 'BORRADOR' && (
            <button
              type="button"
              onClick={() => navigate('/wizard')}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-brand-900 hover:bg-brand-950 text-white font-bold text-sm flex items-center justify-center gap-2 border-2 border-brand-950"
            >
              <FileText className="w-4 h-4" />
              <span>Continuar editando solicitud</span>
            </button>
          )}
        </div>
      )}

      {!activeCase && !isLoading && !error && !localSearchError && (
        <div className="p-6 text-center text-slate-500 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
          <p className="text-xs">
            Ingresa tu código (ej. <span className="font-mono font-bold">CASO-SJH</span>) arriba para consultar el avance.
          </p>
        </div>
      )}
    </div>
  );
};
