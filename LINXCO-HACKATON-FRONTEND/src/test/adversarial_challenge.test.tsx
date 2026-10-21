import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseProvider } from '../context/CaseContext';
import { LandingPage } from '../views/LandingPage';
import { CaseStatusView } from '../views/CaseStatusView';
import { ContinuationPortal } from '../views/ContinuationPortal';
import { WizardView } from '../views/WizardView';
import { ESTADOS_CASO, EstadoCaso, Caso } from '../types';
import * as caseService from '../services/caseService';
import * as api from '../services/api';

describe('Adversarial Verification Suite (Empirical Challenger)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: Exact 3 Action Buttons on Landing Page
  // =========================================================================
  describe('Challenge 1: Exact Action Buttons on Landing Page', () => {
    const renderLanding = () => {
      return render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/portal" element={<div data-testid="portal-view">Portal</div>} />
            <Route path="/aprender" element={<div data-testid="aprender-view">Aprende</div>} />
            <Route path="/asesor" element={<div data-testid="asesor-view">Asesor</div>} />
          </Routes>
        </MemoryRouter>
      );
    };

    it('empirically verifies exact 3 primary buttons: "Protege tus derechos", "Aprende tus derechos", "Habla con un asesor"', () => {
      renderLanding();

      // Query buttons in main navigation
      const nav = screen.getByRole('navigation', { name: /Acciones principales/i });
      expect(nav).toBeInTheDocument();

      const buttons = nav.querySelectorAll('button');
      expect(buttons.length).toBe(3);

      const btn1 = screen.getByRole('button', { name: /Protege tus derechos/i });
      const btn2 = screen.getByRole('button', { name: /Aprende tus derechos/i });
      const btn3 = screen.getByRole('button', { name: /Habla con un asesor/i });

      expect(btn1).toBeInTheDocument();
      expect(btn2).toBeInTheDocument();
      expect(btn3).toBeInTheDocument();

      // Exact text content validation
      expect(btn1.textContent).toContain('Protege tus derechos');
      expect(btn2.textContent).toContain('Aprende tus derechos');
      expect(btn3.textContent).toContain('Habla con un asesor');
    });

    it('navigates to /portal, /aprender, and /asesor when clicked', () => {
      const { unmount } = renderLanding();
      fireEvent.click(screen.getByRole('button', { name: /Protege tus derechos/i }));
      expect(screen.getByTestId('portal-view')).toBeInTheDocument();
      unmount();

      const { unmount: unmount2 } = renderLanding();
      fireEvent.click(screen.getByRole('button', { name: /Aprende tus derechos/i }));
      expect(screen.getByTestId('aprender-view')).toBeInTheDocument();
      unmount2();

      renderLanding();
      fireEvent.click(screen.getByRole('button', { name: /Habla con un asesor/i }));
      expect(screen.getByTestId('asesor-view')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SECTION 2: Exact 5 Status Labels Progression
  // =========================================================================
  describe('Challenge 2: Exact 5 Status Labels Progression in CaseStatusView', () => {
    const renderStatusWithCase = (seedCase: Caso) => {
      localStorage.setItem('justicia_current_codigo', seedCase.codigo_sms);
      return render(
        <MemoryRouter initialEntries={[`/estado/${seedCase.codigo_sms}`]}>
          <CaseProvider>
            <Routes>
              <Route path="/estado/:codigo" element={<CaseStatusView />} />
              <Route path="/wizard" element={<div data-testid="wizard-view">Wizard</div>} />
              <Route path="/" element={<div data-testid="home-view">Home</div>} />
            </Routes>
          </CaseProvider>
        </MemoryRouter>
      );
    };

    it('strictly renders all 5 exact status labels in the timeline', async () => {
      const mockCase: Caso = {
        codigo_sms: 'CASO-ADV',
        tipo_problema: 'Salud - Tutela',
        estado: 'BORRADOR',
        formulario_web: {},
      };

      vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({
        success: true,
        data: mockCase,
      });

      renderStatusWithCase(mockCase);

      await waitFor(() => {
        expect(screen.getByText('CASO-ADV')).toBeInTheDocument();
      });

      // Verify all 5 exact labels exist in DOM
      const expectedLabels: EstadoCaso[] = [
        'BORRADOR',
        'VALIDADO',
        'ENVIADO',
        'RADICADO',
        'RESPUESTA RECIBIDA',
      ];

      expect(ESTADOS_CASO).toEqual(expectedLabels);

      expectedLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('shows "Continuar editando solicitud" ONLY when estado is BORRADOR, hides for other 4 states', async () => {
      const allStates: EstadoCaso[] = [
        'BORRADOR',
        'VALIDADO',
        'ENVIADO',
        'RADICADO',
        'RESPUESTA RECIBIDA',
      ];

      for (const st of allStates) {
        localStorage.clear();
        vi.restoreAllMocks();

        const testCase: Caso = {
          codigo_sms: `CASO-${st.substring(0, 3)}`,
          tipo_problema: 'Derecho de petición',
          estado: st,
          formulario_web: {},
        };

        vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({
          success: true,
          data: testCase,
        });

        const { unmount } = renderStatusWithCase(testCase);

        await waitFor(() => {
          expect(screen.getByText(testCase.codigo_sms)).toBeInTheDocument();
        });

        const editBtn = screen.queryByRole('button', { name: /Continuar editando solicitud/i });
        if (st === 'BORRADOR') {
          expect(editBtn).toBeInTheDocument();
        } else {
          expect(editBtn).not.toBeInTheDocument();
        }

        unmount();
      }
    });

    it('handles unexpected/corrupted estado gracefully without crashing', async () => {
      const corruptCase: Caso = {
        codigo_sms: 'CASO-ERR',
        tipo_problema: 'Derecho de petición',
        estado: 'ESTADO_INEXISTENTE' as unknown as EstadoCaso,
        formulario_web: {},
      };

      vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({
        success: true,
        data: corruptCase,
      });

      renderStatusWithCase(corruptCase);

      await waitFor(() => {
        expect(screen.getByText('CASO-ERR')).toBeInTheDocument();
      });

      // Should default to first stage (BORRADOR) without throwing runtime exception
      expect(screen.getByText('BORRADOR')).toBeInTheDocument();
      expect(screen.getByText('Estado de tu trámite')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SECTION 3: Code Input Formatting Anomalies & Normalization
  // =========================================================================
  describe('Challenge 3: Tracking Code Formatting Anomalies & Normalization', () => {
    const renderPortal = () => {
      return render(
        <MemoryRouter initialEntries={['/portal']}>
          <CaseProvider>
            <Routes>
              <Route path="/portal" element={<ContinuationPortal />} />
              <Route path="/wizard" element={<div data-testid="wizard-view">Wizard</div>} />
              <Route path="/estado/:codigo" element={<div data-testid="status-view">Status</div>} />
            </Routes>
          </CaseProvider>
        </MemoryRouter>
      );
    };

    it('normalizes lowercase and whitespace padded code "  caso-sjh  " -> "CASO-SJH"', async () => {
      const getSpy = vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({
        success: true,
        data: {
          codigo_sms: 'CASO-SJH',
          tipo_problema: 'Salud',
          estado: 'BORRADOR',
          formulario_web: {},
        },
      });

      renderPortal();

      fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
      const input = screen.getByLabelText(/Ingresa tu código de trámite/i);

      fireEvent.change(input, { target: { value: '  caso-sjh  ' } });
      fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith('/casos/CASO-SJH');
        expect(screen.getByTestId('wizard-view')).toBeInTheDocument();
      });
    });

    it('blocks submission with whitespace-only code and displays warning', async () => {
      renderPortal();

      fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
      const input = screen.getByLabelText(/Ingresa tu código de trámite/i);

      fireEvent.change(input, { target: { value: '    ' } });
      fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

      expect(
        screen.getByText(/Por favor ingresa un código de seguimiento/i)
      ).toBeInTheDocument();
    });

    it('displays defensive alert error when non-existent code "caso-xyz" is queried', async () => {
      vi.spyOn(api, 'apiFetch').mockRejectedValueOnce(
        new api.ApiError('Caso no encontrado', 404)
      );

      renderPortal();

      fireEvent.click(screen.getByRole('button', { name: /Continuar trámite/i }));
      const input = screen.getByLabelText(/Ingresa tu código de trámite/i);

      fireEvent.change(input, { target: { value: 'caso-xyz' } });
      fireEvent.click(screen.getByRole('button', { name: /Consultar trámite/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Caso no encontrado/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // SECTION 4: Extreme Inputs, 5000+ Chars, and XSS Injection in Wizard
  // =========================================================================
  describe('Challenge 4: Extreme Inputs & Adversarial Payloads in Wizard', () => {
    const renderWizard = () => {
      return render(
        <MemoryRouter initialEntries={['/wizard']}>
          <CaseProvider>
            <Routes>
              <Route path="/wizard" element={<WizardView />} />
              <Route path="/estado/:codigo" element={<div data-testid="status-view">Status</div>} />
            </Routes>
          </CaseProvider>
        </MemoryRouter>
      );
    };

    it('enforces validation bounds on all empty steps', () => {
      localStorage.setItem(
        'justicia_wizard_draft',
        JSON.stringify({
          paso_actual: 1,
          mecanismo: '',
          categoria: '',
        })
      );

      renderWizard();

      // Step 1: Click next without choosing mechanism or category
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
      expect(
        screen.getByText(/Selecciona el mecanismo legal/i)
      ).toBeInTheDocument();

      // Choose mechanism only
      fireEvent.click(screen.getByRole('button', { name: 'Derecho de petición' }));
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
      expect(screen.getByText(/Selecciona la categoría del problema/i)).toBeInTheDocument();
    });

    it('handles 5,000+ character strings in facts and petition without buffer failure', async () => {
      const extremeFacts = 'A'.repeat(5200);
      const extremePetition = 'B'.repeat(5100);

      // Preload draft with extreme text
      localStorage.setItem(
        'justicia_wizard_draft',
        JSON.stringify({
          paso_actual: 4,
          mecanismo: 'Derecho de petición',
          categoria: 'SALUD',
          ciudadano: {
            nombre_completo: 'Carlos Extremadura',
            numero_documento: '987654321',
            telefono: '3110001122',
          },
          entidad: 'Hospital San José',
          hechos: extremeFacts,
          peticion: extremePetition,
        })
      );

      const postSpy = vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({
        success: true,
        data: {
          codigo_sms: 'CASO-BIG',
          tipo_problema: 'Derecho de petición (SALUD: Trámite web)',
          estado: 'VALIDADO',
          formulario_web: { hechos: extremeFacts, peticion: extremePetition },
        },
      });

      renderWizard();

      expect(screen.getByText(/Paso 4 de 6/i)).toBeInTheDocument();
      // Step 4 -> 5
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
      expect(screen.getByText(/Paso 5 de 6/i)).toBeInTheDocument();

      // Step 5 -> 6
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
      expect(screen.getByText(/Paso 6 de 6/i)).toBeInTheDocument();

      // Step 6 submit
      fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/i }));

      await waitFor(() => {
        expect(postSpy).toHaveBeenCalled();
        expect(screen.getByText('CASO-BIG')).toBeInTheDocument();
      });
    });

    it('neutralizes XSS payloads as plain text in JSX output', async () => {
      const xssPayload = '<script>alert("XSS")</script><img src="x" onerror="alert(1)">';

      localStorage.setItem(
        'justicia_wizard_draft',
        JSON.stringify({
          paso_actual: 6,
          mecanismo: 'Acción de tutela',
          categoria: 'VEREDA',
          ciudadano: {
            nombre_completo: xssPayload,
            numero_documento: '12345678',
            telefono: '3001234567',
          },
          entidad: xssPayload,
          hechos: `Hechos con payload: ${xssPayload}`,
          peticion: `Petición con payload: ${xssPayload}`,
        })
      );

      renderWizard();

      expect(screen.getByText(/Paso 6 de 6/i)).toBeInTheDocument();

      // Check that script tags are NOT executable elements in DOM
      expect(document.querySelector('script[src="x"]')).toBeNull();
      expect(document.querySelector('img[src="x"]')).toBeNull();

      // The text is rendered safely as escaped text
      const reviewText = screen.getByText(/Hechos con payload:/i);
      expect(reviewText.textContent).toContain('<script>alert("XSS")</script>');
    });
  });

  // =========================================================================
  // SECTION 5: Offline Fallback Resilience Under Network Disconnection
  // =========================================================================
  describe('Challenge 5: Offline Fallback Resilience when Fetch Fails', () => {
    it('transparently retrieves seeded cases (CASO-SJH) when fetch throws network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await caseService.getCase('CASO-SJH');
      expect(result).toBeDefined();
      expect(result.codigo_sms).toBe('CASO-SJH');
      expect(result.is_offline).toBe(true);
      expect(result.tipo_problema).toBe('Salud - Citas');
    });

    it('creates new case locally with valid CASO-XXX code when backend drops', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network dropped'));

      const newCase = await caseService.createCase({
        tipo_problema: 'Derecho de petición (Educación)',
        formulario_web: {
          hechos: 'Faltan profesores en la vereda El Retiro',
        },
      });

      expect(newCase).toBeDefined();
      expect(newCase.codigo_sms).toMatch(/^CASO-[A-Z0-9]{3}$/);
      expect(newCase.is_offline).toBe(true);
      expect(newCase.estado).toBe('BORRADOR');

      // Check that it can immediately be read back from mockStorage
      const loaded = await caseService.getCase(newCase.codigo_sms);
      expect(loaded.codigo_sms).toBe(newCase.codigo_sms);
    });

    it('updates existing case in mockStorage when server is down', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      const updated = await caseService.updateCase('CASO-SJH', {
        estado: 'VALIDADO',
        formulario_web: { hechos: 'Hechos actualizados sin conexión' },
      });

      expect(updated).toBeDefined();
      expect(updated.codigo_sms).toBe('CASO-SJH');
      expect(updated.estado).toBe('VALIDADO');
      expect(updated.formulario_web?.hechos).toBe('Hechos actualizados sin conexión');
    });

    it('recovers from AbortError timeout (3000ms) with graceful mock fallback', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

      const result = await caseService.getCase('CASO-GTQ');
      expect(result.codigo_sms).toBe('CASO-GTQ');
      expect(result.is_offline).toBe(true);
      expect(result.estado).toBe('VALIDADO');
    });
  });
});
