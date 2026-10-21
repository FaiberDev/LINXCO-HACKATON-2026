import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Caso, FormularioWeb, CreateCasePayload, UpdateCasePayload } from '../types';
import * as caseService from '../services/caseService';

interface CaseContextType {
  activeCode: string | null;
  activeCase: Caso | null;
  wizardDraft: FormularioWeb;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  setActiveCode: (code: string | null) => void;
  setActiveCase: (caso: Caso | null) => void;
  updateWizardDraft: (patch: Partial<FormularioWeb>) => void;
  clearWizardDraft: () => void;
  loadCaseByCode: (code: string) => Promise<Caso>;
  saveCase: (payload: CreateCasePayload) => Promise<Caso>;
  modifyCase: (code: string, patch: UpdateCasePayload) => Promise<Caso>;
  resetSession: () => void;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACTIVE_CODE: 'justicia_active_code',
  ACTIVE_CASE: 'justicia_active_case',
  WIZARD_DRAFT: 'justicia_wizard_draft',
};

const DEFAULT_DRAFT: FormularioWeb = {
  mecanismo: 'Derecho de petición',
  categoria: 'SALUD',
  problema: '',
  ciudadano: {
    nombre_completo: '',
    numero_documento: '',
    telefono: '',
    municipio: '',
    vereda: '',
  },
  entidad: '',
  hechos: '',
  peticion: '',
  paso_actual: 1,
};

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCode, setActiveCodeState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CODE);
  });

  const [activeCase, setActiveCaseState] = useState<Caso | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CASE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [wizardDraft, setWizardDraftState] = useState<FormularioWeb>(() => {
    if (typeof window === 'undefined') return DEFAULT_DRAFT;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WIZARD_DRAFT);
      return raw ? { ...DEFAULT_DRAFT, ...JSON.parse(raw) } : DEFAULT_DRAFT;
    } catch {
      return DEFAULT_DRAFT;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Monitor browser online/offline status and verify backend health
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      if (!navigator.onLine) {
        setIsOffline(true);
      } else {
        // Ping backend to reset offline flag if backend is alive
        fetch('/api/auth/usuarios-demo')
          .then((res) => {
            if (res.ok) setIsOffline(false);
          })
          .catch(() => {
            // Keep offline if server is unreachable
          });
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Validate activeCode on startup; if it does not exist (like stale CASO-SMK), purge it
  useEffect(() => {
    if (activeCode && typeof window !== 'undefined') {
      caseService
        .getCase(activeCode)
        .then((caso) => {
          if (!caso.is_offline && navigator.onLine) {
            setIsOffline(false);
          }
        })
        .catch((err) => {
          const msg = (err as Error)?.message || '';
          const isNotFound =
            msg.toLowerCase().includes('no se encontró') ||
            (err as { status?: number })?.status === 404;
          if (isNotFound) {
            console.warn(`[CaseContext] Purging non-existent active code: ${activeCode}`);
            setActiveCode(null);
            setActiveCase(null);
          }
        });
    }
  }, []);

  const setActiveCode = useCallback((code: string | null) => {
    const clean = code ? code.trim().toUpperCase() : null;
    setActiveCodeState(clean);
    if (typeof window !== 'undefined') {
      if (clean) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CODE, clean);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CODE);
      }
    }
  }, []);

  const setActiveCase = useCallback((caso: Caso | null) => {
    setActiveCaseState(caso);
    if (caso?.codigo_sms) {
      setActiveCode(caso.codigo_sms);
    }
    if (caso?.is_offline) {
      setIsOffline(true);
    } else if (caso && !caso.is_offline && navigator.onLine) {
      setIsOffline(false);
    }
    if (typeof window !== 'undefined') {
      if (caso) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CASE, JSON.stringify(caso));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CASE);
      }
    }
  }, [setActiveCode]);

  const updateWizardDraft = useCallback((patch: Partial<FormularioWeb>) => {
    setWizardDraftState((prev) => {
      const updated: FormularioWeb = {
        ...prev,
        ...patch,
        ciudadano: {
          ...(prev.ciudadano || {}),
          ...(patch.ciudadano || {}),
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.WIZARD_DRAFT, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const clearWizardDraft = useCallback(() => {
    setWizardDraftState(DEFAULT_DRAFT);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.WIZARD_DRAFT);
    }
  }, []);

  const loadCaseByCode = useCallback(async (code: string): Promise<Caso> => {
    setIsLoading(true);
    setError(null);
    const cleanCode = code ? code.trim().toUpperCase() : '';
    try {
      const caso = await caseService.getCase(cleanCode);
      setActiveCase(caso);
      if (caso.is_offline) {
        setIsOffline(true);
      } else if (navigator.onLine) {
        setIsOffline(false);
      }
      // If the case contains a wizard draft, hydrate it
      if (caso.formulario_web) {
        updateWizardDraft(caso.formulario_web);
      }
      return caso;
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'No se pudo cargar el caso';
      setError(msg);
      // Si el caso no existe (404) y coincide con el código activo, purgar activeCode residual
      const isNotFound =
        msg.toLowerCase().includes('no se encontró') ||
        (err as { status?: number })?.status === 404;
      if (isNotFound && activeCode === cleanCode) {
        setActiveCode(null);
        setActiveCase(null);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeCode, setActiveCode, setActiveCase, updateWizardDraft]);

  const saveCase = useCallback(async (payload: CreateCasePayload): Promise<Caso> => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await caseService.createCase(payload);
      setActiveCase(created);
      if (created.is_offline) {
        setIsOffline(true);
      } else if (navigator.onLine) {
        setIsOffline(false);
      }
      return created;
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Error al guardar el caso';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setActiveCase]);

  const modifyCase = useCallback(async (code: string, patch: UpdateCasePayload): Promise<Caso> => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await caseService.updateCase(code, patch);
      setActiveCase(updated);
      if (updated.is_offline) {
        setIsOffline(true);
      } else if (navigator.onLine) {
        setIsOffline(false);
      }
      return updated;
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Error al actualizar el caso';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setActiveCase]);

  const resetSession = useCallback(() => {
    setActiveCode(null);
    setActiveCase(null);
    clearWizardDraft();
    setError(null);
  }, [setActiveCode, setActiveCase, clearWizardDraft]);

  return (
    <CaseContext.Provider
      value={{
        activeCode,
        activeCase,
        wizardDraft,
        isLoading,
        isOffline,
        error,
        setActiveCode,
        setActiveCase,
        updateWizardDraft,
        clearWizardDraft,
        loadCaseByCode,
        saveCase,
        modifyCase,
        resetSession,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
};

export function useCase(): CaseContextType {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCase must be used within a CaseProvider');
  }
  return context;
}
