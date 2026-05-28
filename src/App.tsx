import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import FlightsPage from './pages/FlightsPage';
import FlightDetailPage from './pages/FlightDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import TravelersPage from './pages/TravelersPage';
import ExternalSkiRedirect from './pages/ExternalSkiRedirect';
import PasswordUpdateModal from './components/auth/PasswordUpdateModal';
import ServiceBusyToast from './components/common/ServiceBusyToast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  const { passwordUpdateRequired, clearPasswordUpdateRequired } = useAuth();
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="flights" element={<FlightsPage />} />
            <Route path="flights/:id" element={<FlightDetailPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="travelers" element={<TravelersPage />} />
            {/* External partner deep-link (e.g. skifinder.ai → /external/ski?arrival=YVR) */}
            <Route path="external/ski" element={<ExternalSkiRedirect />} />
            {/* Login is rendered as a modal triggered from the header / detail
                page guards — there is no dedicated /login page. Older code
                paths and external links to /login (or any other unknown URL)
                used to render a blank screen; redirect them to the homepage
                so the auth modal can be opened from there. */}
            <Route path="login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
      <PasswordUpdateModal
        isOpen={passwordUpdateRequired}
        onClose={clearPasswordUpdateRequired}
      />
      <ServiceBusyToast />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
