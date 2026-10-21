import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { LegalClinicView } from '../views/LegalClinicView';
import * as api from '../services/api';

describe('LegalClinic Feature & Acceptance Criteria (R2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderClinicWithRoutes = (initialEntry = '/asesor') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CaseProvider>
          <Routes>
            <Route path="/asesor" element={<LegalClinicView />} />
            <Route path="/" element={<div data-testid="home-view">Inicio</div>} />
            <Route path="/estado/:codigo" element={<div data-testid="status-view">Estado</div>} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );
  };

  it('TC-T1-F17-01: renders the advisor request form with data authorization checkbox', () => {
    renderClinicWithRoutes();

    expect(screen.getByText('Habla con un asesor')).toBeInTheDocument();
    expect(
      screen.getByText(/Recibe asesoría personalizada del equipo del Consultorio Jurídico/i)
    ).toBeInTheDocument();

    // Mandatory form fields
    expect(screen.getByLabelText(/Nombre completo \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono de contacto \/ WhatsApp \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Municipio \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vereda o sector/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Describe brevemente tu problema legal \*/i)).toBeInTheDocument();

    // Data authorization consent checkbox
    const checkbox = screen.getByRole('checkbox', {
      name: /Autorizo el tratamiento de mis datos personales/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    // Submit button
    expect(screen.getByRole('button', { name: /Solicitar asesoría/i })).toBeInTheDocument();
  });

  it('TC-T1-F17-02: prevents submission when data authorization checkbox is unchecked', async () => {
    renderClinicWithRoutes();

    // Fill all text fields
    fireEvent.change(screen.getByLabelText(/Nombre completo \*/i), {
      target: { value: 'Ana Lucía Hurtado' },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono de contacto \/ WhatsApp \*/i), {
      target: { value: '3145678901' },
    });
    fireEvent.change(screen.getByLabelText(/Municipio \*/i), {
      target: { value: 'Pasto' },
    });
    fireEvent.change(screen.getByLabelText(/Describe brevemente tu problema legal \*/i), {
      target: { value: 'Conflicto de linderos y cerramiento de servidumbre comunal de agua.' },
    });

    // Leave checkbox UNCHECKED and click submit
    const submitBtn = screen.getByRole('button', { name: /Solicitar asesoría/i });
    fireEvent.click(submitBtn);

    // Validation alert
    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toHaveTextContent(
      /Debes autorizar el tratamiento de datos para recibir asesoría/i
    );
  });

  it('TC-T1-F17-03: validates required fields even if checkbox is checked', async () => {
    renderClinicWithRoutes();

    // Check authorization checkbox
    const checkbox = screen.getByRole('checkbox', {
      name: /Autorizo el tratamiento de mis datos personales/i,
    });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Leave name empty and trigger form submission
    const form = screen.getByRole('button', { name: /Solicitar asesoría/i }).closest('form')!;
    fireEvent.submit(form);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toHaveTextContent(
      /Por favor completa los campos obligatorios marcados con \(\*\)/i
    );
  });

  it('TC-T1-F17-04: dispatches API request and displays confirmation with CASO-XXX tracking code', async () => {
    const postSpy = vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-clinic-1',
        codigo_sms: 'CASO-M4Q',
        tipo_problema: 'Consultorio Jurídico (Asesoría personalizada)',
        estado: 'BORRADOR',
        formulario_web: {
          modalidad: 'consultorio_juridico',
          mecanismo: 'Asesoría jurídica',
        },
        created_at: new Date().toISOString(),
      },
    });

    renderClinicWithRoutes();

    // Fill form
    fireEvent.change(screen.getByLabelText(/Nombre completo \*/i), {
      target: { value: 'Ana Lucía Hurtado' },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono de contacto \/ WhatsApp \*/i), {
      target: { value: '3145678901' },
    });
    fireEvent.change(screen.getByLabelText(/Municipio \*/i), {
      target: { value: 'Pasto' },
    });
    fireEvent.change(screen.getByLabelText(/Vereda o sector/i), {
      target: { value: 'San Isidro' },
    });
    fireEvent.change(screen.getByLabelText(/Describe brevemente tu problema legal \*/i), {
      target: { value: 'Un vecino cercó el camino y el nacimiento de agua comunal.' },
    });

    // Check consent
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /Autorizo el tratamiento de mis datos personales/i,
      })
    );

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Solicitar asesoría/i }));

    // Verify API dispatched
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/casos',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"modalidad":"consultorio_juridico"'),
        })
      );
    });

    // Confirmation view assertions
    await waitFor(() => {
      expect(screen.getByText('¡Solicitud recibida!')).toBeInTheDocument();
      expect(screen.getByText('CASO-M4Q')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Copiar código al portapapeles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver estado de mi trámite/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver al inicio/i })).toBeInTheDocument();
  });

  it('TC-T1-F17-05: clicking "Ver estado de mi trámite" navigates to /estado/:codigo', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        codigo_sms: 'CASO-M4Q',
        tipo_problema: 'Asesoría',
        estado: 'BORRADOR',
      },
    });

    renderClinicWithRoutes();

    // Fill and submit
    fireEvent.change(screen.getByLabelText(/Nombre completo \*/i), { target: { value: 'Ana Lucía' } });
    fireEvent.change(screen.getByLabelText(/Teléfono de contacto \/ WhatsApp \*/i), { target: { value: '3145678901' } });
    fireEvent.change(screen.getByLabelText(/Municipio \*/i), { target: { value: 'Pasto' } });
    fireEvent.change(screen.getByLabelText(/Describe brevemente tu problema legal \*/i), { target: { value: 'Descripción del conflicto' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo el tratamiento de mis datos personales/i }));
    fireEvent.click(screen.getByRole('button', { name: /Solicitar asesoría/i }));

    await waitFor(() => {
      expect(screen.getByText('CASO-M4Q')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver estado de mi trámite/i }));
    expect(screen.getByTestId('status-view')).toBeInTheDocument();
  });

  it('TC-T2-F17-04: handles offline fallback and returns generated code when backend is down', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValue(
      new api.ApiError('Network connection failed', 0, null, true)
    );

    renderClinicWithRoutes();

    fireEvent.change(screen.getByLabelText(/Nombre completo \*/i), { target: { value: 'Don José' } });
    fireEvent.change(screen.getByLabelText(/Teléfono de contacto \/ WhatsApp \*/i), { target: { value: '3101112233' } });
    fireEvent.change(screen.getByLabelText(/Municipio \*/i), { target: { value: 'Silvia' } });
    fireEvent.change(screen.getByLabelText(/Describe brevemente tu problema legal \*/i), { target: { value: 'Derrumbe en la vía' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Autorizo el tratamiento de mis datos personales/i }));
    fireEvent.click(screen.getByRole('button', { name: /Solicitar asesoría/i }));

    // MockStorage generates CASO-XXX and confirmation view appears
    await waitFor(() => {
      expect(screen.getByText('¡Solicitud recibida!')).toBeInTheDocument();
      expect(screen.getByText(/^CASO-[A-Z0-9]{3}$/)).toBeInTheDocument();
    });
  });

  it('TC-T1-F17-06: "Volver al inicio" button navigates to /', () => {
    renderClinicWithRoutes();

    const backBtn = screen.getByRole('button', { name: /Volver al inicio/i });
    fireEvent.click(backBtn);

    expect(screen.getByTestId('home-view')).toBeInTheDocument();
  });
});
