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

  it('TC-T1-F13-01: renders Level 1 with the 5 official decision tree categories', () => {
    renderWizardWithRoutes();

    expect(screen.getByText(/Nivel 1: Categoría Principal/i)).toBeInTheDocument();
    expect(
      screen.getByText('¿En qué área general se encuentra tu problema?')
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /A\. Salud/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /B\. Educación/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /C\. Servicios Públicos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /D\. Tierras y Vivienda/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /E\. Laboral o Consumo/i })).toBeInTheDocument();
  });

  it('TC-T2-F13-01: advances to Level 2 subcategories and blocks empty split Name(s) and Last Name(s)', () => {
    renderWizardWithRoutes();

    fireEvent.click(screen.getByRole('button', { name: /A\. Salud/i }));
    expect(screen.getByText(/Nivel 2: Situación Específica/i)).toBeInTheDocument();

    // Seleccionar subcategoría de Derecho de Petición Medicamentos
    fireEvent.click(
      screen.getByRole('button', {
        name: /Me niegan o demoran la entrega de medicamentos/i,
      })
    );

    expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument();

    // Intentar avanzar sin llenar Nombre(s) ni Apellido(s)
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Por favor ingresa tanto el Nombre\(s\) como el Apellido\(s\)/i
    );
  });

  it('TC-T1-F13-02: collects split Name/Last Name, Document, Entity, Diagnosis, Medication, and Municipality Autocomplete', async () => {
    const postDocSpy = vi.spyOn(api, 'apiFetch').mockImplementation(async (url) => {
      if (url === '/generar-documento') {
        return {
          success: true,
          codigo: 'CASO-R8W',
          ruta_documento: '/api/documentos/CASO-R8W.docx',
        };
      }
      return {};
    });

    renderWizardWithRoutes();

    // Nivel 1 -> Salud
    fireEvent.click(screen.getByRole('button', { name: /A\. Salud/i }));

    // Nivel 2 -> Tutela Medicamentos
    fireEvent.click(
      screen.getByRole('button', {
        name: /No me entregan medicamentos urgentes/i,
      })
    );

    // Variable 1: Nombre(s) y Apellido(s) separados en grid de dos columnas
    fireEvent.change(screen.getByLabelText(/Nombre\(s\) \*/i), {
      target: { value: 'María Fernanda' },
    });
    fireEvent.change(screen.getByLabelText(/Apellido\(s\) \*/i), {
      target: { value: 'Rodríguez Gómez' },
    });
    expect(screen.getByText('María Fernanda Rodríguez Gómez')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 2: Número de cédula
    expect(screen.getByText(/Paso 2 de 6/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/¿Cuál es tu número de cédula\?/i), {
      target: { value: '34567890' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 3: EPS con sugerencias rápidas
    expect(screen.getByText(/Paso 3 de 6/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva EPS' }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 4: Diagnóstico médico
    expect(screen.getByText(/Paso 4 de 6/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/¿Cuál es el diagnóstico médico exacto\?/i), {
      target: { value: 'Hipertensión arterial crónica severa' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 5: Medicamento urgente
    expect(screen.getByText(/Paso 5 de 6/i)).toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText(/¿Qué medicamento urgente y dosis te negaron\?/i),
      {
        target: { value: 'Losartán 50mg cada 12 horas' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 6: Municipio con autocompletado DANE ("VA" -> VAUPÉS, VALLE DEL CAUCA) y Vereda
    expect(screen.getByText(/Paso 6 de 6/i)).toBeInTheDocument();
    const munInput = screen.getByLabelText(/Municipio \(DANE\) \*/i);
    fireEvent.focus(munInput);
    fireEvent.change(munInput, { target: { value: 'VA' } });

    // Verifica que al escribir "VA" aparecen sugerencias de departamentos VAUPÉS y VALLE DEL CAUCA
    expect(screen.getAllByRole('button', { name: /VAUPÉS/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /VALLE DEL CAUCA/i }).length).toBeGreaterThanOrEqual(1);

    fireEvent.change(munInput, { target: { value: 'La Cumbre, Valle del Cauca' } });
    fireEvent.change(
      screen.getByLabelText(/Vereda, Corregimiento o Dirección \*/i),
      { target: { value: 'Vereda Pavas' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /Revisar datos/i }));

    // Resumen Final
    expect(screen.getByText(/Confirmación de Plantilla/i)).toBeInTheDocument();
    expect(screen.getByText('María Fernanda Rodríguez Gómez')).toBeInTheDocument();
    expect(screen.getByText('Nueva EPS')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Generar Documento/i }));

    await waitFor(() => {
      expect(postDocSpy).toHaveBeenCalledWith(
        '/generar-documento',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(screen.getByText('CASO-R8W')).toBeInTheDocument();
    });

    // Navegar a la vista de estado
    fireEvent.click(
      screen.getByRole('button', { name: /Ver estado y progreso del trámite/i })
    );
    expect(screen.getByTestId('status-view')).toBeInTheDocument();
  });

  it('TC-T2-F19-03: supports "Otra" option handoff to Human Legal Advisor', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValue({
      success: true,
      data: {
        id: 'uuid-otra-1',
        codigo_sms: 'CASO-OTR',
        tipo_problema: 'Requiere Asesor — Tierras y Vivienda',
        estado: 'BORRADOR',
      },
    });

    renderWizardWithRoutes();

    fireEvent.click(screen.getByRole('button', { name: /D\. Tierras y Vivienda/i }));
    fireEvent.click(screen.getByRole('button', { name: /Otra situación de tierras/i }));

    expect(screen.getByText(/Derivación a Asesor/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nombre\(s\)/i), {
      target: { value: 'Pedro' },
    });
    fireEvent.change(screen.getByLabelText(/Apellido\(s\)/i), {
      target: { value: 'Nel Ospina' },
    });
    fireEvent.change(screen.getByLabelText(/Explicación breve de tu caso \*/i), {
      target: {
        value: 'Tengo un problema de servidumbre de tránsito en mi parcela rural.',
      },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Enviar caso al Asesor Jurídico/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText('¡Solicitud enviada a un Asesor Jurídico!')
      ).toBeInTheDocument();
      expect(screen.getByText('CASO-OTR')).toBeInTheDocument();
    });
  });

  it('TC-T3-F13-01: separates EDAD_MENOR and GRADO_ESCOLAR_SOLICITADO into distinct questions with linear numeric and grade selector', () => {
    renderWizardWithRoutes();

    // Nivel 1 -> Educación
    fireEvent.click(screen.getByRole('button', { name: /B\. Educación/i }));

    // Nivel 2 -> Tutela cupo escolar
    fireEvent.click(
      screen.getByRole('button', {
        name: /A mi hijo\(a\) menor de edad le niegan el cupo escolar/i,
      })
    );

    // Variable 1: Nombre accionante
    fireEvent.change(screen.getByLabelText(/Nombre\(s\) \*/i), {
      target: { value: 'Martha' },
    });
    fireEvent.change(screen.getByLabelText(/Apellido\(s\) \*/i), {
      target: { value: 'Gómez' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 2: Cédula
    fireEvent.change(screen.getByPlaceholderText(/Ej: 1061234567/i), {
      target: { value: '31999888' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 3: Nombre del menor
    fireEvent.change(screen.getByLabelText(/Nombre\(s\) \*/i), {
      target: { value: 'Mateo' },
    });
    fireEvent.change(screen.getByLabelText(/Apellido\(s\) \*/i), {
      target: { value: 'Gómez' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 4: EDAD_MENOR (linear numeric input)
    expect(
      screen.getByText(/¿Qué edad tiene el niño, niña o adolescente\?/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Selección rápida lineal \(1 a 18 años\):/i)).toBeInTheDocument();

    // Click linear age pill "8"
    const age8Button = screen.getByRole('button', { name: '8' });
    fireEvent.click(age8Button);
    expect(screen.getByText(/8 años cumplidos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente pregunta/i }));

    // Variable 5: GRADO_ESCOLAR_SOLICITADO (grade selector)
    expect(
      screen.getByText(/¿Para qué grado escolar solicita el cupo\?/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Básica Primaria \(1° a 5°\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Secundaria y Media \(6° a 11°\):/i)).toBeInTheDocument();

    // Click grade button "Tercero (3°)"
    fireEvent.click(screen.getByRole('button', { name: 'Tercero (3°)' }));
    expect(screen.getByText(/Grado escolar seleccionado:/i)).toBeInTheDocument();
    expect(screen.getAllByText('Tercero (3°)').length).toBeGreaterThanOrEqual(2);
  });
});
