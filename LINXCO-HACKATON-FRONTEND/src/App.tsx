import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CaseProvider } from './context/CaseContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRouterController } from './components/auth/ProtectedRoute';
import { MobileContainer } from './components/layout/MobileContainer';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Citizen Views (Vista de Usuario: Solicitudes y Orientación)
import { LandingPage } from './views/LandingPage';
import { ContinuationPortal } from './views/ContinuationPortal';
import { WizardView } from './views/WizardView';
import { CaseStatusView } from './views/CaseStatusView';
import { LearnRightsView } from './views/LearnRightsView';
import { LegalClinicView } from './views/LegalClinicView';
import { WhatsAppBotControlView } from './views/WhatsAppBotControlView';

// Admin & Auth Views (RBAC Separado Físicamente)
import { LoginView } from './views/LoginView';
import { JefeDashboardView } from './views/JefeDashboardView';
import { AsesorDashboardView } from './views/AsesorDashboardView';

export const AppContent: React.FC = () => {
  return (
    <MobileContainer>
      <Header />
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Controlador de Vistas por Rol (RBAC Dispatcher) */}
          <Route path="/dashboard" element={<RoleRouterController fallbackToLogin={true} />} />
          <Route path="/admin" element={<RoleRouterController fallbackToLogin={true} />} />

          {/* 1. Vista de Usuario (Solicitudes Ciudadanas y Orientación) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/usuario" element={<ContinuationPortal />} />
          <Route path="/portal" element={<ContinuationPortal />} />
          <Route path="/wizard" element={<WizardView />} />
          <Route path="/estado" element={<CaseStatusView />} />
          <Route path="/estado/:codigo" element={<CaseStatusView />} />
          <Route path="/aprender" element={<LearnRightsView />} />
          <Route path="/asesor" element={<LegalClinicView />} />
          <Route path="/bot" element={<WhatsAppBotControlView />} />
          <Route path="/admin/bot" element={<WhatsAppBotControlView />} />

          {/* Autenticación Institucional */}
          <Route path="/login" element={<LoginView />} />

          {/* 2. Vista de Jefe (Métricas, supervisión y asignación de borradores) */}
          <Route
            path="/admin/jefe"
            element={
              <ProtectedRoute allowedRole="Jefe de Consultorio">
                <JefeDashboardView />
              </ProtectedRoute>
            }
          />

          {/* 3. Vista de Asesor (Gestión exclusiva de casos asignados y estados) */}
          <Route
            path="/admin/asesor"
            element={
              <ProtectedRoute allowedRole="Asesor Jurídico">
                <AsesorDashboardView />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </MobileContainer>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CaseProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </CaseProvider>
    </AuthProvider>
  );
};

export default App;
