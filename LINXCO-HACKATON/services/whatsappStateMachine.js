const fs = require('fs');
const path = require('path');
const { Solicitud, supabase } = require('../models/Solicitud');
const { generarDocumentoDesdePlantilla } = require('./templateService');

const ARBOL_PATH = path.join(__dirname, '..', 'config', 'arbol_decision.json');

const SERVER_BASE_URL =
  process.env.PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'http://18.234.219.58';

// ---- Estados Exactos de la Máquina de Estados (State Machine) ----
const ESTADOS_FSM = {
  INICIO: 'INICIO',
  APRENDE_DERECHOS: 'APRENDE_DERECHOS',
  SOLICITUD_NOMBRE: 'SOLICITUD_NOMBRE',
  SOLICITUD_TELEFONO: 'SOLICITUD_TELEFONO',
  SOLICITUD_MECANISMO: 'SOLICITUD_MECANISMO',
  ESPERANDO_CODIGO_CONSULTA: 'ESPERANDO_CODIGO_CONSULTA',
  ESPERANDO_CATEGORIA: 'ESPERANDO_CATEGORIA',
  ESPERANDO_SUBCATEGORIA: 'ESPERANDO_SUBCATEGORIA',
  RECOLECTANDO_VARIABLES: 'RECOLECTANDO_VARIABLES',
  REQUIERE_ASESOR: 'REQUIERE_ASESOR',
};

const MENSAJE_HANDOFF_OTRA =
  'Por favor, explícame brevemente tu caso en un solo mensaje. Un asesor revisará tu situación y se contactará contigo.';

// Textos Pedagógicos del Módulo "Aprende tus Derechos"
const TEXTOS_PEDAGOGICOS = {
  PETICION:
    `📖 *¿Qué es el Derecho de Petición? (Artículo 23 de la Constitución)*\n\n` +
    `Es una herramienta constitucional que le permite a cualquier ciudadano, campesino o habitante rural solicitar información, documentos, copias o respuestas claras a entidades del Estado (Alcaldía, EPS, Colegio, Banco Agrario, Prosperidad Social) o empresas de servicios públicos.\n\n` +
    `⏱️ *Plazos legales de respuesta obligatoria:*\n` +
    `• Solicitud de documentos / copias: *10 días hábiles*.\n` +
    `• Peticiones de interés particular o quejas: *15 días hábiles*.\n` +
    `• Consultas a autoridades: *30 días hábiles*.\n\n` +
    `💡 *¿Cuándo te conviene usarlo?*\n` +
    `• Tu EPS no te entrega citas, autorizaciones o historia clínica.\n` +
    `• La Alcaldía o gobernación no responde peticiones sobre arreglo de vías o alumbrado.\n` +
    `• Solicitas certificados de estudio o subsidios rurales.\n` +
    `• Reclamos por cobros injustos de agua, luz o gas.\n\n` +
    `----------------------------------------\n` +
    `👉 ¿Deseas iniciar tu *Derecho de Petición* ahora con tus datos básicos?\n` +
    `*1.* ✍️ *Sí, iniciar mi solicitud ahora*\n` +
    `*0.* 🔙 *Volver al menú principal*`,

  TUTELA:
    `⚖️ *¿Qué es la Acción de Tutela? (Artículo 86 de la Constitución)*\n\n` +
    `Es el mecanismo judicial más rápido y poderoso en Colombia para proteger tus *Derechos Fundamentales* (la vida, la salud, la dignidad, el agua, la educación de los niños, el debido proceso) cuando una entidad pública o particular los vulnera o amenaza.\n\n` +
    `⏱️ *Plazos y orden del Juez:*\n` +
    `• El Juez de la República tiene un plazo máximo e improrrogable de *10 días hábiles* para emitir su fallo obligatorio.\n` +
    `• ¡No necesitas abogado ni intermediarios para presentarla!\n\n` +
    `💡 *¿Cuándo te conviene usarla?*\n` +
    `• Negación o demora en entrega de medicamentos vitales o citas con especialistas.\n` +
    `• Cirugías o tratamientos urgentes no autorizados por la EPS.\n` +
    `• Falta de ruta o transporte escolar para menores de edad en la vereda.\n` +
    `• Cuando radicaste un Derecho de Petición y no te respondieron, afectando tu salud o sustento.\n\n` +
    `----------------------------------------\n` +
    `👉 ¿Deseas formular una *Acción de Tutela* ahora con tus datos básicos?\n` +
    `*1.* ✍️ *Sí, iniciar mi solicitud ahora*\n` +
    `*0.* 🔙 *Volver al menú principal*`,

  DIFERENCIAS:
    `🔍 *¿Derecho de Petición o Acción de Tutela? Guía Práctica:*\n\n` +
    `1️⃣ *Usa Derecho de Petición cuando:*\n` +
    `• Es el reclamo o solicitud inicial ante la entidad responsable (EPS, Alcaldía, colegio, empresa).\n` +
    `• Buscas copias de documentos o aclaraciones de trámites.\n` +
    `• Plazo legal de respuesta: 10 a 15 días hábiles.\n\n` +
    `2️⃣ *Usa Acción de Tutela cuando:*\n` +
    `• Hay una urgencia médica o riesgo inminente para la salud o la vida.\n` +
    `• La entidad ya ignoró tu petición y tu derecho fundamental sigue vulnerado.\n` +
    `• Se radica ante un Juez (fallo vinculante en 10 días hábiles).\n\n` +
    `----------------------------------------\n` +
    `👉 ¿Deseas iniciar tu trámite ahora con tus datos básicos?\n` +
    `*1.* ✍️ *Iniciar mi solicitud ahora*\n` +
    `*0.* 🔙 *Volver al menú principal*`,
};

