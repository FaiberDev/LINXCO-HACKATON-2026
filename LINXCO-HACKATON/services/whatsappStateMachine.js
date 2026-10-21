const fs = require('fs');
const path = require('path');
const { Solicitud, supabase } = require('../models/Solicitud');
const { generarDocumentoDesdePlantilla } = require('./templateService');

const ARBOL_PATH = path.join(__dirname, '..', 'config', 'arbol_decision.json');

// ---- Estados Exactos de la Máquina de Estados (State Machine) ----
const ESTADOS_FSM = {
  INICIO: 'INICIO',
  ESPERANDO_CATEGORIA: 'ESPERANDO_CATEGORIA',
  ESPERANDO_SUBCATEGORIA: 'ESPERANDO_SUBCATEGORIA',
  RECOLECTANDO_VARIABLES: 'RECOLECTANDO_VARIABLES',
  REQUIERE_ASESOR: 'REQUIERE_ASESOR',
};

const MENSAJE_HANDOFF_OTRA =
  'Por favor, explícame brevemente tu caso en un solo mensaje. Un asesor revisará tu situación y se contactará contigo.';

function cargarArbolDecision(customConfig = null) {
  if (customConfig && Array.isArray(customConfig.categorias)) {
    return customConfig;
  }
  const raw = fs.readFileSync(ARBOL_PATH, 'utf8');
  return JSON.parse(raw);
}

function parseContextoSesion(rawCategoriaTemporal) {
  if (!rawCategoriaTemporal) return {};
  if (typeof rawCategoriaTemporal === 'object') return rawCategoriaTemporal;
  try {
    const parsed = JSON.parse(rawCategoriaTemporal);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return { legacy: rawCategoriaTemporal };
  }
}

async function actualizarSesionUsuario(usuarioId, nuevoEstado, contextoObj = null) {
  const patch = {
    estado_conversacion: nuevoEstado,
    categoria_temporal:
      contextoObj === null ? null : JSON.stringify(contextoObj),
  };
  const { error } = await supabase
    .from('usuarios')
    .update(patch)
    .eq('id', usuarioId);
  if (error) throw error;
}

/**
 * Construye el texto del Menú de Nivel 1 (Categoría Principal: A - E)
 */
function construirMenuCategorias(arbol) {
  const letrasDefault = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const lineas = arbol.categorias.map((cat, idx) => {
    const letra = cat.letra || letrasDefault[idx] || String(idx + 1);
    return `*${letra}.* ${cat.titulo}`;
  });

  return (
    `🏛️ *Bienvenido(a) a Justicia para Todos — Justicia en tu Vereda*\n\n` +
    `Para ayudarte a generar tu documento legal o conectarte con un asesor, dime en qué área general se encuentra tu problema:\n\n` +
    `${lineas.join('\n')}\n\n` +
    `_(Responde con la letra *A, B, C, D, E* o el número de la opción)_`
  );
}

/**
 * Construye el texto del Submenú de Nivel 2 (Casos específicos + opción "Otra")
 */
function construirMenuSubcategorias(categoria) {
  const lineas = (categoria.subcategorias || []).map((sub, idx) => {
    const esOtra =
      sub.accion === 'handoff_asesor' ||
      sub.descripcion.toLowerCase().startsWith('otra');
    const etiqueta = esOtra ? `Otra (${sub.descripcion})` : sub.descripcion;
    return `*${idx + 1}.* ${etiqueta}`;
  });

  return (
    `📂 *Categoría: ${categoria.titulo}*\n` +
    `Selecciona la situación específica que mejor describe tu caso:\n\n` +
    `${lineas.join('\n')}\n\n` +
    `*0.* Volver al menú de categorías`
  );
}

/**
 * Resuelve la categoría de Nivel 1 seleccionada por letra (A-E), número (1-5), id o título
 */
