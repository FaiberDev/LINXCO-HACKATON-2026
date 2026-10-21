require('dotenv').config();
const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware CORS para clientes web (React + Vite)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-role, x-user-name'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Soporte para JSON (API REST frontend) y URL-encoded (Twilio webhook)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Conexión con Supabase usando SERVICE ROLE KEY
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---- Definición de Estados FSM (Según mermaid-diagram (3).png definitivo) ----
const INICIO = 'INICIO';
const E0 = 'ESTADO_0'; // ¿En qué te podemos ayudar hoy?
const E_APRENDER = 'ESTADO_APRENDER'; // ¿Qué quieres aprender? (1. Petición / 2. Tutela)
const E_APRENDER_ACCION = 'ESTADO_APRENDER_ACCION'; // ¿Qué deseas hacer? (1. Web / 2. Asesor / 0. Menú)
const E_TIPO_PROBLEMA = 'ESTADO_TIPO_PROBLEMA'; // ¿Qué tipo de problema tienes? (1. Salud / 2. Educación / 3. Vereda / 4. Diferente)
const E_PROB_SALUD = 'ESTADO_PROB_SALUD'; // Selecciona tu problema (Salud: 1, 2, 3)
const E_PROB_EDUCACION = 'ESTADO_PROB_EDUCACION'; // Selecciona tu problema (Educación: 1, 2, 3)
const E_PROB_VEREDA = 'ESTADO_PROB_VEREDA'; // Selecciona tu problema (Vereda: 1, 2, 3, 4)
const E_CONTINUAR = 'ESTADO_CONTINUAR'; // ¿Cómo quieres continuar? (1. Web / 2. Asesor / 0. Menú)
const E_ASESOR_AUTH = 'ESTADO_ASESOR_AUTH'; // Solicitar contacto con consultorio -> ¿Autoriza el uso de sus datos?
const E_ASESOR_DATOS = 'ESTADO_ASESOR_DATOS'; // Solicitar nombre, municipio y breve descripción -> Registrar -> Asignación -> Fin
const E_FINAL = 'ESTADO_FINAL'; // Fin / Bucle (1. Menú principal / 0. Terminar)

// ---- Catálogo Exacto de Problemas según el Diagrama Definitivo ----
const CATALOGO_PROBLEMAS = {
  SALUD: {
    '1': {
      problema: 'No me entregan medicamentos',
      mecanismo: 'Posible tutela',
      explicacion:
        'Cuando tu EPS no entrega los medicamentos recetados y se afecta tu derecho fundamental a la salud o a la vida digna, procede una *Acción de Tutela*.',
    },
    '2': {
      problema: 'No autorizan cirugía o tratamiento',
      mecanismo: 'Posible tutela',
      explicacion:
        'La negación o demora injustificada de una cirugía o tratamiento médico vulnera tu derecho fundamental a la salud. Procede una *Acción de Tutela*.',
    },
    '3': {
      problema: 'Mi familia no tiene agua potable mínima',
      mecanismo: 'Posible tutela',
      explicacion:
        'El acceso a una cantidad mínima de agua potable para consumo humano es un derecho fundamental ligado a la vida y la salud. Procede una *Acción de Tutela*.',
    },
  },
  EDUCACION: {
    '1': {
      problema: 'Faltan profesores',
      mecanismo: 'Derecho de petición',
      explicacion:
        'Puedes exigir formalmente a la Secretaría de Educación información y soluciones sobre el nombramiento de docentes mediante un *Derecho de Petición*.',
    },
    '2': {
      problema: 'No tenemos transporte escolar',
      mecanismo: 'Derecho de petición',
      explicacion:
        'Puedes solicitar formalmente a la Alcaldía o Secretaría de Educación la habilitación de rutas de transporte escolar mediante un *Derecho de Petición*.',
    },
    '3': {
      problema: 'Mi hijo no tiene cupo escolar',
      mecanismo: 'Posible tutela',
      explicacion:
        'La educación de niños, niñas y adolescentes es un derecho fundamental de aplicación inmediata. Ante la negación de cupo escolar procede una *Acción de Tutela*.',
    },
  },
  VEREDA: {
    '1': {
      problema: 'Carretera dañada',
      mecanismo: 'Derecho de petición',
      explicacion:
        'Para solicitar el mantenimiento, reparación o informe de intervención sobre vías veredales ante la Alcaldía o Gobernación, procede un *Derecho de Petición*.',
    },
    '2': {
      problema: 'No avanza titulación de tierras',
      mecanismo: 'Derecho de petición',
      explicacion:
        'Para exigir información oficial sobre el estado de tu expediente y el avance del trámite ante la Agencia Nacional de Tierras o entidad competente, procede un *Derecho de Petición*.',
    },
    '3': {
      problema: 'Vereda sin energía eléctrica',
      mecanismo: 'Derecho de petición',
      explicacion:
        'Para reclamar formalmente ante la empresa prestadora o la Alcaldía por la falta o falla del servicio de energía eléctrica, procede un *Derecho de Petición*.',
    },
    '4': {
      problema: 'No responden mi derecho de petición',
      mecanismo: 'Posible tutela',
      explicacion:
        'Cuando una entidad vence el plazo legal sin responder tu Derecho de Petición, vulnera tu derecho fundamental de petición y puedes exigir respuesta con una *Acción de Tutela*.',
    },
  },
};

