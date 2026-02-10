import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import DesktopDashboard from './pages/desktop/DesktopDashboard';
import MobileDashboard from './pages/mobile/MobileDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/auth';

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
    return isMobile ? <MobileDashboard /> : <DesktopDashboard />;
  };

  return (
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
          path="/dashboard/desktop"
          element={
            <ProtectedRoute>
              <DesktopDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/mobile"
          element={
            <ProtectedRoute>
              <MobileDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