function resolverCategoriaNivel1(entrada, arbol) {
  const norm = String(entrada || '').trim().toLowerCase();
  if (!norm) return null;

  const letrasDefault = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  for (let i = 0; i < arbol.categorias.length; i++) {
    const cat = arbol.categorias[i];
    const letraCat = (cat.letra || letrasDefault[i] || '').toLowerCase();
    const numCat = String(i + 1);
    const idCat = String(cat.id || '').toLowerCase();
    const tituloCat = String(cat.titulo || '').toLowerCase();

    if (
      norm === letraCat ||
      norm === `${letraCat}.` ||
      norm === numCat ||
      norm === `${numCat}.` ||
      norm === idCat ||
      norm === tituloCat ||
      (norm.length >= 4 && tituloCat.includes(norm))
    ) {
      return cat;
    }
  }
  return null;
}

/**
 * Resuelve la subcategoría de Nivel 2 seleccionada por número (1..N), id o palabra "otra"
 */
function resolverSubcategoriaNivel2(entrada, categoria) {
  const norm = String(entrada || '').trim().toLowerCase();
  if (!norm || !categoria || !Array.isArray(categoria.subcategorias)) {
    return null;
  }

  const subs = categoria.subcategorias;

  // Si escribe explícitamente "otra" u "otro", buscar la opción con accion === 'handoff_asesor' o última
  if (norm === 'otra' || norm === 'otro') {
    return (
      subs.find(
        (s) =>
          s.accion === 'handoff_asesor' ||
          String(s.descripcion || '').toLowerCase().startsWith('otra')
      ) || subs[subs.length - 1]
    );
  }

  const idx = parseInt(norm, 10);
  if (!Number.isNaN(idx) && idx >= 1 && idx <= subs.length) {
    return subs[idx - 1];
  }

  return (
    subs.find(
      (s) =>
        String(s.id || '').toLowerCase() === norm ||
        String(s.descripcion || '').toLowerCase() === norm
    ) || null
  );
}

/**
 * Procesador principal de la Máquina de Estados de Dos Niveles y Recolección Dinámica de Variables.
 * Devuelve un string con la respuesta del bot, o `null` cuando el usuario está en `REQUIERE_ASESOR`
 * y las respuestas automatizadas deben detenerse.
 */