// ---- Mensajes Exactos del Diagrama ----
const MSG = {
  [E0]:
    '🏛️ *Inicio: Justicia para Todos*\n' +
    'Bienvenido a *Justicia en tu Vereda*.\n\n' +
    '¿En qué te podemos ayudar hoy?\n' +
    '1. Quiero aprender de mis derechos\n' +
    '2. Quiero proteger mis derechos\n' +
    '3. Quiero hablar con un asesor jurídico',

  [E_APRENDER]:
    '📚 *¿Qué quieres aprender?*\n\n' +
    '1. Qué es un derecho de petición\n' +
    '2. Qué es una tutela\n\n' +
    '0. Volver al menú principal',

  EXP_PETICION:
    '📄 *Explicación breve del derecho de petición*\n' +
    'El Derecho de Petición sirve para solicitar respetuosamente información, copias de documentos o reclamar la solución de un problema ante entidades públicas o empresas de servicios. Deben responderte en los plazos de ley.\n\n' +
    '¿Qué deseas hacer?\n' +
    '1. Ir a la página web\n' +
    '2. Hablar con un asesor jurídico\n' +
    '0. Volver al menú principal',

  EXP_TUTELA:
    '📜 *Explicación breve de la tutela*\n' +
    'La Acción de Tutela es un mecanismo gratuito e inmediato para pedirle a un juez que proteja tus derechos fundamentales (como salud, vida, agua mínima o educación) cuando están siendo vulnerados o en peligro urgente.\n\n' +
    '¿Qué deseas hacer?\n' +
    '1. Ir a la página web\n' +
    '2. Hablar con un asesor jurídico\n' +
    '0. Volver al menú principal',

  [E_TIPO_PROBLEMA]:
    '🛡️ *Quiero proteger mis derechos*\n' +
    '¿Qué tipo de problema tienes?\n\n' +
    '1. Salud y bienestar\n' +
    '2. Educación\n' +
    '3. Mi vereda y trámites\n' +
    '4. Mi problema es diferente\n\n' +
    '0. Volver al menú principal',

  [E_PROB_SALUD]:
    '🏥 *Salud y bienestar*\n' +
    'Selecciona tu problema:\n\n' +
    '1. No me entregan medicamentos\n' +
    '2. No autorizan cirugía o tratamiento\n' +
    '3. Mi familia no tiene agua potable mínima\n\n' +
    '0. Volver atrás',

  [E_PROB_EDUCACION]:
    '🎓 *Educación*\n' +
    'Selecciona tu problema:\n\n' +
    '1. Faltan profesores\n' +
    '2. No tenemos transporte escolar\n' +
    '3. Mi hijo no tiene cupo escolar\n\n' +
    '0. Volver atrás',

  [E_PROB_VEREDA]:
    '🌾 *Mi vereda y trámites*\n' +
    'Selecciona tu problema:\n\n' +
    '1. Carretera dañada\n' +
    '2. No avanza titulación de tierras\n' +
    '3. Vereda sin energía eléctrica\n' +
    '4. No responden mi derecho de petición\n\n' +
    '0. Volver atrás',

  [E_ASESOR_AUTH]:
    '👨‍⚖️ *Solicitar contacto con consultorio jurídico*\n' +
    'Te conectaremos con un consultorio jurídico participante para brindarte acompañamiento gratuito y supervisado.\n\n' +
    '¿Autoriza el uso de sus datos de contacto?\n' +
    '1. Sí\n' +
    '2. No (Volver al inicio)',

  [E_ASESOR_DATOS]:
    '📝 *Datos para tu solicitud*\n' +
    'Por favor escribe en un solo mensaje tu:\n' +
    '• *Nombre completo*\n' +
    '• *Municipio / Vereda*\n' +
    '• *Breve descripción de tu problema*\n\n' +
    '*(Ejemplo: Juan Pérez, Vereda El Roble - Popayán, no me entregan un medicamento)*\n\n' +
    '0. Volver atrás',

  [E_FINAL]:
    '¿Necesitas ayuda con algo más? Responde:\n' +
    '1. Volver al menú principal\n' +
    '0. Terminar',

  DESPEDIDA:
    'Gracias por comunicarte con *Justicia para Todos - Justicia en tu Vereda*. Tu sesión ha finalizado. Cuando nos necesites nuevamente, escríbenos cualquier mensaje. ¡Buen día! 👋',
};

function construirMensajeOrientacion(infoCategoria) {
  const partes = (infoCategoria || 'Derecho de petición|Consulta general|').split('|');
  const mecanismo = partes[0] || 'Derecho de petición';
  const problema = partes[1] || '';
  const explicacion = partes[2] || `Tu caso se orienta mediante: *${mecanismo}*.`;

  return (
    `⚖️ *Orientación: ${mecanismo.toLowerCase()}*\n` +
    `📌 *Caso:* ${problema}\n\n` +
    `${explicacion}\n\n` +
    `¿Cómo quieres continuar?\n` +
    `1. Ir a la página web\n` +
    `2. Hablar con un asesor jurídico\n` +
    `0. Volver al menú principal`
  );
}

// ---- Helpers de Persistencia en Supabase ----
async function getOrCreateUsuario(telefono) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, telefono, estado_conversacion, categoria_temporal')
    .eq('telefono', telefono)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: insErr } = await supabase
    .from('usuarios')
    .insert({ telefono, estado_conversacion: INICIO, categoria_temporal: null })
    .select('id, telefono, estado_conversacion, categoria_temporal')
    .single();

  if (insErr) throw insErr;
  return created;
}

async function setEstado(id, estado, categoria_temporal) {
  const patch = { estado_conversacion: estado };
  if (categoria_temporal !== undefined) {
    patch.categoria_temporal = categoria_temporal;
  }
  const { error } = await supabase.from('usuarios').update(patch).eq('id', id);
  if (error) throw error;
}

// Genera e inserta el código único (CASO-XXX) en la tabla 'casos'
async function generarCodigoCaso(usuarioId, tipoTramite, extras = null) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let intento = 0; intento < 5; intento++) {
    let suffix = '';
    for (let i = 0; i < 3; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const codigo = `CASO-${suffix}`;

    const payload = {
      usuario_id: usuarioId,
      codigo_sms: codigo,
      tipo_problema: tipoTramite,
    };
    if (extras) {
      payload.formulario_web = extras;
    }

    const { error } = await supabase.from('casos').insert(payload);

    if (!error) return codigo;
    if (error.code !== '23505') throw error;
  }
  throw new Error('No fue posible generar un código único');
}

