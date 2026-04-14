import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import FlightsPage from './pages/FlightsPage';
import FlightDetailPage from './pages/FlightDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import TravelersPage from './pages/TravelersPage';
import PasswordUpdateModal from './components/auth/PasswordUpdateModal';

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
          </Route>
        </Routes>
      </Router>
      <PasswordUpdateModal
        isOpen={passwordUpdateRequired}
        onClose={clearPasswordUpdateRequired}
      />
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
