const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const PLANTILLAS_DIR = path.join(__dirname, '..', 'plantillas');
const DOCUMENTOS_DIR = path.join(__dirname, '..', 'documentos_generados');

if (!fs.existsSync(DOCUMENTOS_DIR)) {
  fs.mkdirSync(DOCUMENTOS_DIR, { recursive: true });
}

const PLANTILLAS_DISPONIBLES = {
  DP_MEDICAMENTOS: 'Plantilla Derecho de Petición Medicamentos Colombia.docx',
  TUTELA_MEDICAMENTOS: 'Plantilla Accion de Tutela Medicamentos Colombia.docx',
  TUTELA_SALUD: 'TUTELA CIRUGIA.docx',
  DP_TRANSPORTE_ESCOLAR: 'Plantilla Derecho de Petición Ausencia de Transporte Escolar.docx',
  TUTELA_EDUCACION: 'TUTELA CUPO COLEGIO.docx',
  TUTELA_AGUA_POTABLE: 'Plantilla Acción de Tutela Mínimo Vital de Agua Potable (1).docx',
  DP_ENERGIA_ELECTRICA: 'Plantilla Derecho de Peticion Ausencia de Energia Electrica (Definitiva).docx',
  DP_TITULACION_TIERRAS: 'Plantilla Derecho de Petición Titulación de Tierras ANT.docx',
  DERECHO_PETICION: 'CIUDAD.docx',
  TUTELA_NO_RESPUESTA: 'Plantilla Acción de Tutela por No Respuesta del Derecho de Petición.docx',
};

/**
 * Determina qué archivo .docx de /plantillas usar según el nombre de plantilla,
 * tipo de trámite, mecanismo o categoría.
 */
