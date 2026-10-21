import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AdminUser, FALLBACK_ADMIN_USERS } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Caso, EstadoCaso, ESTADOS_CASO } from '../types';
import {
  listMockCases,
  assignMockCaseToAsesor,
  changeMockCaseEstado,
} from '../services/mockStorage';
import {
  Briefcase,
  ArrowsClockwise,
  UserCheck,
  CheckCircle,
  WarningCircle,
  SignOut,
  FileText,
  DownloadSimple,
  ChartBar,
  UsersThree,
  FolderOpen,
  ShieldCheck,
} from '@phosphor-icons/react';

export const JefeDashboardView: React.FC = () => {
  const navigate = useNavigate();
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
  const [justAssignedKey, setJustAssignedKey] = useState<string | null>(null);
  const [updatingEstadoId, setUpdatingEstadoId] = useState<string | null>(null);
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
    } catch {
      // Fallback local para demostración sin servidor activo
      const listaLocales = listMockCases(
        filtroEstado === 'BORRADOR' ? { estado: 'BORRADOR' } : undefined
      );
      const listaAsesores = FALLBACK_ADMIN_USERS.filter(
        (u) => u.rol === 'Asesor Jurídico'
      );
      setSolicitudes(listaLocales);
      setAsesores(listaAsesores);

      const initialMap: Record<string, string> = {};
      listaLocales.forEach((c) => {
        const key = c.id || c.codigo_sms;
        if (c.asesor_asignado_id) {
          initialMap[key] = c.asesor_asignado_id;
        }
      });
      setSelectedAsesorByCaso((prev) => ({ ...initialMap, ...prev }));
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

    const targetAsesor = asesores.find((a) => a.id === asesorId);

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

      // Si el caso estaba en BORRADOR, al asignarlo se valida automáticamente en consultorio
      let finalCase = response.solicitud;
      if (caso.estado === 'BORRADOR') {
        try {
          const resEstado = await apiFetch<{ solicitud: Caso }>(
            `/solicitudes/${encodeURIComponent(rowKey)}/estado`,
            {
              method: 'PUT',
              headers: authHeaders(),
              body: JSON.stringify({ estado: 'VALIDADO' }),
            }
          );
          if (resEstado?.solicitud) {
            finalCase = resEstado.solicitud;
          }
        } catch {
          // No bloqueante
        }
      }

      setSolicitudes((prev) =>
        prev.map((item) =>
          (item.id || item.codigo_sms) === rowKey ? finalCase : item
        )
      );

      setJustAssignedKey(rowKey);
      setTimeout(() => setJustAssignedKey(null), 5000);

      setFeedback({
        type: 'success',
        message:
          response.mensaje ||
          `Caso ${caso.codigo_sms} asignado correctamente a ${targetAsesor?.nombre_completo || 'Asesor'} y validado técnicamente.`,
      });
    } catch (err) {
      const updatedLocal = assignMockCaseToAsesor(
        rowKey,
        asesorId,
        targetAsesor?.nombre_completo
      );
      if (updatedLocal) {
        const validatedLocal =
          caso.estado === 'BORRADOR'
            ? changeMockCaseEstado(rowKey, 'VALIDADO') || updatedLocal
            : updatedLocal;

        setSolicitudes((prev) =>
          prev.map((item) =>
            (item.id || item.codigo_sms) === rowKey ? validatedLocal : item
          )
        );

        setJustAssignedKey(rowKey);
        setTimeout(() => setJustAssignedKey(null), 5000);

        setFeedback({
          type: 'success',
          message: `Caso ${caso.codigo_sms} asignado a ${
            targetAsesor?.nombre_completo || 'Asesor Jurídico'
          } y validado técnicamente.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            (err as Error)?.message ||
            `Error al asignar el caso ${caso.codigo_sms}.`,
        });
      }
    } finally {
      setAssigningId(null);
    }
  };

  const handleSupervisionEstado = async (caso: Caso, nuevoEstado: EstadoCaso) => {
    const rowKey = caso.id || caso.codigo_sms;
    setUpdatingEstadoId(rowKey);
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

      setSolicitudes((prev) =>
        prev.map((item) =>
          (item.id || item.codigo_sms) === rowKey ? res.solicitud : item
        )
      );

      setFeedback({
        type: 'success',
        message:
          res.mensaje ||
          `Estado de ${caso.codigo_sms} supervisado y actualizado a ${nuevoEstado}.`,
      });
    } catch {
      const updatedLocal = changeMockCaseEstado(rowKey, nuevoEstado);
      if (updatedLocal) {
        setSolicitudes((prev) =>
          prev.map((item) =>
            (item.id || item.codigo_sms) === rowKey ? updatedLocal : item
          )
        );
        setFeedback({
          type: 'success',
          message: `Estado de ${caso.codigo_sms} actualizado a ${nuevoEstado}.`,
        });
      }
    } finally {
      setUpdatingEstadoId(null);
    }
  };

  const obtenerNombreCiudadano = (c: Caso): string => {
    const fw = c.formulario_web;
    if (!fw) return 'Ciudadano (Vía WhatsApp)';
    if (fw.ciudadano?.nombre_completo) return fw.ciudadano.nombre_completo;
    const combinado = [fw.ciudadano?.nombres, fw.ciudadano?.apellidos]
      .filter(Boolean)
      .join(' ');
    if (combinado) return combinado;
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
    const ver =
      fw.ciudadano?.vereda ||
      fw.ciudadano?.vereda_o_barrio ||
      (fw.vereda as string) ||
      '';
    return [ver, mun].filter(Boolean).join(' — ');
  };

  // Métricas ejecutivas para supervisión del Jefe de Consultorio
  const metricas = useMemo(() => {
    const total = solicitudes.length;
    const borradores = solicitudes.filter((s) => s.estado === 'BORRADOR').length;
    const sinAsignar = solicitudes.filter((s) => !s.asesor_asignado_id).length;
    const validadosYAvanzados = solicitudes.filter(
      (s) => s.estado !== 'BORRADOR'
    ).length;
    return { total, borradores, sinAsignar, validadosYAvanzados };
  }, [solicitudes]);

  return (
    <div className="py-6 space-y-6 flex-1">
      {/* Cabecera del Panel de Jefe */}
      <div className="bg-charcoal-900 text-white p-6 sm:p-8 rounded-3xl border-2 border-charcoal-950 shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-olive-300 text-charcoal-950 text-xs font-black uppercase tracking-wider">
            <Briefcase weight="duotone" className="w-4 h-4" />
            <span>Rol: {user?.rol}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-editorial text-white">
            Panel del Jefe de Consultorio Jurídico
          </h2>
          <p className="text-xs sm:text-sm text-olive-100 max-w-2xl leading-relaxed">
            Bienvenido(a), <strong className="text-white">{user?.nombre_completo}</strong>. Supervisa las métricas globales del consultorio, revisa las solicitudes entrantes en estado{' '}
            <span className="font-mono font-bold text-aqua-300">BORRADOR</span> y asígnalas a tu equipo de Asesores Jurídicos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={cargarDatos}
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

      {/* KPI Metrics Grid (Supervisión y Métricas del Jefe) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-charcoal-800 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase text-charcoal-600 block">
              Total en Vista
            </span>
            <span className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial mt-1 block">
              {metricas.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-institucional-50 border border-institucional-200 flex items-center justify-center text-institucional-600">
            <ChartBar weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-500 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase text-amber-900 block">
              En Estado BORRADOR
            </span>
            <span className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial mt-1 block">
              {metricas.borradores}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-200/70 flex items-center justify-center text-amber-900">
            <FolderOpen weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-olive-50 border-2 border-olive-500 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase text-olive-900 block">
              Asesores Activos
            </span>
            <span className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial mt-1 block">
              {asesores.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-olive-200 flex items-center justify-center text-charcoal-900">
            <UsersThree weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-aqua-50 border-2 border-aqua-500 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase text-aqua-900 block">
              En Trámite / Radicados
            </span>
            <span className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial mt-1 block">
              {metricas.validadosYAvanzados}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-aqua-200/70 flex items-center justify-center text-institucional-900">
            <ShieldCheck weight="duotone" className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filtro de vista */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-2xl border-2 border-charcoal-300 bg-olive-100/70 p-1.5">
          <button
            type="button"
            onClick={() => setFiltroEstado('BORRADOR')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
              filtroEstado === 'BORRADOR'
                ? 'bg-institucional-500 text-white shadow-sm'
                : 'text-charcoal-700 hover:text-charcoal-950'
            }`}
          >
            Solicitudes en BORRADOR
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
              filtroEstado === 'TODOS'
                ? 'bg-institucional-500 text-white shadow-sm'
                : 'text-charcoal-700 hover:text-charcoal-950'
            }`}
          >
            Todos los Estados
          </button>
        </div>

        <span className="text-xs font-bold text-charcoal-700">
          Total en lista: <strong className="text-charcoal-950">{solicitudes.length}</strong> solicitudes
          {metricas.sinAsignar > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono text-[11px]">
              {metricas.sinAsignar} sin asignar
            </span>
          )}
        </span>
      </div>

      {/* Alerta de feedback fija y toast flotante */}
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
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-charcoal-400 hover:text-charcoal-800 font-bold"
            aria-label="Cerrar alerta"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toast flotante visible independientemente del scroll */}
      {feedback && (
        <div
          role="status"
          className={`fixed top-20 right-6 z-50 max-w-sm p-4 rounded-2xl border-2 flex items-start gap-3 text-xs font-bold shadow-2xl transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-[#F4F7F2] border-olive-600 text-charcoal-950 ring-4 ring-olive-400/20'
              : 'bg-red-50 border-red-700 text-red-950 ring-4 ring-red-400/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle weight="fill" className="w-5 h-5 text-olive-700 shrink-0 mt-0.5" />
          ) : (
            <WarningCircle weight="fill" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="block text-sm font-black font-editorial mb-0.5">
              {feedback.type === 'success' ? 'Asignación Confirmada' : 'Atención'}
            </span>
            <span className="text-xs text-charcoal-800 leading-snug">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-charcoal-400 hover:text-charcoal-800 text-xs font-bold"
            aria-label="Cerrar notificación flotante"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabla de Solicitudes Entrantes y Supervisión */}
      <div className="bg-white rounded-3xl border-2 border-charcoal-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-charcoal-900 text-white text-[11px] font-mono font-bold uppercase tracking-wider">
                <th className="py-4 px-4">Código / Fecha</th>
                <th className="py-4 px-4">Ciudadano y Municipio</th>
                <th className="py-4 px-4">Problema del Ciudadano</th>
                <th className="py-4 px-4">Estado (Supervisión)</th>
                <th className="py-4 px-4">Asignar Asesor Jurídico</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-charcoal-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center font-bold text-charcoal-600">
                    Cargando solicitudes entrantes desde la base de datos...
                  </td>
                </tr>
              ) : solicitudes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center font-bold text-charcoal-600">
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
                  const pdfUrl =
                    (caso.formulario_web?.ruta_documento_pdf as string | undefined) ||
                    (docUrl
                      ? docUrl.replace(/\.docx$/i, '.pdf')
                      : `/api/casos/${encodeURIComponent(caso.codigo_sms)}/pdf`);

                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-olive-50/50 transition-colors align-top"
                    >
                      {/* Código y documento */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-olive-200 text-charcoal-950 border border-olive-400 inline-block">
                          {caso.codigo_sms}
                        </span>
                        {caso.created_at && (
                          <p className="text-[11px] font-mono text-charcoal-500 mt-1">
                            {new Date(caso.created_at).toLocaleDateString('es-CO')}
                          </p>
                        )}
                        {docUrl && (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <a
                              href={docUrl}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-olive-800 hover:underline"
                              title="Descargar versión Word (.docx)"
                            >
                              <FileText weight="duotone" className="w-3.5 h-3.5" />
                              <span>Word (.docx)</span>
                            </a>
                            <span className="text-charcoal-400 text-xs">•</span>
                            <a
                              href={pdfUrl}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-institucional-700 hover:underline"
                              title="Descargar versión PDF oficial (.pdf)"
                            >
                              <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
                              <span>PDF (.pdf)</span>
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Ciudadano */}
                      <td className="py-4 px-4">
                        <p className="font-black text-charcoal-950 text-sm">
                          {obtenerNombreCiudadano(caso)}
                        </p>
                        {obtenerUbicacion(caso) && (
                          <p className="text-[11px] text-charcoal-600 font-semibold mt-0.5">
                            {obtenerUbicacion(caso)}
                          </p>
                        )}
                      </td>

                      {/* Problema del ciudadano */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-bold text-charcoal-900">
                          {caso.tipo_problema}
                        </p>
                        {caso.formulario_web?.hechos && (
                          <p className="text-[11px] text-charcoal-600 mt-1 line-clamp-2">
                            {String(caso.formulario_web.hechos)}
                          </p>
                        )}
                        {caso.formulario_web &&
                          typeof caso.formulario_web.datos_usuario_descripcion ===
                            'string' && (
                            <p className="text-[11px] text-charcoal-600 mt-1 line-clamp-2">
                              {caso.formulario_web.datos_usuario_descripcion}
                            </p>
                          )}
                      </td>

                      {/* Estado y Supervisión directa del Jefe */}
                      <td className="py-4 px-4 whitespace-nowrap space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border ${
                              caso.estado === 'BORRADOR'
                                ? 'bg-amber-100 text-amber-950 border-amber-400'
                                : 'bg-olive-200 text-charcoal-950 border-olive-500'
                            }`}
                          >
                            {caso.estado}
                          </span>
                        </div>

                        <select
                          aria-label={`Supervisar estado de ${caso.codigo_sms}`}
                          disabled={updatingEstadoId === rowKey}
                          value={caso.estado}
                          onChange={(e) =>
                            handleSupervisionEstado(
                              caso,
                              e.target.value as EstadoCaso
                            )
                          }
                          className="block w-full min-h-[34px] px-2 py-1 rounded-lg border border-charcoal-300 bg-charcoal-50 text-[11px] font-bold text-charcoal-800 focus:border-institucional-500"
                        >
                          {ESTADOS_CASO.map((est) => (
                            <option key={est} value={est}>
                              Estado: {est}
                            </option>
                          ))}
                        </select>

                        {asesorActual && (
                          <p className="text-[11px] font-bold text-institucional-700">
                            Asignado a: {asesorActual.nombre_completo}
                          </p>
                        )}
                      </td>

                      {/* Selector Dropdown de Asesor + Botón Asignar */}
                      <td className="py-4 px-4 min-w-[250px]">
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
                            className="flex-1 min-h-[42px] px-3 py-1.5 rounded-xl border-2 border-charcoal-300 bg-white text-charcoal-950 font-semibold text-xs focus:outline-none focus:border-institucional-500"
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
                            className={`min-h-[42px] px-4 py-1.5 rounded-xl disabled:opacity-60 font-black text-xs inline-flex items-center justify-center gap-1.5 border-2 transition shrink-0 ${
                              justAssignedKey === rowKey
                                ? 'bg-olive-600 text-white border-olive-800 shadow-inner'
                                : 'bg-institucional-500 hover:bg-institucional-600 text-white border-charcoal-950 shadow-sm'
                            }`}
                          >
                            {justAssignedKey === rowKey ? (
                              <>
                                <CheckCircle weight="fill" className="w-4 h-4 text-aqua-300" />
                                <span>¡Asignado!</span>
                              </>
                            ) : (
                              <>
                                <UserCheck weight="duotone" className="w-4 h-4 text-aqua-300" />
                                <span>
                                  {assigningId === rowKey
                                    ? 'Asignando...'
                                    : 'Asignar'}
                                </span>
                              </>
                            )}
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