async function procesarMensajeArbolDecision(usuario, texto, customConfig = null) {
  const arbol = cargarArbolDecision(customConfig);
  const entrada = String(texto || '').trim();
  const entradaNorm = entrada.toLowerCase();

  // Comando administrativo de emergencia para reiniciar una sesión desde WhatsApp durante pruebas
  if (entradaNorm === '#reset' || entradaNorm === '#reiniciar') {
    const menu = construirMenuCategorias(arbol);
    await actualizarSesionUsuario(
      usuario.id,
      ESTADOS_FSM.ESPERANDO_CATEGORIA,
      {}
    );
    return menu;
  }

  const estadoActual = usuario.estado_conversacion || ESTADOS_FSM.INICIO;
  const contexto = parseContextoSesion(usuario.categoria_temporal);

  // ---- ESTADO: REQUIERE_ASESOR ----
  if (estadoActual === ESTADOS_FSM.REQUIERE_ASESOR) {
    // Si acaba de elegir "Otra" y nos está enviando el mensaje único con la explicación de su caso:
    if (contexto.esperando_explicacion_asesor) {
      const categoriaTitulo = contexto.categoria_titulo || 'Consulta General';
      const tipoTramite = `Requiere Asesor — ${categoriaTitulo}`;

      const casoCreado = await Solicitud.create({
        usuarioId: usuario.id,
        tipoTramite,
        estado: 'BORRADOR',
        datosCiudadano: {
          modalidad: 'handoff_asesor',
          accion: 'handoff_asesor',
          categoria_id: contexto.categoria_id || 'otra',
          categoria: categoriaTitulo,
          hechos: entrada,
          datos_usuario_descripcion: entrada,
          fecha_solicitud_asesor: new Date().toISOString(),
        },
      });

      // Mantiene el estado en REQUIERE_ASESOR y marca que ya se guardó el texto para detener respuestas automáticas posteriores
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.REQUIERE_ASESOR, {
        ...contexto,
        esperando_explicacion_asesor: false,
        codigo_caso: casoCreado.codigo_sms,
        texto_guardado: entrada,
      });

      return (
        `✅ *Hemos registrado tu caso bajo el código:* *${casoCreado.codigo_sms}*\n\n` +
        `Un asesor jurídico revisará tu situación y se pondrá en contacto contigo por este medio.`
      );
    }

    // Ya está en REQUIERE_ASESOR con su mensaje guardado: detener respuestas automatizadas
    return null;
  }

  // ---- ESTADO: INICIO (o estados heredados de versiones previas) ----
  const esEstadoValido = Object.values(ESTADOS_FSM).includes(estadoActual);
  if (estadoActual === ESTADOS_FSM.INICIO || !esEstadoValido) {
    const menu = construirMenuCategorias(arbol);
    await actualizarSesionUsuario(
      usuario.id,
      ESTADOS_FSM.ESPERANDO_CATEGORIA,
      {}
    );
    return menu;
  }

  // ---- NIVEL 1: ESPERANDO_CATEGORIA ----
  if (estadoActual === ESTADOS_FSM.ESPERANDO_CATEGORIA) {
    const categoriaSeleccionada = resolverCategoriaNivel1(entrada, arbol);
    if (!categoriaSeleccionada) {
      return (
        `⚠️ Opción no reconocida. Por favor responde con la letra (*A, B, C, D, E*) o el número de la categoría:\n\n` +
        construirMenuCategorias(arbol)
      );
    }

    const nuevoContexto = {
      categoria_id: categoriaSeleccionada.id,
      categoria_titulo: categoriaSeleccionada.titulo,
    };

    await actualizarSesionUsuario(
      usuario.id,
      ESTADOS_FSM.ESPERANDO_SUBCATEGORIA,
      nuevoContexto
    );

    return construirMenuSubcategorias(categoriaSeleccionada);
  }

  // ---- NIVEL 2: ESPERANDO_SUBCATEGORIA ----
  if (estadoActual === ESTADOS_FSM.ESPERANDO_SUBCATEGORIA) {
    if (entradaNorm === '0' || entradaNorm === 'volver') {
      await actualizarSesionUsuario(
        usuario.id,
        ESTADOS_FSM.ESPERANDO_CATEGORIA,
        {}
      );
      return construirMenuCategorias(arbol);
    }

    const categoriaActual =
      arbol.categorias.find((c) => c.id === contexto.categoria_id) ||
      arbol.categorias[0];

    const subcategoria = resolverSubcategoriaNivel2(entrada, categoriaActual);
    if (!subcategoria) {
      return (
        `⚠️ Por favor selecciona un número válido de la lista (o *0* para volver):\n\n` +
        construirMenuSubcategorias(categoriaActual)
      );
    }

    const esOpcionOtra =
      subcategoria.accion === 'handoff_asesor' ||
      String(subcategoria.id || '').toLowerCase().startsWith('otra') ||
      String(subcategoria.descripcion || '').toLowerCase() === 'otra';

    // Si elige "Otra" -> Pasar a REQUIERE_ASESOR y pedir explicación breve en un solo mensaje
    if (esOpcionOtra) {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.REQUIERE_ASESOR, {
        categoria_id: categoriaActual.id,
        categoria_titulo: categoriaActual.titulo,
        subcategoria_id: subcategoria.id,
        esperando_explicacion_asesor: true,
      });
      return MENSAJE_HANDOFF_OTRA;
    }

    // Si elige un caso específico -> Match con plantilla y pasar a RECOLECTANDO_VARIABLES
    const variablesRequeridas = Array.isArray(subcategoria.variables_requeridas)
      ? subcategoria.variables_requeridas
      : [];

    if (variablesRequeridas.length === 0) {
      // Si la plantilla no requiere variables adicionales, generar documento inmediatamente
      return await finalizarYGenerarDocumento(usuario, {
        categoria_id: categoriaActual.id,
        categoria_titulo: categoriaActual.titulo,
        subcategoria_id: subcategoria.id,
        subcategoria_descripcion: subcategoria.descripcion,
        plantilla: subcategoria.plantilla,
        mecanismo: subcategoria.mecanismo || 'Trámite legal',
        respuestas_recolectadas: {},
      });
    }

    const primeraVariable = variablesRequeridas[0];
    const contextoVariables = {
      categoria_id: categoriaActual.id,
      categoria_titulo: categoriaActual.titulo,
      subcategoria_id: subcategoria.id,
      subcategoria_descripcion: subcategoria.descripcion,
      plantilla: subcategoria.plantilla,
      mecanismo: subcategoria.mecanismo || 'Documento legal',
      variables_requeridas: variablesRequeridas,
      indice_variable_actual: 0,
      respuestas_recolectadas: {},
    };

    await actualizarSesionUsuario(
      usuario.id,
      ESTADOS_FSM.RECOLECTANDO_VARIABLES,
      contextoVariables
    );

    return (
      `📝 *${subcategoria.descripcion}*\n` +
      `Vamos a diligenciar tu documento paso a paso (Pregunta 1 de ${variablesRequeridas.length}).\n\n` +
      `${primeraVariable.pregunta}\n\n` +
      `_(Escribe *0* si deseas cancelar y volver al inicio)_`
    );
  }

  // ---- PASO 4: RECOLECTANDO_VARIABLES ----
  if (estadoActual === ESTADOS_FSM.RECOLECTANDO_VARIABLES) {
    if (entradaNorm === '0' || entradaNorm === 'cancelar') {
      await actualizarSesionUsuario(
        usuario.id,
        ESTADOS_FSM.ESPERANDO_CATEGORIA,
        {}
      );
      return construirMenuCategorias(arbol);
    }

    const variablesRequeridas = Array.isArray(contexto.variables_requeridas)
      ? contexto.variables_requeridas
      : [];
    const indiceActual = Number(contexto.indice_variable_actual || 0);
    const variableActual = variablesRequeridas[indiceActual];

    if (!variableActual) {
      return await finalizarYGenerarDocumento(usuario, contexto);
    }

    const respuestasActualizadas = {
      ...(contexto.respuestas_recolectadas || {}),
      [variableActual.id]: entrada,
    };

    const siguienteIndice = indiceActual + 1;

    // Si aún faltan variables por recolectar -> preguntar la siguiente
    if (siguienteIndice < variablesRequeridas.length) {
      const siguienteVariable = variablesRequeridas[siguienteIndice];
      const nuevoContexto = {
        ...contexto,
        indice_variable_actual: siguienteIndice,
        respuestas_recolectadas: respuestasActualizadas,
      };

      await actualizarSesionUsuario(
        usuario.id,
        ESTADOS_FSM.RECOLECTANDO_VARIABLES,
        nuevoContexto
      );

      return (
        `✅ Dato guardado (${siguienteIndice + 1} de ${variablesRequeridas.length}).\n\n` +
        `${siguienteVariable.pregunta}`
      );
    }

    // Si ya se recolectó la última variable -> generar el documento y registrar en BD
    return await finalizarYGenerarDocumento(usuario, {
      ...contexto,
      respuestas_recolectadas: respuestasActualizadas,
    });
  }

  return null;
}

