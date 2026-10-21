import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { CaseStatusView } from '../views/CaseStatusView';
import * as api from '../services/api';
import { EstadoCaso } from '../types';

describe('CaseStatus Feature & Acceptance Criteria (R5)', () => {
  const EXACT_STATUS_LABELS: EstadoCaso[] = [
    'BORRADOR',
    'VALIDADO',
    'ENVIADO',
    'RADICADO',
    'RESPUESTA RECIBIDA',
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderStatusWithRoutes = (initialEntry = '/estado/CASO-SJH') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CaseProvider>
          <Routes>
            <Route path="/estado" element={<CaseStatusView />} />
            <Route path="/estado/:codigo" element={<CaseStatusView />} />
            <Route path="/" element={<div data-testid="home-view">Inicio</div>} />
            <Route path="/wizard" element={<div data-testid="wizard-view">Wizard Form</div>} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );
  };

  it('TC-T1-F15-01: renders all 5 exact status labels in the timeline', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-case-1',
        codigo_sms: 'CASO-SJH',
        tipo_problema: 'Salud - Citas prioritarias',
        estado: 'BORRADOR',
        formulario_web: {},
        created_at: '2026-10-21T01:00:00Z',
      },
    });

    renderStatusWithRoutes('/estado/CASO-SJH');

    for (const label of EXACT_STATUS_LABELS) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
  });

  it('TC-T1-F15-02: marks active status and completed stages for ENVIADO', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-case-2',
        codigo_sms: 'CASO-SJH',
        tipo_problema: 'Acción de tutela (Salud: Medicamentos)',
        estado: 'ENVIADO',
        formulario_web: {},
        created_at: '2026-10-21T01:00:00Z',
      },
    });

    renderStatusWithRoutes('/estado/CASO-SJH');

    expect(await screen.findByText('ENVIADO')).toBeInTheDocument();

    // Verify "Estado actual" badge is rendered next to current status
    expect(screen.getByText('Estado actual')).toBeInTheDocument();

    // Verify case metadata card
    expect(screen.getByText('CASO-SJH')).toBeInTheDocument();
    expect(screen.getByText('Acción de tutela (Salud: Medicamentos)')).toBeInTheDocument();
  });

  it('TC-T1-F15-03: renders "Continuar editando solicitud" button only when in BORRADOR', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-case-draft',
        codigo_sms: 'CASO-SJH',
        tipo_problema: 'Derecho de petición (Educación)',
        estado: 'BORRADOR',
        formulario_web: {},
        created_at: '2026-10-21T01:00:00Z',
      },
    });

    renderStatusWithRoutes('/estado/CASO-SJH');

    const editBtn = await screen.findByRole('button', {
      name: /Continuar editando solicitud/i,
    });
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(screen.getByTestId('wizard-view')).toBeInTheDocument();
  });

  it('TC-T1-F15-04: does not display "Continuar editando solicitud" when status is VALIDADO or beyond', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-case-val',
        codigo_sms: 'CASO-GTQ',
        tipo_problema: 'Tutela',
        estado: 'VALIDADO',
        formulario_web: {},
        created_at: '2026-10-21T01:00:00Z',
      },
    });

    renderStatusWithRoutes('/estado/CASO-GTQ');

    await screen.findByText('VALIDADO');
    expect(
      screen.queryByRole('button', { name: /Continuar editando solicitud/i })
    ).not.toBeInTheDocument();
  });

  it('TC-T1-F15-05: allows searching for a new code via search bar', async () => {
    const fetchSpy = vi.spyOn(api, 'apiFetch').mockImplementation(async (url) => {
      if (url === '/casos/CASO-NEW') {
        return {
          success: true,
          data: {
            id: 'uuid-new',
            codigo_sms: 'CASO-NEW',
            tipo_problema: 'Vereda - Vías',
            estado: 'RADICADO',
            formulario_web: {},
            created_at: '2026-10-21T01:00:00Z',
          },
        };
      }
      return {
        success: true,
        data: {
          id: 'uuid-init',
          codigo_sms: 'CASO-SJH',
          tipo_problema: 'Salud',
          estado: 'BORRADOR',
          formulario_web: {},
        },
      };
    });

    renderStatusWithRoutes('/estado/CASO-SJH');

    await screen.findByText('CASO-SJH');

    const searchInput = screen.getByPlaceholderText(/Código \(Ej: CASO-SJH\)/i);
    fireEvent.change(searchInput, { target: { value: 'CASO-NEW' } });

    const searchBtn = screen.getByRole('button', { name: /Buscar/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/casos/CASO-NEW');
    });

    expect(await screen.findByText('CASO-NEW')).toBeInTheDocument();
    expect(screen.getByText('Vereda - Vías')).toBeInTheDocument();
  });

  it('TC-T2-F15-01: handles case lookup error with alert message', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('No encontramos el caso solicitado', 404, null, false)
    );

    renderStatusWithRoutes('/estado/CASO-NOTFOUND');

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(/No encontramos el caso solicitado|No se pudo cargar el caso/i);
  });

  it('TC-T2-F15-03: renders RESPUESTA RECIBIDA as final active step with all 5 labels', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-case-resp',
        codigo_sms: 'CASO-FIN',
        tipo_problema: 'Tutela - Fallo favorable',
        estado: 'RESPUESTA RECIBIDA',
        formulario_web: {},
        created_at: '2026-10-21T01:00:00Z',
      },
    });

    renderStatusWithRoutes('/estado/CASO-FIN');

    expect(await screen.findByText('RESPUESTA RECIBIDA')).toBeInTheDocument();
    expect(screen.getByText('Estado actual')).toBeInTheDocument();
    expect(
      screen.getByText(/Respuesta formal emitida por la entidad o fallo del juez/i)
    ).toBeInTheDocument();
  });

  it('TC-T1-F15-06: "Volver al inicio" button navigates to /', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-1',
        codigo_sms: 'CASO-SJH',
        tipo_problema: 'Salud',
        estado: 'BORRADOR',
        formulario_web: {},
      },
    });

    renderStatusWithRoutes('/estado/CASO-SJH');

    await screen.findByText('CASO-SJH');

    const backBtn = screen.getByRole('button', { name: /Volver al inicio/i });
    fireEvent.click(backBtn);

    expect(screen.getByTestId('home-view')).toBeInTheDocument();
  });
});