// Registra un caso en la tabla 'casos' con código único (CASO-XXX) y retorna el registro completo
async function registrarCaso({ usuarioId = null, tipoProblema, formularioWeb = null, estado = 'BORRADOR' }) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const problema =
    tipoProblema ||
    (formularioWeb && (formularioWeb.tipo_tramite || formularioWeb.mecanismo)) ||
    'Trámite ciudadano';

  for (let intento = 0; intento < 5; intento++) {
    let suffix = '';
    for (let i = 0; i < 3; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const codigo = `CASO-${suffix}`;

    const payload = {
      usuario_id: usuarioId || null,
      codigo_sms: codigo,
      tipo_problema: problema,
      estado: estado || 'BORRADOR',
    };
    if (formularioWeb) {
      payload.formulario_web = formularioWeb;
    }

    const { data, error } = await supabase
      .from('casos')
      .insert(payload)
      .select('id, usuario_id, asesor_asignado_id, codigo_sms, tipo_problema, estado, formulario_web, created_at')
      .single();

    if (!error && data) return data;
    if (error && error.code !== '23505') throw error;
  }
  throw new Error('No fue posible generar un código único de caso');
}

function esSaludoOInicio(texto) {
  const norm = texto.toLowerCase().trim();
  return [
    'hola',
    'buenas',
    'buenos dias',
    'buenas tardes',
    'buenas noches',
    'inicio',
    'menu',
    'menú',
    'ayuda',
    'empezar',
    'start',
    'hi',
  ].includes(norm);
}

const {
  ESTADOS_FSM,
  MENSAJE_HANDOFF_OTRA,
  cargarArbolDecision,
  procesarMensajeArbolDecision,
} = require('./services/whatsappStateMachine');

// ---- Máquina de Estados Finita (FSM): Árbol de Decisión de 2 Niveles + Recolección Dinámica ----
const ESTADOS_LEGACY = new Set([
  E0,
  E_APRENDER,
  E_APRENDER_ACCION,
  E_TIPO_PROBLEMA,
  E_PROB_SALUD,
  E_PROB_EDUCACION,
  E_PROB_VEREDA,
  E_CONTINUAR,
  E_ASESOR_AUTH,
  E_ASESOR_DATOS,
  E_FINAL,
]);

async function procesarMensaje(usuario, texto, customTreeConfig = null) {
  const estadoActual = usuario.estado_conversacion || INICIO;
  // Mantiene compatibilidad con pruebas legacy si el usuario fue preconfigurado en ESTADO_0..ESTADO_FINAL
  if (!customTreeConfig && ESTADOS_LEGACY.has(estadoActual)) {
    return procesarMensajeLegacy(usuario, texto);
  }
  return procesarMensajeArbolDecision(usuario, texto, customTreeConfig);
}