function seleccionarPlantilla(datos = {}, tipoTramite = '', plantillaSolicitada = '') {
  const solicitada = plantillaSolicitada || datos.plantilla || '';
  if (solicitada) {
    const clean = path.basename(solicitada);
    const asDocx = clean.replace(/\.pdf$/i, '.docx');
    if (fs.existsSync(path.join(PLANTILLAS_DIR, asDocx))) {
      return asDocx;
    }
    if (fs.existsSync(path.join(PLANTILLAS_DIR, clean)) && clean.toLowerCase().endsWith('.docx')) {
      return clean;
    }

    const upper = clean.toUpperCase();
    if (upper.includes('DP_MEDICAMENTOS') || (upper.includes('PETIC') && upper.includes('MEDICAMENTO'))) {
      return PLANTILLAS_DISPONIBLES.DP_MEDICAMENTOS;
    }
    if (upper.includes('TUTELA') && upper.includes('MEDICAMENTO')) {
      return PLANTILLAS_DISPONIBLES.TUTELA_MEDICAMENTOS;
    }
    if (upper.includes('CIRUGIA') || upper.includes('URGENCIA')) {
      return PLANTILLAS_DISPONIBLES.TUTELA_SALUD;
    }
    if (upper.includes('TRANSPORTE')) {
      return PLANTILLAS_DISPONIBLES.DP_TRANSPORTE_ESCOLAR;
    }
    if (upper.includes('COLEGIO') || upper.includes('CUPO')) {
      return PLANTILLAS_DISPONIBLES.TUTELA_EDUCACION;
    }
    if (upper.includes('AGUA')) {
      return PLANTILLAS_DISPONIBLES.TUTELA_AGUA_POTABLE;
    }
    if (upper.includes('ENERGIA') || upper.includes('ELECTRICA')) {
      return PLANTILLAS_DISPONIBLES.DP_ENERGIA_ELECTRICA;
    }
    if (upper.includes('TIERRA') || upper.includes('ANT') || upper.includes('TITULACION')) {
      return PLANTILLAS_DISPONIBLES.DP_TITULACION_TIERRAS;
    }
    if (upper.includes('NO_RESPUESTA') || upper.includes('NO RESPUESTA')) {
      return PLANTILLAS_DISPONIBLES.TUTELA_NO_RESPUESTA;
    }
  }

  const textoContexto = [
    tipoTramite,
    datos.mecanismo,
    datos.tipo_tramite,
    datos.categoria,
    datos.subcategoria,
    datos.problema,
    datos.hechos,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const esTutela = textoContexto.includes('tutela');

  if (textoContexto.includes('agua')) {
    return PLANTILLAS_DISPONIBLES.TUTELA_AGUA_POTABLE;
  }
  if (textoContexto.includes('energ') || textoContexto.includes('eléctric') || textoContexto.includes('electric')) {
    return PLANTILLAS_DISPONIBLES.DP_ENERGIA_ELECTRICA;
  }
  if (textoContexto.includes('transporte escolar')) {
    return PLANTILLAS_DISPONIBLES.DP_TRANSPORTE_ESCOLAR;
  }
  if (textoContexto.includes('cupo') || (esTutela && textoContexto.includes('educaci'))) {
    return PLANTILLAS_DISPONIBLES.TUTELA_EDUCACION;
  }
  if (textoContexto.includes('tierra') || textoContexto.includes('predio') || textoContexto.includes('ant')) {
    return PLANTILLAS_DISPONIBLES.DP_TITULACION_TIERRAS;
  }
  if (textoContexto.includes('no responden') || textoContexto.includes('no respuesta') || textoContexto.includes('venció el plazo')) {
    return PLANTILLAS_DISPONIBLES.TUTELA_NO_RESPUESTA;
  }
  if (textoContexto.includes('medicamento')) {
    return esTutela
      ? PLANTILLAS_DISPONIBLES.TUTELA_MEDICAMENTOS
      : PLANTILLAS_DISPONIBLES.DP_MEDICAMENTOS;
  }
  if (esTutela || textoContexto.includes('cirug') || textoContexto.includes('salud')) {
    if (esTutela) return PLANTILLAS_DISPONIBLES.TUTELA_SALUD;
  }

  return PLANTILLAS_DISPONIBLES.DERECHO_PETICION;
}

/**
 * Construye el diccionario completo de variables para inyectar en cualquiera de las 10 plantillas
 */
function construirVariablesPlantilla(datos = {}, codigo = 'CASO-SIN-CODIGO') {
  const ciudadano = datos.ciudadano || {};
  const respuestas = datos.respuestas_recolectadas || {};
  const fuente = { ...datos, ...respuestas };

  const fechaActual = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const nombreCompleto =
    ciudadano.nombre_completo ||
    fuente.NOMBRE_COMPLETO ||
    fuente.NOMBRE_ACCIONANTE ||
    fuente.NOMBRE_COMPLETO_ACCIONANTE ||
    fuente.NOMBRE_COMPLETO_PACIENTE_USUARIO ||
    fuente.NOMBRE_COMPLETO_PETICIONARIO ||
    fuente.nombre_completo ||
    fuente.nombre ||
    'Ciudadano solicitante';

  const tipoDocumento =
    ciudadano.tipo_documento ||
    fuente.TIPO_DOCUMENTO ||
    fuente.tipo_documento ||
    'Cédula de Ciudadanía';

  const numeroDocumento =
    ciudadano.numero_documento ||
    fuente.NUMERO_DOCUMENTO ||
    fuente.NUMERO_DOCUMENTO_ACCIONANTE ||
    fuente.NUMERO_CEDULA ||
    fuente.numero_documento ||
    fuente.cedula ||
    'No especificado';

  const telefono =
    ciudadano.telefono ||
    fuente.NUMERO_TELEFONO ||
    fuente.TELEFONO_ACCIONANTE ||
    fuente.NUMERO_TELEFONICO_CELULAR ||
    fuente.NUMERO_TELEFONO_CELULAR_ACCIONANTE ||
    fuente.NUMERO_TELEFONICO_ACCIONANTE ||
    fuente.telefono ||
    'No especificado';

  const correo =
    ciudadano.correo ||
    ciudadano.email ||
    fuente.CORREO_ELECTRONICO ||
    fuente.CORREO_ACCIONANTE ||
    fuente.DIRECCION_CORREO_ELECTRONICO_COMPLETA ||
    fuente.DIRECCION_CORREO_ELECTRONICO_ACCIONANTE ||
    fuente.CORREO_ELECTRONICO_ACCIONANTE ||
    fuente.CORREO_ELECTRONICO_PARA_RESPUESTA ||
    fuente.correo ||
    fuente.email ||
    'notificaciones@justiciaparatodos.gov.co';

  const municipio =
    ciudadano.municipio ||
    fuente.MUNICIPIO ||
    fuente.CIUDAD ||
    fuente.CIUDAD_O_MUNICIPIO ||
    fuente.CIUDAD_O_MUNICIPIO_RADICACION ||
    fuente.CIUDAD_RESIDENCIA ||
    fuente.municipio ||
    'La Cumbre';

  const departamento =
    ciudadano.departamento ||
    fuente.DEPARTAMENTO ||
    fuente.departamento ||
    'Valle del Cauca';

  const vereda =
    ciudadano.vereda ||
    fuente.VEREDA_RESIDENCIA ||
    fuente.VEREDA_CORREGIMIENTO_O_BARRIO ||
    fuente.NOMBRE_VEREDA ||
    fuente.NOMBRE_VEREDA_CARRETERA ||
    fuente.DIRECCION_EXACTA_BARRIO_SECTOR_VEREDA ||
    fuente.vereda ||
    municipio;

  const direccion =
    ciudadano.direccion ||
    fuente.DIRECCION_NOTIFICACION ||
    fuente.DIRECCION_ACCIONANTE ||
    fuente.DIRECCION_DOMICILIARIA_COMPLETA ||
    fuente.DIRECCION_COMPLETA_RESIDENCIA_BARRIO_CIUDAD ||
    fuente.DIRECCION_EXACTA_BARRIO_SECTOR_VEREDA ||
    `${vereda}, ${municipio}`;

  const entidad =
    (typeof fuente.entidad === 'string' ? fuente.entidad : fuente.entidad?.nombre) ||
    fuente.ENTIDAD_DESTINATARIA ||
    fuente.NOMBRE_EPS ||
    fuente.NOMBRE_COMPLETO_EPS_O_IPS_ACCIONADA ||
    fuente.ENTIDAD_RECEPTORA_SOLICITUD ||
    fuente.NOMBRE_INSTITUCION_EDUCATIVA ||
    fuente.NOMBRE_EMPRESA_PRESTADORA_ACUEDUCTO ||
    fuente.NOMBRE_COMPLETO_ENTIDAD_O_AUTORIDAD_ACCIONADA ||
    fuente.Nombre_EPS ||
    'Entidad Competente';

  const hechos =
    fuente.hechos ||
    fuente.HECHOS ||
    fuente.DESCRIPCION_DANOS_CARRETERA ||
    fuente.CAUSA_CORTE_O_FALTA_SERVICIO ||
    fuente.RESUMEN_SOLICITUD_DERECHO_PETICION ||
    fuente.DIAGNOSTICO_MEDICO ||
    fuente.DIAGNOSTICO_MEDICO_O_ENFERMEDAD ||
    fuente.Diagnostico_Urgente ||
    fuente.descripcion ||
    `Solicitud asociada a: ${fuente.problema || fuente.tipo_problema || 'Protección de derechos ciudadanos'}`;

  const peticion =
    fuente.peticion ||
    fuente.PETICION ||
    fuente.NOMBRE_CIRUGIA_O_TRATAMIENTO ||
    fuente.NOMBRE_MEDICAMENTO_1 ||
    fuente.NOMBRE_MEDICAMENTO ||
    fuente.Nombre_Medicamento ||
    'Se solicita dar respuesta de fondo y solución efectiva a la problemática expuesta dentro de los términos de ley.';

  const medicamento =
    fuente.NOMBRE_MEDICAMENTO_1 ||
    fuente.NOMBRE_MEDICAMENTO ||
    fuente.Nombre_Medicamento ||
    peticion;

  const diagnostico =
    fuente.DIAGNOSTICO_MEDICO ||
    fuente.DIAGNOSTICO_MEDICO_O_ENFERMEDAD ||
    fuente.Diagnostico_Urgente ||
    hechos;

  return {
    // Metadatos generales
    CODIGO_SEGUIMIENTO: codigo,
    FECHA: fechaActual,
    FECHA_RADICACION: fuente.FECHA_RADICACION || fechaActual,
    FECHA_PRESENTACION: fuente.FECHA_PRESENTACION || fechaActual,
    HECHOS: hechos,
    PETICION: peticion,

    // Variables de CIUDAD.docx (Derecho de Petición / Vereda)
    CIUDAD: municipio,
    MUNICIPIO: municipio,
    CIUDAD_O_MUNICIPIO: municipio,
    CIUDAD_O_MUNICIPIO_RADICACION: municipio,
    CIUDAD_RESIDENCIA: municipio,
    DEPARTAMENTO: departamento,
    ENTIDAD_DESTINATARIA: entidad,
    CORREO_ENTIDAD_DESTINATARIA: 'atencionalciudadano@entidad.gov.co',
    ENTIDAD_COPIA_SI_APLICA: 'Personería Municipal',
    CORREO_ENTIDAD_COPIA: 'personeria@municipio.gov.co',
    NOMBRE_COMPLETO: nombreCompleto,
    TIPO_DOCUMENTO: tipoDocumento,
    NUMERO_DOCUMENTO: numeroDocumento,
    NUMERO_CEDULA: numeroDocumento,
    LUGAR_EXPEDICION: municipio,
    LUGAR_EXPEDICION_CEDULA: municipio,
    CIUDAD_EXPEDICION: municipio,
    VEREDA_RESIDENCIA: vereda,
    VEREDA: vereda,
    NOMBRE_VEREDA: vereda,
    NOMBRE_VEREDA_O_BARRIO: vereda,
    NOMBRE_VEREDA_O_SECTOR: vereda,
    NOMBRE_VEREDA_CARRETERA: vereda,
    UBICACION_EXACTA_CARRETERA: vereda,
    PUNTO_INICIO_TRAMO: `Entrada principal de ${vereda}`,
    PUNTO_FINAL_TRAMO: `Sector central de ${vereda}`,
    FECHA_INICIO_DETERIORO: 'hace varios meses',
    DESCRIPCION_DANOS_CARRETERA: hechos,
    USOS_PRINCIPALES_CARRETERA:
      'transporte de productos agrícolas, acceso escolar y tránsito de emergencias médicas',
    AFECTACIONES_A_LA_COMUNIDAD: peticion,
    NUMERO_PERSONAS_O_FAMILIAS_AFECTADAS: 'las familias residentes del sector',
    DESCRIPCION_RIESGOS_IDENTIFICADOS: hechos,
    DESCRIPCION_FOTOGRAFIAS_ANEXAS: 'Registro fotográfico del estado actual',
    DESCRIPCION_VIDEOS_ANEXOS: 'Evidencia audiovisual comunitaria',
    DESCRIPCION_DOCUMENTOS_O_SOPORTES_ADICIONALES:
      'Copia de documento de identidad y soportes del caso',
    MEDIO_NOTIFICACION: 'Correo electrónico y WhatsApp',
    DIRECCION_NOTIFICACION: direccion,
    CORREO_ELECTRONICO: correo,
    NUMERO_TELEFONO: telefono,
    NUMERO_TELEFONICO_CELULAR: telefono,
    FIRMA: nombreCompleto,

    // Variables de Salud (DP Medicamentos, Tutela Medicamentos, Tutela Cirugía)
    NOMBRE_ACCIONANTE: nombreCompleto,
    NOMBRE_COMPLETO_ACCIONANTE: nombreCompleto,
    NOMBRE_COMPLETO_PACIENTE_USUARIO: nombreCompleto,
    NUMERO_DOCUMENTO_ACCIONANTE: numeroDocumento,
    NOMBRE_EPS: entidad,
    NOMBRE_EPS_O_IPS: entidad,
    NOMBRE_COMPLETO_EPS_O_IPS_ACCIONADA: entidad,
    DIRECCION_FISICA_EPS_IPS: `Sede administrativa de ${entidad} en ${municipio}`,
    CORREO_ELECTRONICO_EPS_IPS: 'notificaciones@eps.com.co',
    VEREDA_CORREGIMIENTO_O_BARRIO: vereda,
    REGIMEN_CONTRIBUTIVO_O_SUBSIDIADO: 'Subsidiado',
    CALIDAD_AFILIACION_COTIZANTE_BENEFICIARIO_SUBSIDIADO: 'Afiliado / Subsidiado',
    DIAGNOSTICO_MEDICO: diagnostico,
    DIAGNOSTICO_MEDICO_O_ENFERMEDAD: diagnostico,
    NOMBRE_MEDICAMENTO: medicamento,
    NOMBRE_MEDICAMENTO_1: medicamento,
    NOMBRE_MEDICAMENTO_2: 'Según prescripción médica',
    NOMBRES_MEDICAMENTOS_PENDIENTES: medicamento,
    CANTIDAD_PRESCRITA: 'Según orden médica',
    CANTIDAD_PRESCRITA_1: 'Según fórmula médica',
    CANTIDAD_PRESCRITA_2: '-',
    DOSIS_FRECUENCIA: 'Según prescripción del médico tratante',
    DOSIS_FRECUENCIA_1: 'Según fórmula médica',
    DOSIS_FRECUENCIA_2: '-',
    FECHA_FORMULA_MEDICA: fechaActual,
    FECHA_ORDEN_MEDICA: fechaActual,
    NUMERO_FORMULA_MEDICA: 'Vigente',
    FECHA_ACUDIO_FARMACIA: fechaActual,
    NOMBRE_FARMACIA_O_DISPENSARIO_Y_DIRECCION: `Dispensario asignado en ${municipio}`,
    NUMERO_COMPROBANTE_PENDIENTE: 'Pendiente de entrega',
    NOMBRE_MEDICO_TRATANTE: 'Médico tratante adscrito',
    NOMBRE_MEDICO_TRATANTE_Y_ESPECIALIDAD: 'Médico tratante adscrito',
    ESPECIALIDAD_MEDICA: 'Medicina Especializada',
    NOMBRE_IPS: 'IPS Asignada',
    NOMBRE_CIRUGIA_O_TRATAMIENTO: peticion,
    FECHA_SOLICITUD_AUTORIZACION: fechaActual,
    MEDIO_DE_SOLICITUD: 'Presencial / Virtual',
    DESCRIPCION_NEGATIVA_O_DEMORA_EN_LA_AUTORIZACION: hechos,
    DESCRIPCION_SINTOMAS_AFECTACIONES_Y_CONSECUENCIAS_DE_LA_DEMORA: hechos,
    DESCRIPCION_RIESGO_INMINENTE_ACREDITADO: peticion,
    DESCRIPCION_SOPORTE_MEDICO_QUE_ACREDITA_LA_URGENCIA:
      'Orden médica e historia clínica adjunta',
    DESCRIPCION_PRUEBAS_ADICIONALES:
      'Copia de cédula de ciudadanía, historia clínica y fórmula médica',
    ANEXO_DOCUMENTO_ADICIONAL_O_HISTORIA_CLINICA:
      'Copia de historia clínica y fórmula médica vigente',
    DIRECCION_ACCIONANTE: direccion,
    DIRECCION_DOMICILIARIA_COMPLETA: direccion,
    DIRECCION_COMPLETA_RESIDENCIA_BARRIO_CIUDAD: direccion,
    TELEFONO_ACCIONANTE: telefono,
    CORREO_ACCIONANTE: correo,
    CORREO_ELECTRONICO_PARA_RESPUESTA: correo,
    DIRECCION_NOTIFICACIONES_EPS: `Sede administrativa de ${entidad}`,
    MUNICIPIO_SEDE_EPS: municipio,
    CORREO_NOTIFICACIONES_JUDICIALES_EPS: 'notificacionesjudiciales@eps.com.co',

    // Variables de Educación (Transporte Escolar y Cupo Colegio)
    NOMBRE_COMPLETO_PETICIONARIO: nombreCompleto,
    MUNICIPIO_O_DEPARTAMENTO_CERTIFICADO: municipio,
    NOMBRE_MUNICIPIO_O_DEPARTAMENTO: `${municipio} - ${departamento}`,
    CIUDAD_Y_DEPARTAMENTO_SEDE_ENTIDAD: `${municipio}, ${departamento}`,
    NOMBRE_INSTITUCION_EDUCATIVA: entidad,
    NOMBRE_INSTITUCION_EDUCATIVA_Y_SEDE: entidad,
    NOMBRE_SEDE: entidad,
    NOMBRE_ESTUDIANTE: fuente.NOMBRE_ESTUDIANTE || fuente.NOMBRE_MENOR || 'Estudiante beneficiario',
    NOMBRES_ESTUDIANTES_BENEFICIARIOS:
      fuente.NOMBRE_ESTUDIANTE || fuente.NOMBRE_MENOR || 'Estudiantes de la vereda',
    GRADO: fuente.GRADO || fuente.GRADO_ESCOLAR_SOLICITADO || 'Básica / Media',
    GRADO_ESCOLAR: fuente.GRADO_ESCOLAR_SOLICITADO || fuente.GRADO || 'Primero (1°)',
    DISTANCIA_O_TIEMPO_RECORRIDO: vereda,
    FECHA_SUSPENSION_O_FALTA_SERVICIO: 'el presente calendario escolar',
    DIRECCION_RESIDENCIA_VEREDA_CORREGIMIENTO_MUNICIPIO: direccion,
    DIRECCION_CORREO_ELECTRONICO_COMPLETA: correo,
    LISTADO_FIRMAS_PADRES_AFECTADOS_OPCIONAL: 'Padres de familia de la vereda',
    CERTIFICADO_RESIDENCIA_JAC_OPCIONAL: 'Constancia de residencia veredal',
    NOMBRE_MENOR: fuente.NOMBRE_MENOR || fuente.NOMBRE_ESTUDIANTE || 'Menor representado(a)',
    PADRE_O_MADRE: 'padre/madre y representante legal',
    TIPO_Y_NUMERO_DOCUMENTO_MENOR: 'Tarjeta de Identidad / Registro Civil',
    EDAD_MENOR: fuente.EDAD_MENOR ? String(fuente.EDAD_MENOR).replace(/[^0-9]/g, '') || String(fuente.EDAD_MENOR) : '10',
    GRADO_ESCOLAR_SOLICITADO: fuente.GRADO_ESCOLAR_SOLICITADO || fuente.GRADO || 'Primero (1°)',
    ANO_LECTIVO: String(new Date().getFullYear()),
    ENTIDAD_RECEPTORA_SOLICITUD: entidad,
    DESCRIPCION_GESTIONES_REALIZADAS_Y_FECHAS: hechos,
    RESPUESTA_ENTIDAD_O_INDICAR_SIN_RESPUESTA: peticion,
    DESCRIPCION_CONDICIONES_DE_ACCESO_Y_TRANSPORTE:
      `Residente en zona rural (${vereda}, ${municipio}) sin otra oferta educativa cercana`,

    // Variables de Servicios Públicos (Agua Potable y Energía Eléctrica)
    NOMBRE_EMPRESA_PRESTADORA_ACUEDUCTO: entidad,
    NOMBRE_MUNICIPIO_O_DISTRITO: municipio,
    CAUSA_CORTE_O_FALTA_SERVICIO: hechos,
    DIRECCION_EXACTA_BARRIO_SECTOR_VEREDA: direccion,
    DIRECCION_COMPLETA_RESIDENCIA_BARRIO_VEREDA: direccion,
    INTEGRANTES_NUCLEO_FAMILIAR: hechos,
    CONDICION_VULNERABILIDAD_SISBEN_DESPLAZAMIENTO: 'Población rural de especial protección',
    FECHA_RADICACION_PETICION: fechaActual,
    NUMERO_RADICADO_PETICION: 'En trámite',
    DIRECCION_FISICA_Y_CORREO_JUDICIAL_EMPRESA: `Sede oficial de ${entidad} en ${municipio}`,
    DIRECCION_FISICA_Y_CORREO_JUDICIAL_ALCALDIA: `Alcaldía Municipal de ${municipio}`,
    DIRECCION_CORREO_ELECTRONICO_ACCIONANTE: correo,
    NUMERO_TELEFONO_CELULAR_ACCIONANTE: telefono,
    COPIA_DERECHO_PETICION_RADICADO_OPCIONAL: 'Reclamación previa realizada',
    PRUEBA_SISBEN_O_VULNERABILIDAD_OPCIONAL: 'Copia de documento de identidad y recibo',
    NUMERO_NIC_CONTRATO: fuente.NUMERO_NIC_CONTRATO || 'Servicio comunitario veredal',
    FECHA_SUSPENSION_SERVICIO: fuente.FECHA_SUSPENSION_SERVICIO || 'recientemente',
    TIEMPO_SIN_SERVICIO: fuente.FECHA_SUSPENSION_SERVICIO || 'varios días',

    // Variables de Tierras ANT
    ENTIDAD_COMPETENTE: 'Dirección de Acceso a Tierras / UGT Territorial',
    NOMBRE_ENTIDAD_ANT_INCODER_OTRA: 'Agencia Nacional de Tierras (ANT)',
    NUMERO_EXPEDIENTE_O_FISO: fuente.NUMERO_EXPEDIENTE_O_FISO || 'En verificación por cédula',
    NOMBRE_PREDIO: fuente.NOMBRE_PREDIO_O_FINCA || `Predio rural en ${vereda}`,
    NOMBRE_PREDIO_O_FINCA: fuente.NOMBRE_PREDIO_O_FINCA || `Predio rural en ${vereda}`,
    NUMERO_CEDULA_CATASTRAL: 'En expediente ANT',
    NUMERO_MATRICULA_INMOBILIARIA: 'En trámite de formalización',
    FECHA_INICIO_TRAMITE_SOLICITUD: 'En trámite ante la entidad',
    NUMERO_RADICADO: fuente.NUMERO_EXPEDIENTE_O_FISO || 'Radicado en expediente',
    TIEMPO_TRANSCURRIDO_DESDE_SOLICITUD: 'más del término legal de respuesta',
    DOCUMENTOS_APORTADOS: 'Formulario de solicitud y documentos de posesión del predio',
    DIRECCION_RESIDENCIA_VEREDA_MUNICIPIO: direccion,
    DIRECCION_COMPLETA_VEREDA_MUNICIPIO_DEPARTAMENTO: `${direccion}, ${departamento}`,
    ANEXO_OPCIONAL_PRUEBAS_POSESION: 'Copia de cédula y soportes del predio',
    ANEXO_OPCIONAL_ULTIMA_ACTUACION: 'Solicitud de estado de trámite',

    // Variables de Tutela por No Respuesta a Derecho de Petición (Laboral / Consumo / Entidad)
    NOMBRE_COMPLETO_ENTIDAD_O_AUTORIDAD_ACCIONADA: entidad,
    ORGANISMO_O_ENTIDAD_RADICADA: entidad,
    LUGAR_DOMICILIO_Y_DIRECCION: direccion,
    FECHA_RADICACION_DERECHO_PETICION:
      fuente.FECHA_RADICACION_DERECHO_PETICION || 'hace más de 15 días hábiles',
    MEDIO_RADICACION: 'Escrito / Presencial / Virtual',
    RESUMEN_SOLICITUD_DERECHO_PETICION:
      fuente.RESUMEN_SOLICITUD_DERECHO_PETICION || hechos,
    FECHA_VENCIMIENTO_TERMINO_LEGAL: 'Vencido a la fecha de presentación',
    NUMERO_DIAS_HABILES: '15',
    NUMERO_DIAS_TRANSCURRIDOS: 'más de 15 días hábiles',
    DIRECCION_COMPLETA_RESIDENCIA_NOTIFICACION: direccion,
    CORREO_ELECTRONICO_ACCIONANTE: correo,
    NUMERO_TELEFONICO_ACCIONANTE: telefono,
    DIRECCION_ENTIDAD_ACCIONADA: `Sede de ${entidad} en ${municipio}`,
    CORREO_ELECTRONICO_JUDICIAL_ENTIDAD: 'notificaciones@entidad.gov.co',
    ANEXO_PRUEBA_ADICIONAL_OPCIONAL: 'Copia del Derecho de Petición radicado y cédula',

    // Sobrescribir con cualquier llave exacta recolectada
    ...fuente,
  };
}

/**
 * Normaliza los placeholders de las plantillas:
 * - Convierte {{VARIABLE}} -> {VARIABLE}
 * - Convierte (VARIABLE) en mayúsculas -> {VARIABLE}
 * para que docxtemplater los procese de manera uniforme.
 */
function normalizarDelimitadoresXml(zip) {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  let xml = file.asText();
  xml = xml.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, '{$1}');
  xml = xml.replace(/\(([A-Z0-9_]{3,})\)/g, '{$1}');

  zip.file(xmlPath, xml);
}

