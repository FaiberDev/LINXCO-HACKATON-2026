import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ContinuationPortal } from '../views/ContinuationPortal';
import { CaseStatusView } from '../views/CaseStatusView';
import * as api from '../services/api';
import * as caseService from '../services/caseService';
import * as mockStorage from '../services/mockStorage';

describe('OfflineFallback & Network Resilience (R6)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderWithProviders = (ui: React.ReactNode, initialEntry = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CaseProvider>{ui}</CaseProvider>
      </MemoryRouter>
    );
  };

  it('TC-T1-F09-01: Header and Footer toggle offline indicators on window offline/online events', async () => {
    renderWithProviders(
      <>
        <Header />
        <Footer />
      </>
    );

    // Initially online
    expect(screen.getByText('En línea con juzgados')).toBeInTheDocument();
    expect(
      screen.queryByText(/Modo sin conexión - Cambios guardados localmente/i)
    ).not.toBeInTheDocument();

    // Trigger offline event
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Offline banner and footer indicator appear
    expect(
      screen.getByText(/Modo sin conexión.*guardados localmente/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Modo local (Sin conexión)')).toBeInTheDocument();

    // Trigger online event to recover
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Back online
    expect(screen.getByText('En línea con juzgados')).toBeInTheDocument();
    expect(
      screen.queryByText(/Modo sin conexión.*guardados localmente/i)
    ).not.toBeInTheDocument();
  });

  it('TC-T1-F09-02: caseService.getCase retrieves pre-seeded mock cases when network fails', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('Failed to fetch', 0, null, true)
    );

    // Pre-seeded case 1: CASO-SJH
    const caseSJH = await caseService.getCase('CASO-SJH');
    expect(caseSJH.codigo_sms).toBe('CASO-SJH');
    expect(caseSJH.estado).toBe('BORRADOR');
    expect(caseSJH.is_offline).toBe(true);

    // Pre-seeded case 2: CASO-GTQ
    const caseGTQ = await caseService.getCase('CASO-GTQ');
    expect(caseGTQ.codigo_sms).toBe('CASO-GTQ');
    expect(caseGTQ.estado).toBe('VALIDADO');
    expect(caseGTQ.is_offline).toBe(true);

    // Pre-seeded case 3: CASO-123
    const case123 = await caseService.getCase('CASO-123');
    expect(case123.codigo_sms).toBe('CASO-123');
    expect(case123.estado).toBe('RADICADO');
    expect(case123.is_offline).toBe(true);
  });

  it('TC-T1-F09-03: caseService.createCase creates case in localStorage with valid CASO-XXX when offline', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('Connection refused', 0, null, true)
    );

    const newCase = await caseService.createCase({
      tipo_problema: 'Derecho de petición (Vereda: Carretera dañada)',
      estado: 'BORRADOR',
      formulario_web: {
        mecanismo: 'Derecho de petición',
        categoria: 'VEREDA',
        hechos: 'Derrumbe en la vía principal.',
      },
    });

    expect(newCase.codigo_sms).toMatch(/^CASO-[A-Z0-9]{3}$/);
    expect(newCase.estado).toBe('BORRADOR');
    expect(newCase.is_offline).toBe(true);

    // Verify it is found in mockStorage
    const stored = mockStorage.findMockCase(newCase.codigo_sms);
    expect(stored).not.toBeNull();
    expect(stored?.codigo_sms).toBe(newCase.codigo_sms);
  });

  it('TC-T1-F09-04: caseService.updateCase updates case in localStorage when offline', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('Connection timeout', 0, null, true)
    );

    const updated = await caseService.updateCase('CASO-SJH', {
      estado: 'ENVIADO',
      tipo_problema: 'Salud - Despachado',
    });

    expect(updated.codigo_sms).toBe('CASO-SJH');
    expect(updated.estado).toBe('ENVIADO');
    expect(updated.tipo_problema).toBe('Salud - Despachado');
    expect(updated.is_offline).toBe(true);

    // Verify persistence in mockStorage
    const found = mockStorage.findMockCase('CASO-SJH');
    expect(found?.estado).toBe('ENVIADO');
  });

  it('TC-T2-F09-01: ContinuationPortal successfully loads seeded case when offline and navigates', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('Failed to fetch', 0, null, true)
    );

    render(
      <MemoryRouter initialEntries={['/portal']}>
        <CaseProvider>
          <Routes>
            <Route path="/portal" element={<ContinuationPortal />} />
            <Route path="/estado/:codigo" element={<div data-testid="status-target">Status Target</div>} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
    // CASO-GTQ is seeded with VALIDADO -> redirects to /estado/CASO-GTQ
    const input = screen.getByLabelText(/Ingresa tu código de trámite/i);
    fireEvent.change(input, { target: { value: 'CASO-GTQ' } });

    fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

    await waitFor(() => {
      expect(screen.getByTestId('status-target')).toBeInTheDocument();
    });
  });

  it('TC-T2-F09-02: CaseStatusView renders progression cleanly when offline using seeded case', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('Failed to fetch', 0, null, true)
    );

    render(
      <MemoryRouter initialEntries={['/estado/CASO-123']}>
        <CaseProvider>
          <Routes>
            <Route path="/estado/:codigo" element={<CaseStatusView />} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );

    // CASO-123 is seeded with status RADICADO
    expect(await screen.findByText('CASO-123')).toBeInTheDocument();
    expect(screen.getByText('RADICADO')).toBeInTheDocument();
    expect(screen.getByText('Estado actual')).toBeInTheDocument();
  });
});