async function procesarMensajeLegacy(usuario, texto) {
  const estado_actual = usuario.estado_conversacion || INICIO;
  const entrada = (texto || '').trim();

  // Primer mensaje o sesión reiniciada: nunca muestra "Opción no válida"
  if (estado_actual === INICIO) {
    await setEstado(usuario.id, E0, null);
    return MSG[E0];
  }

  // Si está en el menú principal y envía un saludo, responde el menú sin error
  if (estado_actual === E0 && esSaludoOInicio(entrada)) {
    return MSG[E0];
  }

  switch (estado_actual) {
    // 1. MENÚ PRINCIPAL: ¿En qué te podemos ayudar hoy?
    case E0:
      switch (entrada) {
        case '1':
          await setEstado(usuario.id, E_APRENDER, null);
          return MSG[E_APRENDER];
        case '2':
          await setEstado(usuario.id, E_TIPO_PROBLEMA, null);
          return MSG[E_TIPO_PROBLEMA];
        case '3':
          await setEstado(usuario.id, E_ASESOR_AUTH, 'Asesoría jurídica|Solicitud directa desde menú principal');
          return MSG[E_ASESOR_AUTH];
        case '0':
          await setEstado(usuario.id, INICIO, null);
          return MSG.DESPEDIDA;
        default:
          return `⚠️ Opción no válida.\n\n${MSG[E0]}`;
      }

    // 2. ¿QUÉ QUIERES APRENDER? (1. Qué es un derecho de petición / 2. Qué es una tutela)
    case E_APRENDER:
      switch (entrada) {
        case '1':
          await setEstado(usuario.id, E_APRENDER_ACCION, 'PETICION');
          return MSG.EXP_PETICION;
        case '2':
          await setEstado(usuario.id, E_APRENDER_ACCION, 'TUTELA');
          return MSG.EXP_TUTELA;
        case '0':
          await setEstado(usuario.id, E0, null);
          return MSG[E0];
        default:
          return `⚠️ Opción no válida.\n\n${MSG[E_APRENDER]}`;
      }

    // 3. ¿QUÉ DESEAS HACER? (Tras explicación educativa: 1. Ir a la página web / 2. Hablar con un asesor / 0. Volver al menú principal)
    case E_APRENDER_ACCION: {
      const esTutela = usuario.categoria_temporal === 'TUTELA';
      const nombreTema = esTutela ? 'Acción de Tutela' : 'Derecho de Petición';
      const slug = esTutela ? 'tutela' : 'derecho-de-peticion';

      switch (entrada) {
        case '1':
          await setEstado(usuario.id, E_FINAL, null);
          return (
            `🌐 *Ir a la página web (${nombreTema})*\n` +
            `Conoce las guías, videos interactivos y formatos en nuestra plataforma:\n` +
            `https://justiciaentuvereda.gov.co/aprender/${slug}\n\n` +
            `¿Necesitas ayuda con algo más? Responde:\n` +
            `1. Volver al menú principal\n` +
            `0. Terminar`
          );
        case '2':
          await setEstado(usuario.id, E_ASESOR_AUTH, `Orientación educativa|Duda sobre ${nombreTema}`);
          return MSG[E_ASESOR_AUTH];
        case '0':
        case '3':
          await setEstado(usuario.id, E0, null);
          return MSG[E0];
        default: {
          const msgActual = esTutela ? MSG.EXP_TUTELA : MSG.EXP_PETICION;
          return `⚠️ Opción no válida.\n\n${msgActual}`;
        }
      }
    }

    // 4. ¿QUÉ TIPO DE PROBLEMA TIENES? (1. Salud y bienestar / 2. Educación / 3. Mi vereda y trámites / 4. Mi problema es diferente)
    case E_TIPO_PROBLEMA:
      switch (entrada) {
        case '1':
          await setEstado(usuario.id, E_PROB_SALUD, null);
          return MSG[E_PROB_SALUD];
        case '2':
          await setEstado(usuario.id, E_PROB_EDUCACION, null);
          return MSG[E_PROB_EDUCACION];
        case '3':
          await setEstado(usuario.id, E_PROB_VEREDA, null);
          return MSG[E_PROB_VEREDA];
        case '4':
          // 4. Mi problema es diferente -> Remitir a asesor jurídico -> Solicitar contacto con consultorio jurídico
          await setEstado(usuario.id, E_ASESOR_AUTH, 'Otro problema|Mi problema es diferente');
          return (
            `ℹ️ *Remitir a asesor jurídico*\n` +
            `Como tu problema requiere una evaluación específica, te pondremos en contacto con un asesor.\n\n` +
            `${MSG[E_ASESOR_AUTH]}`
          );
        case '0':
          await setEstado(usuario.id, E0, null);
          return MSG[E0];
        default:
          return `⚠️ Opción no válida.\n\n${MSG[E_TIPO_PROBLEMA]}`;
      }

    // 5A. SELECCIONA TU PROBLEMA: SALUD Y BIENESTAR
    case E_PROB_SALUD: {
      if (entrada === '0') {
        await setEstado(usuario.id, E_TIPO_PROBLEMA, null);
        return MSG[E_TIPO_PROBLEMA];
      }
      const item = CATALOGO_PROBLEMAS.SALUD[entrada];
      if (!item) {
        return `⚠️ Opción no válida.\n\n${MSG[E_PROB_SALUD]}`;
      }
      const info = `${item.mecanismo}|Salud: ${item.problema}|${item.explicacion}`;
      await setEstado(usuario.id, E_CONTINUAR, info);
      return construirMensajeOrientacion(info);
    }

    // 5B. SELECCIONA TU PROBLEMA: EDUCACIÓN
    case E_PROB_EDUCACION: {
      if (entrada === '0') {
        await setEstado(usuario.id, E_TIPO_PROBLEMA, null);
        return MSG[E_TIPO_PROBLEMA];
      }
      const item = CATALOGO_PROBLEMAS.EDUCACION[entrada];
      if (!item) {
        return `⚠️ Opción no válida.\n\n${MSG[E_PROB_EDUCACION]}`;
      }
      const info = `${item.mecanismo}|Educación: ${item.problema}|${item.explicacion}`;
      await setEstado(usuario.id, E_CONTINUAR, info);
      return construirMensajeOrientacion(info);
    }

    // 5C. SELECCIONA TU PROBLEMA: MI VEREDA Y TRÁMITES
    case E_PROB_VEREDA: {
      if (entrada === '0') {
        await setEstado(usuario.id, E_TIPO_PROBLEMA, null);
        return MSG[E_TIPO_PROBLEMA];
      }
      const item = CATALOGO_PROBLEMAS.VEREDA[entrada];
      if (!item) {
        return `⚠️ Opción no válida.\n\n${MSG[E_PROB_VEREDA]}`;
      }
      const info = `${item.mecanismo}|Vereda: ${item.problema}|${item.explicacion}`;
      await setEstado(usuario.id, E_CONTINUAR, info);
      return construirMensajeOrientacion(info);
    }

    // 6. ¿CÓMO QUIERES CONTINUAR? (1. Ir a la página web / 2. Hablar con un asesor jurídico / 0. Volver al menú principal)
    case E_CONTINUAR: {
      if (entrada === '0' || entrada === '3') {
        await setEstado(usuario.id, E0, null);
        return MSG[E0];
      }
      if (entrada === '1') {
        const partes = (usuario.categoria_temporal || 'Derecho de petición|Caso general').split('|');
        const mecanismo = partes[0];
        const problema = partes[1] || '';
        const tipoTramite = problema ? `${mecanismo} (${problema})` : mecanismo;

        const codigo = await generarCodigoCaso(usuario.id, tipoTramite, {
          modalidad: 'pagina_web',
          mecanismo,
          problema,
        });

        await setEstado(usuario.id, E_FINAL, null);
        return (
          `🌐 *Ir a la página web*\n` +
          `Tu trámite de *${mecanismo}* ha sido registrado.\n\n` +
          `📋 *Problema:* ${problema}\n` +
          `🔑 *Tu código de seguimiento es:* *${codigo}*\n` +
          `🔗 *Ingresa a la web con tu código:*\n` +
          `https://justiciaentuvereda.gov.co/casos/${codigo}\n\n` +
          `¿Necesitas ayuda con algo más? Responde:\n` +
          `1. Volver al menú principal\n` +
          `0. Terminar`
        );
      }
      if (entrada === '2') {
        await setEstado(usuario.id, E_ASESOR_AUTH, usuario.categoria_temporal);
        return MSG[E_ASESOR_AUTH];
      }
      return `⚠️ Opción no válida.\n\n${construirMensajeOrientacion(usuario.categoria_temporal)}`;
    }

    // 7. SOLICITAR CONTACTO CON CONSULTORIO JURÍDICO -> ¿Autoriza el uso de sus datos de contacto?
    case E_ASESOR_AUTH: {
      if (entrada === '1' || entrada.toLowerCase() === 'si' || entrada.toLowerCase() === 'sí') {
        await setEstado(usuario.id, E_ASESOR_DATOS, usuario.categoria_temporal);
        return MSG[E_ASESOR_DATOS];
      }
      if (entrada === '2' || entrada === '0' || entrada.toLowerCase() === 'no') {
        // Según diagrama: "No" regresa a "Inicio: Justicia para Todos" (Menú Principal)
        await setEstado(usuario.id, E0, null);
        return MSG[E0];
      }
      return `⚠️ Opción no válida.\n\n${MSG[E_ASESOR_AUTH]}`;
    }

    // 8. SOLICITAR NOMBRE, MUNICIPIO Y BREVE DESCRIPCIÓN -> Registrar solicitud -> Asignación a consultorio jurídico -> Fin
    case E_ASESOR_DATOS: {
      if (entrada === '0') {
        await setEstado(usuario.id, E_ASESOR_AUTH, usuario.categoria_temporal);
        return MSG[E_ASESOR_AUTH];
      }

      if (entrada.length < 3) {
        return `⚠️ Por favor ingresa tu nombre, municipio y una breve descripción (o responde 0 para volver).\n\n${MSG[E_ASESOR_DATOS]}`;
      }

      const partes = (usuario.categoria_temporal || 'Asesoría jurídica|Solicitud de contacto').split('|');
      const mecanismo = partes[0];
      const problema = partes[1] || 'Consulta general';
      const tipoTramite = `Consultorio Jurídico - ${mecanismo} (${problema})`;

      const codigo = await generarCodigoCaso(usuario.id, tipoTramite, {
        modalidad: 'consultorio_juridico',
        autorizacion_datos: true,
        datos_usuario_descripcion: entrada,
        mecanismo,
        problema,
      });

      await setEstado(usuario.id, E_FINAL, null);
      return (
        `✅ *Solicitud registrada*\n` +
        `🏛️ *Asignación a consultorio jurídico completada*\n\n` +
        `📋 *Categoría:* ${mecanismo} (${problema})\n` +
        `👤 *Datos registrados:* ${entrada}\n` +
        `🔑 *Tu código de seguimiento es:* *${codigo}*\n\n` +
        `Un asesor del consultorio jurídico asignado se pondrá en contacto contigo a este número.\n\n` +
        `¿Necesitas ayuda con algo más? Responde:\n` +
        `1. Volver al menú principal\n` +
        `0. Terminar`
      );
    }

    // 9. FIN / RESOLUCIÓN DEL CICLO
    case E_FINAL:
      switch (entrada) {
        case '1':
          await setEstado(usuario.id, E0, null);
          return MSG[E0];
        case '0':
          await setEstado(usuario.id, INICIO, null);
          return MSG.DESPEDIDA;
        default:
          return `⚠️ Opción no válida.\n\n${MSG[E_FINAL]}`;
      }

    default:
      await setEstado(usuario.id, E0, null);
      return MSG[E0];
  }
}