/**
 * Elimina la sección de "ANEXOS" / "PRUEBAS Y ANEXOS" del archivo word/document.xml.
 * Esto asegura que en el documento final .docx no aparezca la sección de anexos,
 * ya que los soportes y pruebas se entregan por separado por el ciudadano.
 */
function eliminarSeccionAnexosXml(zip) {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  let xml = file.asText();
  const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>.*?<\/w:p>/gs) || [];
  let newParagraphs = [];
  let skipping = false;

  for (let i = 0; i < paragraphs.length; i++) {
    let p = paragraphs[i];
    let text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Comprobar si el párrafo es encabezado puro de ANEXOS / PRUEBAS Y ANEXOS
    const isPureAnexoHeading = /^(?:[0-9IVXLCDM]+\.\s*)?(?:ANEXOS|PRUEBAS Y ANEXOS|ANEXOS Y PRUEBAS|PRUEBAS DOCUMENTALES)\s*$/i.test(text);
    const isNextSectionHeading = /^(?:[0-9IVXLCDM]+\.\s*)?(?:NOTIFICACIONES|JURAMENTO|PRETENSIONES|PETICIONES|SOLICITUD|FIRMA)/i.test(text);

    if (isPureAnexoHeading) {
      skipping = true;
      continue;
    }

    if (skipping) {
      if (isNextSectionHeading) {
        skipping = false;
        newParagraphs.push(p);
      } else {
        continue;
      }
    } else {
      // Si termina con "VI. PRUEBAS Y ANEXOS" al final del párrafo
      if (/(?:[0-9IVXLCDM]+\.\s*)?(?:PRUEBAS Y ANEXOS|ANEXOS Y PRUEBAS|ANEXOS)\s*$/i.test(text)) {
        p = p.replace(/(?:[0-9IVXLCDM]+\.\s*)?(?:PRUEBAS Y ANEXOS|ANEXOS Y PRUEBAS|ANEXOS)\s*(?=<\/w:t>)/gi, '');
        const remainingText = p.replace(/<[^>]+>/g, ' ').trim();
        if (!remainingText) continue;
      }

      // Si el párrafo completo es una lista de pruebas (ej: inicia con PRUEBAS Y ANEXOS y no contiene NOTIFICACIONES)
      if (/^(?:[0-9IVXLCDM]+\.\s*)?(?:PRUEBAS Y ANEXOS|ANEXOS Y PRUEBAS)/i.test(text) && !/NOTIFICACIONES/i.test(text)) {
        continue;
      }

      // Si el párrafo anterior terminó en PRUEBAS Y ANEXOS y este contiene el listado introducido con "Para fundamentar los hechos..."
      if (/Para fundamentar los hechos.*aporto las siguientes pruebas/i.test(text)) {
        p = p.replace(/Para fundamentar los hechos[\s\S]*?(?=(?:[0-9IVXLCDM]+\.\s*)?NOTIFICACIONES)/gi, '');
      }

      // Anexos incrustados entre encabezados: "PRUEBAS Y ANEXOS 1. ... NOTIFICACIONES"
      p = p.replace(/(?:(?:[0-9IVXLCDM]+\.\s*)?(?:PRUEBAS Y ANEXOS|ANEXOS Y PRUEBAS)[\s\S]*?)(?=(?:[0-9IVXLCDM]+\.\s*)?NOTIFICACIONES)/gi, '');

      // Anexos incrustados hasta el final del párrafo/nodo de texto
      p = p.replace(/(?:[0-9IVXLCDM]+\.\s*)?(?:PRUEBAS Y ANEXOS|ANEXOS Y PRUEBAS)[\s\S]*?(?=<\/w:t>)/gi, '');

      const checkText = p.replace(/<[^>]+>/g, ' ').trim();
      if (checkText) {
        newParagraphs.push(p);
      }
    }
  }

  const firstP = xml.indexOf('<w:p');
  const lastPEnd = xml.lastIndexOf('</w:p>') + 6;
  if (firstP !== -1 && lastPEnd > firstP) {
    xml = xml.slice(0, firstP) + newParagraphs.join('') + xml.slice(lastPEnd);
  }

  zip.file(xmlPath, xml);
}

