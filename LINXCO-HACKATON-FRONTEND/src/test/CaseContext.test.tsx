import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CaseProvider, useCase } from '../context/CaseContext';
import * as caseService from '../services/caseService';

describe('CaseContext & State Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CaseProvider>{children}</CaseProvider>
  );

  it('initializes with null activeCode and default wizard draft', () => {
    const { result } = renderHook(() => useCase(), { wrapper });
    expect(result.current.activeCode).toBeNull();
    expect(result.current.activeCase).toBeNull();
    expect(result.current.wizardDraft.mecanismo).toBe('Derecho de petición');
  });

  it('updates and persists active tracking code to localStorage', () => {
    const { result } = renderHook(() => useCase(), { wrapper });

    act(() => {
      result.current.setActiveCode('caso-sjh');
    });

    expect(result.current.activeCode).toBe('CASO-SJH');
    expect(localStorage.getItem('justicia_active_code')).toBe('CASO-SJH');
  });

  it('updates and persists wizard draft to localStorage', () => {
    const { result } = renderHook(() => useCase(), { wrapper });

    act(() => {
      result.current.updateWizardDraft({
        categoria: 'EDUCACION',
        problema: 'Faltan profesores',
        ciudadano: {
          nombre_completo: 'Carlos Gómez',
        },
      });
    });

    expect(result.current.wizardDraft.categoria).toBe('EDUCACION');
    expect(result.current.wizardDraft.ciudadano?.nombre_completo).toBe('Carlos Gómez');

    const storedDraft = JSON.parse(localStorage.getItem('justicia_wizard_draft') || '{}');
    expect(storedDraft.categoria).toBe('EDUCACION');
    expect(storedDraft.ciudadano?.nombre_completo).toBe('Carlos Gómez');
  });

  it('loads case by code and synchronizes activeCase and draft', async () => {
    vi.spyOn(caseService, 'getCase').mockResolvedValue({
      id: 'local-123',
      codigo_sms: 'CASO-SJH',
      tipo_problema: 'Salud - Citas',
      estado: 'BORRADOR',
      formulario_web: {
        mecanismo: 'Acción de tutela',
        categoria: 'SALUD',
        problema: 'No me entregan medicamentos',
      },
    });

    const { result } = renderHook(() => useCase(), { wrapper });

    await act(async () => {
      await result.current.loadCaseByCode('CASO-SJH');
    });

    expect(result.current.activeCode).toBe('CASO-SJH');
    expect(result.current.activeCase?.tipo_problema).toBe('Salud - Citas');
    expect(result.current.wizardDraft.mecanismo).toBe('Acción de tutela');
  });

  it('resetSession clears code, case, draft, and localStorage items', () => {
    const { result } = renderHook(() => useCase(), { wrapper });

    act(() => {
      result.current.setActiveCode('CASO-SJH');
      result.current.updateWizardDraft({ hechos: 'Hechos guardados' });
    });

    expect(result.current.activeCode).toBe('CASO-SJH');

    act(() => {
      result.current.resetSession();
    });

    expect(result.current.activeCode).toBeNull();
    expect(result.current.activeCase).toBeNull();
    expect(localStorage.getItem('justicia_active_code')).toBeNull();
  });
});