// ---- Endpoint Webhook de Twilio ----
app.post('/sms', async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const rawFrom = req.body.From || '';
    const telefono = rawFrom.replace(/^whatsapp:/, '').trim();
    const texto = req.body.Body || '';

    const usuario = await getOrCreateUsuario(telefono);
    const respuestaTexto = await procesarMensaje(usuario, texto);

    twiml.message(respuestaTexto);
  } catch (err) {
    console.error('Error procesando webhook de Twilio:', err);
    twiml.message('Ocurrió un error al procesar tu solicitud. Intenta nuevamente.');
  }

  res.type('text/xml').send(twiml.toString());
});

const path = require('path');
const fs = require('fs');
const { Solicitud, formatSolicitudRecord } = require('./models/Solicitud');
const {
  generarDocumentoDesdePlantilla,
  listarPlantillasDisponibles,
  DOCUMENTOS_DIR,
} = require('./services/templateService');
const {
  ROLES_ADMIN,
  signToken,
  normalizeRol,
  extractUserFromRequest,
  requireAuth,
  requireJefe,
  ensureAdminUsersSeeded,
} = require('./middleware/auth');

// ---- API REST: Health Check ----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'linxco-backend',
    timestamp: new Date().toISOString(),
  });
});

const ESTADOS_VALIDOS = ['BORRADOR', 'VALIDADO', 'ENVIADO', 'RADICADO', 'RESPUESTA RECIBIDA'];

// ---- API REST: Autenticación (Login Jefe y Asesor) ----
app.post('/api/auth/login', async (req, res) => {
  try {
    await ensureAdminUsersSeeded();
    const {
      numero_documento,
      identificador,
      usuario_id,
      password,
      contrasena,
    } = req.body || {};

    const docOrId = String(numero_documento || identificador || '').trim();
    const pass = String(password || contrasena || '').trim();

    let query = supabase
      .from('usuarios')
      .select('id, numero_documento, nombre_completo, rol, contrasena_hash, telefono');

    if (usuario_id) {
      query = query.eq('id', usuario_id);
    } else if (docOrId) {
      query = query.eq('numero_documento', docOrId);
    } else {
      return res.status(400).json({
        error: 'Por favor ingresa tu número de documento y contraseña.',
      });
    }

    const { data: user, error } = await query.maybeSingle();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    // Si se envió contraseña y el usuario tiene contrasena_hash configurada, validar
    if (!usuario_id && user.contrasena_hash && pass !== user.contrasena_hash) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    const rolNormalizado = normalizeRol(user.rol);
    if (
      rolNormalizado !== ROLES_ADMIN.JEFE &&
      rolNormalizado !== ROLES_ADMIN.ASESOR
    ) {
      return res.status(403).json({
        error: 'Este usuario no posee un rol administrativo (Jefe de Consultorio o Asesor Jurídico).',
      });
    }

    const userPayload = {
      id: user.id,
      numero_documento: user.numero_documento,
      nombre_completo: user.nombre_completo || `Usuario ${user.numero_documento}`,
      rol: rolNormalizado,
    };

    const token = signToken(userPayload);
    const redirectTo =
      rolNormalizado === ROLES_ADMIN.JEFE ? '/admin/jefe' : '/admin/asesor';

    res.json({
      success: true,
      token,
      user: userPayload,
      redirectTo,
    });
  } catch (err) {
    console.error('Error en POST /api/auth/login:', err);
    res.status(500).json({ error: 'Error interno al iniciar sesión' });
  }
});

