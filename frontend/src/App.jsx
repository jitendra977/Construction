import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/auth';
import { ConstructionProvider } from './context/ConstructionContext';

// Lazy load dashboard components
const DesktopDashboard = lazy(() => import('./pages/desktop/DesktopDashboard'));
const MobileDashboard = lazy(() => import('./pages/mobile/MobileDashboard'));
const DesktopRoutes = lazy(() => import('./routes/desktop/DesktopRoutes'));
const MobileRoutes = lazy(() => import('./routes/mobile/MobileRoutes'));

const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const isAuthenticated = authService.isAuthenticated();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const DashboardRouter = () => {
    return isMobile ? <Navigate to="/dashboard/mobile" replace /> : <Navigate to="/dashboard/desktop" replace />;
  };

  return (
    <ConstructionProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/desktop/*"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingFallback />}>
                  <DesktopDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route path="*" element={<Suspense fallback={<LoadingFallback />}><DesktopRoutes /></Suspense>} />
          </Route>
          <Route
            path="/dashboard/mobile/*"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingFallback />}>
                  <MobileDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route path="*" element={<Suspense fallback={<LoadingFallback />}><MobileRoutes /></Suspense>} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ConstructionProvider>
  );
}

export default App;
