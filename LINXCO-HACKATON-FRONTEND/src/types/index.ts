export type EstadoCaso =
  | 'BORRADOR'
  | 'VALIDADO'
  | 'ENVIADO'
  | 'RADICADO'
  | 'RESPUESTA RECIBIDA';

export const ESTADOS_CASO: readonly EstadoCaso[] = [
  'BORRADOR',
  'VALIDADO',
  'ENVIADO',
  'RADICADO',
  'RESPUESTA RECIBIDA',
] as const;

export type Mecanismo =
  | 'Derecho de petición'
  | 'Acción de tutela'
  | 'Posible tutela'
  | string;

export interface CiudadanoData {
  nombres?: string;
  apellidos?: string;
  nombre_completo?: string;
  tipo_documento?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  departamento?: string;
  municipio?: string;
  vereda?: string;
  vereda_o_barrio?: string;
  direccion_notificacion?: string;
}

export interface EntidadData {
  nombre?: string;
  correo_o_direccion?: string;
}

export interface FormularioWeb {
  mecanismo?: Mecanismo;
  categoria?: string;
  problema?: string;
  ciudadano?: CiudadanoData;
  entidad?: string | EntidadData;
  hechos?: string;
  peticion?: string;
  peticiones?: string;
  anexos_descripcion?: string;
  modalidad?: string;
  paso_actual?: number;
  [key: string]: unknown;
}

export interface Caso {
  id?: string;
  codigo_sms: string;
  usuario_id?: string | null;
  asesor_asignado_id?: string | null;
  tipo_problema: string;
  estado: EstadoCaso;
  formulario_web?: FormularioWeb | null;
  ruta_documento?: string | null;
  created_at?: string;
  is_offline?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  caso?: T;
  codigo?: string;
  error?: string;
}

export interface CreateCasePayload {
  tipo_problema: string;
  formulario_web?: FormularioWeb;
  estado?: EstadoCaso;
  telefono?: string;
}

export interface UpdateCasePayload {
  tipo_problema?: string;
  formulario_web?: FormularioWeb;
  estado?: EstadoCaso;
}