function cargarArbolDecision(customConfig = null) {
  if (customConfig && Array.isArray(customConfig.categorias)) {
    return customConfig;
  }
  try {
    const raw = fs.readFileSync(ARBOL_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return { categorias: [] };
  }
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
  if (error) {
    console.error('[WSP FSM] Error actualizando sesión usuario:', error.message);
  }
}

/**
 * Menú Principal enfocado en "Aprende tus Derechos" y "Creación Ágil de Solicitud"
 */
function construirMenuPrincipal(usuario) {
  const telDisplay = usuario.telefono ? ` (${usuario.telefono})` : '';
  return (
    `🏛️ *Bienvenido(a) a Justicia para Todos — Consultorio Jurídico*\n` +
    `Asistencia jurídica rural gratuita y pedagógica.\n\n` +
    `📚 *Módulo: Aprende tus Derechos*\n` +
    `*1.* 📖 *Derecho de Petición* (¿Qué es, para qué sirve y plazos?)\n` +
    `*2.* ⚖️ *Acción de Tutela* (¿Qué es, cuándo procede y tiempos del juez?)\n` +
    `*3.* 🔍 *¿Petición o Tutela?* (Diferencias clave para saber cuál usar)\n\n` +
    `✍️ *Iniciar tu Solicitud (Ágil)*\n` +
    `*4.* 📝 *Registrar solicitud con datos básicos* (y continuar en la web)\n\n` +
    `📂 *Seguimiento*\n` +
    `*5.* 🔍 *Consultar estado de un trámite con tu código*\n\n` +
    `_(Responde con el número de la opción *1, 2, 3, 4 o 5*, o escribe tu consulta directamente)_`
  );
}

/**
 * Muestra el menú de categorías del árbol para retrocompatibilidad
 */
function construirMenuCategorias(arbol) {
  const letrasDefault = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const lineas = (arbol.categorias || []).map((cat, idx) => {
    const letra = cat.letra || letrasDefault[idx] || String(idx + 1);
    return `*${letra}.* ${cat.titulo}`;
  });

  return (
    `🏛️ *Catálogo de Áreas Jurídicas*\n\n` +
    `Dime en qué área general se encuentra tu problema:\n\n` +
    `${lineas.join('\n')}\n\n` +
    `_(Responde con la letra o número de la opción)_`
  );
}

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
    `*0.* Volver al menú principal`
  );
}