/**
 * Empaqueta el payload recolectado, invoca el motor de plantillas (docxtemplater),
 * guarda la solicitud en PostgreSQL en estado 'BORRADOR' y reinicia el estado del usuario.
 */
async function finalizarYGenerarDocumento(usuario, contextoFinal) {
  const respuestas = contextoFinal.respuestas_recolectadas || {};
  const tipoTramite = `${contextoFinal.mecanismo || 'Trámite'} (${
    contextoFinal.categoria_titulo || 'General'
  }: ${contextoFinal.subcategoria_descripcion || contextoFinal.subcategoria_id})`;

  const nombreCiudadano =
    respuestas.NOMBRE_COMPLETO ||
    respuestas.NOMBRE_ACCIONANTE ||
    respuestas.NOMBRE_COMPLETO_ACCIONANTE ||
    respuestas.NOMBRE_COMPLETO_PACIENTE_USUARIO ||
    respuestas.NOMBRE_COMPLETO_PETICIONARIO ||
    'Ciudadano (WhatsApp)';

  const documentoCiudadano =
    respuestas.NUMERO_CEDULA ||
    respuestas.NUMERO_DOCUMENTO ||
    respuestas.NUMERO_DOCUMENTO_ACCIONANTE ||
    '';

  const municipioCiudadano =
    respuestas.CIUDAD_O_MUNICIPIO ||
    respuestas.CIUDAD_O_MUNICIPIO_RADICACION ||
    respuestas.VEREDA_CORREGIMIENTO_O_BARRIO ||
    respuestas.NOMBRE_VEREDA ||
    respuestas.NOMBRE_VEREDA_CARRETERA ||
    respuestas.DIRECCION_EXACTA_BARRIO_SECTOR_VEREDA ||
    '';

  const datosCiudadano = {
    modalidad: 'whatsapp_bot',
    mecanismo: contextoFinal.mecanismo || 'Derecho de petición',
    categoria: contextoFinal.categoria_titulo,
    subcategoria: contextoFinal.subcategoria_id,
    problema: contextoFinal.subcategoria_descripcion,
    plantilla: contextoFinal.plantilla,
    ciudadano: {
      nombre_completo: nombreCiudadano,
      numero_documento: documentoCiudadano,
      telefono: usuario.telefono || '',
      municipio: municipioCiudadano,
      vereda: municipioCiudadano,
    },
    respuestas_recolectadas: respuestas,
    ...respuestas,
  };

  // 1. Crear registro en la tabla casos/solicitudes en estado 'BORRADOR'
  let solicitud = await Solicitud.create({
    usuarioId: usuario.id,
    tipoTramite,
    datosCiudadano,
    estado: 'BORRADOR',
  });

  // 2. Generar el documento legal desde la plantilla seleccionada
  let docGenerado = null;
  try {
    docGenerado = generarDocumentoDesdePlantilla({
      codigo: solicitud.codigo_sms,
      datosCiudadano,
      tipoTramite,
      plantilla: contextoFinal.plantilla,
    });

    solicitud = await Solicitud.updateByCodigo(solicitud.codigo_sms, {
      estado: 'BORRADOR',
      ruta_documento: docGenerado.rutaDocumento,
      formulario_web: {
        ...datosCiudadano,
        ruta_documento: docGenerado.rutaDocumento,
        plantilla_usada: docGenerado.plantillaUsada,
      },
    });
  } catch (err) {
    console.error('Error generando documento desde WhatsApp FSM:', err);
  }

  // 3. Reiniciar estado del usuario a INICIO tras finalizar
  await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, null);

  // Adjuntar metadatos en el objeto usuario en memoria para que whatsapp_bot.js pueda enviar el archivo .docx
  if (docGenerado) {
    usuario.ultimoDocumentoGenerado = docGenerado;
  }

  return (
    `🎉 *¡Tu documento legal ha sido generado con éxito!*\n\n` +
    `📄 *Trámite:* ${contextoFinal.subcategoria_descripcion}\n` +
    `📌 *Estado actual:* BORRADOR (en revisión por Consultorio Jurídico)\n` +
    `🔑 *Tu código de seguimiento es:* *${solicitud.codigo_sms}*\n` +
    (docGenerado
      ? `📥 *Descarga o consulta tu documento en la web con tu código:*\nhttp://localhost:5173/estado/${solicitud.codigo_sms}\n\n`
      : '\n') +
    `_(Si necesitas realizar otro trámite, envíanos cualquier mensaje para volver a empezar)_`
  );
}

module.exports = {
  ESTADOS_FSM,
  MENSAJE_HANDOFF_OTRA,
  cargarArbolDecision,
  procesarMensajeArbolDecision,
  construirMenuCategorias,
  construirMenuSubcategorias,
  resolverCategoriaNivel1,
  resolverSubcategoriaNivel2,
};
