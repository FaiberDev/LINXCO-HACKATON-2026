import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { WizardView } from '../views/WizardView';
import * as api from '../services/api';

describe('WizardForm Feature & Acceptance Criteria (R4)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderWizardWithRoutes = (initialEntry = '/wizard') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CaseProvider>
          <Routes>
            <Route path="/wizard" element={<WizardView />} />
            <Route path="/" element={<div data-testid="home-view">Inicio</div>} />
            <Route path="/portal" element={<div data-testid="portal-view">Portal</div>} />
            <Route path="/estado/:codigo" element={<div data-testid="status-view">Estado</div>} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );
  };

  it('TC-T1-F13-01: renders Step 1 with mechanism and category choices', () => {
    renderWizardWithRoutes();

    expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument();
    expect(screen.getByText('¿Qué trámite deseas radicar?')).toBeInTheDocument();

    // Mechanisms
    expect(screen.getByRole('button', { name: 'Derecho de petición' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acción de tutela' })).toBeInTheDocument();

    // Categories
    expect(screen.getByRole('button', { name: /Salud y bienestar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Educación y escuela/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mi vereda y vías/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Otro asunto legal/i })).toBeInTheDocument();
  });

  it('TC-T2-F13-01: blocks advancing step 1 when mechanism or category is missing', () => {
    localStorage.setItem(
      'justicia_wizard_draft',
      JSON.stringify({
        paso_actual: 1,
        mecanismo: '',
        categoria: '',
      })
    );

    renderWizardWithRoutes();

    const btnSiguiente = screen.getByRole('button', { name: /Siguiente/i });
    fireEvent.click(btnSiguiente);

    // Validation alert
    expect(screen.getByRole('alert')).toHaveTextContent(/Selecciona el mecanismo legal/i);
    expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument();
  });

  it('TC-T1-F13-02: advances to Step 2 and validates citizen inputs', () => {
    renderWizardWithRoutes();

    // Step 1: select category
    fireEvent.click(screen.getByRole('button', { name: /Salud y bienestar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Now in Step 2
    expect(screen.getByText(/Paso 2 de 6/i)).toBeInTheDocument();
    expect(screen.getByText('¿Quién presenta la solicitud?')).toBeInTheDocument();

    // Try to advance without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Ingresa tu nombre completo/i);

    // Fill citizen fields
    fireEvent.change(screen.getByLabelText(/Nombre completo \*/i), {
      target: { value: 'María Rodríguez' },
    });
    fireEvent.change(screen.getByLabelText(/Número doc\. \*/i), {
      target: { value: '34567890' },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono \/ WhatsApp \*/i), {
      target: { value: '3109876543' },
    });
    fireEvent.change(screen.getByLabelText(/Municipio/i), {
      target: { value: 'Popayán' },
    });
    fireEvent.change(screen.getByLabelText(/Vereda \/ Sector/i), {
      target: { value: 'El Sendero' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Now in Step 3
    expect(screen.getByText(/Paso 3 de 6/i)).toBeInTheDocument();
  });

  it('TC-T1-F13-03: advances to Step 3 and validates target entity', () => {
    // Seed draft up to step 3
    localStorage.setItem(
      'justicia_wizard_draft',
      JSON.stringify({
        paso_actual: 3,
        mecanismo: 'Acción de tutela',
        categoria: 'SALUD',
        ciudadano: {
          nombre_completo: 'María Rodríguez',
          numero_documento: '34567890',
          telefono: '3109876543',
        },
      })
    );

    renderWizardWithRoutes();

    expect(screen.getByText(/Paso 3 de 6/i)).toBeInTheDocument();
    expect(screen.getByText('¿A quién se le reclama?')).toBeInTheDocument();

    // Attempt advancing with empty entity
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Indica la entidad o autoridad a la que va dirigida la solicitud/i
    );

    // Fill entity
    fireEvent.change(screen.getByLabelText(/Nombre de la entidad o autoridad \*/i), {
      target: { value: 'Nueva EPS' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Now in Step 4
    expect(screen.getByText(/Paso 4 de 6/i)).toBeInTheDocument();
  });

  it('TC-T1-F13-04: advances to Step 4 and validates facts narrative length (min 15 chars)', () => {
    localStorage.setItem(
      'justicia_wizard_draft',
      JSON.stringify({
        paso_actual: 4,
        mecanismo: 'Acción de tutela',
        categoria: 'SALUD',
        ciudadano: {
          nombre_completo: 'María Rodríguez',
          numero_documento: '34567890',
          telefono: '3109876543',
        },
        entidad: 'Nueva EPS',
      })
    );

    renderWizardWithRoutes();

    expect(screen.getByText(/Paso 4 de 6/i)).toBeInTheDocument();
    expect(screen.getByText('¿Qué ocurrió? (Los Hechos)')).toBeInTheDocument();

    // Less than 15 chars
    fireEvent.change(screen.getByLabelText(/Descripción de los hechos \*/i), {
      target: { value: 'No hay citas' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Describe los hechos de manera clara \(mínimo 15 caracteres\)/i
    );

    // Enter valid facts (>= 15 chars)
    fireEvent.change(screen.getByLabelText(/Descripción de los hechos \*/i), {
      target: {
        value: 'Desde hace 3 meses no me entregan los medicamentos para mi hipertensión arterial.',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Now in Step 5
    expect(screen.getByText(/Paso 5 de 6/i)).toBeInTheDocument();
  });

  it('TC-T1-F13-05: advances to Step 5 and validates petition narrative length (min 10 chars)', () => {
    localStorage.setItem(
      'justicia_wizard_draft',
      JSON.stringify({
        paso_actual: 5,
        mecanismo: 'Acción de tutela',
        categoria: 'SALUD',
        ciudadano: {
          nombre_completo: 'María Rodríguez',
          numero_documento: '34567890',
          telefono: '3109876543',
        },
        entidad: 'Nueva EPS',
        hechos: 'Desde hace 3 meses no me entregan los medicamentos para mi hipertensión arterial.',
      })
    );

    renderWizardWithRoutes();

    expect(screen.getByText(/Paso 5 de 6/i)).toBeInTheDocument();
    expect(screen.getByText('¿Qué solicitas con exactitud?')).toBeInTheDocument();

    // Short petition (< 10 chars)
    fireEvent.change(screen.getByLabelText(/Petición concreta \/ Pretensión \*/i), {
      target: { value: 'Ayuda' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Especifica qué solicitas con claridad \(mínimo 10 caracteres\)/i
    );

    // Valid petition
    fireEvent.change(screen.getByLabelText(/Petición concreta \/ Pretensión \*/i), {
      target: {
        value: 'Solicito la entrega inmediata de mis medicamentos Losartán e Hidroclorotiazida.',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 6: Review & Submit
    expect(screen.getByText(/Paso 6 de 6/i)).toBeInTheDocument();
    expect(screen.getByText('Revisión y confirmación')).toBeInTheDocument();
  });

  it('TC-T1-F14-01: Step 6 displays complete review card and submits POST request returning CASO-XXX', async () => {
    const postApiSpy = vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-new-1',
        codigo_sms: 'CASO-R8W',
        tipo_problema: 'Acción de tutela (SALUD: Trámite web)',
        estado: 'VALIDADO',
        formulario_web: {
          mecanismo: 'Acción de tutela',
          categoria: 'SALUD',
        },
        created_at: new Date().toISOString(),
      },
    });

    localStorage.setItem(
      'justicia_wizard_draft',
      JSON.stringify({
        paso_actual: 6,
        mecanismo: 'Acción de tutela',
        categoria: 'SALUD',
        ciudadano: {
          nombre_completo: 'María Rodríguez',
          numero_documento: '34567890',
          telefono: '3109876543',
        },
        entidad: 'Nueva EPS',
        hechos: 'Desde hace 3 meses no me entregan los medicamentos para mi hipertensión.',
        peticion: 'Solicito la entrega inmediata de mis medicamentos vitales formulados.',
      })
    );

    renderWizardWithRoutes();

    // Review card checks
    expect(screen.getByText(/Acción de tutela — SALUD/i)).toBeInTheDocument();
    expect(screen.getByText(/María Rodríguez/i)).toBeInTheDocument();
    expect(screen.getByText(/Nueva EPS/i)).toBeInTheDocument();

    // Submit button
    const btnSubmit = screen.getByRole('button', { name: /Enviar solicitud/i });
    expect(btnSubmit).toBeInTheDocument();
    fireEvent.click(btnSubmit);

    // Verify API called with POST /casos and JSON payload
    await waitFor(() => {
      expect(postApiSpy).toHaveBeenCalledWith(
        '/casos',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"mecanismo":"Acción de tutela"'),
        })
      );
    });

    // Confirmation screen
    await waitFor(() => {
      expect(screen.getByText('¡Trámite radicado exitosamente!')).toBeInTheDocument();
      expect(screen.getByText('CASO-R8W')).toBeInTheDocument();
    });

    // Copy code button
    expect(screen.getByRole('button', { name: /Copiar código al portapapeles/i })).toBeInTheDocument();

    // Navigation buttons
    expect(
      screen.getByRole('button', { name: /Ver estado y progreso del trámite/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver al inicio/i })).toBeInTheDocument();
  });

  it('TC-T1-F14-02: updates existing case via PUT when continuing draft with activeCode', async () => {
    const putApiSpy = vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-update-1',
        codigo_sms: 'CASO-SJH',
        tipo_problema: 'Derecho de petición (EDUCACION: Trámite web)',
        estado: 'VALIDADO',
        formulario_web: {
          mecanismo: 'Derecho de petición',
        },
      },
    });

    localStorage.setItem('justicia_active_code', 'CASO-SJH');
    localStorage.setItem(
      'justicia_wizard_draft',
      JSON.stringify({
        paso_actual: 6,
        mecanismo: 'Derecho de petición',
        categoria: 'EDUCACION',
        ciudadano: {
          nombre_completo: 'Carlos Gómez',
          numero_documento: '1053456789',
          telefono: '3201234567',
        },
        entidad: 'Secretaría de Educación',
        hechos: 'Faltan profesores en la escuela de la vereda La Aguadita.',
        peticion: 'Solicito nombrar los dos profesores faltantes de manera urgente.',
      })
    );

    renderWizardWithRoutes();

    const btnSubmit = screen.getByRole('button', { name: /Enviar solicitud/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(putApiSpy).toHaveBeenCalledWith(
        '/casos/CASO-SJH',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"mecanismo":"Derecho de petición"'),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('CASO-SJH')).toBeInTheDocument();
    });
  });

  it('TC-T2-F19-03: supports backward and forward step traversal preserving draft', () => {
    renderWizardWithRoutes();

    // Step 1: select mechanism and category
    fireEvent.click(screen.getByRole('button', { name: 'Derecho de petición' }));
    fireEvent.click(screen.getByRole('button', { name: /Educación y escuela/i }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 2: enter citizen name
    expect(screen.getByText(/Paso 2 de 6/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nombre completo \*/i), {
      target: { value: 'Rosa Elena Silva' },
    });

    // Click "Anterior"
    fireEvent.click(screen.getByRole('button', { name: /Anterior/i }));

    // Back to Step 1
    expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument();

    // Click "Siguiente"
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Back in Step 2; verify input retained
    expect(screen.getByText(/Paso 2 de 6/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo \*/i)).toHaveValue('Rosa Elena Silva');
  });

  it('TC-T1-F14-05: clicking "Ver estado y progreso del trámite" on confirmation screen navigates to /estado/:codigo', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        codigo_sms: 'CASO-NAV1',
        tipo_problema: 'Derecho de petición',
        estado: 'VALIDADO',
      },
    });

    localStorage.setItem(
      'justicia_wizard_draft',
      JSON.stringify({
        paso_actual: 6,
        mecanismo: 'Derecho de petición',
        categoria: 'EDUCACION',
        ciudadano: {
          nombre_completo: 'Carlos Gómez',
          numero_documento: '1053456789',
          telefono: '3201234567',
        },
        entidad: 'Secretaría de Educación',
        hechos: 'Faltan docentes desde el mes pasado en la escuela.',
        peticion: 'Solicito asignar los docentes de manera pronta.',
      })
    );

    renderWizardWithRoutes();

    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/i }));

    await waitFor(() => {
      expect(screen.getByText('CASO-NAV1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver estado y progreso del trámite/i }));

    expect(screen.getByTestId('status-view')).toBeInTheDocument();
  });
});
