import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { LearnRightsView } from '../views/LearnRightsView';

describe('LearnRights Feature & Acceptance Criteria (R2)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderLearnRightsWithRoutes = (initialEntry = '/aprender') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CaseProvider>
          <Routes>
            <Route path="/aprender" element={<LearnRightsView />} />
            <Route path="/" element={<div data-testid="home-view">Inicio</div>} />
            <Route path="/portal" element={<div data-testid="portal-view">Portal View</div>} />
            <Route path="/asesor" element={<div data-testid="asesor-view">Asesor View</div>} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );
  };

  it('TC-T1-F16-01: renders the educational header and initial Derecho de Petición guide', () => {
    renderLearnRightsWithRoutes();

    expect(screen.getByText('Aprende tus derechos')).toBeInTheDocument();
    expect(
      screen.getByText(/Conoce cómo defender tus garantías fundamentales sin necesidad de abogado/i)
    ).toBeInTheDocument();

    // Derecho de Petición guide content
    expect(
      screen.getByText('¿Qué es el Derecho de Petición? (Art. 23)')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/solicitar información, documentos, o la solución de un problema/i)
    ).toBeInTheDocument();

    // Legal response deadlines
    expect(screen.getByText(/10 días hábiles/i)).toBeInTheDocument();
    expect(screen.getByText(/15 días hábiles/i)).toBeInTheDocument();
    expect(screen.getByText(/30 días hábiles/i)).toBeInTheDocument();

    // Common Vereda problems mentioned
    expect(screen.getByText(/Falta de profesores en la escuela rural/i)).toBeInTheDocument();
    expect(screen.getByText(/arreglos de vías terciarias y carreteras/i)).toBeInTheDocument();
  });

  it('TC-T1-F16-02: toggles to Acción de Tutela view when clicking the Tutela tab', () => {
    renderLearnRightsWithRoutes();

    const tutelaTab = screen.getByRole('button', { name: 'Acción de Tutela' });
    fireEvent.click(tutelaTab);

    // Tutela content
    expect(screen.getByText('¿Qué es la Acción de Tutela? (Art. 86)')).toBeInTheDocument();
    expect(
      screen.getByText(/protección inmediata de tus derechos constitucionales fundamentales/i)
    ).toBeInTheDocument();

    // 10-day judicial deadline
    expect(
      screen.getByText(/El juez debe fallar en un término máximo e improrrogable/i)
    ).toBeInTheDocument();
    expect(screen.getByText('10 días')).toBeInTheDocument();

    // Urgent Tutela scenarios (Salud / Educación / Agua)
    expect(screen.getByText(/No entrega de medicamentos esenciales/i)).toBeInTheDocument();
    expect(screen.getByText(/falta de agua potable mínima/i)).toBeInTheDocument();
  });

  it('TC-T1-F16-03: toggles back to Derecho de Petición from Acción de Tutela', () => {
    renderLearnRightsWithRoutes();

    const tutelaTab = screen.getByRole('button', { name: 'Acción de Tutela' });
    fireEvent.click(tutelaTab);
    expect(screen.getByText('¿Qué es la Acción de Tutela? (Art. 86)')).toBeInTheDocument();

    const peticionTab = screen.getByRole('button', { name: 'Derecho de Petición' });
    fireEvent.click(peticionTab);
    expect(
      screen.getByText('¿Qué es el Derecho de Petición? (Art. 23)')
    ).toBeInTheDocument();
  });

  it('TC-T1-F16-04: clicking CTA "Iniciar trámite de petición o tutela" navigates to /portal', () => {
    renderLearnRightsWithRoutes();

    const ctaTramite = screen.getByRole('button', {
      name: /Iniciar trámite de petición o tutela/i,
    });
    expect(ctaTramite).toBeInTheDocument();

    fireEvent.click(ctaTramite);
    expect(screen.getByTestId('portal-view')).toBeInTheDocument();
  });

  it('TC-T1-F16-05: clicking CTA "Consultar caso con un asesor" navigates to /asesor', () => {
    renderLearnRightsWithRoutes();

    const ctaAsesor = screen.getByRole('button', {
      name: /Consultar caso con un asesor/i,
    });
    expect(ctaAsesor).toBeInTheDocument();

    fireEvent.click(ctaAsesor);
    expect(screen.getByTestId('asesor-view')).toBeInTheDocument();
  });

  it('TC-T1-F16-06: "Volver al inicio" button navigates to /', () => {
    renderLearnRightsWithRoutes();

    const backBtn = screen.getByRole('button', { name: /Volver al inicio/i });
    fireEvent.click(backBtn);

    expect(screen.getByTestId('home-view')).toBeInTheDocument();
  });
});
