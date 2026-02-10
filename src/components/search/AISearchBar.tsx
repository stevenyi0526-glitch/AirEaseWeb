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
      {/* Main Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className={cn(
          'relative flex items-center rounded-2xl bg-white shadow-lg border-2 transition-all duration-300',
          error ? 'border-red-300' : 'border-transparent focus-within:border-purple-400 focus-within:shadow-xl'
        )}>
          {/* AI Icon */}
          <div className="pl-4 pr-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder={placeholder || 'Try: "fly to Tokyo tomorrow morning"'}
            className="flex-1 py-4 px-2 text-base sm:text-lg bg-transparent outline-none placeholder-gray-400"
            disabled={isLoading}
          />

          {/* Clear Button */}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Search Button */}
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={cn(
              'mr-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all duration-200',
              'bg-gradient-to-r from-purple-500 to-pink-500',
              'hover:from-purple-600 hover:to-pink-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
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

        {/* Location Indicator */}
        {nearestAirport && (
          <div className="absolute -bottom-6 left-4 flex items-center gap-1 text-xs text-white/80">
            <MapPin className="w-3 h-3" />
            <span>Flying from {nearestAirport}</span>
          </div>
        )}
        {isLocating && (
          <div className="absolute -bottom-6 left-4 flex items-center gap-1 text-xs text-white/80">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Detecting your location...</span>
          </div>
        )}
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default AISearchBar;
