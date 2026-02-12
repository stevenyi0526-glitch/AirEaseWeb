/**
 * AI Natural Language Search Bar Component
 * 
 * A prominent search bar that allows users to search for flights using
 * natural language queries like "下周五去上海最舒服的早班机"
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, MapPin, Loader2, X } from 'lucide-react';
import { parseNaturalLanguageSearch, paramsToSearchURL, getUserLocation } from '../../api/aiSearch';
import { findNearestAirport } from '../../api/airports';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

interface AISearchBarProps {
  className?: string;
  onSearchStart?: () => void;
  onSearchComplete?: () => void;
}

const EXAMPLE_QUERIES = [
  'Fly to Shanghai next Friday morning, most comfortable',
  'Cheapest flight to Tokyo tomorrow',
  'Business class to Singapore',
  'Morning flight to Seoul next Monday',
  'Budget flight to Bangkok this weekend',
];

const AISearchBar: React.FC<AISearchBarProps> = ({
  className = '',
  onSearchStart,
  onSearchComplete,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestAirport, setNearestAirport] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Animate placeholder with example queries
  useEffect(() => {
    const examples = EXAMPLE_QUERIES;
    let charIndex = 0;
    let currentExample = examples[placeholderIndex];
    let isDeleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const type = () => {
      if (!isDeleting) {
        if (charIndex <= currentExample.length) {
          setPlaceholder(currentExample.substring(0, charIndex));
          charIndex++;
          timeout = setTimeout(type, 50);
        } else {
          // Pause at the end
          timeout = setTimeout(() => {
            isDeleting = true;
            type();
          }, 2000);
        }
      } else {
        if (charIndex > 0) {
          charIndex--;
          setPlaceholder(currentExample.substring(0, charIndex));
          timeout = setTimeout(type, 30);
        } else {
          // Move to next example
          isDeleting = false;
          setPlaceholderIndex((prev) => (prev + 1) % examples.length);
        }
      }
    };

    type();

    return () => clearTimeout(timeout);
  }, [placeholderIndex]);

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
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setError(null);
    onSearchStart?.();

    try {
      const result = await parseNaturalLanguageSearch(
        query,
        userLocation || undefined
      );

      if (result.success && result.params) {
        // Navigate to flights page with parsed params + original query for AI recommendations
        const searchParams = paramsToSearchURL(result.params, query);
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
            {/* Top semicircle cutout — clip bottom half */}
            <div className="absolute -top-2.5 -right-2.5 w-5 h-5 overflow-hidden pointer-events-none">
              <div
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: '#f5f7f8', boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.05)' }}
              />
            </div>
            {/* Bottom semicircle cutout — clip top half */}
            <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 overflow-hidden pointer-events-none">
              <div
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: '#f5f7f8', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
              />
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-amber-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Middle — Input Area */}
          <div className="relative flex-1 flex items-center px-5 py-3">
            {/* Top label */}
            <span className="absolute top-2 left-5 text-[10px] font-semibold tracking-widest text-gray-400 uppercase select-none">
              Flight Query
            </span>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              placeholder={placeholder || 'Try: "fly to Tokyo tomorrow morning"'}
              className="w-full pt-4 pb-1 text-base sm:text-lg bg-transparent outline-none text-gray-700 placeholder-gray-400"
              disabled={isLoading}
            />

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
              disabled={isLoading || !query.trim()}
              className={cn(
                'px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200',
                'bg-[#8da2fb] hover:bg-[#7c92f0]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2 whitespace-nowrap'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>

        {/* Location Indicator — below the pass */}
        {nearestAirport && (
          <div className="absolute -bottom-7 left-5 flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>Flying from {nearestAirport}</span>
          </div>
        )}
        {isLocating && !nearestAirport && (
          <div className="absolute -bottom-7 left-5 flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Detecting your location...</span>
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
