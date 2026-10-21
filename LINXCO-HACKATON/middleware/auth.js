const crypto = require('crypto');
const { supabase } = require('../models/Solicitud');

const AUTH_SECRET = process.env.AUTH_SECRET || 'linxco-justicia-vereda-secret-2026';

const ROLES_ADMIN = {
  JEFE: 'Jefe de Consultorio',
  ASESOR: 'Asesor Jurídico',
};

const USUARIOS_SEED = [
  {
    numero_documento: '1000100100',
    contrasena_hash: 'admin123',
    nombre_completo: 'Dr. Carlos Mendoza (Jefe de Consultorio)',
    rol: ROLES_ADMIN.JEFE,
    telefono: '+573101000100',
  },
  {
    numero_documento: '1000200201',
    contrasena_hash: 'asesor123',
    nombre_completo: 'Laura Valentina Ríos (Asesora Jurídica)',
    rol: ROLES_ADMIN.ASESOR,
    telefono: '+573102000201',
  },
  {
    numero_documento: '1000200202',
    contrasena_hash: 'asesor123',
    nombre_completo: 'Andrés Felipe Morales (Asesor Jurídico)',
    rol: ROLES_ADMIN.ASESOR,
    telefono: '+573102000202',
  },
  {
    numero_documento: '1000200203',
    contrasena_hash: 'asesor123',
    nombre_completo: 'Camila Andrea Soto (Asesora Jurídica)',
    rol: ROLES_ADMIN.ASESOR,
    telefono: '+573102000203',
  },
];

function signToken(userPayload) {
  const data = Buffer.from(
    JSON.stringify({
      id: userPayload.id,
      numero_documento: userPayload.numero_documento,
      nombre_completo: userPayload.nombre_completo,
      rol: userPayload.rol,
      iat: Date.now(),
    })
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(data)
    .digest('base64url');

  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(data)
    .digest('base64url');

  if (sig !== expectedSig) return null;

  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function normalizeRol(rolRaw) {
  const norm = String(rolRaw || '').trim().toLowerCase();
  if (norm.includes('jefe') || norm === 'admin' || norm === 'administrador') {
    return ROLES_ADMIN.JEFE;
  }
  if (norm.includes('asesor') || norm.includes('estudiante')) {
    return ROLES_ADMIN.ASESOR;
  }
  return rolRaw;
}

function extractUserFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const decoded = verifyToken(token);
    if (decoded) {
      return {
        ...decoded,
        rol: normalizeRol(decoded.rol),
      };
    }
  }

  // Soporte alternativo por cabeceras explícitas para pruebas rápidas
  const headerUserId = req.headers['x-user-id'];
  const headerUserRole = req.headers['x-user-role'];
  if (headerUserId && headerUserRole) {
    return {
      id: String(headerUserId),
      rol: normalizeRol(headerUserRole),
      nombre_completo: req.headers['x-user-name'] || 'Usuario Administrativo',
    };
  }

  return null;
}

function requireAuth(req, res, next) {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({
      error: 'No autenticado. Por favor inicie sesión como Jefe de Consultorio o Asesor Jurídico.',
    });
  }
  req.user = user;
  next();
}

function requireJefe(req, res, next) {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({
      error: 'No autenticado. Se requiere sesión activa.',
    });
  }
  if (user.rol !== ROLES_ADMIN.JEFE) {
    return res.status(403).json({
      error: 'Acceso denegado. Solo el Jefe de Consultorio puede realizar esta acción.',
    });
  }
  req.user = user;
  next();
}

async function ensureAdminUsersSeeded() {
  try {
    const { data: existing } = await supabase
      .from('usuarios')
      .select('id, numero_documento, nombre_completo, rol')
      .in('rol', [ROLES_ADMIN.JEFE, ROLES_ADMIN.ASESOR]);

    if (existing && existing.length >= 2) {
      return existing;
    }

    for (const u of USUARIOS_SEED) {
      await supabase
        .from('usuarios')
        .upsert(u, { onConflict: 'numero_documento' });
    }

    const { data: seeded } = await supabase
      .from('usuarios')
      .select('id, numero_documento, nombre_completo, rol')
      .in('rol', [ROLES_ADMIN.JEFE, ROLES_ADMIN.ASESOR]);

    return seeded || [];
  } catch (err) {
    console.warn('Advertencia verificando usuarios semilla:', err.message);
    return [];
  }
}

module.exports = {
  ROLES_ADMIN,
  USUARIOS_SEED,
  signToken,
  verifyToken,
  normalizeRol,
  extractUserFromRequest,
  requireAuth,
  requireJefe,
  ensureAdminUsersSeeded,
};
