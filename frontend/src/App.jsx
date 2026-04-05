import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/auth';
import { ConstructionProvider } from './context/ConstructionContext';
import { ThemeProvider } from './context/ThemeContext';
import TourManager from './components/common/TourManager';

// Lazy load dashboard components
const DesktopDashboard = lazy(() => import('./pages/desktop/DesktopDashboard'));
const MobileDashboard = lazy(() => import('./pages/mobile/MobileDashboard'));
const DesktopRoutes = lazy(() => import('./routes/desktop/DesktopRoutes'));
const MobileRoutes = lazy(() => import('./routes/mobile/MobileRoutes'));

const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen bg-[var(--t-bg)]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--t-primary)]"></div>
  </div>
);

// Helper component to handle responsive redirection
const ResponsiveRedirector = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      if (mobile !== isMobile) {
        setIsMobile(mobile);

        // If currently in dashboard, synchronize paths
        if (location.pathname.startsWith('/dashboard')) {
          const currentPath = location.pathname;
          let targetPath = '';

          if (mobile && currentPath.includes('/dashboard/desktop')) {
            targetPath = currentPath.replace('/dashboard/desktop', '/dashboard/mobile');
          } else if (!mobile && currentPath.includes('/dashboard/mobile')) {
            targetPath = currentPath.replace('/dashboard/mobile', '/dashboard/desktop');
          }

          if (targetPath && targetPath !== currentPath) {
            navigate(targetPath, { replace: true });
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, location.pathname, navigate]);

  return children;
};

// Initial entry point redirection
const DashboardRouter = () => {
  const isMobile = window.innerWidth < 1024;
  return isMobile ? <Navigate to="/dashboard/mobile" replace /> : <Navigate to="/dashboard/desktop" replace />;
};

function App() {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <ThemeProvider>
      <ConstructionProvider>
        <Router>
          <TourManager />
          <ResponsiveRedirector>
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
          </ResponsiveRedirector>
        </Router>
      </ConstructionProvider>
    </ThemeProvider>
  );
}

export default App;
