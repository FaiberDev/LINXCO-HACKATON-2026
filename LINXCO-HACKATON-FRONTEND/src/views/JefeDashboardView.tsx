import React, { useEffect, useState, useCallback } from 'react';
import { useAuth, AdminUser, FALLBACK_ADMIN_USERS } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Caso } from '../types';
import {
  Briefcase,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  LogOut,
  FileText,
} from 'lucide-react';

export const JefeDashboardView: React.FC = () => {
  const { user, token, logout } = useAuth();

  const [solicitudes, setSolicitudes] = useState<Caso[]>([]);
  const [asesores, setAsesores] = useState<AdminUser[]>([]);
  const [selectedAsesorByCaso, setSelectedAsesorByCaso] = useState<
    Record<string, string>
  >({});
  const [filtroEstado, setFiltroEstado] = useState<'BORRADOR' | 'TODOS'>(
    'BORRADOR'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
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

  const cargarDatos = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint =
        filtroEstado === 'BORRADOR'
          ? '/solicitudes?estado=BORRADOR'
          : '/solicitudes';

      const [solRes, aseRes] = await Promise.all([
        apiFetch<{ solicitudes?: Caso[]; casos?: Caso[] }>(endpoint, {
          headers: authHeaders(),
        }),
        apiFetch<{ asesores?: AdminUser[] }>('/asesores', {
          headers: authHeaders(),
        }),
      ]);

      const listaCasos = solRes.solicitudes || solRes.casos || [];
      const listaAsesores =
        aseRes.asesores && aseRes.asesores.length > 0
          ? aseRes.asesores
          : FALLBACK_ADMIN_USERS.filter((u) => u.rol === 'Asesor Jurídico');

      setSolicitudes(listaCasos);
      setAsesores(listaAsesores);

      // Inicializar selección de dropdown con el asesor ya asignado si existe
      const initialMap: Record<string, string> = {};
      listaCasos.forEach((c) => {
        const key = c.id || c.codigo_sms;
        if (c.asesor_asignado_id) {
          initialMap[key] = c.asesor_asignado_id;
        }
      });
      setSelectedAsesorByCaso((prev) => ({ ...initialMap, ...prev }));
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          (err as Error)?.message ||
          'No se pudieron cargar las solicitudes desde el servidor.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filtroEstado, authHeaders]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleAssign = async (caso: Caso) => {
    const rowKey = caso.id || caso.codigo_sms;
    const asesorId = selectedAsesorByCaso[rowKey];

    if (!asesorId) {
      setFeedback({
        type: 'error',
        message: `Selecciona un Asesor Jurídico para el caso ${caso.codigo_sms}.`,
      });
      return;
    }

    setAssigningId(rowKey);
    setFeedback(null);

    try {
      const response = await apiFetch<{
        success: boolean;
        mensaje: string;
        solicitud: Caso;
      }>(`/solicitudes/${encodeURIComponent(rowKey)}/asignar`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ asesor_id: asesorId }),
      });

      setSolicitudes((prev) =>
        prev.map((item) =>
          (item.id || item.codigo_sms) === rowKey ? response.solicitud : item
        )
      );

      setFeedback({
        type: 'success',
        message:
          response.mensaje ||
          `Caso ${caso.codigo_sms} asignado correctamente.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          (err as Error)?.message ||
          `Error al asignar el caso ${caso.codigo_sms}.`,
      });
    } finally {
      setAssigningId(null);
    }
  };

  const obtenerNombreCiudadano = (c: Caso): string => {
    const fw = c.formulario_web;
    if (!fw) return 'Ciudadano (Vía WhatsApp)';
    if (fw.ciudadano?.nombre_completo) return fw.ciudadano.nombre_completo;
    if (typeof fw.nombre_completo === 'string') return fw.nombre_completo;
    if (typeof fw.datos_usuario_descripcion === 'string') {
      return fw.datos_usuario_descripcion.split(',')[0];
    }
    return 'Ciudadano registrado';
  };

  const obtenerUbicacion = (c: Caso): string => {
    const fw = c.formulario_web;
    if (!fw) return '';
    const mun = fw.ciudadano?.municipio || (fw.municipio as string) || '';
    const ver = fw.ciudadano?.vereda || (fw.vereda as string) || '';
    return [ver, mun].filter(Boolean).join(' - ');
  };

  return (
    <div className="py-5 space-y-5 flex-1">
      {/* Cabecera del Panel de Jefe */}
      <div className="bg-brand-950 text-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[11px] font-black uppercase">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Rol: {user?.rol}</span>
          </div>
          <h2 className="text-xl font-black">
            Panel del Jefe de Consultorio Jurídico
          </h2>
          <p className="text-xs text-slate-200">
            Bienvenido(a), <strong>{user?.nombre_completo}</strong>. Revisa las solicitudes entrantes en estado{' '}
            <span className="font-mono font-bold text-amber-300">BORRADOR</span> y asígnalas a un Asesor Jurídico.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={cargarDatos}
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

      {/* Filtro de vista */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-xl border-2 border-slate-300 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setFiltroEstado('BORRADOR')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-colors ${
              filtroEstado === 'BORRADOR'
                ? 'bg-brand-900 text-white'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            Solicitudes en BORRADOR
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-colors ${
              filtroEstado === 'TODOS'
                ? 'bg-brand-900 text-white'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            Todos los Estados
          </button>
        </div>

        <span className="text-xs font-bold text-slate-700">
          Total en lista: <strong className="text-slate-950">{solicitudes.length}</strong> solicitudes
        </span>
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

      {/* Tabla de Solicitudes Entrantes */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4">Código / Fecha</th>
                <th className="py-3.5 px-4">Ciudadano</th>
                <th className="py-3.5 px-4">Problema del Ciudadano</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Asignar Asesor Jurídico</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-bold text-slate-600">
                    Cargando solicitudes entrantes desde la base de datos...
                  </td>
                </tr>
              ) : solicitudes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-bold text-slate-600">
                    No hay solicitudes registradas con el filtro actual.
                  </td>
                </tr>
              ) : (
                solicitudes.map((caso) => {
                  const rowKey = caso.id || caso.codigo_sms;
                  const currentSelected =
                    selectedAsesorByCaso[rowKey] || caso.asesor_asignado_id || '';
                  const asesorActual = asesores.find(
                    (a) => a.id === caso.asesor_asignado_id
                  );
                  const docUrl =
                    caso.ruta_documento ||
                    (caso.formulario_web?.ruta_documento as string | undefined);

                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-slate-50 transition-colors align-top"
                    >
                      {/* Código y documento */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded bg-brand-100 text-brand-950 border border-brand-300 inline-block">
                          {caso.codigo_sms}
                        </span>
                        {caso.created_at && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            {new Date(caso.created_at).toLocaleDateString('es-CO')}
                          </p>
                        )}
                        {docUrl && (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver .docx</span>
                          </a>
                        )}
                      </td>

                      {/* Ciudadano */}
                      <td className="py-3.5 px-4">
                        <p className="font-black text-slate-950">
                          {obtenerNombreCiudadano(caso)}
                        </p>
                        {obtenerUbicacion(caso) && (
                          <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                            {obtenerUbicacion(caso)}
                          </p>
                        )}
                      </td>

                      {/* Problema del ciudadano */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900">
                          {caso.tipo_problema}
                        </p>
                        {caso.formulario_web?.hechos && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            {String(caso.formulario_web.hechos)}
                          </p>
                        )}
                        {caso.formulario_web &&
                          typeof caso.formulario_web.datos_usuario_descripcion ===
                            'string' && (
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                              {caso.formulario_web.datos_usuario_descripcion}
                            </p>
                          )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-black uppercase bg-amber-100 text-amber-950 border border-amber-400">
                          {caso.estado}
                        </span>
                        {asesorActual && (
                          <p className="text-[11px] font-bold text-emerald-800 mt-1.5">
                            Asignado a: {asesorActual.nombre_completo}
                          </p>
                        )}
                      </td>

                      {/* Selector Dropdown de Asesor + Botón Asignar */}
                      <td className="py-3.5 px-4 min-w-[240px]">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            aria-label={`Seleccionar Asesor Jurídico para ${caso.codigo_sms}`}
                            value={currentSelected}
                            onChange={(e) =>
                              setSelectedAsesorByCaso((prev) => ({
                                ...prev,
                                [rowKey]: e.target.value,
                              }))
                            }
                            className="flex-1 min-h-[40px] px-2.5 py-1.5 rounded-lg border-2 border-slate-400 bg-white text-slate-950 font-semibold text-xs focus:outline-none focus:border-brand-900"
                          >
                            <option value="">-- Seleccionar Asesor --</option>
                            {asesores.map((asesor) => (
                              <option key={asesor.id} value={asesor.id}>
                                {asesor.nombre_completo}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={assigningId === rowKey}
                            onClick={() => handleAssign(caso)}
                            className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-brand-900 hover:bg-brand-950 disabled:opacity-60 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <UserCheck className="w-4 h-4 text-emerald-300" />
                            <span>
                              {assigningId === rowKey
                                ? 'Asignando...'
                                : 'Asignar'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