function resolverCategoriaNivel1(entrada, arbol) {
  const norm = String(entrada || '').trim().toLowerCase();
  if (!norm || !arbol || !Array.isArray(arbol.categorias)) return null;

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

function resolverSubcategoriaNivel2(entrada, categoria) {
  const norm = String(entrada || '').trim().toLowerCase();
  if (!norm || !categoria || !Array.isArray(categoria.subcategorias)) {
    return null;
  }

  const subs = categoria.subcategorias;

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
 * Consulta y formatea un caso existente
 */
async function consultarCasoPorCodigo(codigo) {
  const clean = String(codigo || '').trim().toUpperCase();
  try {
    const caso = await Solicitud.findByCodigo(clean);
    if (!caso) return null;

    const nombre =
      caso.datos_ciudadano?.ciudadano?.nombre_completo ||
      caso.datos_ciudadano?.ciudadano?.nombres ||
      'Ciudadano';
    const tel =
      caso.datos_ciudadano?.ciudadano?.telefono || 'No registrado';
    const mecanismo =
      caso.datos_ciudadano?.mecanismo ||
      caso.tipo_tramite ||
      'Trámite legal';

    return (
      `🔍 *Información de tu Caso:* *${caso.codigo_sms}*\n\n` +
      `📌 *Estado legal:* *${caso.estado}*\n` +
      `👤 *Solicitante:* ${nombre}\n` +
      `📞 *Contacto:* ${tel}\n` +
      `⚖️ *Mecanismo:* ${mecanismo}\n\n` +
      `🌐 *Para continuar editando en la web o consultar los avances:*\n` +
      `👉 ${SERVER_BASE_URL}/estado/${caso.codigo_sms}\n\n` +
      `💡 Al abrir el enlace, haz clic en *"Continuar editando solicitud"* para completar tu documento.\n\n` +
      `_(Escribe *HOLA* o *0* para volver al menú principal)_`
    );
  } catch (err) {
    console.error('[WSP FSM] Error consultando caso por código:', err);
    return null;
  }
}

/**
 * Procesador principal de la Máquina de Estados de WhatsApp
 */
async function procesarMensajeArbolDecision(usuario, texto, customConfig = null) {
  const entrada = String(texto || '').trim();
  const entradaNorm = entrada.toLowerCase();
  const arbol = cargarArbolDecision(customConfig);

  // 1. Comando de reinicio / saludo inicial
  if (
    entradaNorm === '#reset' ||
    entradaNorm === '#reiniciar' ||
    entradaNorm === '#inicio' ||
    entradaNorm === 'hola' ||
    entradaNorm === 'buenos dias' ||
    entradaNorm === 'buenas tardes' ||
    entradaNorm === 'buenas noches' ||
    entradaNorm === 'menu' ||
    entradaNorm === 'inicio'
  ) {
    await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, {});
    return construirMenuPrincipal(usuario);
  }

  // 2. Detección directa de código de caso (ej: CASO-ABC o caso-123)
  const matchCodigo = entrada.match(/CASO-[A-Z0-9]{3,6}/i);
  if (matchCodigo) {
    const info = await consultarCasoPorCodigo(matchCodigo[0]);
    if (info) return info;
  }

  const estadoActual = usuario.estado_conversacion || ESTADOS_FSM.INICIO;
  const contexto = parseContextoSesion(usuario.categoria_temporal);

  // ---- ESTADO: REQUIERE_ASESOR ----
  if (estadoActual === ESTADOS_FSM.REQUIERE_ASESOR) {
    if (contexto.esperando_explicacion_asesor) {
      const categoriaTitulo = contexto.categoria_titulo || 'Consulta General';
      const tipoTramite = `Requiere Asesor — ${categoriaTitulo}`;

      const casoCreado = await Solicitud.create({
        usuarioId: usuario.id,
        tipoTramite,
        estado: 'BORRADOR',
        datosCiudadano: {
          modalidad: 'handoff_asesor',
          categoria: categoriaTitulo,
          hechos: entrada,
          ciudadano: {
            nombre_completo: 'Ciudadano WhatsApp',
            telefono: usuario.telefono || '',
          },
          fecha_solicitud_asesor: new Date().toISOString(),
        },
      });

      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.REQUIERE_ASESOR, {
        ...contexto,
        esperando_explicacion_asesor: false,
        codigo_caso: casoCreado.codigo_sms,
        texto_guardado: entrada,
      });

      return (
        `✅ *Hemos registrado tu solicitud con el código:* *${casoCreado.codigo_sms}*\n\n` +
        `🌐 *Puedes consultar y continuar tu caso en la web:*\n` +
        `👉 ${SERVER_BASE_URL}/estado/${casoCreado.codigo_sms}\n\n` +
        `Un asesor jurídico revisará tu situación y se pondrá en contacto contigo por este medio.`
      );
    }
    return null;
  }

  // ---- ESTADO: INICIO (Menú Principal y Selección de Opciones) ----
  if (estadoActual === ESTADOS_FSM.INICIO) {
    // Opción 1: Pedagogía Derecho de Petición
    if (
      entradaNorm === '1' ||
      entradaNorm === 'peticion' ||
      entradaNorm === 'derecho de peticion' ||
      entradaNorm.includes('petición') ||
      entradaNorm.includes('peticion')
    ) {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.APRENDE_DERECHOS, {
        mecanismo_sugerido: 'Derecho de petición',
      });
      return TEXTOS_PEDAGOGICOS.PETICION;
    }

    // Opción 2: Pedagogía Acción de Tutela
    if (
      entradaNorm === '2' ||
      entradaNorm === 'tutela' ||
      entradaNorm === 'accion de tutela' ||
      entradaNorm.includes('tutela')
    ) {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.APRENDE_DERECHOS, {
        mecanismo_sugerido: 'Acción de tutela',
      });
      return TEXTOS_PEDAGOGICOS.TUTELA;
    }

    // Opción 3: Comparativa Diferencias Petición vs Tutela
    if (
      entradaNorm === '3' ||
      entradaNorm.includes('diferencia') ||
      entradaNorm.includes('cual usar')
    ) {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.APRENDE_DERECHOS, {
        mecanismo_sugerido: 'Derecho de petición',
      });
      return TEXTOS_PEDAGOGICOS.DIFERENCIAS;
    }

    // Opción 4: Iniciar Solicitud Rápida (Paso 1: Nombre)
    if (
      entradaNorm === '4' ||
      entradaNorm === 'crear' ||
      entradaNorm === 'iniciar' ||
      entradaNorm === 'solicitar' ||
      entradaNorm === 'tramitar'
    ) {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.SOLICITUD_NOMBRE, {
        mecanismo_sugerido: 'Derecho de petición',
      });
      return (
        `📝 *Registro Ágil de Solicitud (Paso 1 de 3)*\n\n` +
        `👤 Para comenzar, por favor escribe tu *Nombre y Apellidos completos*:\n\n` +
        `_(Escribe *0* si deseas cancelar y volver al menú principal)_`
      );
    }

    // Opción 5: Consultar Trámite
    if (
      entradaNorm === '5' ||
      entradaNorm === 'consultar' ||
      entradaNorm === 'codigo'
    ) {
      await actualizarSesionUsuario(
        usuario.id,
        ESTADOS_FSM.ESPERANDO_CODIGO_CONSULTA,
        {}
      );
      return (
        `📂 *Consulta de Trámites*\n\n` +
        `Por favor escribe el código de tu caso (ejemplo: *CASO-SJH* o *CASO-QYW*):\n\n` +
        `_(Escribe *0* para volver al menú principal)_`
      );
    }

    // Si escribe texto no reconocido en INICIO, responder con el menú pedagógico
    return (
      `Hola. Para guiarte correctamente, elige una de las opciones del menú:\n\n` +
      construirMenuPrincipal(usuario)
    );
  }

  // ---- ESTADO: APRENDE_DERECHOS ----
  if (estadoActual === ESTADOS_FSM.APRENDE_DERECHOS) {
    if (entradaNorm === '0' || entradaNorm === 'volver' || entradaNorm === 'menu') {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, {});
      return construirMenuPrincipal(usuario);
    }

    // Si responde "1", "si", "crear", "iniciar" -> Pasa a solicitar el nombre
    if (
      entradaNorm === '1' ||
      entradaNorm === 'si' ||
      entradaNorm === 'crear' ||
      entradaNorm === 'iniciar' ||
      entradaNorm === 'continuar'
    ) {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.SOLICITUD_NOMBRE, {
        mecanismo_sugerido: contexto.mecanismo_sugerido || 'Derecho de petición',
      });
      return (
        `📝 *Registro Ágil de Solicitud (Paso 1 de 3)*\n\n` +
        `👤 Por favor escribe tu *Nombre y Apellidos completos*:\n\n` +
        `_(Escribe *0* si deseas cancelar y volver al menú principal)_`
      );
    }

    // Si escribe otra cosa, sugerir cómo proceder
    return (
      `👉 Para iniciar tu solicitud con tus datos básicos, responde con el número *1* o escribe *CREAR*.\n` +
      `Para volver al menú principal, responde con *0*.`
    );
  }

  // ---- ESTADO: ESPERANDO_CODIGO_CONSULTA ----
  if (estadoActual === ESTADOS_FSM.ESPERANDO_CODIGO_CONSULTA) {
    if (entradaNorm === '0' || entradaNorm === 'cancelar' || entradaNorm === 'menu') {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, {});
      return construirMenuPrincipal(usuario);
    }

    const info = await consultarCasoPorCodigo(entrada);
    if (info) {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, {});
      return info;
    }

    return (
      `⚠️ No encontramos ningún trámite con el código *"${entrada.toUpperCase()}"*.\n\n` +
      `Por favor verifica que esté bien escrito (ej: *CASO-SJH*) e inténtalo de nuevo, o escribe *0* para volver al menú principal.`
    );
  }

  // ---- PASO 1: SOLICITUD_NOMBRE ----
  if (estadoActual === ESTADOS_FSM.SOLICITUD_NOMBRE) {
    if (entradaNorm === '0' || entradaNorm === 'cancelar') {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, {});
      return construirMenuPrincipal(usuario);
    }

    if (entrada.length < 3) {
      return `⚠️ Por favor ingresa tu nombre y apellido completo para que el asesor pueda identificarte:`;
    }

    const nombreLimpio = entrada.replace(/[*_~`]/g, '').trim();
    const nuevoContexto = {
      ...contexto,
      nombre_completo: nombreLimpio,
    };

    await actualizarSesionUsuario(
      usuario.id,
      ESTADOS_FSM.SOLICITUD_TELEFONO,
      nuevoContexto
    );

    const telefonoActual = usuario.telefono || '';
    return (
      `✅ Registrado: *${nombreLimpio}*\n\n` +
      `📞 *Paso 2 de 3: Número de contacto*\n` +
      `¿A qué número de teléfono o celular puede comunicarse un asesor jurídico contigo?\n\n` +
      (telefonoActual
        ? `• Responde *1* para usar este mismo número de WhatsApp (*${telefonoActual}*)\n`
        : '') +
      `• O escribe tu número telefónico (ej: *3101234567*)\n\n` +
      `_(Escribe *0* para cancelar)_`
    );
  }

  // ---- PASO 2: SOLICITUD_TELEFONO ----
  if (estadoActual === ESTADOS_FSM.SOLICITUD_TELEFONO) {
    if (entradaNorm === '0' || entradaNorm === 'cancelar') {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, {});
      return construirMenuPrincipal(usuario);
    }

    let telefonoContacto = entrada.trim();
    if (
      entradaNorm === '1' ||
      entradaNorm === 'este' ||
      entradaNorm === 'mismo' ||
      entradaNorm === 'si'
    ) {
      telefonoContacto = usuario.telefono || 'Sin teléfono';
    }

    const nuevoContexto = {
      ...contexto,
      telefono_contacto: telefonoContacto,
    };

    await actualizarSesionUsuario(
      usuario.id,
      ESTADOS_FSM.SOLICITUD_MECANISMO,
      nuevoContexto
    );

    const mecanismoSugerido = contexto.mecanismo_sugerido || 'Derecho de petición';
    return (
      `✅ Contacto registrado: *${telefonoContacto}*\n\n` +
      `⚖️ *Paso 3 de 3: Mecanismo y Breve Descripción*\n` +
      `¿Para qué problema necesitas la solicitud?\n\n` +
      `*1.* 📖 *Derecho de Petición* (Salud, subsidios, servicios públicos, copias o quejas)\n` +
      `*2.* ⚖️ *Acción de Tutela* (Urgencia médica vital, falta de medicamentos o citas urgentes)\n\n` +
      `_O escribe directamente en un mensaje tu caso (ej: "La EPS no me entrega el medicamento para el azúcar")_\n\n` +
      `_(Escribe *0* para cancelar)_`
    );
  }

  // ---- PASO 3: SOLICITUD_MECANISMO Y CREACIÓN EN SUPABASE ----
  if (estadoActual === ESTADOS_FSM.SOLICITUD_MECANISMO) {
    if (entradaNorm === '0' || entradaNorm === 'cancelar') {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, {});
      return construirMenuPrincipal(usuario);
    }

    let mecanismoFinal = contexto.mecanismo_sugerido || 'Derecho de petición';
    let resumenProblema = entrada.trim();

    if (entradaNorm === '1' || entradaNorm.includes('peticion') || entradaNorm.includes('petición')) {
      mecanismoFinal = 'Derecho de petición';
      if (entradaNorm === '1') {
        resumenProblema = 'Solicitud de información, copias o reclamo ante entidad';
      }
    } else if (entradaNorm === '2' || entradaNorm.includes('tutela')) {
      mecanismoFinal = 'Acción de tutela';
      if (entradaNorm === '2') {
        resumenProblema = 'Vulneración de derecho fundamental a la salud o educación';
      }
    }

    const nombreCompleto = contexto.nombre_completo || 'Ciudadano';
    const telefonoContacto = contexto.telefono_contacto || usuario.telefono || '';

    // Crear registro en la tabla de solicitudes en estado 'BORRADOR'
    const datosCiudadano = {
      modalidad: 'whatsapp_bot_agil',
      mecanismo: mecanismoFinal,
      problema: resumenProblema,
      origen: 'whatsapp_bot',
      ciudadano: {
        nombre_completo: nombreCompleto,
        nombres: nombreCompleto,
        telefono: telefonoContacto,
      },
      formulario_web: {
        mecanismo: mecanismoFinal,
        problema: resumenProblema,
        categoria: 'Solicitud iniciada por WhatsApp',
        ciudadano: {
          nombres: nombreCompleto,
          telefono: telefonoContacto,
        },
        respuestas_recolectadas: {
          NOMBRE_COMPLETO: nombreCompleto,
          TELEFONO_CONTACTO: telefonoContacto,
          HECHOS_PROBLEMA: resumenProblema,
        },
      },
      fecha_registro: new Date().toISOString(),
    };

    const casoCreado = await Solicitud.create({
      usuarioId: usuario.id,
      tipoTramite: `${mecanismoFinal} — ${resumenProblema.slice(0, 50)}`,
      estado: 'BORRADOR',
      datosCiudadano,
    });

    // Reiniciar estado del usuario para futuras interacciones
    await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, null);

    const codigo = casoCreado.codigo_sms;
    const linkWeb = `${SERVER_BASE_URL}/estado/${codigo}`;

    return (
      `🎉 *¡Tu solicitud preliminar ha sido creada con éxito!*\n\n` +
      `📌 *Código de seguimiento:* *${codigo}*\n` +
      `👤 *Solicitante:* ${nombreCompleto}\n` +
      `📞 *Contacto registrado:* ${telefonoContacto}\n` +
      `⚖️ *Mecanismo:* ${mecanismoFinal}\n` +
      `📋 *Estado:* *BORRADOR*\n\n` +
      `🌐 *ENLACE PARA CONTINUAR TU TRÁMITE EN LA WEB:*\n` +
      `👉 ${linkWeb}\n\n` +
      `💡 *¿Cómo completar tu documento?*\n` +
      `1. Abre el enlace anterior desde tu celular o computador.\n` +
      `2. Verás tu caso con tu código *${codigo}* cargado automáticamente.\n` +
      `3. Haz clic en el botón *"Continuar editando solicitud"* para responder las preguntas de tu caso y adjuntar pruebas.\n\n` +
      `📞 Además, un asesor de nuestro Consultorio Jurídico tiene tu número (*${telefonoContacto}*) para comunicarse contigo en caso de requerir apoyo directo.\n\n` +
      `_(Si deseas consultar otro tema, escribe *HOLA* en cualquier momento)_`
    );
  }

  // ---- RETROCOMPATIBILIDAD CON ÁRBOL (ESPERANDO_CATEGORIA / SUBCATEGORIA) ----
  if (estadoActual === ESTADOS_FSM.ESPERANDO_CATEGORIA) {
    const categoriaSeleccionada = resolverCategoriaNivel1(entrada, arbol);
    if (!categoriaSeleccionada) {
      return (
        `⚠️ Opción no reconocida. Por favor responde con la letra o número de la categoría:\n\n` +
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

  if (estadoActual === ESTADOS_FSM.ESPERANDO_SUBCATEGORIA) {
    if (entradaNorm === '0' || entradaNorm === 'volver') {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.INICIO, {});
      return construirMenuPrincipal(usuario);
    }

    const categoriaActual =
      arbol.categorias?.find((c) => c.id === contexto.categoria_id) ||
      arbol.categorias?.[0];

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

    if (esOpcionOtra) {
      await actualizarSesionUsuario(usuario.id, ESTADOS_FSM.REQUIERE_ASESOR, {
        categoria_id: categoriaActual.id,
        categoria_titulo: categoriaActual.titulo,
        subcategoria_id: subcategoria.id,
        esperando_explicacion_asesor: true,
      });
      return MENSAJE_HANDOFF_OTRA;
    }

    // Pasar a recolección de variables o generar documento
    return (
      `📝 *${subcategoria.descripcion}*\n` +
      `Puedes continuar completando este trámite en la web o escribiendo tus datos.\n` +
      `Para iniciar con tus datos básicos, responde con tu *Nombre completo*:`
    );
  }

  return construirMenuPrincipal(usuario);
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
