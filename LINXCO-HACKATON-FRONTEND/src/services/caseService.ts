import { Caso, CreateCasePayload, UpdateCasePayload } from '../types';
import { apiFetch, ApiError } from './api';
import {
  findMockCase,
  createMockCase,
  updateMockCase,
  saveOrUpdateMockCase,
} from './mockStorage';

/**
 * Normalizes API response to return the inner Caso object
 */
function extractCaseData(response: unknown): Caso {
  if (!response || typeof response !== 'object') {
    throw new Error('Respuesta del servidor no válida');
  }

  const obj = response as Record<string, unknown>;

  if (obj.data && typeof obj.data === 'object') {
    return obj.data as Caso;
  }

  if (obj.caso && typeof obj.caso === 'object') {
    return obj.caso as Caso;
  }

  if ('codigo_sms' in obj) {
    return obj as unknown as Caso;
  }

  throw new Error('No se encontró información del caso en la respuesta');
}

/**
 * Retrieves a case by tracking code.
 * Falls back to offline mockStorage if backend is unreachable or returns 404 for seeded/local cases.
 */
export async function getCase(codigo: string): Promise<Caso> {
  if (!codigo) {
    throw new Error('El código de seguimiento es requerido');
  }

  const cleanCode = codigo.trim().toUpperCase();

  try {
    const rawResponse = await apiFetch<unknown>(`/casos/${encodeURIComponent(cleanCode)}`);
    const serverCase = extractCaseData(rawResponse);
    saveOrUpdateMockCase({ ...serverCase, is_offline: false });
    return { ...serverCase, is_offline: false };
  } catch (err) {
    const apiErr = err as ApiError;

    // Solo caer a mockStorage local si realmente hubo fallo de red o error de servidor (500+)
    const isNetworkOrDown = apiErr.isNetworkError || apiErr.status === 0 || apiErr.status >= 500;

    if (isNetworkOrDown) {
      const localCase = findMockCase(cleanCode);
      if (localCase) {
        console.warn(`[caseService] Fallback to local storage for code: ${cleanCode}`);
        return { ...localCase, is_offline: true };
      }

      throw new Error(
        `Sin conexión al servidor (puerto 3000) y no se encontró el caso ${cleanCode} en este dispositivo.`
      );
    }

    // Re-throw 404 or backend business errors directamente sin marcar offline falso
    throw err;
  }
}

/**
 * Creates a new legal case.
 * Transparently falls back to mockStorage if backend is offline/unreachable.
 */
export async function createCase(payload: CreateCasePayload): Promise<Caso> {
  try {
    const rawResponse = await apiFetch<unknown>('/casos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const serverCase = extractCaseData(rawResponse);
    saveOrUpdateMockCase({ ...serverCase, is_offline: false });
    return { ...serverCase, is_offline: false };
  } catch (err) {
    const apiErr = err as ApiError;

    // If network dropped, server down, or gateway error (500+) -> offline fallback
    if (apiErr.isNetworkError || apiErr.status === 0 || apiErr.status >= 500) {
      console.warn('[caseService] Backend unavailable. Creating case in offline mockStorage.');
      const localCase = createMockCase(payload);
      return localCase;
    }

    // Re-throw 400 validation errors from backend
    throw err;
  }
}

/**
 * Updates an existing case.
 * Transparently updates local storage if backend is offline.
 */
export async function updateCase(codigo: string, patch: UpdateCasePayload): Promise<Caso> {
  if (!codigo) {
    throw new Error('El código del caso es requerido para actualizar');
  }

  const cleanCode = codigo.trim().toUpperCase();

  try {
    const rawResponse = await apiFetch<unknown>(`/casos/${encodeURIComponent(cleanCode)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });

    const serverCase = extractCaseData(rawResponse);
    saveOrUpdateMockCase({ ...serverCase, is_offline: false });
    return { ...serverCase, is_offline: false };
  } catch (err) {
    const apiErr = err as ApiError;

    if (apiErr.isNetworkError || apiErr.status === 0 || apiErr.status >= 500) {
      console.warn(`[caseService] Backend unavailable. Updating case ${cleanCode} locally.`);
      const updatedLocal = updateMockCase(cleanCode, patch);
      if (updatedLocal) {
        return updatedLocal;
      }
    }

    throw err;
  }
}
