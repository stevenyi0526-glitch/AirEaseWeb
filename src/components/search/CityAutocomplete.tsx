import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Plane } from 'lucide-react';
import { autocompleteApi, type LocationSuggestion, type AirportSuggestion } from '../../api/autocomplete';
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

  // Search cities using SerpAPI Autocomplete
  const searchCities = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Use SerpAPI Google Flights Autocomplete
      const response = await autocompleteApi.getAirports(searchQuery);
      setResults(response.suggestions);
      setUseLocalFallback(false);
    } catch (error) {
      // Fallback to local search
      console.log('Using local airport search fallback');
      const localResults = searchAirports(searchQuery, 10);
      // Convert local results to LocationSuggestion format
      setResults(localResults.map((airport, index) => ({
        position: index + 1,
        name: `${airport.city}, ${airport.country}`,
        type: 'city' as const,
        description: airport.country,
        airports: [{
          name: `${airport.city} Airport`,
          code: airport.code,
          city: airport.city,
        }]
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

  // Check if a string looks like an airport code (3 uppercase letters)
  const isAirportCode = (str: string): boolean => {
    return /^[A-Z]{3}$/i.test(str.trim());
  };

  // Handle selection of a city (selects first airport)
  const handleSelectCity = (suggestion: LocationSuggestion) => {
    const firstAirport = suggestion.airports?.[0];
    let code = firstAirport?.code || '';
    
    // If this is a direct airport match (no airports array, type is null),
    // and the original query looks like an airport code, use that
    if (!code && !suggestion.airports && !suggestion.type) {
      // Check if the query is an airport code
      if (isAirportCode(query)) {
        code = query.toUpperCase();
      }
    }
    
    const displayValue = code || suggestion.name;
    setQuery(displayValue);
    onChange(displayValue, code);
    setIsOpen(false);
  };

  // Handle selection of a specific airport
  const handleSelectAirport = (airport: AirportSuggestion) => {
    const displayValue = airport.code;
    setQuery(displayValue);
    onChange(displayValue, airport.code);
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

      {/* Dropdown with grouped airports */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
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
              {results.map((suggestion) => (
                <li key={suggestion.id || `${suggestion.name}-${suggestion.position}`}>
                  {/* City/Region Header */}
                  {suggestion.airports && suggestion.airports.length > 0 ? (
                    // City with airports - show grouped
                    <div className="border-b border-gray-100 last:border-b-0">
                      {/* City header - clickable to select first airport */}
                      <button
                        type="button"
                        onClick={() => handleSelectCity(suggestion)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {suggestion.name}
                          </p>
                          {suggestion.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {suggestion.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {suggestion.airports.length} airport{suggestion.airports.length > 1 ? 's' : ''}
                        </span>
                      </button>
                      
                      {/* Airports under this city */}
                      <div className="pl-6 bg-gray-50/50">
                        {suggestion.airports.map((airport) => (
                          <button
                            key={airport.code}
                            type="button"
                            onClick={() => handleSelectAirport(airport)}
                            className="w-full px-4 py-2 flex items-center gap-3 hover:bg-primary/5 transition-colors text-left"
                          >
                            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center">
                              <Plane className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate">
                                {airport.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="font-mono font-semibold text-primary">
                                  {airport.code}
                                </span>
                                {airport.distance && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span>{airport.distance}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : !suggestion.type ? (
                    // Direct airport match (no type = airport code search like "HKG")
                    <button
                      type="button"
                      onClick={() => {
                        // If the search query is already an airport code, use it directly
                        // Otherwise try to extract from name or use query as fallback
                        let code: string;
                        if (/^[A-Za-z]{3}$/.test(query.trim())) {
                          // User searched with an airport code like "NRT", "hkg", etc.
                          code = query.trim().toUpperCase();
                        } else {
                          // Try to extract from name (look for uppercase pattern)
                          const codeMatch = suggestion.name.match(/\(([A-Z]{3})\)/);
                          code = codeMatch ? codeMatch[1] : query.trim().toUpperCase().substring(0, 3);
                        }
                        setQuery(code);
                        onChange(code, code);
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-primary/5 transition-colors text-left border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Plane className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {suggestion.name}
                        </p>
                        {suggestion.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {suggestion.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary font-semibold rounded">
                        Airport
                      </span>
                    </button>
                  ) : (
                    // Region without airports
                    <button
                      type="button"
                      onClick={() => handleSelectCity(suggestion)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {suggestion.name}
                        </p>
                        {suggestion.description && (
                          <p className="text-sm text-gray-500 truncate">
                            {suggestion.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                        {suggestion.type}
                      </span>
                    </button>
                  )}
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
