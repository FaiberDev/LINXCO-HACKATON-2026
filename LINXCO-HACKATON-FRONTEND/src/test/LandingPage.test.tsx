import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { LandingPage } from '../views/LandingPage';

describe('LandingPage Feature & Acceptance Criteria (R2)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderLandingWithRoutes = (initialEntry = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CaseProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/portal" element={<div data-testid="portal-view">Vista Portal</div>} />
            <Route path="/aprender" element={<div data-testid="aprender-view">Vista Aprender</div>} />
            <Route path="/asesor" element={<div data-testid="asesor-view">Vista Asesor</div>} />
          </Routes>
        </CaseProvider>
      </MemoryRouter>
    );
  };

  it('TC-T1-F11-01: renders the platform description and mission statement', () => {
    renderLandingWithRoutes();

    // Verify badge and main headline
    expect(screen.getByText(/Orientación jurídica rural y comunitaria/i)).toBeInTheDocument();
    expect(screen.getByText('Justicia rápida, clara y sin intermediarios')).toBeInTheDocument();

    // Verify explanatory description
    expect(
      screen.getByText(/Defiende tu salud, la educación de tus hijos y las necesidades de tu vereda/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Derechos de Petición y Acciones de Tutela con respaldo constitucional/i)
    ).toBeInTheDocument();
  });

  it('TC-T1-F11-02: renders the exact button "Protege tus derechos" and it is enabled', () => {
    renderLandingWithRoutes();

    const btn = screen.getByRole('button', { name: /Protege tus derechos/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
    expect(screen.getByText('Radica peticiones y tutelas en minutos')).toBeInTheDocument();
  });

  it('TC-T1-F11-03: renders the exact button "Aprende tus derechos" and it is enabled', () => {
    renderLandingWithRoutes();

    const btn = screen.getByRole('button', { name: /Aprende tus derechos/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
    expect(screen.getByText('Guía práctica: Salud, Educación y Vías')).toBeInTheDocument();
  });

  it('TC-T1-F11-04: renders the exact button "Habla con un asesor" and it is enabled', () => {
    renderLandingWithRoutes();

    const btn = screen.getByRole('button', { name: /Habla con un asesor/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
    expect(screen.getByText('Atención directa con Consultorio Jurídico')).toBeInTheDocument();
  });

  it('TC-T1-F11-05: clicking "Protege tus derechos" navigates to /portal', () => {
    renderLandingWithRoutes();

    const btn = screen.getByRole('button', { name: /Protege tus derechos/i });
    fireEvent.click(btn);

    expect(screen.getByTestId('portal-view')).toBeInTheDocument();
  });

  it('TC-T1-F11-06: clicking "Aprende tus derechos" navigates to /aprender', () => {
    renderLandingWithRoutes();

    const btn = screen.getByRole('button', { name: /Aprende tus derechos/i });
    fireEvent.click(btn);

    expect(screen.getByTestId('aprender-view')).toBeInTheDocument();
  });

  it('TC-T1-F11-07: clicking "Habla con un asesor" navigates to /asesor', () => {
    renderLandingWithRoutes();

    const btn = screen.getByRole('button', { name: /Habla con un asesor/i });
    fireEvent.click(btn);

    expect(screen.getByTestId('asesor-view')).toBeInTheDocument();
  });

  it('TC-T2-F07-02: displays constitutional free-service guarantee info card', () => {
    renderLandingWithRoutes();

    expect(screen.getByText('Totalmente gratuito y sin costo')).toBeInTheDocument();
    expect(screen.getByText(/artículos 23 y 86 de la Constitución Política/i)).toBeInTheDocument();
  });

  it('TC-T2-F11-01: buttons have accessible roles and touch targets', () => {
    renderLandingWithRoutes();

    const nav = screen.getByRole('navigation', { name: /Acciones principales/i });
    expect(nav).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    buttons.forEach((btn) => {
      expect(btn.className).toMatch(/min-h-\[(48|52|56)px\]/);
    });
  });
});
