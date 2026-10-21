const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ESTADOS_VALIDOS = [
  'BORRADOR',
  'VALIDADO',
  'ENVIADO',
  'RADICADO',
  'RESPUESTA RECIBIDA',
];

const SELECT_COLUMNS =
  'id, usuario_id, asesor_asignado_id, codigo_sms, tipo_problema, estado, formulario_web, ruta_documento, created_at';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val) {
  return UUID_REGEX.test(String(val || '').trim());
}

/**
 * Normaliza un registro de la base de datos ('casos' / 'solicitudes')
 * exponiendo tanto los nombres de campos del modelo Solicitudes (Prompt 2 y 3)
 * como los nombres usados por el bot de WhatsApp y el Frontend Ciudadano.
 */
function formatSolicitudRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    codigo_seguimiento: row.codigo_sms,
    codigo_sms: row.codigo_sms,
    datos_ciudadano: row.formulario_web || {},
    formulario_web: row.formulario_web || {},
    tipo_tramite: row.tipo_problema,
    tipo_problema: row.tipo_problema,
    estado: row.estado || 'BORRADOR',
    asesor_asignado_id: row.asesor_asignado_id || null,
    usuario_id: row.usuario_id || null,
    ruta_documento:
      row.ruta_documento ||
      (row.formulario_web && row.formulario_web.ruta_documento) ||
      null,
    created_at: row.created_at,
  };
}

function generarSufijoCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CASO-${suffix}`;
}

class Solicitud {
  static get supabase() {
    return supabase;
  }

  static get ESTADOS_VALIDOS() {
    return ESTADOS_VALIDOS;
  }

  /**
   * Busca una solicitud/caso por su código de seguimiento (ej. CASO-XXX)
   */
  static async findByCodigo(codigo) {
    const cleanCode = (codigo || '').trim().toUpperCase();
    if (!cleanCode) return null;

    const { data, error } = await supabase
      .from('casos')
      .select(SELECT_COLUMNS)
      .eq('codigo_sms', cleanCode)
      .maybeSingle();

    if (error) throw error;
    return formatSolicitudRecord(data);
  }

  /**
   * Busca una solicitud ya sea por su UUID (id) o por su código (CASO-XXX)
   */
  static async findByIdOrCodigo(idOrCodigo) {
    const clean = String(idOrCodigo || '').trim();
    if (!clean) return null;

    if (isUuid(clean)) {
      const { data, error } = await supabase
        .from('casos')
        .select(SELECT_COLUMNS)
        .eq('id', clean)
        .maybeSingle();
      if (error) throw error;
      if (data) return formatSolicitudRecord(data);
    }

    return Solicitud.findByCodigo(clean);
  }

  /**
   * Lista todas las solicitudes (con filtros opcionales por estado o asesor)
   */
  static async findAll(filters = {}) {
    let query = supabase
      .from('casos')
      .select(SELECT_COLUMNS)
      .order('created_at', { ascending: false });

    if (filters.estado) {
      query = query.eq('estado', filters.estado);
    }
    if (filters.asesor_asignado_id) {
      query = query.eq('asesor_asignado_id', filters.asesor_asignado_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(formatSolicitudRecord);
  }

  /**
   * Crea una nueva solicitud con código único CASO-XXX
   */
  static async create({
    usuarioId = null,
    asesorAsignadoId = null,
    tipoTramite = 'Trámite ciudadano',
    datosCiudadano = {},
    estado = 'BORRADOR',
    rutaDocumento = null,
    codigoFijo = null,
  } = {}) {
    const estadoFinal = ESTADOS_VALIDOS.includes(estado) ? estado : 'BORRADOR';
    const tipoFinal =
      (typeof tipoTramite === 'string' && tipoTramite.trim()) ||
      'Trámite ciudadano';

    for (let intento = 0; intento < 5; intento++) {
      const codigo = codigoFijo
        ? codigoFijo.trim().toUpperCase()
        : generarSufijoCodigo();

      const payload = {
        usuario_id: usuarioId,
        asesor_asignado_id: asesorAsignadoId,
        codigo_sms: codigo,
        tipo_problema: tipoFinal,
        estado: estadoFinal,
        formulario_web: datosCiudadano,
        ruta_documento: rutaDocumento,
      };

      const { data, error } = await supabase
        .from('casos')
        .insert(payload)
        .select(SELECT_COLUMNS)
        .single();

      if (!error) return formatSolicitudRecord(data);
      if (error.code !== '23505' || codigoFijo) throw error;
    }

    throw new Error('No fue posible generar un código de seguimiento único');
  }

  /**
   * Actualiza una solicitud existente por su código de seguimiento o UUID
   */
  static async updateByIdOrCodigo(idOrCodigo, patch = {}) {
    const clean = String(idOrCodigo || '').trim();
    if (!clean) return null;

    const dbPatch = {};
    if (
      patch.formulario_web !== undefined ||
      patch.datos_ciudadano !== undefined
    ) {
      dbPatch.formulario_web =
        patch.formulario_web !== undefined
          ? patch.formulario_web
          : patch.datos_ciudadano;
    }
    if (patch.estado !== undefined) {
      dbPatch.estado = patch.estado;
    }
    if (
      patch.tipo_problema !== undefined ||
      patch.tipo_tramite !== undefined
    ) {
      dbPatch.tipo_problema =
        patch.tipo_problema !== undefined
          ? patch.tipo_problema
          : patch.tipo_tramite;
    }
    if (patch.asesor_asignado_id !== undefined) {
      dbPatch.asesor_asignado_id = patch.asesor_asignado_id;
    }
    if (patch.ruta_documento !== undefined) {
      dbPatch.ruta_documento = patch.ruta_documento;
    }

    let query = supabase.from('casos').update(dbPatch);
    if (isUuid(clean)) {
      query = query.eq('id', clean);
    } else {
      query = query.eq('codigo_sms', clean.toUpperCase());
    }

    const { data, error } = await query.select(SELECT_COLUMNS).maybeSingle();
    if (error) throw error;
    return formatSolicitudRecord(data);
  }

  static async updateByCodigo(codigo, patch = {}) {
    return Solicitud.updateByIdOrCodigo(codigo, patch);
  }
}

module.exports = {
  Solicitud,
  supabase,
  ESTADOS_VALIDOS,
  formatSolicitudRecord,
  isUuid,
};
