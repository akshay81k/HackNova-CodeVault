import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import OrganizerDashboard from './pages/OrganizerDashboard';
import UserDashboard from './pages/UserDashboard';
import EventsPage from './pages/EventsPage';
import SubmitPage from './pages/SubmitPage';
import VerifyPage from './pages/VerifyPage';
import LandingPage from './pages/LandingPage';
import EventDetailPage from './pages/EventDetailPage';
import PlagiarismCheckPage from './pages/PlagiarismCheckPage';
import TimelinePage from './pages/TimelinePage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'organizer') return <Navigate to="/organizer" replace />;
  return <Navigate to="/user" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/organizer" element={
        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
          <OrganizerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/user" element={
        <ProtectedRoute allowedRoles={['user']}>
          <UserDashboard />
        </ProtectedRoute>
      } />
      <Route path="/submit/:eventId" element={
        <ProtectedRoute allowedRoles={['user']}>
          <SubmitPage />
        </ProtectedRoute>
      } />
      <Route path="/event/:eventId" element={
        <ProtectedRoute allowedRoles={['user']}>
          <EventDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/plagiarism/:eventId" element={
        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
          <PlagiarismCheckPage />
        </ProtectedRoute>
      } />
      <Route path="/timeline/:submissionId" element={
        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
          <TimelinePage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
