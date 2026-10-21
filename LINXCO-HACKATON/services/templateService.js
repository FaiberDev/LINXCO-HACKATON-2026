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
  DERECHO_PETICION: 'CIUDAD.docx',
  TUTELA_SALUD: 'TUTELA CIRUGIA.docx',
  TUTELA_EDUCACION: 'TUTELA CUPO COLEGIO.docx',
};

/**
 * Determina qué archivo .docx de /plantillas usar según el tipo de trámite,
 * mecanismo, categoría o nombre de plantilla explícito.
 */
function seleccionarPlantilla(datos = {}, tipoTramite = '', plantillaSolicitada = '') {
  if (plantillaSolicitada) {
    const clean = path.basename(plantillaSolicitada);
    const candidate = path.join(PLANTILLAS_DIR, clean);
    if (fs.existsSync(candidate)) return clean;
    if (clean.toUpperCase().includes('COLEGIO') || clean.toUpperCase().includes('EDUCACION')) {
      return PLANTILLAS_DISPONIBLES.TUTELA_EDUCACION;
    }
    if (clean.toUpperCase().includes('CIRUGIA') || clean.toUpperCase().includes('SALUD') || clean.toUpperCase().includes('TUTELA')) {
      return PLANTILLAS_DISPONIBLES.TUTELA_SALUD;
    }
  }

  const textoContexto = [
    tipoTramite,
    datos.mecanismo,
    datos.tipo_tramite,
    datos.categoria,
    datos.problema,
    datos.subcategoria,
    datos.hechos,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const esTutela = textoContexto.includes('tutela');
  const esEducacion =
    textoContexto.includes('educaci') ||
    textoContexto.includes('cupo') ||
    textoContexto.includes('colegio') ||
    textoContexto.includes('escolar');
  const esSalud =
    textoContexto.includes('salud') ||
    textoContexto.includes('cirug') ||
    textoContexto.includes('medicamento') ||
    textoContexto.includes('tratamiento') ||
    textoContexto.includes('eps');

  if (esTutela && esEducacion) {
    return PLANTILLAS_DISPONIBLES.TUTELA_EDUCACION;
  }
  if (esTutela || esSalud) {
    if (esTutela) return PLANTILLAS_DISPONIBLES.TUTELA_SALUD;
  }

  return PLANTILLAS_DISPONIBLES.DERECHO_PETICION;
}

/**
 * Construye el diccionario completo de variables para inyectar en cualquiera
 * de las plantillas .docx (CIUDAD.docx, TUTELA CIRUGIA.docx, TUTELA CUPO COLEGIO.docx)
 * a partir del JSON enviado por el formulario del ciudadano o el bot de WhatsApp.
 */
function construirVariablesPlantilla(datos = {}, codigo = 'CASO-SIN-CODIGO') {
  const ciudadano = datos.ciudadano || {};
  const fechaActual = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const nombreCompleto =
    ciudadano.nombre_completo ||
    datos.nombre_completo ||
    datos.NOMBRE_COMPLETO ||
    datos.NOMBRE_ACCIONANTE ||
    datos.nombre ||
    'Ciudadano solicitante';

  const tipoDocumento =
    ciudadano.tipo_documento ||
    datos.tipo_documento ||
    datos.TIPO_DOCUMENTO ||
    'Cédula de Ciudadanía';

  const numeroDocumento =
    ciudadano.numero_documento ||
    datos.numero_documento ||
    datos.cedula ||
    datos.NUMERO_DOCUMENTO ||
    datos.NUMERO_DOCUMENTO_ACCIONANTE ||
    'No especificado';

  const telefono =
    ciudadano.telefono ||
    datos.telefono ||
    datos.NUMERO_TELEFONO ||
    datos.TELEFONO_ACCIONANTE ||
    'No especificado';

  const correo =
    ciudadano.correo ||
    ciudadano.email ||
    datos.correo ||
    datos.email ||
    datos.CORREO_ELECTRONICO ||
    datos.CORREO_ACCIONANTE ||
    'notificaciones@justiciaparatodos.gov.co';

  const municipio =
    ciudadano.municipio ||
    datos.municipio ||
    datos.CIUDAD ||
    datos.MUNICIPIO ||
    'La Cumbre';

  const departamento =
    ciudadano.departamento ||
    datos.departamento ||
    datos.DEPARTAMENTO ||
    'Valle del Cauca';

  const vereda =
    ciudadano.vereda ||
    datos.vereda ||
    datos.VEREDA_RESIDENCIA ||
    datos.VEREDA_CORREGIMIENTO_O_BARRIO ||
    'Zona Rural';

  const direccion =
    ciudadano.direccion ||
    datos.direccion ||
    datos.DIRECCION_NOTIFICACION ||
    datos.DIRECCION_ACCIONANTE ||
    `${vereda}, ${municipio}`;

  const entidad =
    datos.entidad ||
    datos.entidad_accionada ||
    datos.ENTIDAD_DESTINATARIA ||
    datos.NOMBRE_EPS ||
    datos.ENTIDAD_RECEPTORA_SOLICITUD ||
    'Entidad Competente';

  const hechos =
    datos.hechos ||
    datos.descripcion ||
    datos.datos_usuario_descripcion ||
    datos.HECHOS ||
    `Solicitud asociada al problema: ${datos.problema || datos.tipo_problema || 'Vulneración de derechos'}`;

  const peticion =
    datos.peticion ||
    datos.solicitud ||
    datos.PETICION ||
    'Se solicita dar respuesta de fondo y solución efectiva a la problemática expuesta dentro de los términos de ley.';

  return {
    // Metadatos generales
    CODIGO_SEGUIMIENTO: codigo,
    FECHA: fechaActual,
    FECHA_RADICACION: datos.FECHA_RADICACION || fechaActual,
    FECHA_PRESENTACION: datos.FECHA_PRESENTACION || fechaActual,
    HECHOS: hechos,
    PETICION: peticion,

    // Variables de CIUDAD.docx (Derecho de Petición / Vereda)
    CIUDAD: datos.CIUDAD || municipio,
    MUNICIPIO: municipio,
    DEPARTAMENTO: departamento,
    ENTIDAD_DESTINATARIA: entidad,
    CORREO_ENTIDAD_DESTINATARIA:
      datos.CORREO_ENTIDAD_DESTINATARIA || 'atencionalciudadano@entidad.gov.co',
    ENTIDAD_COPIA_SI_APLICA: datos.ENTIDAD_COPIA_SI_APLICA || 'Personería Municipal',
    CORREO_ENTIDAD_COPIA: datos.CORREO_ENTIDAD_COPIA || 'personeria@municipio.gov.co',
    NOMBRE_COMPLETO: nombreCompleto,
    TIPO_DOCUMENTO: tipoDocumento,
    NUMERO_DOCUMENTO: numeroDocumento,
    VEREDA_RESIDENCIA: vereda,
    NOMBRE_VEREDA_CARRETERA: datos.NOMBRE_VEREDA_CARRETERA || vereda,
    UBICACION_EXACTA_CARRETERA: datos.UBICACION_EXACTA_CARRETERA || vereda,
    PUNTO_INICIO_TRAMO: datos.PUNTO_INICIO_TRAMO || `Entrada principal de ${vereda}`,
    PUNTO_FINAL_TRAMO: datos.PUNTO_FINAL_TRAMO || `Sector central de ${vereda}`,
    FECHA_INICIO_DETERIORO: datos.FECHA_INICIO_DETERIORO || 'hace varios meses',
    DESCRIPCION_DANOS_CARRETERA: datos.DESCRIPCION_DANOS_CARRETERA || hechos,
    USOS_PRINCIPALES_CARRETERA:
      datos.USOS_PRINCIPALES_CARRETERA ||
      'transporte de productos agrícolas, acceso escolar y tránsito de emergencias médicas',
    AFECTACIONES_A_LA_COMUNIDAD: datos.AFECTACIONES_A_LA_COMUNIDAD || peticion,
    NUMERO_PERSONAS_O_FAMILIAS_AFECTADAS:
      datos.NUMERO_PERSONAS_O_FAMILIAS_AFECTADAS || 'las familias residentes del sector',
    DESCRIPCION_RIESGOS_IDENTIFICADOS:
      datos.DESCRIPCION_RIESGOS_IDENTIFICADOS || hechos,
    DESCRIPCION_FOTOGRAFIAS_ANEXAS:
      datos.DESCRIPCION_FOTOGRAFIAS_ANEXAS || 'Registro fotográfico del estado actual',
    DESCRIPCION_VIDEOS_ANEXOS:
      datos.DESCRIPCION_VIDEOS_ANEXOS || 'Evidencia audiovisual comunitaria',
    DESCRIPCION_DOCUMENTOS_O_SOPORTES_ADICIONALES:
      datos.DESCRIPCION_DOCUMENTOS_O_SOPORTES_ADICIONALES ||
      'Copia de documento de identidad y soportes del caso',
    MEDIO_NOTIFICACION: datos.MEDIO_NOTIFICACION || 'Correo electrónico y WhatsApp',
    DIRECCION_NOTIFICACION: direccion,
    CORREO_ELECTRONICO: correo,
    NUMERO_TELEFONO: telefono,
    FIRMA: datos.FIRMA || nombreCompleto,

    // Variables de TUTELA CIRUGIA.docx (Tutela Salud)
    NOMBRE_ACCIONANTE: nombreCompleto,
    NUMERO_DOCUMENTO_ACCIONANTE: numeroDocumento,
    CIUDAD_EXPEDICION: datos.CIUDAD_EXPEDICION || municipio,
    NOMBRE_EPS: entidad,
    VEREDA_CORREGIMIENTO_O_BARRIO: vereda,
    REGIMEN_CONTRIBUTIVO_O_SUBSIDIADO:
      datos.REGIMEN_CONTRIBUTIVO_O_SUBSIDIADO || 'Subsidiado',
    DIAGNOSTICO_MEDICO:
      datos.DIAGNOSTICO_MEDICO || datos.problema || 'Condición médica acreditada en historia clínica',
    FECHA_ORDEN_MEDICA: datos.FECHA_ORDEN_MEDICA || fechaActual,
    NOMBRE_MEDICO_TRATANTE: datos.NOMBRE_MEDICO_TRATANTE || 'Médico tratante adscrito',
    ESPECIALIDAD_MEDICA: datos.ESPECIALIDAD_MEDICA || 'Medicina Especializada',
    NOMBRE_IPS: datos.NOMBRE_IPS || 'IPS Asignada',
    NOMBRE_CIRUGIA_O_TRATAMIENTO:
      datos.NOMBRE_CIRUGIA_O_TRATAMIENTO || peticion,
    FECHA_SOLICITUD_AUTORIZACION: datos.FECHA_SOLICITUD_AUTORIZACION || fechaActual,
    MEDIO_DE_SOLICITUD: datos.MEDIO_DE_SOLICITUD || 'Presencial / Virtual',
    DESCRIPCION_NEGATIVA_O_DEMORA_EN_LA_AUTORIZACION:
      datos.DESCRIPCION_NEGATIVA_O_DEMORA_EN_LA_AUTORIZACION || hechos,
    DESCRIPCION_SINTOMAS_AFECTACIONES_Y_CONSECUENCIAS_DE_LA_DEMORA:
      datos.DESCRIPCION_SINTOMAS_AFECTACIONES_Y_CONSECUENCIAS_DE_LA_DEMORA || hechos,
    DESCRIPCION_RIESGO_INMINENTE_ACREDITADO:
      datos.DESCRIPCION_RIESGO_INMINENTE_ACREDITADO || peticion,
    DESCRIPCION_SOPORTE_MEDICO_QUE_ACREDITA_LA_URGENCIA:
      datos.DESCRIPCION_SOPORTE_MEDICO_QUE_ACREDITA_LA_URGENCIA ||
      'Orden médica e historia clínica adjunta',
    DESCRIPCION_PRUEBAS_ADICIONALES:
      datos.DESCRIPCION_PRUEBAS_ADICIONALES ||
      'Copia de cédula de ciudadanía, historia clínica y fórmula médica',
    DIRECCION_ACCIONANTE: direccion,
    TELEFONO_ACCIONANTE: telefono,
    CORREO_ACCIONANTE: correo,
    DIRECCION_NOTIFICACIONES_EPS:
      datos.DIRECCION_NOTIFICACIONES_EPS || `Sede administrativa de ${entidad}`,
    MUNICIPIO_SEDE_EPS: datos.MUNICIPIO_SEDE_EPS || municipio,
    CORREO_NOTIFICACIONES_JUDICIALES_EPS:
      datos.CORREO_NOTIFICACIONES_JUDICIALES_EPS || 'notificacionesjudiciales@eps.com.co',

    // Variables de TUTELA CUPO COLEGIO.docx (Tutela Educación)
    NOMBRE_MENOR: datos.NOMBRE_MENOR || 'Menor representado(a)',
    PADRE_O_MADRE: datos.PADRE_O_MADRE || 'padre/madre',
    TIPO_Y_NUMERO_DOCUMENTO_MENOR:
      datos.TIPO_Y_NUMERO_DOCUMENTO_MENOR || 'Tarjeta de Identidad / Registro Civil',
    EDAD_MENOR: datos.EDAD_MENOR || '10',
    GRADO_ESCOLAR_SOLICITADO: datos.GRADO_ESCOLAR_SOLICITADO || 'Grado correspondiente',
    ANO_LECTIVO: datos.ANO_LECTIVO || String(new Date().getFullYear()),
    ENTIDAD_RECEPTORA_SOLICITUD: entidad,
    DESCRIPCION_GESTIONES_REALIZADAS_Y_FECHAS:
      datos.DESCRIPCION_GESTIONES_REALIZADAS_Y_FECHAS || hechos,
    RESPUESTA_ENTIDAD_O_INDICAR_SIN_RESPUESTA:
      datos.RESPUESTA_ENTIDAD_O_INDICAR_SIN_RESPUESTA || peticion,
    DESCRIPCION_CONDICIONES_DE_ACCESO_Y_TRANSPORTE:
      datos.DESCRIPCION_CONDICIONES_DE_ACCESO_Y_TRANSPORTE ||
      `Residente en zona rural (${vereda}, ${municipio}) sin otra oferta educativa cercana`,

    // Permite sobrescribir cualquier llave en mayúsculas enviada directamente en datos
    ...datos,
  };
}

/**
 * Normaliza los placeholders de las plantillas extraídas de PLANTILLAS.zip:
 * - Convierte {{VARIABLE}} (usado en CIUDAD.docx) -> {VARIABLE}
 * - Convierte (VARIABLE) en mayúsculas (usado en TUTELA CIRUGIA.docx y TUTELA CUPO COLEGIO.docx) -> {VARIABLE}
 * para que docxtemplater los procese de manera uniforme.
 */
function normalizarDelimitadoresXml(zip) {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  let xml = file.asText();
  // Reemplazar {{VAR}} -> {VAR}
  xml = xml.replace(/\{\{([A-Z0-9_]+)\}\}/g, '{$1}');
  // Reemplazar (VAR) -> {VAR} para variables en mayúsculas de al menos 3 caracteres
  xml = xml.replace(/\(([A-Z0-9_]{3,})\)/g, '{$1}');

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

  // Normalizar delimitadores {{VAR}} y (VAR) a {VAR} para docxtemplater
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

  const cleanCode = (codigo || 'CASO-DOC').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const slugPlantilla = nombrePlantilla
    .replace(/\.docx$/i, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .toUpperCase();
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
  PLANTILLAS_DIR,
  DOCUMENTOS_DIR,
  PLANTILLAS_DISPONIBLES,
};
