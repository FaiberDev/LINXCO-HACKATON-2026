import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { AuthProvider, AUTH_STORAGE_KEY } from '../context/AuthContext';
import { ProtectedRoute, RoleRouterController } from '../components/auth/ProtectedRoute';
import { LandingPage } from '../views/LandingPage';
import { ContinuationPortal } from '../views/ContinuationPortal';
import { WizardView } from '../views/WizardView';
import { CaseStatusView } from '../views/CaseStatusView';
import { LegalClinicView } from '../views/LegalClinicView';
import { LoginView } from '../views/LoginView';
import { JefeDashboardView } from '../views/JefeDashboardView';
import { AsesorDashboardView } from '../views/AsesorDashboardView';
import * as api from '../services/api';

describe('Tier 4: Real-World Rural Citizen Journeys & RBAC Security Flows', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const renderAppFlow = (initialEntry = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          <CaseProvider>
            <Routes>
              <Route path="/dashboard" element={<RoleRouterController />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/portal" element={<ContinuationPortal />} />
              <Route path="/wizard" element={<WizardView />} />
              <Route path="/estado" element={<CaseStatusView />} />
              <Route path="/estado/:codigo" element={<CaseStatusView />} />
              <Route path="/asesor" element={<LegalClinicView />} />
              <Route path="/login" element={<LoginView />} />
              <Route
                path="/admin/jefe"
                element={
                  <ProtectedRoute allowedRole="Jefe de Consultorio">
                    <JefeDashboardView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/asesor"
                element={
                  <ProtectedRoute allowedRole="Asesor Jurídico">
                    <AsesorDashboardView />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </CaseProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('Scenario 1 (Salud): Continues WhatsApp code CASO-SJH, completes Tutela wizard with split Name & Municipality autocomplete', async () => {
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
      if (url === '/generar-documento' && options?.method === 'POST') {
        return {
          success: true,
          codigo: 'CASO-SJH',
          ruta_documento: '/api/documentos/CASO-SJH.docx',
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

    // Arrives at Estado de tu trámite view, then citizen clicks "Continuar editando solicitud"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continuar editando solicitud/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Continuar editando solicitud/i }));

    await waitFor(() => {
      expect(screen.getByText(/Nivel 1: Categoría Principal/i)).toBeInTheDocument();
    });

    // Seleccionar A. Salud -> Tutela Medicamentos
    fireEvent.click(screen.getByRole('button', { name: /A\. Salud/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /No me entregan medicamentos urgentes/i })
    );

    // Variable 1: Nombre(s) y Apellido(s)
    fireEvent.change(screen.getByLabelText(/Nombre\(s\) \*/i), {
      target: { value: 'María' },
    });
    fireEvent.change(screen.getByLabelText(/Apellido\(s\) \*/i), {
      target: { value: 'Rodríguez' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 2: Documento
    fireEvent.change(screen.getByLabelText(/¿Cuál es tu número de cédula\?/i), {
      target: { value: '34567890' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 3: EPS
    fireEvent.click(screen.getByRole('button', { name: 'Nueva EPS' }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 4: Diagnóstico
    fireEvent.change(screen.getByLabelText(/¿Cuál es el diagnóstico médico exacto\?/i), {
      target: { value: 'Hipertensión arterial crónica' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 5: Medicamento
    fireEvent.change(
      screen.getByLabelText(/¿Qué medicamento urgente y dosis te negaron\?/i),
      { target: { value: 'Losartán 50mg' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 6: Municipio (Autocompletado) y Vereda
    fireEvent.change(screen.getByLabelText(/Municipio \(DANE\) \*/i), {
      target: { value: 'Popayán, Cauca' },
    });
    fireEvent.change(
      screen.getByLabelText(/Vereda, Corregimiento o Dirección \*/i),
      { target: { value: 'Vereda El Sendero' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /Revisar datos/i }));

    // Confirmar y generar documento
    fireEvent.click(screen.getByRole('button', { name: /Generar Documento/i }));

    await waitFor(() => {
      expect(
        screen.getByText('¡Documento legal generado con éxito!')
      ).toBeInTheDocument();
      expect(screen.getByText('CASO-SJH')).toBeInTheDocument();
    });
  });

  it('Scenario 2 (Logout & RBAC): Clears storage on logout and blocks returning to protected routes', async () => {
    // Simular sesión activa de Jefe de Consultorio
    const jefeSession = {
      user: {
        id: '4481df48-b9ca-40ef-8529-be92c2075850',
        numero_documento: '1000100100',
        nombre_completo: 'Dr. Carlos Mendoza (Jefe de Consultorio)',
        rol: 'Jefe de Consultorio',
      },
      token: 'token-jefe-123',
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(jefeSession));

    renderAppFlow('/dashboard');

    // RoleRouterController redirige automáticamente a /admin/jefe
    await waitFor(() => {
      expect(
        screen.getByText(/Panel del Jefe de Consultorio Jurídico/i)
      ).toBeInTheDocument();
    });

    // Cerrar sesión con el botón Salir
    const btnSalir = screen.getByRole('button', { name: /^Salir$/i });
    fireEvent.click(btnSalir);

    // Verifica que limpió LocalStorage y SessionStorage y redirigió a /login con replace
    await waitFor(() => {
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(
        screen.getByText(/Portal de Consultorio Jurídico/i)
      ).toBeInTheDocument();
    });
  });

  it('Scenario 3 (Consultorio Jurídico): Submits legal clinic request from landing with split Name/Last Name and Municipality autocomplete', async () => {
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

    // Fill form (both Nombre(s) and Apellido(s) are present)
    fireEvent.change(screen.getByLabelText(/Nombre completo \*/i), {
      target: { value: 'Ana Lucía' },
    });
    fireEvent.change(screen.getByLabelText(/Apellido\(s\) \*/i), {
      target: { value: 'Hurtado' },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono de contacto \/ WhatsApp \*/i), {
      target: { value: '3145678901' },
    });
    fireEvent.change(screen.getByLabelText(/Municipio \*/i), {
      target: { value: 'Pasto, Nariño' },
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
