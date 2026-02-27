import React, { useState, useEffect, useRef } from 'react';
import { Plane, Sparkles, History, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SearchForm from '../components/search/SearchForm';
import AISearchBar from '../components/search/AISearchBar';
import { getGreeting } from '../utils/formatters';
import { apiClient } from '../api/client';
import { cn } from '../utils/cn';

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

const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchMode, setSearchMode] = useState<'ai' | 'classic'>('ai');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Load search history on mount
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingHistory(true);
      apiClient.get<SearchHistoryItem[]>('/v1/users/search-history')
        .then(res => setSearchHistory(res.data))
        .catch(err => console.error('Failed to load search history:', err))
        .finally(() => setLoadingHistory(false));
    }
  }, [isAuthenticated]);

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
    <div className="min-h-screen bg-[#f5f7f8] relative overflow-hidden font-causten">
      {/* Subtle decorative background blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-0 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0 pointer-events-none" />

      {/* Hero Section */}
      <div className="relative z-10 pt-24 pb-8 px-4 min-h-[45vh] flex flex-col justify-center">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
          {/* Logo Icon */}
          <div className="mb-6">
            <svg className="text-primary" fill="none" height="56" viewBox="0 0 24 24" width="56" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tight text-[#034891] mb-2 text-center font-causten font-bold">
  AirEase
</h1>

          <p className="text-sm sm:text-base text-slate-400 mb-1 text-center tracking-wide">
            Your professional flight butler
          </p>
          <p className="text-base sm:text-lg text-slate-500 mb-8 text-center">
            {getGreeting()}, {isAuthenticated ? user?.username : 'Traveler'}. Find your perfect flight.
          </p>

          {/* Search Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60">
              <button
                onClick={() => setSearchMode('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchMode === 'ai'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Search</span>
              </button>
              <button
                onClick={() => setSearchMode('classic')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchMode === 'classic'
                    ? 'bg-white text-gray-800 shadow-lg'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Plane className="w-4 h-4" />
                <span>Classic</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className={cn(
        "relative z-10 mx-auto px-4",
        searchMode === 'ai'
          ? "w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl"
          : "w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
      )}>
        {searchMode === 'ai' ? (
          <div className="mb-12">
            <AISearchBar />
            <p className="text-center text-slate-400 text-sm mt-10">
              Just describe what you're looking for in natural language
            </p>
          </div>
        ) : (
          <SearchForm />
        )}
      </div>

      {/* Features Section - Why Choose Airease (Airplane Window Design) */}
      <div className="relative z-10 mt-6 pb-4">
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-lg sm:text-xl font-semibold text-center text-slate-800 mb-8">
            Why Choose Airease?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {/* Card 1 - Smart Scoring */}
            <div
              className="bg-white text-center group cursor-default"
              style={{
                borderRadius: '55px',
                border: '12px solid #eef2f6',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              <div className="h-36 sm:h-40 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&h=400&q=80"
                  alt="Smart flight scoring"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=600&h=400&q=80';
                  }}
                />
              </div>
              <div className="px-5 pt-4" style={{ paddingBottom: '40px' }}>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm">Smart Scoring</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Our Airease Score helps you find flights with the best balance of price, comfort, and service.
                </p>
              </div>
            </div>

            {/* Card 2 - Compare Easily */}
            <div
              className="bg-white text-center group cursor-default"
              style={{
                borderRadius: '55px',
                border: '12px solid #eef2f6',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              <div className="h-36 sm:h-40 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1556388169-db19adc96088?auto=format&fit=crop&w=600&h=400&q=80"
                  alt="Compare flights easily"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=600&h=400&q=80';
                  }}
                />
              </div>
              <div className="px-5 pt-4" style={{ paddingBottom: '40px' }}>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm">Compare Easily</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  See all the details that matter - WiFi, seat pitch, meals, and more - at a glance.
                </p>
              </div>
            </div>

            {/* Card 3 - Best Value */}
            <div
              className="bg-white text-center group cursor-default"
              style={{
                borderRadius: '55px',
                border: '12px solid #eef2f6',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              <div className="h-36 sm:h-40 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1483450389192-3d2a08510e8e?auto=format&fit=crop&w=600&h=400&q=80"
                  alt="Best value flights"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=600&h=400&q=80';
                  }}
                />
              </div>
              <div className="px-5 pt-4" style={{ paddingBottom: '40px' }}>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm">Best Value</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  AI-powered analysis to ensure you're getting a great deal on every flight.
                </p>
              </div>
            </div>

            {/* Card 4 - Safety Records */}
            <div
              className="bg-white text-center group cursor-default"
              style={{
                borderRadius: '55px',
                border: '12px solid #eef2f6',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              <div className="h-36 sm:h-40 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=600&h=400&q=80"
                  alt="Safety incident records"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=600&h=400&q=80';
                  }}
                />
              </div>
              <div className="px-5 pt-4" style={{ paddingBottom: '40px' }}>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm">Safety Records</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Browse NTSB incident records for any airline and aircraft model — full transparency, all verified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flight History Section - Below "Why Airease" */}
      {isAuthenticated && (
        <div className="relative z-10 pb-12" ref={historyRef}>
          <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-slate-800">Recent Searches</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loadingHistory ? (
                  <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
                ) : searchHistory.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    No search history yet. Start searching to see your recent flights here.
                  </div>
                ) : (
                  searchHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 cursor-pointer group transition-colors"
                      onClick={() => {
                        window.location.href = `/flights?from=${encodeURIComponent(item.departure_city)}&to=${encodeURIComponent(item.arrival_city)}&date=${item.departure_date}${item.return_date ? `&returnDate=${item.return_date}` : ''}&adults=${item.passengers}&cabin=${item.cabin_class}`;
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            <Plane className="w-3.5 h-3.5 text-primary" />
                            <span>{item.departure_city}</span>
                            <span className="text-slate-300">→</span>
                            <span>{item.arrival_city}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 ml-5.5">
                            {formatDate(item.departure_date)}
                            {item.return_date && ` – ${formatDate(item.return_date)}`}
                            <span className="mx-1.5">·</span>
                            {item.passengers} pax · {item.cabin_class}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="p-1.5 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 text-center">
        <div className="mt-3 text-xs text-slate-300">
          © 2025 Airease Inc.
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
