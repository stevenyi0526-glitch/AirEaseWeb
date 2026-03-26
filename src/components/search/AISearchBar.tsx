/**
 * AI Natural Language Search Bar Component
 * 
 * A prominent search bar that allows users to search for flights using
 * natural language queries like "下周五去上海最舒服的早班机"
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, MapPin, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { parseNaturalLanguageSearch, paramsToSearchURL, getUserLocation } from '../../api/aiSearch';
import { findNearestAirport } from '../../api/airports';
import { addSearchHistory } from '../../api/searchHistory';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

interface AISearchBarProps {
  className?: string;
  onSearchStart?: () => void;
  onSearchComplete?: () => void;
}

const FIXED_PLACEHOLDER = 'Give me the cheapest single-person business flight to Tokyo tomorrow.';

const AISearchBar: React.FC<AISearchBarProps> = ({
  className = '',
  onSearchStart,
  onSearchComplete,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestAirport, setNearestAirport] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const marqueeContainerRef = useRef<HTMLDivElement>(null);

  // Show moving text when: empty query + not focused
  const showMarquee = !query && !isFocused && !isLoading;

  // Try to get user location on mount
  useEffect(() => {
    const getLocation = async () => {
      setIsLocating(true);
      try {
        const position = await getUserLocation();
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        
        // Find nearest airport
        const airport = await findNearestAirport(loc.lat, loc.lng, 150);
        setNearestAirport(`${airport.municipality || airport.name} (${airport.iataCode})`);
      } catch (e) {
        console.log('Location not available:', e);
      } finally {
        setIsLocating(false);
      }
    };

    getLocation();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require login before searching
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
      return;
    }
    
    // If the user hasn't typed anything, use the placeholder as the query
    let searchQuery = query.trim() || FIXED_PLACEHOLDER;

    // If the query is very short / looks like just a city name (no verbs, prepositions, etc.),
    // enrich it into a full sentence using defaults so the AI parser always has enough context.
    const looksLikeBareCityOrMinimal = (q: string): boolean => {
      const lower = q.toLowerCase();
      // If it contains flight-related keywords, it's already a proper query
      const flightKeywords = /\b(fly|flight|cheap|direct|morning|afternoon|evening|business|first class|economy|from|到|去|飞|便宜|最|航班|机票|直飞|商务|头等)\b/i;
      if (flightKeywords.test(q)) return false;
      // Short queries (1-3 words) without keywords are likely just city names
      const words = lower.split(/\s+/).filter(Boolean);
      return words.length <= 3;
    };

    if (looksLikeBareCityOrMinimal(searchQuery) && searchQuery !== FIXED_PLACEHOLDER) {
      const departure = nearestAirport || 'my nearest airport';
      searchQuery = `Give me the top rated economy flight from ${departure} to ${searchQuery} for 1 person`;
    }

    setIsLoading(true);
    setError(null);
    onSearchStart?.();

    try {
      const result = await parseNaturalLanguageSearch(
        searchQuery,
        userLocation || undefined
      );

      if (result.success && result.params) {
        // Save to search history
        addSearchHistory({
          departure_city: result.params.departure_city_code,
          arrival_city: result.params.arrival_city_code,
          departure_date: result.params.date,
          passengers: result.params.passengers,
          cabin_class: result.params.cabin_class,
        }).catch(() => {}); // fire-and-forget

        // Navigate to flights page with parsed params + original query for AI recommendations
        const searchParams = paramsToSearchURL(result.params, searchQuery);
        navigate(`/flights?${searchParams}`);
      } else {
        setError(result.error || 'Failed to parse search query');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      onSearchComplete?.();
    }
  };

  const handleClear = () => {
    setQuery('');
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Boarding Pass Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div
          className={cn(
            'relative flex items-stretch bg-white rounded-2xl shadow-lg transition-all duration-300 overflow-hidden',
            error ? 'ring-2 ring-red-300' : 'focus-within:shadow-xl'
          )}
        >
          {/* Left Stub — AI Icon */}
          <div className="relative flex items-center justify-center px-5 border-r-2 border-dashed border-gray-200">
            {/* Top semicircle cutout — show bottom half of circle */}
            <div className="absolute -top-2.5 -right-2.5 w-5 h-2.5 overflow-hidden pointer-events-none">
              <div
                className="absolute bottom-0 w-5 h-5 rounded-full"
                style={{ backgroundColor: '#f5f7f8', boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.05)' }}
              />
            </div>
            {/* Bottom semicircle cutout — show top half of circle */}
            <div className="absolute -bottom-2.5 -right-2.5 w-5 h-2.5 overflow-hidden pointer-events-none">
              <div
                className="absolute top-0 w-5 h-5 rounded-full"
                style={{ backgroundColor: '#f5f7f8', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
              />
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Middle — Input Area */}
          <div className="relative flex-1 flex items-center px-5 py-3">
            {/* Top label */}
            <span className="absolute top-2 left-5 text-[10px] font-semibold tracking-widest text-gray-400 uppercase select-none">
              {t('search.flightQuery')}
            </span>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder=""
              className="w-full pt-4 pb-1 pr-8 text-base sm:text-lg bg-transparent outline-none text-gray-700 placeholder-gray-400"
              disabled={isLoading}
            />

            {/* Mobile marquee scrolling placeholder */}
            {showMarquee && (
              <div
                ref={marqueeContainerRef}
                className="absolute left-5 right-8 top-1/2 translate-y-[2px] overflow-hidden pointer-events-none"
              >
                <div
                  className="inline-flex whitespace-nowrap text-base sm:text-lg text-gray-400"
                  style={{
                    animation: 'marquee-scroll 14s linear infinite',
                  }}
                >
                  <span className="pr-12">{t('search.placeholder')}</span>
                  <span className="pr-12">{t('search.placeholder')}</span>
                </div>
              </div>
            )}

            {/* Clear Button */}
            {query && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right — Search Button */}
          <div className="flex items-center pr-3">
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200',
                'bg-gradient-to-r from-blue-500 to-blue-200 hover:from-blue-600 hover:to-blue-300',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2 whitespace-nowrap'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">{t('common.search')}</span>
            </button>
          </div>
        </div>

        {/* Location Indicator — below the pass */}
        {nearestAirport && (
          <div className="absolute -bottom-7 left-5 flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>{t('search.flyingFrom', { airport: nearestAirport })}</span>
          </div>
        )}
        {isLocating && !nearestAirport && (
          <div className="absolute -bottom-7 left-5 flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{t('search.detectingLocation')}</span>
          </div>
        )}
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-8 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default AISearchBar;
