import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/auth';
import { ConstructionProvider } from './context/ConstructionContext';
import { ThemeProvider } from './context/ThemeContext';
import OfflineStatus from './components/common/OfflineStatus';

import { Toaster } from 'sonner';
import { lazyWithRetry } from './utils/lazyRetry';

// Lazy load dashboard components
const DesktopDashboard = lazyWithRetry(() => import('./pages/desktop/DesktopDashboard'));
const MobileDashboard = lazyWithRetry(() => import('./pages/mobile/MobileDashboard'));
const DesktopRoutes = lazyWithRetry(() => import('./routes/desktop/DesktopRoutes'));
const MobileRoutes = lazyWithRetry(() => import('./routes/mobile/MobileRoutes'));
const AboutDeveloper = lazyWithRetry(() => import('./pages/desktop/AboutDeveloper'));
const WorkerPortal      = lazyWithRetry(() => import('./modules/worker/WorkerPortal'));
const AttendanceKiosk   = lazyWithRetry(() => import('./modules/attendance/AttendanceKiosk'));

const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen bg-[var(--t-bg)]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--t-primary)]"></div>
  </div>
);

// Routes that exist on mobile — only convert to mobile if the segment is known
const MOBILE_ROUTES = new Set([
  'home', 'manage', 'budget', 'estimator', 'permits',
  'photos', 'profile', 'activity-logs', 'import', 'timelapse', 'analytics',
]);

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

        if (location.pathname.startsWith('/dashboard')) {
          const currentPath = location.pathname;
          let targetPath = '';

          if (mobile && currentPath.includes('/dashboard/desktop')) {
            // Only convert if the first path segment after /desktop/ is a known mobile route
            const afterDesktop = currentPath.replace('/dashboard/desktop/', '');
            const firstSegment = afterDesktop.split('/')[0];
            if (MOBILE_ROUTES.has(firstSegment)) {
              targetPath = currentPath.replace('/dashboard/desktop', '/dashboard/mobile');
            } else {
              // Desktop-only page (projects, finance, structure, etc.) → fallback to mobile home
              targetPath = '/dashboard/mobile/home';
            }
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());

  useEffect(() => {
    const syncAuth = () => setIsAuthenticated(authService.isAuthenticated());
    window.addEventListener('auth-changed', syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener('auth-changed', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  return (
    <ThemeProvider>
      <ConstructionProvider>
        <Router>
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
              <Route
                path="/about-developer"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <AboutDeveloper />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* Worker portal — standalone, no admin auth required */}
              <Route
                path="/worker"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <WorkerPortal />
                  </Suspense>
                }
              />
              {/* Kiosk — fullscreen NFC kiosk for site entrance, no auth required */}
              <Route
                path="/kiosk/:projectId"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AttendanceKiosk />
                  </Suspense>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <OfflineStatus />
            {/* Global toast notifications */}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{ style: { fontFamily: 'var(--body-font, sans-serif)' } }}
            />
          </ResponsiveRedirector>
        </Router>
      </ConstructionProvider>
    </ThemeProvider>
  );
}

export default App;