// ---- API REST: Listar usuarios administrativos / asesores para dropdown y login rápido ----
app.get('/api/auth/usuarios-demo', async (req, res) => {
  try {
    const usuarios = await ensureAdminUsersSeeded();
    res.json({
      success: true,
      usuarios,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios administrativos' });
  }
});

app.get('/api/asesores', async (req, res) => {
  try {
    await ensureAdminUsersSeeded();
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, numero_documento, nombre_completo, rol, telefono')
      .eq('rol', ROLES_ADMIN.ASESOR)
      .order('nombre_completo', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      success: true,
      asesores: data || [],
    });
  } catch (err) {
    console.error('Error en GET /api/asesores:', err);
    res.status(500).json({ error: 'Error al consultar asesores jurídicos' });
  }
});

// ---- API REST: Listar plantillas disponibles ----
app.get('/api/plantillas', (req, res) => {
  res.json({
    plantillas: listarPlantillasDisponibles(),
  });
});

// ---- API REST: Descargar documento .docx generado ----
app.get(['/api/documentos/:filename', '/documentos/:filename'], (req, res) => {
  const safeName = path.basename(req.params.filename || '');
  const fullPath = path.join(DOCUMENTOS_DIR, safeName);
  if (!safeName || !fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Documento no encontrado' });
  }
  res.download(fullPath, safeName);
});

// ---- API REST: Listar todas las solicitudes / casos (Con protección de aislamiento por rol) ----
async function handleListSolicitudes(req, res) {
  try {
    const currentUser = extractUserFromRequest(req);
    let { estado, asesor_asignado_id } = req.query || {};

    // Seguridad: Si quien consulta es un 'Asesor Jurídico', SOLO puede ver sus propios casos asignados
    if (currentUser && currentUser.rol === ROLES_ADMIN.ASESOR) {
      if (asesor_asignado_id && asesor_asignado_id !== currentUser.id) {
        return res.status(403).json({
          error: 'Acceso denegado. Un Asesor Jurídico no puede consultar los casos de otro Asesor.',
        });
      }
      asesor_asignado_id = currentUser.id;
    }

    const lista = await Solicitud.findAll({ estado, asesor_asignado_id });
    res.json({
      success: true,
      total: lista.length,
      solicitudes: lista,
      casos: lista,
    });
  } catch (err) {
    console.error('Error al listar solicitudes/casos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
app.get('/api/solicitudes', handleListSolicitudes);
app.get('/api/casos', handleListSolicitudes);

// ---- API REST: Asignar solicitud a un Asesor Jurídico (Exclusivo Jefe de Consultorio) ----
app.put('/api/solicitudes/:id/asignar', requireJefe, async (req, res) => {
  try {
    const idOrCodigo = req.params.id;
    const { asesor_id, asesor_asignado_id } = req.body || {};
    const targetAsesorId = asesor_id || asesor_asignado_id;

    if (!targetAsesorId) {
      return res.status(400).json({
        error: 'Debe seleccionar un Asesor Jurídico válido (asesor_id).',
      });
    }

    // Verificar que el asesor exista en la BD
    const { data: asesor, error: errAsesor } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, rol')
      .eq('id', targetAsesorId)
      .maybeSingle();

    if (errAsesor) {
      return res.status(500).json({ error: errAsesor.message });
    }
    if (!asesor) {
      return res.status(404).json({ error: 'El Asesor Jurídico seleccionado no existe.' });
    }

    const existente = await Solicitud.findByIdOrCodigo(idOrCodigo);
    if (!existente) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const actualizada = await Solicitud.updateByIdOrCodigo(idOrCodigo, {
      asesor_asignado_id: targetAsesorId,
      formulario_web: {
        ...(existente.formulario_web || {}),
        asesor_asignado_nombre: asesor.nombre_completo,
        fecha_asignacion: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      mensaje: `Caso ${actualizada.codigo_sms} asignado a ${asesor.nombre_completo}`,
      solicitud: actualizada,
      caso: actualizada,
      asesor,
    });
  } catch (err) {
    console.error('Error en PUT /api/solicitudes/:id/asignar:', err);
    res.status(500).json({ error: 'Error interno al asignar el caso' });
  }
});

// ---- API REST: Cambiar estado del caso (Protegido para que el Asesor solo modifique sus casos) ----
app.put('/api/solicitudes/:id/estado', requireAuth, async (req, res) => {
  try {
    const idOrCodigo = req.params.id;
    const { estado } = req.body || {};

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
      });
    }

    const existente = await Solicitud.findByIdOrCodigo(idOrCodigo);
    if (!existente) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    // Seguridad: Un Asesor Jurídico solo puede modificar casos asignados a él mismo
    if (
      req.user.rol === ROLES_ADMIN.ASESOR &&
      existente.asesor_asignado_id !== req.user.id
    ) {
      return res.status(403).json({
        error: 'Acceso denegado. No puedes modificar un caso que no te ha sido asignado.',
      });
    }

    const actualizada = await Solicitud.updateByIdOrCodigo(idOrCodigo, {
      estado,
    });

    res.json({
      success: true,
      mensaje: `Estado del caso ${actualizada.codigo_sms} actualizado a ${estado}`,
      solicitud: actualizada,
      caso: actualizada,
    });
  } catch (err) {
    console.error('Error en PUT /api/solicitudes/:id/estado:', err);
    res.status(500).json({ error: 'Error interno al cambiar el estado del caso' });
  }
});

// ---- API REST: Endpoint de Continuación (GET /api/solicitudes/:codigo y /api/casos/:codigo) ----
async function handleGetPorCodigo(req, res) {
  try {
    const rawCodigo = req.params.codigo;
    const codigo = (rawCodigo || '').trim().toUpperCase();
    if (!codigo) {
      return res.status(400).json({ error: 'El código de seguimiento es requerido' });
    }

    const registro = await Solicitud.findByIdOrCodigo(codigo);

    if (!registro) {
      return res.status(404).json({ error: 'Caso no encontrado', codigo });
    }

    const currentUser = extractUserFromRequest(req);
    if (
      currentUser &&
      currentUser.rol === ROLES_ADMIN.ASESOR &&
      registro.asesor_asignado_id !== currentUser.id
    ) {
      return res.status(403).json({
        error: 'Acceso denegado. Este caso no está asignado a tu perfil de Asesor Jurídico.',
      });
    }

    res.json(registro);
  } catch (err) {
    console.error('Error en GET por código:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
app.get('/api/solicitudes/:codigo', handleGetPorCodigo);
app.get('/api/casos/:codigo', handleGetPorCodigo);

// ---- API REST: Crear nueva solicitud / caso (Wizard / Asesor) ----
async function handleCreateSolicitud(req, res) {
  try {
    const {
      tipo_problema,
      tipo_tramite,
      formulario_web,
      datos_ciudadano,
      estado,
      usuario_id,
      asesor_asignado_id,
      generar_documento,
      plantilla,
    } = req.body || {};

    if (req.body && req.body.estado !== undefined) {
      if (!ESTADOS_VALIDOS.includes(req.body.estado)) {
        return res.status(400).json({
          error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
        });
      }
    }

    const datosJson = formulario_web !== undefined ? formulario_web : datos_ciudadano || null;
    const tipoProblema =
      tipo_problema ||
      tipo_tramite ||
      (datosJson && (datosJson.tipo_tramite || datosJson.mecanismo)) ||
      'Trámite ciudadano';

    let casoCreado = await Solicitud.create({
      usuarioId: usuario_id || null,
      asesorAsignadoId: asesor_asignado_id || null,
      tipoTramite: tipoProblema,
      datosCiudadano: datosJson,
      estado: estado || 'BORRADOR',
    });

    // Si tiene datos de formulario ciudadano (o se solicita explícitamente), genera automáticamente el .docx
    const tieneDatosFormulario =
      generar_documento === true ||
      (datosJson &&
        typeof datosJson === 'object' &&
        (datosJson.ciudadano || datosJson.hechos || datosJson.peticion || datosJson.nombre_completo));

    if (tieneDatosFormulario && generar_documento !== false) {
      try {
        const docInfo = generarDocumentoDesdePlantilla({
          codigo: casoCreado.codigo_sms,
          datosCiudadano: datosJson || {},
          tipoTramite: tipoProblema,
          plantilla,
        });
        casoCreado = await Solicitud.updateByCodigo(casoCreado.codigo_sms, {
          ruta_documento: docInfo.rutaDocumento,
        });
      } catch (docErr) {
        console.warn('Advertencia generando documento automático en POST:', docErr.message);
      }
    }

    res.status(201).json({
      success: true,
      codigo: casoCreado.codigo_sms,
      caso: casoCreado,
      solicitud: casoCreado,
    });
  } catch (err) {
    console.error('Error en POST casos/solicitudes:', err);
    res.status(500).json({ error: err.message || 'Error al registrar el caso' });
  }
}
app.post('/api/solicitudes', handleCreateSolicitud);
app.post('/api/casos', handleCreateSolicitud);

// ---- API REST: Actualizar caso / solicitud existente ----
async function handleUpdateSolicitud(req, res) {
  try {
    const rawCodigo = req.params.codigo;
    const codigo = (rawCodigo || '').trim().toUpperCase();
    if (!codigo) {
      return res.status(400).json({ error: 'El código de seguimiento es requerido' });
    }

    if (req.body && req.body.estado !== undefined) {
      if (!ESTADOS_VALIDOS.includes(req.body.estado)) {
        return res.status(400).json({
          error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
        });
      }
    }

    const rawTipo =
      req.body && req.body.tipo_problema !== undefined
        ? req.body.tipo_problema
        : req.body && req.body.tipo_tramite;

    if (req.body && (req.body.tipo_problema !== undefined || req.body.tipo_tramite !== undefined)) {
      if (
        rawTipo === null ||
        rawTipo === '' ||
        (typeof rawTipo === 'string' && rawTipo.trim() === '')
      ) {
        return res.status(400).json({ error: 'El tipo_problema no puede ser nulo o vacío' });
      }
    }

    const patch = {};
    if (req.body && (req.body.formulario_web !== undefined || req.body.datos_ciudadano !== undefined)) {
      patch.formulario_web =
        req.body.formulario_web !== undefined ? req.body.formulario_web : req.body.datos_ciudadano;
    }
    if (req.body && req.body.estado !== undefined) {
      patch.estado = req.body.estado;
    }
    if (rawTipo !== undefined) {
      patch.tipo_problema = rawTipo;
    }
    if (req.body && req.body.asesor_asignado_id !== undefined) {
      patch.asesor_asignado_id = req.body.asesor_asignado_id;
    }
    if (req.body && req.body.ruta_documento !== undefined) {
      patch.ruta_documento = req.body.ruta_documento;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar' });
    }

    const currentUser = extractUserFromRequest(req);
    if (currentUser && currentUser.rol === ROLES_ADMIN.ASESOR) {
      if (patch.asesor_asignado_id !== undefined) {
        return res.status(403).json({
          error: 'Acceso denegado. Solo el Jefe de Consultorio puede asignar casos.',
        });
      }
      const previo = await Solicitud.findByIdOrCodigo(codigo);
      if (previo && previo.asesor_asignado_id !== currentUser.id) {
        return res.status(403).json({
          error: 'Acceso denegado. No puedes modificar un caso asignado a otro Asesor.',
        });
      }
    }

    let actualizado = await Solicitud.updateByIdOrCodigo(codigo, patch);

    if (!actualizado) {
      return res.status(404).json({ error: 'Caso no encontrado para actualizar', codigo });
    }

    // Si se actualizaron los datos del formulario ciudadano, regenera el documento .docx automáticamente
    const formObj = patch.formulario_web;
    if (
      formObj &&
      typeof formObj === 'object' &&
      (formObj.ciudadano || formObj.hechos || formObj.peticion || formObj.nombre_completo) &&
      req.body.generar_documento !== false
    ) {
      try {
        const docInfo = generarDocumentoDesdePlantilla({
          codigo: actualizado.codigo_sms,
          datosCiudadano: formObj,
          tipoTramite: actualizado.tipo_problema,
          plantilla: req.body.plantilla,
        });
        actualizado = await Solicitud.updateByCodigo(codigo, {
          ruta_documento: docInfo.rutaDocumento,
        });
      } catch (docErr) {
        console.warn('Advertencia generando documento en PUT:', docErr.message);
      }
    }

    res.json({ success: true, caso: actualizado, solicitud: actualizado });
  } catch (err) {
    console.error('Error en PUT casos/solicitudes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
app.put('/api/solicitudes/:codigo', handleUpdateSolicitud);
app.put('/api/casos/:codigo', handleUpdateSolicitud);

// ---- API REST: Motor de Plantillas (POST /api/generar-documento) ----
app.post('/api/generar-documento', async (req, res) => {
  try {
    const body = req.body || {};
    const rawCodigo = body.codigo || body.codigo_seguimiento || body.codigo_sms || '';
    const codigoLimpio = rawCodigo.trim().toUpperCase();

    // Extraer datos del ciudadano ya sea desde datos_ciudadano, formulario_web o el body plano
    const datosCiudadano =
      body.datos_ciudadano ||
      body.formulario_web ||
      (Object.keys(body).length > 0 ? body : {});

    const tipoTramite =
      body.tipo_tramite ||
      body.tipo_problema ||
      datosCiudadano.tipo_tramite ||
      datosCiudadano.mecanismo ||
      'Derecho de petición';

    // 1. Verificar si ya existe la solicitud en BD (por ejemplo creada en WhatsApp)
    let solicitudExistente = null;
    if (codigoLimpio) {
      solicitudExistente = await Solicitud.findByCodigo(codigoLimpio);
    }

    const codigoFinal = solicitudExistente
      ? solicitudExistente.codigo_sms
      : codigoLimpio || undefined;

    // Si no existe en la BD todavía, la creamos en estado BORRADOR
    if (!solicitudExistente) {
      solicitudExistente = await Solicitud.create({
        usuarioId: body.usuario_id || null,
        asesorAsignadoId: body.asesor_asignado_id || null,
        tipoTramite,
        datosCiudadano,
        estado: 'BORRADOR',
        codigoFijo: codigoFinal,
      });
    }

    // Combinar datos previos de WhatsApp con los nuevos datos del formulario web
    const datosCombinados = {
      ...(solicitudExistente.formulario_web || {}),
      ...(typeof datosCiudadano === 'object' ? datosCiudadano : {}),
    };

    // 2. Generar el documento .docx desde la plantilla local usando docxtemplater + pizzip
    const resultadoDoc = generarDocumentoDesdePlantilla({
      codigo: solicitudExistente.codigo_sms,
      datosCiudadano: datosCombinados,
      tipoTramite: tipoTramite || solicitudExistente.tipo_problema,
      plantilla: body.plantilla || datosCombinados.plantilla,
    });

    // 3. Actualizar la solicitud en la BD pasando automáticamente al estado 'BORRADOR'
    //    y guardando la ruta del documento generado
    const solicitudActualizada = await Solicitud.updateByCodigo(
      solicitudExistente.codigo_sms,
      {
        estado: 'BORRADOR',
        tipo_problema: tipoTramite || solicitudExistente.tipo_problema,
        ruta_documento: resultadoDoc.rutaDocumento,
        formulario_web: {
          ...datosCombinados,
          ruta_documento: resultadoDoc.rutaDocumento,
          plantilla_usada: resultadoDoc.plantillaUsada,
          fecha_generacion_documento: new Date().toISOString(),
        },
      }
    );

    res.status(200).json({
      success: true,
      mensaje: 'Documento generado exitosamente y estado actualizado a BORRADOR',
      codigo: solicitudActualizada.codigo_sms,
      estado: solicitudActualizada.estado,
      plantilla_usada: resultadoDoc.plantillaUsada,
      archivo_generado: resultadoDoc.filename,
      ruta_documento: resultadoDoc.rutaDocumento,
      solicitud: solicitudActualizada,
      caso: solicitudActualizada,
    });
  } catch (err) {
    console.error('Error en POST /api/generar-documento:', err);
    res.status(500).json({
      error: err.message || 'Error al generar el documento desde la plantilla',
    });
  }
});

// ---- API REST: Consultar Árbol de Decisión de 2 Niveles y Simular Bot ----
app.get('/api/arbol-decision', (req, res) => {
  try {
    res.json(cargarArbolDecision());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { botManager } = require('./services/whatsappBotManager');

// ---- Rutas de Control de Encendido/Apagado del Bot de WhatsApp ----
app.get('/api/bot/status', (req, res) => {
  res.json({ success: true, ...botManager.getStatus() });
});

app.post('/api/bot/start', async (req, res) => {
  try {
    const status = await botManager.start({
      getOrCreateUsuario,
      procesarMensaje,
    });
    res.json({ success: true, mensaje: 'Iniciando bot de WhatsApp', ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/stop', async (req, res) => {
  try {
    const status = await botManager.stop();
    res.json({ success: true, mensaje: 'Bot de WhatsApp detenido', ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/logout', async (req, res) => {
  try {
    const status = await botManager.logout();
    res.json({ success: true, mensaje: 'Sesión de WhatsApp cerrada y credenciales eliminadas', ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/mensaje', async (req, res) => {
  try {
    const { telefono = '+573001112233', texto = '', arbol_config = null } = req.body || {};
    const usuario = await getOrCreateUsuario(telefono);
    const respuesta = await procesarMensajeArbolDecision(usuario, texto, arbol_config);
    const usuarioActualizado = await getOrCreateUsuario(telefono);

    res.json({
      success: true,
      telefono,
      estado_conversacion: usuarioActualizado.estado_conversacion,
      respuesta_bot: respuesta,
      respuestas_automatizadas_detenidas: respuesta === null,
      documento_generado: usuario.ultimoDocumentoGenerado || null,
    });
  } catch (err) {
    console.error('Error en POST /api/bot/mensaje:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = {
  app,
  getOrCreateUsuario,
  procesarMensaje,
  procesarMensajeArbolDecision,
  ESTADOS_FSM,
  MENSAJE_HANDOFF_OTRA,
  cargarArbolDecision,
  generarCodigoCaso,
  registrarCaso,
  supabase,
  ESTADOS_VALIDOS,
  Solicitud,
  generarDocumentoDesdePlantilla,
  botManager,
};

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor API y Webhook escuchando en puerto ${PORT}`));
}
