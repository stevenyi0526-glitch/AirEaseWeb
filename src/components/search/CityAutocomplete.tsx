import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Plane } from 'lucide-react';
import { citiesApi } from '../../api/auth';
import { searchAirports } from '../../lib/airports';
import type { CitySearchResult } from '../../api/types';
import { cn } from '../../utils/cn';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string, airportCode?: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Search city or airport',
  label,
  className,
}) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update query when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search cities
  const searchCities = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Try API first
      const apiResults = await citiesApi.search(searchQuery);
      setResults(apiResults);
      setUseLocalFallback(false);
    } catch (error) {
      // Fallback to local search
      console.log('Using local airport search fallback');
      const localResults = searchAirports(searchQuery, 10);
      setResults(localResults.map(airport => ({
        placeId: `local_${airport.code}`,
        city: airport.city,
        country: airport.country,
        airportCode: airport.code,
        displayName: `${airport.city}, ${airport.country} (${airport.code})`,
      })));
      setUseLocalFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      searchCities(newValue);
    }, 300);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (query.length >= 2 && results.length === 0) {
      searchCities(query);
    }
  };

  const handleSelect = (result: CitySearchResult) => {
    // Use airport code if available, otherwise city name
    const displayValue = result.airportCode || result.city;
    setQuery(displayValue);
    onChange(displayValue, result.airportCode);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-semibold text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="input-field pl-10 pr-10"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((result) => (
                <li key={result.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {result.city}
                        {result.airportCode && (
                          <span className="ml-2 text-primary font-bold">
                            {result.airportCode}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {result.country}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <p className="text-sm">No cities found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : null}
          
          {useLocalFallback && results.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Using local airport database
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;
