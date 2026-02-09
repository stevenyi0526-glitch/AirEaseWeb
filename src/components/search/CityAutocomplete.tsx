import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Plane, Building2 } from 'lucide-react';
import { autocompleteApi, type LocationSuggestion } from '../../api/autocomplete';
import { searchAirports } from '../../lib/airports';
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
  const [results, setResults] = useState<LocationSuggestion[]>([]);
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

  // Search using Amadeus Airport & City Search
  const searchCities = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await autocompleteApi.getLocations(searchQuery);
      setResults(response.suggestions);
      setUseLocalFallback(false);
    } catch (error) {
      // Fallback to local search
      console.log('Amadeus autocomplete failed, using local airport search fallback');
      const localResults = searchAirports(searchQuery, 10);
      // Convert local results to Amadeus-style LocationSuggestion format
      setResults(
        localResults.map((airport) => ({
          id: `A${airport.code}`,
          iataCode: airport.code,
          name: airport.name,
          detailedName: `${airport.city}/${airport.country}: ${airport.name}`,
          subType: 'AIRPORT',
          cityName: airport.city,
          countryName: airport.country,
        }))
      );
      setUseLocalFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchCities(newValue);
    }, 300);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (query.length >= 1 && results.length === 0) {
      searchCities(query);
    }
  };

  // Handle selection of a suggestion — set the IATA code as the value
  const handleSelect = (suggestion: LocationSuggestion) => {
    const code = suggestion.iataCode;
    setQuery(code);
    onChange(code, code);
    setIsOpen(false);
  };

  // Format a nice display name from Amadeus data
  const formatDisplayName = (s: LocationSuggestion): string => {
    // For cities: "Munich, Germany (MUC)"
    // For airports: "John F Kennedy Intl, New York (JFK)"
    const parts: string[] = [];

    // Use name (title-cased)
    const name = toTitleCase(s.name);
    parts.push(name);

    // Add city for airports (if different from name)
    if (s.subType === 'AIRPORT' && s.cityName) {
      const city = toTitleCase(s.cityName);
      if (!name.toLowerCase().includes(city.toLowerCase())) {
        parts[0] = `${name}, ${city}`;
      }
    }

    // Add country
    if (s.countryName) {
      parts[0] += `, ${toTitleCase(s.countryName)}`;
    }

    return parts[0];
  };

  // Title-case helper: "MUNICH INTERNATIONAL" → "Munich International"
  const toTitleCase = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

      {/* Dropdown with Amadeus results */}
      {isOpen && (query.length >= 1 || results.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((suggestion) => {
                const isAirport = suggestion.subType === 'AIRPORT';
                const Icon = isAirport ? Plane : Building2;
                const iconBg = isAirport ? 'bg-primary/10' : 'bg-amber-50';
                const iconColor = isAirport ? 'text-primary' : 'text-amber-600';
                const badge = isAirport ? 'Airport' : 'City';
                const badgeBg = isAirport ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700';

                return (
                  <li key={suggestion.id || suggestion.iataCode}>
                    <button
                      type="button"
                      onClick={() => handleSelect(suggestion)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                    >
                      <div
                        className={cn(
                          'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                          iconBg
                        )}
                      >
                        <Icon className={cn('w-4 h-4', iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {formatDisplayName(suggestion)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-mono font-semibold text-primary">
                            {suggestion.iataCode}
                          </span>
                          {suggestion.score && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span>Popularity: {suggestion.score}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 font-semibold rounded',
                          badgeBg
                        )}
                      >
                        {badge}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : query.length >= 1 ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <p className="text-sm">No airports or cities found</p>
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
