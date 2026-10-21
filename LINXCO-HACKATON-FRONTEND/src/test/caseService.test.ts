import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as caseService from '../services/caseService';
import * as mockStorage from '../services/mockStorage';
import * as api from '../services/api';

describe('caseService & Offline Resilient Fallback Layer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getCase', () => {
    it('returns pre-seeded case (CASO-SJH) from offline mockStorage when backend is down', async () => {
      // Mock network failure
      vi.spyOn(api, 'apiFetch').mockRejectedValue(
        new api.ApiError('Failed to fetch', 0, null, true)
      );

      const caso = await caseService.getCase('CASO-SJH');
      expect(caso).toBeDefined();
      expect(caso.codigo_sms).toBe('CASO-SJH');
      expect(caso.estado).toBe('BORRADOR');
      expect(caso.tipo_problema).toContain('Salud');
      expect(caso.is_offline).toBe(true);
    });

    it('performs case-insensitive lookup (caso-gtq -> CASO-GTQ)', async () => {
      vi.spyOn(api, 'apiFetch').mockRejectedValue(
        new api.ApiError('Failed to fetch', 0, null, true)
      );

      const caso = await caseService.getCase('caso-gtq');
      expect(caso).toBeDefined();
      expect(caso.codigo_sms).toBe('CASO-GTQ');
      expect(caso.estado).toBe('VALIDADO');
    });

    it('returns server case when backend is online and reachable', async () => {
      const mockServerCase = {
        id: 'server-uuid-1',
        codigo_sms: 'CASO-ONLINE',
        tipo_problema: 'Derecho de petición',
        estado: 'ENVIADO' as const,
        formulario_web: { hecho: 'Servidor respondió' },
        created_at: new Date().toISOString(),
      };

      vi.spyOn(api, 'apiFetch').mockResolvedValue({
        success: true,
        data: mockServerCase,
      });

      const caso = await caseService.getCase('CASO-ONLINE');
      expect(caso.codigo_sms).toBe('CASO-ONLINE');
      expect(caso.is_offline).toBe(false);
      expect(caso.estado).toBe('ENVIADO');
    });

    it('throws error when case does not exist anywhere', async () => {
      vi.spyOn(api, 'apiFetch').mockRejectedValue(
        new api.ApiError('Caso no encontrado', 404, null, false)
      );

      await expect(caseService.getCase('CASO-INEXISTENTE')).rejects.toThrow();
    });
  });

  describe('createCase', () => {
    it('falls back to mockStorage when backend is offline, generating a valid CASO-XXX code', async () => {
      vi.spyOn(api, 'apiFetch').mockRejectedValue(
        new api.ApiError('Network connection refused', 0, null, true)
      );

      const payload = {
        tipo_problema: 'Acción de tutela (Salud: No me entregan medicamentos)',
        estado: 'BORRADOR' as const,
        formulario_web: {
          mecanismo: 'Acción de tutela',
          categoria: 'SALUD',
          problema: 'No me entregan medicamentos',
          ciudadano: {
            nombre_completo: 'Rosa María Gómez',
            numero_documento: '52123456',
            telefono: '3119876543',
          },
        },
      };

      const result = await caseService.createCase(payload);
      expect(result).toBeDefined();
      expect(result.codigo_sms).toMatch(/^CASO-[A-Z0-9]{3}$/);
      expect(result.estado).toBe('BORRADOR');
      expect(result.is_offline).toBe(true);
      expect(result.formulario_web?.mecanismo).toBe('Acción de tutela');

      // Verify it was stored in local mockStorage
      const foundInMock = mockStorage.findMockCase(result.codigo_sms);
      expect(foundInMock).not.toBeNull();
      expect(foundInMock?.codigo_sms).toBe(result.codigo_sms);
    });
  });

  describe('updateCase', () => {
    it('updates existing case status and fields in mockStorage when backend is offline', async () => {
      vi.spyOn(api, 'apiFetch').mockRejectedValue(
        new api.ApiError('Network timeout', 0, null, true)
      );

      const updated = await caseService.updateCase('CASO-SJH', {
        estado: 'VALIDADO',
        tipo_problema: 'Salud - Actualizado',
      });

      expect(updated).toBeDefined();
      expect(updated.codigo_sms).toBe('CASO-SJH');
      expect(updated.estado).toBe('VALIDADO');
      expect(updated.tipo_problema).toBe('Salud - Actualizado');
      expect(updated.is_offline).toBe(true);

      // Verify persistence
      const checked = mockStorage.findMockCase('CASO-SJH');
      expect(checked?.estado).toBe('VALIDADO');
    });
  });
});
