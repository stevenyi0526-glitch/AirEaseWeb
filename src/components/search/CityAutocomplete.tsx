import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, Plane, Building2 } from 'lucide-react';
import { autocompleteApi, type LocationSuggestion } from '../../api/autocomplete';
import { searchAirports, AIRPORTS } from '../../lib/airports';
import { cn } from '../../utils/cn';

// Set of major international airport IATA codes for prioritization
const MAJOR_AIRPORT_CODES = new Set(AIRPORTS.map(a => a.code));

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
  placeholder = undefined,
  label,
  className,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  // Bug 2548304: 防止在 debounce 等待期间先闪出 "no results" 又跳成有结果。
  // 只有真正发起过一次搜索且收到响应后，才允许显示空结果提示。
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update query when value changes externally
  // Bug 2548116: 当父组件外部修改 value (例如对调出发/到达城市) 时，本地的
  // results 仍然是上一次输入的搜索结果。必须同时清空 results，否则用户再次
  // 聚焦时会先看到旧城市的列表。
  useEffect(() => {
    setQuery(value);
    setResults([]);
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
      setHasSearched(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await autocompleteApi.getLocations(searchQuery);
      // Sort results: prioritize large international airports over small/regional ones
      const sorted = [...response.suggestions].sort((a, b) => {
        const aIsMajor = MAJOR_AIRPORT_CODES.has(a.iataCode);
        const bIsMajor = MAJOR_AIRPORT_CODES.has(b.iataCode);
        if (aIsMajor && !bIsMajor) return -1;
        if (!aIsMajor && bIsMajor) return 1;
        // Among same priority, prefer airports over cities
        if (a.subType === 'AIRPORT' && b.subType !== 'AIRPORT') return -1;
        if (a.subType !== 'AIRPORT' && b.subType === 'AIRPORT') return 1;
        // Respect original popularity score
        return (b.score ?? 0) - (a.score ?? 0);
      });
      // Bug 2548284: Amadeus 对 CJK 地名（如"华盛顿"）经常返回空数组。
      // 命中空结果时回退到本地机场搜索（含中文别名映射），保证传统搜寻
      // 与 AI 搜索行为一致。
      if (sorted.length === 0) {
        const localResults = searchAirports(searchQuery, 10);
        if (localResults.length > 0) {
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
        } else {
          setResults([]);
          setUseLocalFallback(false);
        }
      } else {
        setResults(sorted);
        setUseLocalFallback(false);
      }
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
      setHasSearched(true);
    }
  }, []);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    // Bug 2548084: notify the parent on every keystroke so that pressing
    // "Search" without picking a dropdown suggestion still passes the typed
    // value upstream. Previously the parent state stayed empty, causing the
    // form's `if (!from || !to) return;` early-exit and the click felt dead.
    onChange(newValue);
    // Bug 2548304: reset the "already searched" flag so the dropdown stays
    // in a neutral state during the 300ms debounce instead of flashing
    // "no results" before the network response arrives.
    setHasSearched(false);

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
        <label className="block text-base font-semibold text-text-secondary mb-1.5">
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
          placeholder={placeholder || t('cityAutocomplete.searchPlaceholder')}
          className="input-field pl-10 pr-10 text-base h-12"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown with Amadeus results.
          Bug 2548158: in narrow inputs (multi-city columns) the dropdown was
          horizontally clipped and touch scroll was inconsistent. Force a
          minimum width that fits a typical "International, City, Country"
          string, cap to viewport width, and enable smooth iOS momentum scroll. */}
      {isOpen && (query.length >= 1 || results.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full min-w-[320px] max-w-[calc(100vw-24px)] bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {isLoading ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
              <span className="text-sm">{t('cityAutocomplete.searching')}</span>
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((suggestion) => {
                const isAirport = suggestion.subType === 'AIRPORT';
                const Icon = isAirport ? Plane : Building2;
                const iconBg = isAirport ? 'bg-primary/10' : 'bg-amber-50';
                const iconColor = isAirport ? 'text-primary' : 'text-amber-600';
                const badge = isAirport ? t('cityAutocomplete.airport') : t('cityAutocomplete.city');
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
                        <p className="font-medium text-gray-900 break-words">
                          {formatDisplayName(suggestion)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-mono font-semibold text-primary">
                            {suggestion.iataCode}
                          </span>
                          {suggestion.score && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span>{t('cityAutocomplete.popularity', { score: suggestion.score })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'flex-shrink-0 text-xs px-2 py-0.5 font-semibold rounded whitespace-nowrap',
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
          ) : query.length >= 1 && hasSearched ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <p className="text-sm">{t('cityAutocomplete.noResults')}</p>
              <p className="text-xs mt-1">{t('cityAutocomplete.tryDifferent')}</p>
            </div>
          ) : null}

          {useLocalFallback && results.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                {t('cityAutocomplete.usingLocalDb')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;