/**
 * Genera el documento .docx inyectando los datos del ciudadano en la plantilla seleccionada
 * usando PizZip y Docxtemplater, y guarda el archivo en /documentos_generados.
 */
function generarDocumentoDesdePlantilla({
  codigo = 'CASO-DOC',
  datosCiudadano = {},
  tipoTramite = '',
  plantilla = '',
} = {}) {
  const nombrePlantilla = seleccionarPlantilla(datosCiudadano, tipoTramite, plantilla);
  const rutaPlantilla = path.join(PLANTILLAS_DIR, nombrePlantilla);

  if (!fs.existsSync(rutaPlantilla)) {
    throw new Error(`No se encontró la plantilla local: ${rutaPlantilla}`);
  }

  const contenidoBinario = fs.readFileSync(rutaPlantilla);
  const zip = new PizZip(contenidoBinario);

  eliminarSeccionAnexosXml(zip);
  normalizarDelimitadoresXml(zip);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    },
  });

  const variables = construirVariablesPlantilla(datosCiudadano, codigo);
  doc.render(variables);

  const bufferGenerado = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  const cleanCode = (codigo || 'CASO-DOC')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
  const slugPlantilla = nombrePlantilla
    .replace(/\.(docx|pdf)$/i, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .toUpperCase()
    .slice(0, 35);
  const filename = `${cleanCode}_${slugPlantilla}.docx`;
  const filePath = path.join(DOCUMENTOS_DIR, filename);

  fs.writeFileSync(filePath, bufferGenerado);

  const rutaDocumento = `/api/documentos/${filename}`;

  return {
    filename,
    filePath,
    rutaDocumento,
    plantillaUsada: nombrePlantilla,
    variablesInyectadas: variables,
  };
}

function listarPlantillasDisponibles() {
  if (!fs.existsSync(PLANTILLAS_DIR)) return [];
  return fs
    .readdirSync(PLANTILLAS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.docx'));
}

module.exports = {
  generarDocumentoDesdePlantilla,
  seleccionarPlantilla,
  construirVariablesPlantilla,
  listarPlantillasDisponibles,
  eliminarSeccionAnexosXml,
  normalizarDelimitadoresXml,
  PLANTILLAS_DIR,
  DOCUMENTOS_DIR,
  PLANTILLAS_DISPONIBLES,
};
