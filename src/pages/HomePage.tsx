import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Sparkles, History, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useAuth } from '../contexts/AuthContext';
import SearchForm from '../components/search/SearchForm';
import AISearchBar from '../components/search/AISearchBar';
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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
    const locale = i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
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

          <p className="text-lg sm:text-xl text-slate-400 mb-8 text-center tracking-wide">
            {t('home.subtitle')}
          </p>

          {/* Search Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60">
              <button
                onClick={() => setSearchMode('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchMode === 'ai'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-200 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('home.aiSearch')}</span>
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
                <span>{t('home.classic')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className={cn(
        "relative z-10 mx-auto px-4 transition-all duration-500 ease-in-out",
        searchMode === 'ai'
          ? "w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl"
          : "w-full max-w-[340px] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
      )}>
        {/* AI Search */}
        <div
          className={cn(
            "transition-all duration-500 ease-in-out",
            searchMode === 'ai'
              ? "opacity-100 max-h-[600px] scale-100"
              : "opacity-0 max-h-0 scale-95 overflow-hidden pointer-events-none"
          )}
        >
          <div className="mb-12">
            <AISearchBar />
            <p className="text-center text-slate-400 text-sm mt-10">
              {t('home.aiSearchHint')}
            </p>
          </div>
        </div>

        {/* Classic Search — with boarding-pass rotate animation on mobile */}
        <div
          className={cn(
            "transition-all duration-500 ease-in-out",
            searchMode === 'classic'
              ? "opacity-100 max-h-[900px]"
              : "opacity-0 max-h-0 overflow-hidden pointer-events-none"
          )}
        >
          <div
            className={cn(
              "transform transition-transform duration-500 ease-in-out origin-center",
              searchMode === 'classic' ? "sm:rotate-0" : ""
            )}
          >
            <SearchForm />
          </div>
        </div>
      </div>

      {/* Flight History Section - Above "Why Airease" */}
      {isAuthenticated && (
        <div className="relative z-10 pt-8 pb-4" ref={historyRef}>
          <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-slate-800">{t('home.recentSearches')}</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loadingHistory ? (
                  <div className="p-6 text-center text-slate-400 text-sm">{t('common.loading')}</div>
                ) : searchHistory.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    {t('home.noSearchHistory')}
                  </div>
                ) : (
                  searchHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 cursor-pointer group transition-colors"
                      onClick={() => {
                        // Ensure date is not in the past
                        const today = new Date().toISOString().split('T')[0];
                        const searchDate = item.departure_date < today ? today : item.departure_date;
                        const returnDate = item.return_date
                          ? (item.return_date < searchDate ? '' : item.return_date)
                          : '';
                        const tripType = returnDate ? 'roundtrip' : 'oneway';
                        const params = new URLSearchParams({
                          from: item.departure_city,
                          to: item.arrival_city,
                          date: searchDate,
                          adults: String(item.passengers),
                          cabin: item.cabin_class,
                          tripType,
                        });
                        if (returnDate) params.set('returnDate', returnDate);
                        navigate(`/flights?${params.toString()}`);
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

      {/* Features Section - Why Choose Airease (Airplane Window Design) */}
      <div className="relative z-10 mt-6 pb-4">
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-lg sm:text-xl font-semibold text-center text-slate-800 mb-8">
            {t('home.whyChoose')}
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
                  src="/Smart Score.jpg"
                  alt="Smart flight scoring"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="px-5 pt-4" style={{ paddingBottom: '40px' }}>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm">{t('home.features.smartScoring')}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {t('home.features.smartScoringDesc')}
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
              <div className="h-36 sm:h-40 overflow-hidden flex">
                <img
                  src="/compare1.webp"
                  alt="Compare flights left"
                  className="w-1/2 h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <img
                  src="/compare2.png"
                  alt="Compare flights right"
                  className="w-1/2 h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="px-5 pt-4" style={{ paddingBottom: '40px' }}>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm">{t('home.features.compareEasily')}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {t('home.features.compareEasilyDesc')}
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
                  src="/bestvalue.webp"
                  alt="Best value flights"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="px-5 pt-4" style={{ paddingBottom: '40px' }}>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm">{t('home.features.perfectValue')}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {t('home.features.perfectValueDesc')}
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
                  src="/butterlanding.jpg"
                  alt="Safety incident records"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="px-5 pt-4" style={{ paddingBottom: '40px' }}>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm">{t('home.features.safetyRecords')}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {t('home.features.safetyRecordsDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
