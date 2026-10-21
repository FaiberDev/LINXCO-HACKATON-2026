import { Caso, CreateCasePayload, UpdateCasePayload } from '../types';

const MOCK_STORAGE_KEY = 'justicia_mock_casos';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOfflineCaseCode(): string {
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return `CASO-${suffix}`;
}

const SEED_CASES: Record<string, Caso> = {
  'CASO-SJH': {
    id: '60b195a7-f17e-49ee-93a5-4767852e4e26',
    codigo_sms: 'CASO-SJH',
    tipo_problema: 'Salud - Citas',
    estado: 'BORRADOR',
    formulario_web: {
      categoria: 'SALUD',
      mecanismo: 'Acción de tutela',
      problema: 'No me entregan medicamentos',
      ciudadano: {
        nombre_completo: 'María Rodríguez',
        tipo_documento: 'CC',
        numero_documento: '34567890',
        telefono: '3109876543',
        departamento: 'Cauca',
        municipio: 'Popayán',
        vereda_o_barrio: 'Vereda El Sendero',
        direccion_notificacion: 'Finca La Esperanza',
      },
      entidad: {
        nombre: 'Nueva EPS',
        correo_o_direccion: 'notificaciones@nuevaeps.com.co',
      },
      hechos:
        'Desde hace 3 meses el médico ordenó examen urgente y medicamentos vitales que la EPS se niega a suministrar.',
      peticion:
        'Que se autorice y programe de manera inmediata la entrega de medicamentos y cita especializada.',
      peticiones:
        'Que se autorice y programe de manera inmediata la entrega de medicamentos y cita especializada.',
    },
    created_at: '2026-10-20T21:50:06.407Z',
    is_offline: true,
  },
  'CASO-GTQ': {
    id: '69425dc2-e5ad-4ba9-a148-8a2068d7ea70',
    codigo_sms: 'CASO-GTQ',
    tipo_problema: 'Acción de Tutela',
    estado: 'VALIDADO',
    formulario_web: {
      categoria: 'SALUD',
      mecanismo: 'Acción de tutela',
      problema: 'No autorizan cirugía o tratamiento',
      ciudadano: {
        nombre_completo: 'José Albeiro Cuetia',
        tipo_documento: 'CC',
        numero_documento: '1061234567',
        telefono: '3124567890',
        departamento: 'Cauca',
        municipio: 'Santander de Quilichao',
        vereda_o_barrio: 'Vereda San Antonio',
      },
      entidad: {
        nombre: 'Asmet Salud EPS',
      },
      hechos:
        'Requiero cirugía urgente de reemplazo de cadera prescrita por médico especialista que ha sido demorada injustificadamente.',
      peticion:
        'Autorización inmediata y programación de la intervención quirúrgica.',
      peticiones:
        'Autorización inmediata y programación de la intervención quirúrgica.',
    },
    created_at: '2026-10-20T22:15:00.000Z',
    is_offline: true,
  },
  'CASO-123': {
    id: '7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e',
    codigo_sms: 'CASO-123',
    tipo_problema: 'Derecho de petición (Educación: Faltan profesores)',
    estado: 'RADICADO',
    formulario_web: {
      categoria: 'EDUCACION',
      mecanismo: 'Derecho de petición',
      problema: 'Faltan profesores',
      ciudadano: {
        nombre_completo: 'Carlos Gómez',
        tipo_documento: 'CC',
        numero_documento: '1053456789',
        telefono: '3201234567',
        departamento: 'Cundinamarca',
        municipio: 'Fusagasugá',
        vereda_o_barrio: 'Vereda La Aguadita',
      },
      entidad: {
        nombre: 'Secretaría de Educación Municipal',
      },
      hechos:
        'En la escuela rural de La Aguadita faltan dos docentes de básica primaria desde inicio de año.',
      peticion:
        'Nombramiento y asignación inmediata de los docentes requeridos para la comunidad.',
      peticiones:
        'Nombramiento y asignación inmediata de los docentes requeridos para la comunidad.',
    },
    created_at: '2026-10-20T23:00:00.000Z',
    is_offline: true,
  },
};

export function getMockStorage(): Record<string, Caso> {
  if (typeof window === 'undefined') {
    return { ...SEED_CASES };
  }

  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(SEED_CASES));
      return { ...SEED_CASES };
    }
    const parsed = JSON.parse(raw);
    // Ensure seed cases exist if user cleared them partially
    return { ...SEED_CASES, ...parsed };
  } catch (err) {
    console.warn('Error reading mock storage from localStorage:', err);
    return { ...SEED_CASES };
  }
}

export function saveMockStorage(cases: Record<string, Caso>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(cases));
  } catch (err) {
    console.warn('Error saving mock storage to localStorage:', err);
  }
}

export function findMockCase(codigo: string): Caso | null {
  if (!codigo) return null;
  const cleanCode = codigo.trim().toUpperCase();
  const cases = getMockStorage();

  // Exact or normalized match
  if (cases[cleanCode]) {
    return cases[cleanCode];
  }

  // Look through values for case-insensitive match
  for (const c of Object.values(cases)) {
    if (c.codigo_sms && c.codigo_sms.trim().toUpperCase() === cleanCode) {
      return c;
    }
  }

  return null;
}

export function saveOrUpdateMockCase(caso: Caso): Caso {
  const cases = getMockStorage();
  const cleanCode = caso.codigo_sms.trim().toUpperCase();
  const updated: Caso = {
    ...caso,
    codigo_sms: cleanCode,
    is_offline: true,
  };
  cases[cleanCode] = updated;
  saveMockStorage(cases);
  return updated;
}

export function createMockCase(payload: CreateCasePayload): Caso {
  const cases = getMockStorage();
  let code = generateOfflineCaseCode();
  while (cases[code]) {
    code = generateOfflineCaseCode();
  }

  const newCase: Caso = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    codigo_sms: code,
    tipo_problema: payload.tipo_problema || 'Trámite legal',
    estado: payload.estado || 'BORRADOR',
    formulario_web: payload.formulario_web || {},
    created_at: new Date().toISOString(),
    is_offline: true,
  };

  cases[code] = newCase;
  saveMockStorage(cases);
  return newCase;
}

export function updateMockCase(codigo: string, patch: UpdateCasePayload): Caso | null {
  const existing = findMockCase(codigo);
  if (!existing) return null;

  const updated: Caso = {
    ...existing,
    ...(patch.tipo_problema ? { tipo_problema: patch.tipo_problema } : {}),
    ...(patch.estado ? { estado: patch.estado } : {}),
    formulario_web: {
      ...(existing.formulario_web || {}),
      ...(patch.formulario_web || {}),
    },
    is_offline: true,
  };

  return saveOrUpdateMockCase(updated);
}
