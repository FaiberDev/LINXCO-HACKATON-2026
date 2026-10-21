import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CaseProvider } from './context/CaseContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MobileContainer } from './components/layout/MobileContainer';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Citizen Views
import { LandingPage } from './views/LandingPage';
import { ContinuationPortal } from './views/ContinuationPortal';
import { WizardView } from './views/WizardView';
import { CaseStatusView } from './views/CaseStatusView';
import { LearnRightsView } from './views/LearnRightsView';
import { LegalClinicView } from './views/LegalClinicView';

// Admin & Auth Views (Prompt 3)
import { LoginView } from './views/LoginView';
import { JefeDashboardView } from './views/JefeDashboardView';
import { AsesorDashboardView } from './views/AsesorDashboardView';

export const AppContent: React.FC = () => {
  return (
    <MobileContainer>
      <Header />
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Rutas del Ciudadano */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/portal" element={<ContinuationPortal />} />
          <Route path="/wizard" element={<WizardView />} />
          <Route path="/estado" element={<CaseStatusView />} />
          <Route path="/estado/:codigo" element={<CaseStatusView />} />
          <Route path="/aprender" element={<LearnRightsView />} />
          <Route path="/asesor" element={<LegalClinicView />} />

          {/* Rutas de Autenticación y Dashboards Administrativos */}
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
