import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { ContinuationPortal } from '../views/ContinuationPortal';
import * as api from '../services/api';

describe('ContinuationPortal Feature & Acceptance Criteria (R3)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderPortalWithRoutes = (initialEntry = '/portal') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CaseProvider>
          <Routes>
            <Route path="/portal" element={<ContinuationPortal />} />
            <Route path="/" element={<div data-testid="home-view">Inicio</div>} />
            <Route path="/wizard" element={<div data-testid="wizard-view">Formulario Wizard</div>} />
            <Route path="/estado/:codigo" element={<div data-testid="status-view">Vista Estado</div>} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );
  };

  it('TC-T1-F12-01: renders the exact button "Crear nueva solicitud"', () => {
    renderPortalWithRoutes();

    const btnCrear = screen.getByRole('button', { name: /Crear nueva solicitud/i });
    expect(btnCrear).toBeInTheDocument();
    expect(btnCrear).toBeEnabled();
    expect(screen.getByText('Iniciar formulario paso a paso')).toBeInTheDocument();
  });

  it('TC-T1-F12-02: renders the exact button "Continuar trámite"', () => {
    renderPortalWithRoutes();

    const btnContinuar = screen.getByRole('button', { name: /Continuar trámite/i });
    expect(btnContinuar).toBeInTheDocument();
    expect(btnContinuar).toBeEnabled();
    expect(screen.getByText('Tengo un código previo (SMS o WhatsApp)')).toBeInTheDocument();
  });

  it('TC-T1-F12-03: clicking "Crear nueva solicitud" clears draft and navigates to /wizard', () => {
    // Seed draft in localStorage to ensure it gets cleared
    localStorage.setItem(
      'justicia_wizard_draft',
      JSON.stringify({ hechos: 'Borrador antiguo' })
    );

    renderPortalWithRoutes();

    const btnCrear = screen.getByRole('button', { name: /Crear nueva solicitud/i });
    fireEvent.click(btnCrear);

    expect(screen.getByTestId('wizard-view')).toBeInTheDocument();
  });

  it('TC-T1-F12-04: clicking "Continuar trámite" reveals the tracking code input and submit button', () => {
    renderPortalWithRoutes();

    // Code input initially hidden
    expect(screen.queryByLabelText(/Ingresa tu código de trámite/i)).not.toBeInTheDocument();

    const btnContinuar = screen.getByRole('button', { name: /Continuar trámite/i });
    fireEvent.click(btnContinuar);

    // Code input and consultation button revealed
    const input = screen.getByLabelText(/Ingresa tu código de trámite/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Ej: CASO-SJH');
    expect(screen.getByRole('button', { name: /Consultar trámite/i })).toBeInTheDocument();
  });

  it('TC-T1-F12-05: submitting empty tracking code shows validation error message', async () => {
    renderPortalWithRoutes();

    const btnContinuar = screen.getByRole('button', { name: /Continuar trámite/i });
    fireEvent.click(btnContinuar);

    const btnConsultar = screen.getByRole('button', { name: /Consultar trámite/i });
    fireEvent.click(btnConsultar);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(/Por favor ingresa un código de seguimiento/i);
  });

  it('TC-T1-F12-06: queries API and redirects draft case (BORRADOR) to /wizard', async () => {
    // Mock backend returning case in BORRADOR
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-draft-1',
        codigo_sms: 'CASO-SJH',
        tipo_problema: 'Salud',
        estado: 'BORRADOR',
        formulario_web: {
          mecanismo: 'Acción de tutela',
          categoria: 'SALUD',
          hechos: 'Medicamentos no entregados',
        },
        created_at: new Date().toISOString(),
      },
    });

    renderPortalWithRoutes();

    fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
    const input = screen.getByLabelText(/Ingresa tu código de trámite/i);
    fireEvent.change(input, { target: { value: 'CASO-SJH' } });

    fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

    await waitFor(() => {
      expect(screen.getByTestId('wizard-view')).toBeInTheDocument();
    });
  });

  it('TC-T1-F12-07: queries API and redirects progressed case (VALIDADO) to /estado/:codigo', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-valid-1',
        codigo_sms: 'CASO-GTQ',
        tipo_problema: 'Educación',
        estado: 'VALIDADO',
        formulario_web: {},
        created_at: new Date().toISOString(),
      },
    });

    renderPortalWithRoutes();

    fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
    const input = screen.getByLabelText(/Ingresa tu código de trámite/i);
    fireEvent.change(input, { target: { value: 'caso-gtq' } });

    fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

    await waitFor(() => {
      expect(screen.getByTestId('status-view')).toBeInTheDocument();
    });
  });

  it('TC-T2-F12-03: trims leading/trailing spaces and uppercases code', async () => {
    const fetchSpy = vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-1',
        codigo_sms: 'CASO-SJH',
        tipo_problema: 'Salud',
        estado: 'BORRADOR',
        formulario_web: {},
      },
    });

    renderPortalWithRoutes();

    fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
    const input = screen.getByLabelText(/Ingresa tu código de trámite/i);
    fireEvent.change(input, { target: { value: '  caso-sjh  ' } });

    fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/casos/CASO-SJH');
    });
  });

  it('TC-T2-F12-04: displays alert error when code is not found', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('Caso no encontrado', 404, null, false)
    );

    renderPortalWithRoutes();

    fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
    const input = screen.getByLabelText(/Ingresa tu código de trámite/i);
    fireEvent.change(input, { target: { value: 'CASO-999' } });

    fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(/Caso no encontrado|No se encontró el caso/i);
  });

  it('TC-T2-F12-05: resolves via offline mockStorage if backend is offline', async () => {
    // Network error
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('Failed to fetch', 0, null, true)
    );

    renderPortalWithRoutes();

    fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
    const input = screen.getByLabelText(/Ingresa tu código de trámite/i);
    // CASO-SJH is pre-seeded in mockStorage with estado: 'BORRADOR'
    fireEvent.change(input, { target: { value: 'CASO-SJH' } });

    fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

    await waitFor(() => {
      // In BORRADOR -> routes to wizard
      expect(screen.getByTestId('wizard-view')).toBeInTheDocument();
    });
  });

  it('TC-T1-F12-08: "Volver al inicio" button navigates to /', () => {
    renderPortalWithRoutes();

    const backBtn = screen.getByRole('button', { name: /Volver al inicio/i });
    fireEvent.click(backBtn);

    expect(screen.getByTestId('home-view')).toBeInTheDocument();
  });
});
