import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plane, History, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';
import UserProfileDropdown from '../auth/UserProfileDropdown';
import { cn } from '../../utils/cn';
import { apiClient } from '../../api/client';

// Define SearchHistoryItem interface locally to avoid import issues
interface SearchHistoryItem {
  id: number;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  return_date: string | null;
  passengers: number;
  cabin_class: string;
  created_at: string;
}

const Header: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for global 'open-login-modal' event from other components
  useEffect(() => {
    const handleOpenLoginModal = () => setShowLoginModal(true);
    window.addEventListener('open-login-modal', handleOpenLoginModal);
    return () => window.removeEventListener('open-login-modal', handleOpenLoginModal);
  }, []);

  // Load search history when dropdown opens
  const handleFlightsClick = async () => {
    if (!isAuthenticated) {
      setShowHistoryDropdown(!showHistoryDropdown);
      return;
    }
    
    setShowHistoryDropdown(!showHistoryDropdown);
    if (!showHistoryDropdown) {
      setLoadingHistory(true);
      try {
        const response = await apiClient.get<SearchHistoryItem[]>('/v1/users/search-history');
        setSearchHistory(response.data);
      } catch (error) {
        console.error('Failed to load search history:', error);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const handleDeleteHistory = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/v1/users/search-history/${id}`);
      setSearchHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete search history:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-primary shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-white">
                Airease
              </span>
            </Link>

            {/* Navigation - Desktop (Flights with history dropdown) */}
            <nav className="hidden md:flex items-center gap-1 relative" ref={historyRef}>
              <button
                onClick={handleFlightsClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-white/90 hover:text-white hover:bg-white/10"
              >
                <Plane className="w-4 h-4" />
                Flights
                <ChevronDown className={cn("w-4 h-4 transition-transform", showHistoryDropdown && "rotate-180")} />
              </button>

              {/* Search History Dropdown */}
              {showHistoryDropdown && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-3 border-b bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-700">
                      <History className="w-4 h-4" />
                      <span className="font-medium">Search History</span>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {!isAuthenticated ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Please sign in to view search history
                      </div>
                    ) : loadingHistory ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Loading...
                      </div>
                    ) : searchHistory.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No search history yet
                      </div>
                    ) : (
                      searchHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer group"
                          onClick={() => {
                            // Navigate to search with these params - use correct parameter name 'date' instead of 'departDate'
                            window.location.href = `/flights?from=${encodeURIComponent(item.departure_city)}&to=${encodeURIComponent(item.arrival_city)}&date=${item.departure_date}${item.return_date ? `&returnDate=${item.return_date}` : ''}&adults=${item.passengers}&cabin=${item.cabin_class}`;
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                <span>{item.departure_city}</span>
                                <span className="text-gray-400">→</span>
                                <span>{item.arrival_city}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatDate(item.departure_date)}
                                {item.return_date && ` - ${formatDate(item.return_date)}`}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {item.passengers} passenger{item.passengers > 1 ? 's' : ''} · {item.cabin_class}
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteHistory(item.id, e)}
                              className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <UserProfileDropdown isHomePage={true} />
              ) : (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-4 py-2 rounded-lg font-medium transition-colors text-white hover:bg-white/10"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-4 py-2 rounded-button font-medium transition-colors bg-white text-primary hover:bg-white/90"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
};

export default Header;
