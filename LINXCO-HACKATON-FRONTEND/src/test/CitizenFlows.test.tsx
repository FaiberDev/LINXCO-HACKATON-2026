import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { LandingPage } from '../views/LandingPage';
import { ContinuationPortal } from '../views/ContinuationPortal';
import { WizardView } from '../views/WizardView';
import { CaseStatusView } from '../views/CaseStatusView';
import { LegalClinicView } from '../views/LegalClinicView';
import * as api from '../services/api';

describe('Tier 4: Real-World Rural Citizen Journeys & Combinatorial Flows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderAppFlow = (initialEntry = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CaseProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/portal" element={<ContinuationPortal />} />
            <Route path="/wizard" element={<WizardView />} />
            <Route path="/estado" element={<CaseStatusView />} />
            <Route path="/estado/:codigo" element={<CaseStatusView />} />
            <Route path="/asesor" element={<LegalClinicView />} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );
  };

  it('Scenario 1 (Salud): Continues WhatsApp code CASO-SJH, completes Tutela wizard, updates case', async () => {
    // 1. Mock backend response for initial WhatsApp case lookup
    vi.spyOn(api, 'apiFetch').mockImplementation(async (url, options) => {
      if (url === '/casos/CASO-SJH' && (!options || options.method === 'GET')) {
        return {
          success: true,
          data: {
            id: 'uuid-sjh',
            codigo_sms: 'CASO-SJH',
            tipo_problema: 'Posible tutela (Salud: No me entregan medicamentos)',
            estado: 'BORRADOR',
            formulario_web: {
              mecanismo: 'Acción de tutela',
              categoria: 'SALUD',
              problema: 'No me entregan medicamentos',
            },
            created_at: '2026-10-21T01:00:00Z',
          },
        };
      }
      if (url === '/casos/CASO-SJH' && options?.method === 'PUT') {
        return {
          success: true,
          data: {
            id: 'uuid-sjh',
            codigo_sms: 'CASO-SJH',
            tipo_problema: 'Acción de tutela (SALUD: Trámite web)',
            estado: 'VALIDADO',
            formulario_web: JSON.parse((options.body as string) || '{}'),
          },
        };
      }
      return { success: true, data: {} };
    });

    renderAppFlow('/portal');

    // Step 1: Click "Continuar trámite" and enter WhatsApp code
    fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
    const codeInput = screen.getByLabelText(/Ingresa tu código de trámite/i);
    fireEvent.change(codeInput, { target: { value: 'CASO-SJH' } });
    fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

    // Step 2: Redirects to Wizard because status is BORRADOR
    await waitFor(() => {
      expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument();
    });

    // Advance through Wizard steps
    // Step 1 -> Next
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 2: Citizen info
    expect(screen.getByText(/Paso 2 de 6/i)).toBeInTheDocument();
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

    // Step 3: Entity
    expect(screen.getByText(/Paso 3 de 6/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nombre de la entidad o autoridad \*/i), {
      target: { value: 'Nueva EPS' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 4: Facts
    expect(screen.getByText(/Paso 4 de 6/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Descripción de los hechos \*/i), {
      target: {
        value: 'Desde hace 3 meses el médico me formuló Losartán y la EPS no lo entrega.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 5: Petition
    expect(screen.getByText(/Paso 5 de 6/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Petición concreta \/ Pretensión \*/i), {
      target: {
        value: 'Ordenar a Nueva EPS la entrega inmediata de los medicamentos requeridos.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 6: Summary & Submit
    expect(screen.getByText(/Paso 6 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/María Rodríguez/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Nueva EPS/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/i }));

    // Confirmation shows code CASO-SJH
    await waitFor(() => {
      expect(screen.getByText('¡Trámite radicado exitosamente!')).toBeInTheDocument();
      expect(screen.getByText('CASO-SJH')).toBeInTheDocument();
    });

    // Navigate to status view
    fireEvent.click(screen.getByRole('button', { name: /Ver estado y progreso del trámite/i }));

    await waitFor(() => {
      expect(screen.getByText('Estado de tu trámite')).toBeInTheDocument();
      expect(screen.getByText('VALIDADO')).toBeInTheDocument();
    });
  });

  it('Scenario 2 (Educación): Starts from landing, creates new Derecho de Petición case', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-edu-1',
        codigo_sms: 'CASO-K7W',
        tipo_problema: 'Derecho de petición (EDUCACION: Faltan profesores)',
        estado: 'VALIDADO',
        formulario_web: {
          mecanismo: 'Derecho de petición',
          categoria: 'EDUCACION',
        },
        created_at: new Date().toISOString(),
      },
    });

    renderAppFlow('/');

    // Landing -> "Protege tus derechos"
    fireEvent.click(screen.getByRole('button', { name: /Protege tus derechos/i }));

    // Portal -> "Crear nueva solicitud"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Crear nueva solicitud/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Crear nueva solicitud/i }));

    // Wizard Step 1: Mechanism & Category
    await waitFor(() => {
      expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Derecho de petición' }));
    fireEvent.click(screen.getByRole('button', { name: /Educación y escuela/i }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 2: Citizen
    fireEvent.change(screen.getByLabelText(/Nombre completo \*/i), {
      target: { value: 'Carlos Gómez' },
    });
    fireEvent.change(screen.getByLabelText(/Número doc\. \*/i), {
      target: { value: '1053456789' },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono \/ WhatsApp \*/i), {
      target: { value: '3201234567' },
    });
    fireEvent.change(screen.getByLabelText(/Municipio/i), {
      target: { value: 'Fusagasugá' },
    });
    fireEvent.change(screen.getByLabelText(/Vereda \/ Sector/i), {
      target: { value: 'La Aguadita' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 3: Entity
    fireEvent.change(screen.getByLabelText(/Nombre de la entidad o autoridad \*/i), {
      target: { value: 'Secretaría de Educación Municipal' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 4: Facts
    fireEvent.change(screen.getByLabelText(/Descripción de los hechos \*/i), {
      target: {
        value: 'En la escuela rural de la vereda faltan dos profesores desde febrero.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 5: Petition
    fireEvent.change(screen.getByLabelText(/Petición concreta \/ Pretensión \*/i), {
      target: {
        value: 'Solicito el nombramiento inmediato de los docentes de primaria.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Step 6: Submit
    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Trámite radicado exitosamente!')).toBeInTheDocument();
      expect(screen.getByText('CASO-K7W')).toBeInTheDocument();
    });
  });

  it('Scenario 3 (Consultorio Jurídico): Submits legal clinic request from landing', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-jur-1',
        codigo_sms: 'CASO-M4Q',
        tipo_problema: 'Consultorio Jurídico (Asesoría personalizada)',
        estado: 'BORRADOR',
        formulario_web: {
          modalidad: 'consultorio_juridico',
        },
        created_at: new Date().toISOString(),
      },
    });

    renderAppFlow('/');

    // Landing -> "Habla con un asesor"
    fireEvent.click(screen.getByRole('button', { name: /Habla con un asesor/i }));

    await waitFor(() => {
      expect(screen.getByText('Habla con un asesor')).toBeInTheDocument();
    });

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
      target: { value: 'Conflicto por cierre de servidumbre de agua comunal.' },
    });

    // Authorize data
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /Autorizo el tratamiento de mis datos personales/i,
      })
    );

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Solicitar asesoría/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Solicitud recibida!')).toBeInTheDocument();
      expect(screen.getByText('CASO-M4Q')).toBeInTheDocument();
    });
  });
});
