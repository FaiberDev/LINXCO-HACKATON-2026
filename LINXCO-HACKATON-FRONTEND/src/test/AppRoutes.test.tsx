import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { LandingPage } from '../views/LandingPage';
import { ContinuationPortal } from '../views/ContinuationPortal';
import { CaseStatusView } from '../views/CaseStatusView';
import { LearnRightsView } from '../views/LearnRightsView';
import { LegalClinicView } from '../views/LegalClinicView';
import { WizardView } from '../views/WizardView';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

describe('App Views & Route Shells Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('LandingPage (R2)', () => {
    it('renders platform description and the exact 3 primary buttons', () => {
      render(
        <MemoryRouter>
          <CaseProvider>
            <LandingPage />
          </CaseProvider>
        </MemoryRouter>
      );

      // Verify mission / description
      expect(
        screen.getByText(/Justicia rápida, clara y sin intermediarios/i)
      ).toBeInTheDocument();

      // Verify exact 3 primary action buttons
      expect(
        screen.getByRole('button', { name: /Protege tus derechos/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Aprende tus derechos/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Habla con un asesor/i })
      ).toBeInTheDocument();
    });
  });

  describe('ContinuationPortal (R3)', () => {
    it('renders exact buttons "Crear nueva solicitud" and "Continuar trámite"', () => {
      render(
        <MemoryRouter>
          <CaseProvider>
            <ContinuationPortal />
          </CaseProvider>
        </MemoryRouter>
      );

      expect(
        screen.getByRole('button', { name: /Crear nueva solicitud/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Continuar trámite/i })
      ).toBeInTheDocument();
    });

    it('reveals alphanumeric code input when "Continuar trámite" is clicked', () => {
      render(
        <MemoryRouter>
          <CaseProvider>
            <ContinuationPortal />
          </CaseProvider>
        </MemoryRouter>
      );

      // Initially input should not be shown
      expect(screen.queryByLabelText(/Ingresa tu código de trámite/i)).not.toBeInTheDocument();

      // Click "Continuar trámite"
      const continueBtn = screen.getByRole('button', { name: /Continuar trámite/i });
      fireEvent.click(continueBtn);

      // Now code input and submit button should be visible
      expect(screen.getByLabelText(/Ingresa tu código de trámite/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Consultar trámite/i })).toBeInTheDocument();
    });
  });

  describe('CaseStatusView (R5)', () => {
    it('displays the exact 5 status labels: BORRADOR, VALIDADO, ENVIADO, RADICADO, RESPUESTA RECIBIDA', async () => {
      // Seed pre-loaded case to show the stepper
      localStorage.setItem(
        'justicia_active_case',
        JSON.stringify({
          codigo_sms: 'CASO-SJH',
          tipo_problema: 'Salud - Citas',
          estado: 'VALIDADO',
          formulario_web: {},
          created_at: new Date().toISOString(),
        })
      );
      localStorage.setItem('justicia_active_code', 'CASO-SJH');

      render(
        <MemoryRouter initialEntries={['/estado/CASO-SJH']}>
          <CaseProvider>
            <CaseStatusView />
          </CaseProvider>
        </MemoryRouter>
      );

      // Check all 5 exact status labels
      expect(screen.getByText('BORRADOR')).toBeInTheDocument();
      expect(screen.getByText('VALIDADO')).toBeInTheDocument();
      expect(screen.getByText('ENVIADO')).toBeInTheDocument();
      expect(screen.getByText('RADICADO')).toBeInTheDocument();
      expect(screen.getByText('RESPUESTA RECIBIDA')).toBeInTheDocument();
    });
  });

  describe('LearnRightsView (R2)', () => {
    it('renders educational view with Derecho de Petición and Acción de Tutela', () => {
      render(
        <MemoryRouter>
          <CaseProvider>
            <LearnRightsView />
          </CaseProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/Aprende tus derechos/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Derecho de Petición/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Acción de Tutela/i })
      ).toBeInTheDocument();
    });
  });

  describe('LegalClinicView (R2)', () => {
    it('renders advisor request form with data authorization checkbox', () => {
      render(
        <MemoryRouter>
          <CaseProvider>
            <LegalClinicView />
          </CaseProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/Habla con un asesor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre completo \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Teléfono de contacto \/ WhatsApp \*/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Autorizo el tratamiento de mis datos personales/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Solicitar asesoría/i })
      ).toBeInTheDocument();
    });
  });

  describe('WizardView (R4)', () => {
    it('renders dynamic wizard with step indicator', () => {
      render(
        <MemoryRouter>
          <CaseProvider>
            <WizardView />
          </CaseProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Siguiente/i })).toBeInTheDocument();
    });
  });

  describe('Header & Footer Layout Components', () => {
    it('Header displays brand and active case code badge when set', () => {
      localStorage.setItem('justicia_active_code', 'CASO-XYZ');

      render(
        <MemoryRouter>
          <CaseProvider>
            <Header />
          </CaseProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Justicia para todos')).toBeInTheDocument();
      expect(screen.getByText('Justicia en tu Vereda')).toBeInTheDocument();
      expect(screen.getByText('CASO-XYZ')).toBeInTheDocument();
    });

    it('Footer displays institutional links and service status', () => {
      render(
        <MemoryRouter>
          <CaseProvider>
            <Footer />
          </CaseProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/Estado del servicio:/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Aprende tus derechos/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Habla con un asesor/i })).toBeInTheDocument();
    });
  });
});
