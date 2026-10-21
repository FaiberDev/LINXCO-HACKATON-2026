import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Caso, EstadoCaso } from '../types';
import {
  Scale,
  RefreshCw,
  LogOut,
  FileDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const ESTADOS_GESTION_ASESOR: EstadoCaso[] = [
  'VALIDADO',
  'ENVIADO',
  'RADICADO',
  'RESPUESTA RECIBIDA',
];

export const AsesorDashboardView: React.FC = () => {
  const { user, token, logout } = useAuth();

  const [misCasos, setMisCasos] = useState<Caso[]>([]);
  const [casoAbiertoId, setCasoAbiertoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [generatingDocId, setGeneratingDocId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          (err as Error)?.message ||
          'No se pudieron cargar tus casos asignados.',
      });
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
      setFeedback({
        type: 'error',
        message:
          (err as Error)?.message ||
          `No se pudo cambiar el estado de ${caso.codigo_sms}.`,
      });
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

  return (
    <div className="py-5 space-y-5 flex-1">
      {/* Cabecera del Panel de Asesor Jurídico */}
      <div className="bg-brand-950 text-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-400 text-slate-950 text-[11px] font-black uppercase">
            <Scale className="w-3.5 h-3.5" />
            <span>Rol: {user?.rol}</span>
          </div>
          <h2 className="text-xl font-black">
            Panel del Asesor Jurídico
          </h2>
          <p className="text-xs text-slate-200">
            Bienvenido(a), <strong>{user?.nombre_completo}</strong>. Aquí solo aparecen los casos asignados exclusivamente a ti ({misCasos.length}).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={cargarMisCasos}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="px-3.5 py-2.5 rounded-xl bg-red-800 hover:bg-red-900 text-white text-xs font-bold flex items-center gap-1.5 border border-red-950"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Alerta de feedback */}
      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border-2 flex items-start gap-2.5 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-700 text-emerald-950'
              : 'bg-red-50 border-red-700 text-red-950'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Listado de Casos Asignados al Asesor */}
      {isLoading ? (
        <div className="p-8 rounded-2xl bg-white border-2 border-slate-300 text-center text-xs font-bold text-slate-600">
          Cargando tus casos asignados...
        </div>
      ) : misCasos.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-black text-slate-800">
            Aún no tienes casos asignados
          </p>
          <p className="text-xs text-slate-600">
            Cuando el Jefe de Consultorio te asigne una solicitud desde su panel, aparecerá aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {misCasos.map((caso) => {
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
                className="rounded-2xl bg-white border-2 border-slate-300 shadow-sm overflow-hidden"
              >
                {/* Encabezado de la tarjeta del caso */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs px-2.5 py-1 rounded bg-brand-900 text-white">
                        {caso.codigo_sms}
                      </span>
                      <span className="px-2.5 py-1 rounded text-[11px] font-black uppercase bg-emerald-100 text-emerald-950 border border-emerald-500">
                        Estado actual: {caso.estado}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-950">
                      {caso.tipo_problema}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCasoAbiertoId(isOpen ? null : rowKey)
                    }
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-400 text-slate-900 font-black text-xs inline-flex items-center gap-1.5"
                  >
                    <span>{isOpen ? 'Cerrar detalle' : 'Abrir caso'}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Cuerpo desplegable del caso */}
                {isOpen && (
                  <div className="p-4 space-y-5 text-xs">
                    {/* Datos del ciudadano y del problema */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-500 block">
                          Ciudadano Solicitante
                        </span>
                        <span className="font-bold text-slate-950">
                          {ciudadano.nombre_completo ||
                            (fw.nombre_completo as string) ||
                            'Registrado vía WhatsApp'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-500 block">
                          Documento / Teléfono
                        </span>
                        <span className="font-bold text-slate-950">
                          {ciudadano.numero_documento || 'Sin doc'}{' '}
                          {ciudadano.telefono ? `• ${ciudadano.telefono}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-500 block">
                          Municipio / Vereda
                        </span>
                        <span className="font-bold text-slate-950">
                          {[ciudadano.vereda, ciudadano.municipio]
                            .filter(Boolean)
                            .join(', ') || 'No especificado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-500 block">
                          Entidad Accionada / Destinataria
                        </span>
                        <span className="font-bold text-slate-950">
                          {typeof fw.entidad === 'string'
                            ? fw.entidad
                            : fw.entidad?.nombre || 'Por definir'}
                        </span>
                      </div>

                      {fw.hechos && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">
                            Hechos relatados por el ciudadano
                          </span>
                          <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                            {String(fw.hechos)}
                          </p>
                        </div>
                      )}

                      {fw.peticion && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">
                            Petición / Pretensión
                          </span>
                          <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                            {String(fw.peticion)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Sección de Descarga del Documento Generado (.docx) */}
                    <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-black text-emerald-950 text-xs">
                          Documento Legal (Motor de Plantillas .docx)
                        </h4>
                        <p className="text-[11px] text-emerald-900">
                          {docUrl
                            ? 'El documento fue rellenado automáticamente con los datos del ciudadano y está listo para revisión.'
                            : 'Este caso fue iniciado por WhatsApp. Puedes generar el documento .docx ahora mismo con un clic.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {docUrl && (
                          <a
                            href={docUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs inline-flex items-center gap-2 border-2 border-emerald-950"
                          >
                            <FileDown className="w-4 h-4" />
                            <span>Descargar Documento (.docx)</span>
                          </a>
                        )}

                        <button
                          type="button"
                          disabled={generatingDocId === rowKey}
                          onClick={() => handleGenerarDocumento(caso)}
                          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-950 font-black text-xs inline-flex items-center gap-1.5 border-2 border-emerald-800"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
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

                    {/* Botones de Cambio de Estado Exactos */}
                    <div className="space-y-2">
                      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Actualizar Estado del Caso:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                              className={`min-h-[44px] px-3 py-2 rounded-xl font-black text-xs border-2 transition-colors flex items-center justify-center text-center ${
                                isCurrent
                                  ? 'bg-emerald-700 text-white border-emerald-950 cursor-default'
                                  : 'bg-brand-900 hover:bg-brand-950 text-white border-slate-950'
                              }`}
                            >
                              {isBusy ? 'Guardando...' : estadoObjetivo}
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
