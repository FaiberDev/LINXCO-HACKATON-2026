import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { ESTADOS_CASO, EstadoCaso } from '../types';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Circle,
  WarningCircle,
  FileText,
  MagnifyingGlass,
  SpinnerGap,
  Gauge,
  UserCheck,
  Briefcase,
} from '@phosphor-icons/react';

export const CaseStatusView: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const { activeCase, activeCode, loadCaseByCode, isLoading, error } = useCase();
  const { user } = useAuth();

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

  const rolResponsablePorEstado: Record<EstadoCaso, string> = {
    BORRADOR: 'Ciudadano (Edición abierta) / Jefe de Consultorio (Pendiente de asignación)',
    VALIDADO: 'Asesor Jurídico Asignado (Revisión técnica y validación legal)',
    ENVIADO: 'Asesor Jurídico Asignado (Despacho a entidad o juzgado)',
    RADICADO: 'Entidad Pública / Juzgado Receptor (Confirmación de radicado)',
    'RESPUESTA RECIBIDA': 'Juzgado / Entidad Accionada (Fallo o contestación de fondo)',
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Back button & Role shortcut */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-charcoal-800 hover:text-institucional-600 py-1.5 px-3 rounded-xl hover:bg-olive-100 transition"
        >
          <ArrowLeft weight="bold" className="w-4 h-4" />
          Volver al inicio
        </button>

        {user && (
          <button
            type="button"
            onClick={() =>
              navigate(
                user.rol === 'Jefe de Consultorio' ? '/admin/jefe' : '/admin/asesor'
              )
            }
            className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-institucional-500 hover:bg-institucional-600 px-3.5 py-2 rounded-xl border border-charcoal-900 transition"
          >
            <Gauge weight="duotone" className="w-4 h-4 text-aqua-300" />
            <span>Gestionar en mi Panel ({user.rol})</span>
          </button>
        )}
      </div>

      <div className="text-left">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-institucional-600">
          Trazabilidad de Solicitudes
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-charcoal-950 tracking-tight font-editorial">
          Estado de tu trámite
        </h2>
        <p className="text-sm text-charcoal-600 mt-1">
          Sigue la evolución de tu solicitud ante entidades públicas y juzgados según el rol que la gestiona.
        </p>
      </div>

      {/* Lookup Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="text"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          placeholder="Código (Ej: CASO-SJH)"
          className="flex-1 min-h-[50px] px-4 py-2 text-sm font-mono font-bold uppercase rounded-xl border-2 border-charcoal-400 bg-white text-charcoal-950 focus:border-institucional-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="min-h-[50px] px-6 py-2 bg-institucional-500 hover:bg-institucional-600 text-white font-black rounded-xl border-2 border-charcoal-950 flex items-center justify-center gap-2 text-xs uppercase transition"
        >
          {isLoading ? (
            <SpinnerGap weight="bold" className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <MagnifyingGlass weight="bold" className="w-4 h-4" />
              <span>Buscar</span>
            </>
          )}
        </button>
      </form>

      {(error || localSearchError) && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border-2 border-red-400 rounded-xl text-xs font-bold text-red-900 flex items-start gap-2.5"
        >
          <WarningCircle weight="duotone" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <span>{error || localSearchError}</span>
        </div>
      )}

      {/* Case Details Card */}
      {activeCase && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna izquierda: Resumen del Caso y Acciones según el Estado y el Usuario */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-white border-2 border-charcoal-800 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal-600 uppercase">
                  Código de seguimiento
                </span>
                <span className="font-mono text-sm font-black text-charcoal-950 bg-olive-200 px-3 py-1 rounded-lg border border-olive-400">
                  {activeCase.codigo_sms}
                </span>
              </div>

              <div className="border-t border-charcoal-100 pt-3 flex flex-col gap-1.5">
                <span className="text-sm font-black text-charcoal-950 font-editorial">
                  {activeCase.tipo_problema}
                </span>
                {activeCase.formulario_web?.ciudadano?.nombre_completo && (
                  <span className="text-xs font-bold text-charcoal-700">
                    Solicitante: {activeCase.formulario_web.ciudadano.nombre_completo}
                  </span>
                )}
                {activeCase.formulario_web?.ciudadano?.municipio && (
                  <span className="text-xs text-charcoal-600">
                    Ubicación: {[
                      activeCase.formulario_web.ciudadano.vereda ||
                        activeCase.formulario_web.ciudadano.vereda_o_barrio,
                      activeCase.formulario_web.ciudadano.municipio,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                )}
                {activeCase.created_at && (
                  <span className="text-[11px] font-mono text-charcoal-500 mt-1">
                    Registrado el {new Date(activeCase.created_at).toLocaleDateString('es-CO')}
                  </span>
                )}
              </div>

              {/* Explicación de cómo opera el estado actual según el rol */}
              <div className="p-3 rounded-xl bg-olive-50 border border-olive-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-black text-charcoal-900">
                  {activeCase.estado === 'BORRADOR' ? (
                    <Briefcase weight="duotone" className="w-4 h-4 text-amber-700" />
                  ) : (
                    <UserCheck weight="duotone" className="w-4 h-4 text-institucional-600" />
                  )}
                  <span>Responsable en etapa {activeCase.estado}:</span>
                </div>
                <p className="text-charcoal-700 text-[11px] leading-relaxed">
                  {rolResponsablePorEstado[activeCase.estado]}
                </p>
              </div>
            </div>

            {/* Notificación de Trámite Finalizado y Resuelto */}
            {activeCase.estado === 'RESPUESTA RECIBIDA' && (
              <div className="p-4 rounded-2xl bg-olive-100 border-2 border-olive-500 text-charcoal-950 flex items-start gap-3 shadow-sm">
                <CheckCircle weight="fill" className="w-6 h-6 text-olive-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wide text-olive-900 font-editorial">
                    ¡Trámite finalizado con éxito!
                  </h4>
                  <p className="text-[11px] text-charcoal-800 mt-1 leading-relaxed font-medium">
                    El Consultorio Jurídico ha recibido la contestación de fondo o fallo judicial. El ciclo completo de tu solicitud ha concluido formalmente.
                  </p>
                </div>
              </div>
            )}

            {/* Generated Document Download with role-based restriction */}
            {Boolean(activeCase.ruta_documento || activeCase.formulario_web?.ruta_documento) && (() => {
              const isOfficial = Boolean(
                user && (user.rol === 'Jefe de Consultorio' || user.rol === 'Asesor Jurídico')
              );
              const docxUrl = String(
                activeCase.ruta_documento || activeCase.formulario_web?.ruta_documento || ''
              );
              const pdfUrl = String(
                activeCase.ruta_documento_pdf ||
                activeCase.formulario_web?.ruta_documento_pdf ||
                (docxUrl ? docxUrl.replace(/\.docx$/i, '.pdf') : `/api/casos/${encodeURIComponent(activeCase.codigo_sms)}/pdf`)
              );

              return (
                <div className="flex flex-col gap-2">
                  {/* Los ciudadanos SOLO pueden descargar el PDF estructurado oficial */}
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-black text-sm flex items-center justify-center gap-2 border-2 border-charcoal-950 transition shadow-sm"
                  >
                    <FileText weight="duotone" className="w-5 h-5" />
                    <span>Descargar Documento Oficial (.pdf)</span>
                  </a>

                  {/* Exclusivo para Asesores y Jefes de consultorio: versión editable Word */}
                  {isOfficial && docxUrl && (
                    <a
                      href={docxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white hover:bg-olive-100 text-charcoal-950 font-bold text-xs flex items-center justify-center gap-2 border-2 border-charcoal-800 transition"
                    >
                      <FileText weight="duotone" className="w-4 h-4 text-institucional-600" />
                      <span>Descargar Versión Editable (.docx) [Exclusivo Asesor]</span>
                    </a>
                  )}
                </div>
              );
            })()}

            {/* Action to edit/resume if in BORRADOR (Ciudadano solo puede editar cuando está en BORRADOR) */}
            {activeCase.estado === 'BORRADOR' && (
              <button
                type="button"
                onClick={() => navigate('/wizard')}
                className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-bold text-sm flex items-center justify-center gap-2 border-2 border-charcoal-950 transition"
              >
                <FileText weight="duotone" className="w-5 h-5" />
                <span>Continuar editando solicitud</span>
              </button>
            )}
          </div>

          {/* Columna derecha: 5 Exact Status Progression Stepper */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-charcoal-700">
              Línea de progreso legal (5 Etapas Oficiales)
            </h3>

            <div className="flex flex-col gap-3 bg-white p-5 sm:p-6 rounded-2xl border-2 border-charcoal-800 shadow-sm">
              {ESTADOS_CASO.map((statusName: EstadoCaso, idx: number) => {
                const isCompleted = idx < activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                  <div key={statusName} className="flex items-start gap-3.5 relative">
                    {/* Connecting line between stages */}
                    {idx < ESTADOS_CASO.length - 1 && (
                      <div
                        className={`absolute left-3.5 top-7 bottom-0 w-0.5 -mb-3 ${
                          idx < activeIndex ? 'bg-olive-600' : 'bg-charcoal-200'
                        }`}
                      />
                    )}

                    {/* Step Icon */}
                    <div className="relative z-10 shrink-0">
                      {isCompleted || (isCurrent && statusName === 'RESPUESTA RECIBIDA') ? (
                        <CheckCircle weight="fill" className="w-7 h-7 text-olive-600" />
                      ) : isCurrent ? (
                        <div className="w-7 h-7 rounded-full bg-institucional-500 text-white flex items-center justify-center font-bold text-xs ring-4 ring-aqua-300/60">
                          <Clock weight="bold" className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <Circle weight="regular" className="w-7 h-7 text-charcoal-300" />
                      )}
                    </div>

                    {/* Step Details & Exact Label */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`text-sm font-black ${
                            isCurrent
                              ? 'text-institucional-700 underline decoration-aqua-400 decoration-2 underline-offset-4'
                              : isCompleted
                              ? 'text-olive-800 font-bold'
                              : 'text-charcoal-400 font-medium'
                          }`}
                        >
                          {statusName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-md bg-olive-200 text-charcoal-950 border border-olive-400">
                            Estado actual
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-charcoal-600 mt-1 leading-snug">
                        {statusName === 'BORRADOR' &&
                          'Solicitud en proceso de edición por el ciudadano o recién recibida para asignación del Jefe de Consultorio.'}
                        {statusName === 'VALIDADO' &&
                          'Solicitud asignada, revisada y validada técnicamente por el Asesor Jurídico.'}
                        {statusName === 'ENVIADO' &&
                          'Documento legal despachado por el Consultorio Jurídico a la entidad o juzgado competente.'}
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
        </div>
      )}

      {!activeCase && !isLoading && !error && !localSearchError && (
        <div className="p-8 text-center text-charcoal-600 bg-olive-50/60 border-2 border-dashed border-olive-400 rounded-2xl">
          <p className="text-xs sm:text-sm font-medium">
            Ingresa tu código (ej. <span className="font-mono font-bold text-charcoal-900">CASO-SJH</span>) arriba para consultar el avance.
          </p>
        </div>
      )}
    </div>
  );
};
