import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Caso, EstadoCaso } from '../types';
import {
  listMockCases,
  changeMockCaseEstado,
} from '../services/mockStorage';
import {
  Scales,
  ArrowsClockwise,
  SignOut,
  DownloadSimple,
  FileDoc,
  CheckCircle,
  WarningCircle,
  FolderOpen,
  CaretDown,
  CaretUp,
  UserCircle,
  MapPinLine,
  Buildings,
  ClockCountdown,
  Funnel,
  Lightning,
} from '@phosphor-icons/react';

const ESTADOS_GESTION_ASESOR: EstadoCaso[] = [
  'VALIDADO',
  'ENVIADO',
  'RADICADO',
  'RESPUESTA RECIBIDA',
];

const DESCRIPCION_ESTADO_OPERATIVO: Record<EstadoCaso, string> = {
  BORRADOR: 'Caso recién asignado. Revísalo y márcalo como VALIDADO para iniciar el trámite formal.',
  VALIDADO: 'Revisión jurídica completada. El ciudadano ya no puede modificar el borrador.',
  ENVIADO: 'Documento remitido formalmente a la EPS, Alcaldía, empresa o juzgado receptor.',
  RADICADO: 'Número de radicado oficial confirmado ante la entidad o despacho judicial.',
  'RESPUESTA RECIBIDA': 'Contestación de fondo o fallo judicial notificado al ciudadano.',
};

export const AsesorDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [misCasos, setMisCasos] = useState<Caso[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [casoAbiertoId, setCasoAbiertoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [generatingDocId, setGeneratingDocId] = useState<string | null>(null);
  const [isSimulatingId, setIsSimulatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSecureLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const authHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (user) {
      headers['x-user-id'] = user.id;
      headers['x-user-role'] = user.rol;
    }
    return headers;
  }, [token, user]);

  const cargarMisCasos = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await apiFetch<{ solicitudes?: Caso[]; casos?: Caso[] }>(
        `/solicitudes?asesor_asignado_id=${encodeURIComponent(user.id)}`,
        {
          headers: authHeaders(),
        }
      );
      const lista = res.solicitudes || res.casos || [];
      setMisCasos(lista);
      if (lista.length > 0 && !casoAbiertoId) {
        setCasoAbiertoId(lista[0].id || lista[0].codigo_sms);
      }
    } catch {
      // Fallback local para operación sin servidor backend activo
      const locales = listMockCases({ asesor_asignado_id: user.id });
      setMisCasos(locales);
      if (locales.length > 0 && !casoAbiertoId) {
        setCasoAbiertoId(locales[0].id || locales[0].codigo_sms);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, authHeaders, casoAbiertoId]);

  useEffect(() => {
    cargarMisCasos();
  }, [cargarMisCasos]);

  const handleCambiarEstado = async (caso: Caso, nuevoEstado: EstadoCaso) => {
    const rowKey = caso.id || caso.codigo_sms;
    setUpdatingId(`${rowKey}-${nuevoEstado}`);
    setFeedback(null);

    try {
      const res = await apiFetch<{
        success: boolean;
        mensaje: string;
        solicitud: Caso;
      }>(`/solicitudes/${encodeURIComponent(rowKey)}/estado`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      setMisCasos((prev) =>
        prev.map((item) =>
          (item.id || item.codigo_sms) === rowKey ? res.solicitud : item
        )
      );

      setFeedback({
        type: 'success',
        message:
          res.mensaje ||
          `Estado de ${caso.codigo_sms} actualizado a ${nuevoEstado}.`,
      });
    } catch (err) {
      // Fallback local si el servidor no responde
      const updatedLocal = changeMockCaseEstado(rowKey, nuevoEstado);
      if (updatedLocal) {
        setMisCasos((prev) =>
          prev.map((item) =>
            (item.id || item.codigo_sms) === rowKey ? updatedLocal : item
          )
        );
        setFeedback({
          type: 'success',
          message: `Estado de ${caso.codigo_sms} actualizado a ${nuevoEstado} (sincronizado localmente).`,
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            (err as Error)?.message ||
            `No se pudo cambiar el estado de ${caso.codigo_sms}.`,
        });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleGenerarDocumento = async (caso: Caso) => {
    const rowKey = caso.id || caso.codigo_sms;
    setGeneratingDocId(rowKey);
    setFeedback(null);

    try {
      const res = await apiFetch<{
        success: boolean;
        ruta_documento: string;
        solicitud: Caso;
      }>('/generar-documento', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          codigo: caso.codigo_sms,
          tipo_tramite: caso.tipo_problema,
          datos_ciudadano: caso.formulario_web || {},
        }),
      });

      setMisCasos((prev) =>
        prev.map((item) =>
          (item.id || item.codigo_sms) === rowKey ? res.solicitud : item
        )
      );

      setFeedback({
        type: 'success',
        message: `Documento .docx generado para ${caso.codigo_sms}. Ya puedes descargarlo.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          (err as Error)?.message ||
          `Error al generar documento para ${caso.codigo_sms}.`,
      });
    } finally {
      setGeneratingDocId(null);
    }
  };

  const handleSimularWorkflow = async (caso: Caso) => {
    const rowKey = caso.id || caso.codigo_sms;
    setIsSimulatingId(rowKey);
    setFeedback({
      type: 'success',
      message: `Simulando avance secuencial de etapas oficiales para ${caso.codigo_sms}...`,
    });

    const steps: EstadoCaso[] = ['VALIDADO', 'ENVIADO', 'RADICADO', 'RESPUESTA RECIBIDA'];
    const startIdx = steps.indexOf(caso.estado);
    const remainingSteps = steps.slice(startIdx >= 0 ? startIdx + 1 : 0);

    for (const step of remainingSteps) {
      await handleCambiarEstado(caso, step);
      await new Promise((r) => setTimeout(r, 900));
    }

    setIsSimulatingId(null);
    setFeedback({
      type: 'success',
      message: `🎉 ¡Trámite ${caso.codigo_sms} completado con éxito! Se ha notificado la contestación o fallo final.`,
    });
  };

  const metricasAsesor = useMemo(() => {
    const porRevisar = misCasos.filter((c) => c.estado === 'BORRADOR' || c.estado === 'VALIDADO').length;
    const enCurso = misCasos.filter((c) => c.estado === 'ENVIADO' || c.estado === 'RADICADO').length;
    const resueltos = misCasos.filter((c) => c.estado === 'RESPUESTA RECIBIDA').length;
    return { total: misCasos.length, porRevisar, enCurso, resueltos };
  }, [misCasos]);

  const casosFiltrados = useMemo(() => {
    if (filtroEstado === 'TODOS') return misCasos;
    return misCasos.filter((c) => c.estado === filtroEstado);
  }, [misCasos, filtroEstado]);

  return (
    <div className="py-6 space-y-6 flex-1">
      {/* Cabecera Institucional del Panel de Asesor Jurídico */}
      <div className="bg-charcoal-900 text-white p-6 sm:p-8 rounded-3xl border-2 border-charcoal-950 shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aqua-400 text-charcoal-950 text-xs font-black uppercase tracking-wider">
            <Scales weight="duotone" className="w-4 h-4" />
            <span>Rol: {user?.rol}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-editorial text-white">
            Panel del Asesor Jurídico
          </h2>
          <p className="text-xs sm:text-sm text-olive-100 max-w-2xl leading-relaxed">
            Bienvenido(a), <strong className="text-white">{user?.nombre_completo}</strong>. Aquí gestionas exclusivamente los casos asignados a tu despacho ({misCasos.length}) y controlas su transición de estado legal.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={cargarMisCasos}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-white text-xs font-bold flex items-center gap-2 border border-charcoal-600 transition"
          >
            <ArrowsClockwise weight="bold" className="w-4 h-4 text-aqua-300" />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={handleSecureLogout}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-900 text-white text-xs font-bold flex items-center gap-2 border border-red-950 transition"
          >
            <SignOut weight="bold" className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Resumen de Carga de Trabajo del Asesor */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border-2 border-charcoal-800 shadow-sm">
          <span className="text-[11px] font-mono font-bold uppercase text-charcoal-600 block">
            Mis Casos Asignados
          </span>
          <span className="text-2xl font-black text-charcoal-950 font-editorial mt-1 block">
            {metricasAsesor.total}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-olive-50 border-2 border-olive-400 shadow-sm">
          <span className="text-[11px] font-mono font-bold uppercase text-olive-900 block">
            En Validación Técnica
          </span>
          <span className="text-2xl font-black text-olive-900 font-editorial mt-1 block">
            {metricasAsesor.porRevisar}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-institucional-50 border-2 border-institucional-300 shadow-sm">
          <span className="text-[11px] font-mono font-bold uppercase text-institucional-800 block">
            Enviados / Radicados
          </span>
          <span className="text-2xl font-black text-institucional-800 font-editorial mt-1 block">
            {metricasAsesor.enCurso}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-aqua-50 border-2 border-aqua-400 shadow-sm">
          <span className="text-[11px] font-mono font-bold uppercase text-aqua-900 block">
            Respuesta Recibida
          </span>
          <span className="text-2xl font-black text-aqua-900 font-editorial mt-1 block">
            {metricasAsesor.resueltos}
          </span>
        </div>
      </div>

      {/* Filtro rápido por Estado */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-2xl border border-charcoal-200">
        <div className="flex items-center gap-2 text-xs font-bold text-charcoal-700">
          <Funnel weight="duotone" className="w-4 h-4 text-institucional-600" />
          <span>Filtrar mi bandeja por estado:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['TODOS', 'BORRADOR', ...ESTADOS_GESTION_ASESOR].map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition ${
                filtroEstado === est
                  ? 'bg-institucional-500 text-white border border-charcoal-950'
                  : 'bg-charcoal-100 hover:bg-olive-100 text-charcoal-800'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Alerta de feedback */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-2xl border-2 flex items-start gap-3 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-olive-50 border-olive-600 text-charcoal-950'
              : 'bg-red-50 border-red-700 text-red-950'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle weight="duotone" className="w-5 h-5 text-olive-700 shrink-0" />
          ) : (
            <WarningCircle weight="duotone" className="w-5 h-5 text-red-700 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Listado de Casos Asignados al Asesor */}
      {isLoading ? (
        <div className="p-10 rounded-3xl bg-white border-2 border-charcoal-300 text-center text-xs font-bold text-charcoal-600">
          Cargando tus casos asignados...
        </div>
      ) : casosFiltrados.length === 0 ? (
        <div className="p-10 rounded-3xl bg-olive-50/60 border-2 border-dashed border-olive-400 text-center space-y-2">
          <FolderOpen weight="duotone" className="w-10 h-10 text-charcoal-400 mx-auto" />
          <p className="text-base font-black text-charcoal-900 font-editorial">
            No tienes casos en esta vista
          </p>
          <p className="text-xs text-charcoal-600 max-w-md mx-auto">
            Cuando el Jefe de Consultorio te asigne una solicitud desde su panel de supervisión, aparecerá aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {casosFiltrados.map((caso) => {
            const rowKey = caso.id || caso.codigo_sms;
            const isOpen = casoAbiertoId === rowKey;
            const fw = caso.formulario_web || {};
            const ciudadano = fw.ciudadano || {};
            const docUrl =
              caso.ruta_documento ||
              (typeof fw.ruta_documento === 'string' ? fw.ruta_documento : null);

            return (
              <div
                key={rowKey}
                className="rounded-3xl bg-white border-2 border-charcoal-800 shadow-sm overflow-hidden transition"
              >
                {/* Encabezado de la tarjeta del caso */}
                <div className="p-5 bg-olive-50/70 border-b border-olive-200 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs px-3 py-1 rounded-lg bg-charcoal-900 text-aqua-300">
                        {caso.codigo_sms}
                      </span>
                      <span className="px-3 py-1 rounded-lg text-[11px] font-black uppercase bg-olive-200 text-charcoal-950 border border-olive-500">
                        Estado actual: {caso.estado}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-charcoal-950 font-editorial pt-0.5">
                      {caso.tipo_problema}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCasoAbiertoId(isOpen ? null : rowKey)}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-olive-100 border-2 border-charcoal-700 text-charcoal-950 font-black text-xs inline-flex items-center gap-2 transition"
                  >
                    <span>{isOpen ? 'Cerrar detalle' : 'Abrir caso'}</span>
                    {isOpen ? (
                      <CaretUp weight="bold" className="w-4 h-4" />
                    ) : (
                      <CaretDown weight="bold" className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Cuerpo desplegable del caso */}
                {isOpen && (
                  <div className="p-5 sm:p-6 space-y-6 text-xs animate-fadeIn">
                    {/* Datos del ciudadano y del problema en Grid Responsivo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-charcoal-50 border border-charcoal-200">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-charcoal-500 flex items-center gap-1">
                          <UserCircle weight="duotone" className="w-3.5 h-3.5 text-institucional-600" />
                          <span>Ciudadano Solicitante</span>
                        </span>
                        <span className="font-bold text-sm text-charcoal-950 block">
                          {ciudadano.nombre_completo ||
                            [ciudadano.nombres, ciudadano.apellidos].filter(Boolean).join(' ') ||
                            (fw.nombre_completo as string) ||
                            'Registrado vía WhatsApp'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-charcoal-500 block">
                          Documento / Teléfono
                        </span>
                        <span className="font-mono font-bold text-charcoal-950 block">
                          {ciudadano.numero_documento || 'Sin doc'}{' '}
                          {ciudadano.telefono ? `• ${ciudadano.telefono}` : ''}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-charcoal-500 flex items-center gap-1">
                          <MapPinLine weight="duotone" className="w-3.5 h-3.5 text-olive-700" />
                          <span>Municipio / Vereda</span>
                        </span>
                        <span className="font-bold text-charcoal-950 block">
                          {[ciudadano.vereda || ciudadano.vereda_o_barrio, ciudadano.municipio]
                            .filter(Boolean)
                            .join(', ') || 'No especificado'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-charcoal-500 flex items-center gap-1">
                          <Buildings weight="duotone" className="w-3.5 h-3.5 text-institucional-600" />
                          <span>Entidad Destinataria</span>
                        </span>
                        <span className="font-bold text-charcoal-950 block">
                          {typeof fw.entidad === 'string'
                            ? fw.entidad
                            : fw.entidad?.nombre || 'Por definir'}
                        </span>
                      </div>

                      {fw.hechos && (
                        <div className="md:col-span-2 lg:col-span-2 pt-2 border-t border-charcoal-200">
                          <span className="text-[10px] font-black uppercase text-charcoal-500 block">
                            Hechos relatados por el ciudadano
                          </span>
                          <p className="font-medium text-charcoal-800 mt-1 leading-relaxed">
                            {String(fw.hechos)}
                          </p>
                        </div>
                      )}

                      {fw.peticion && (
                        <div className="md:col-span-2 lg:col-span-2 pt-2 border-t border-charcoal-200">
                          <span className="text-[10px] font-black uppercase text-charcoal-500 block">
                            Petición / Pretensión
                          </span>
                          <p className="font-medium text-charcoal-800 mt-1 leading-relaxed">
                            {String(fw.peticion)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Sección de Descarga del Documento Generado (.docx) */}
                    <div className="p-4 rounded-2xl bg-olive-50 border-2 border-olive-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <h4 className="font-black text-charcoal-950 text-xs sm:text-sm font-editorial">
                          Documento Legal (Motor de Plantillas .docx)
                        </h4>
                        <p className="text-[11px] text-charcoal-700">
                          {docUrl
                            ? 'El documento fue rellenado automáticamente con los datos del ciudadano y está listo para revisión.'
                            : 'Puedes generar el documento .docx oficial ahora mismo con un clic.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        {docUrl && (
                          <a
                            href={docUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-black text-xs inline-flex items-center gap-2 border-2 border-charcoal-950 transition"
                          >
                            <DownloadSimple weight="bold" className="w-4 h-4" />
                            <span>Descargar Documento (.docx)</span>
                          </a>
                        )}

                        <button
                          type="button"
                          disabled={generatingDocId === rowKey}
                          onClick={() => handleGenerarDocumento(caso)}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-olive-200 text-charcoal-950 font-black text-xs inline-flex items-center gap-2 border-2 border-charcoal-800 transition"
                        >
                          <FileDoc weight="duotone" className="w-4 h-4 text-institucional-600" />
                          <span>
                            {generatingDocId === rowKey
                              ? 'Generando...'
                              : docUrl
                              ? 'Regenerar .docx'
                              : 'Generar .docx'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Flujo de Estados del Asesor Jurídico */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="block text-[11px] font-black uppercase tracking-wider text-charcoal-800">
                            Actualizar Estado del Caso (Flujo Operativo del Asesor):
                          </span>
                          {caso.estado !== 'RESPUESTA RECIBIDA' && (
                            <button
                              type="button"
                              disabled={isSimulatingId === rowKey}
                              onClick={() => handleSimularWorkflow(caso)}
                              className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-black text-[11px] inline-flex items-center gap-1.5 border border-amber-400 transition shadow-sm active:scale-95"
                              title="Avanzar secuencialmente hasta el cierre del trámite"
                            >
                              <Lightning weight="fill" className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                              <span>
                                {isSimulatingId === rowKey
                                  ? 'Simulando etapas...'
                                  : '⚡ Simular avance completo (Demo)'}
                              </span>
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-charcoal-600 flex items-center gap-1 font-medium">
                          <ClockCountdown weight="duotone" className="w-4 h-4 text-institucional-600" />
                          <span>{DESCRIPCION_ESTADO_OPERATIVO[caso.estado]}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {ESTADOS_GESTION_ASESOR.map((estadoObjetivo) => {
                          const isCurrent = caso.estado === estadoObjetivo;
                          const isBusy =
                            updatingId === `${rowKey}-${estadoObjetivo}`;

                          return (
                            <button
                              key={estadoObjetivo}
                              type="button"
                              disabled={isCurrent || isBusy}
                              onClick={() =>
                                handleCambiarEstado(caso, estadoObjetivo)
                              }
                              className={`min-h-[48px] px-3.5 py-2.5 rounded-xl font-black text-xs border-2 transition flex items-center justify-center text-center gap-1.5 ${
                                isCurrent
                                  ? 'bg-olive-600 text-white border-charcoal-950 cursor-default shadow-inner'
                                  : 'bg-institucional-500 hover:bg-institucional-600 text-white border-charcoal-950 shadow-sm'
                              }`}
                            >
                              {isCurrent && <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />}
                              <span>{isBusy ? 'Guardando...' : estadoObjetivo}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
