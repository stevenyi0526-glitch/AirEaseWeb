import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

export type TripType = 'roundtrip' | 'oneway' | 'multicity';
export type SortBy = 'score' | 'price' | 'duration' | 'departure' | 'arrival';
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export interface MultiCityLeg {
  from: string;
  to: string;
  date: string;
}

export interface FlightSearchFilters {
  // Search params
  from: string;
  to: string;
  date: string;
  returnDate: string;
  tripType: TripType;
  adults: number;
  children: number;
  cabin: CabinClass;
  
  // Multi-city legs
  multiCityLegs: MultiCityLeg[];

  // Filter params
  stops: string; // 'any', '0', '1', '2+'
  minPrice: number | undefined;
  maxPrice: number | undefined;
  airlines: string[];
  departureTimeMin: number | undefined; // hour 0-24
  departureTimeMax: number | undefined;
  aircraftType: string | undefined; // 'widebody', 'narrowbody'
  alliance: string | undefined; // 'star', 'oneworld', 'skyteam'

  // Sort
  sortBy: SortBy;
}

const DEFAULT_FILTERS: FlightSearchFilters = {
  from: '',
  to: '',
  date: '',
  returnDate: '',
  tripType: 'roundtrip',
  adults: 1,
  children: 0,
  cabin: 'economy',
  multiCityLegs: [],
  stops: 'any',
  minPrice: undefined,
  maxPrice: undefined,
  airlines: [],
  departureTimeMin: undefined,
  departureTimeMax: undefined,
  aircraftType: undefined,
  alliance: undefined,
  sortBy: 'score',
};

export function useFlightSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const filters: FlightSearchFilters = useMemo(() => {
    const airlines = searchParams.get('airlines');
    
    // Parse multi-city legs from URL
    let multiCityLegs: MultiCityLeg[] = [];
    const multiCityLegsParam = searchParams.get('multiCityLegs');
    if (multiCityLegsParam) {
      try {
        multiCityLegs = JSON.parse(multiCityLegsParam);
      } catch (e) {
        console.error('Failed to parse multiCityLegs:', e);
      }
    }

    return {
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      date: searchParams.get('date') || '',
      returnDate: searchParams.get('returnDate') || '',
      tripType: (searchParams.get('tripType') as TripType) || 'roundtrip',
      adults: parseInt(searchParams.get('adults') || '1', 10),
      children: parseInt(searchParams.get('children') || '0', 10),
      cabin: (searchParams.get('cabin') as CabinClass) || 'economy',
      multiCityLegs,
      stops: searchParams.get('stops') || 'any',
      minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!, 10) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : undefined,
      airlines: airlines ? airlines.split(',').filter(Boolean) : [],
      departureTimeMin: searchParams.get('depMin') ? parseInt(searchParams.get('depMin')!, 10) : undefined,
      departureTimeMax: searchParams.get('depMax') ? parseInt(searchParams.get('depMax')!, 10) : undefined,
      aircraftType: searchParams.get('aircraftType') || undefined,
      alliance: searchParams.get('alliance') || undefined,
      sortBy: (searchParams.get('sortBy') as SortBy) || 'score',
    };
  }, [searchParams]);

  // Update filters (partial update)
  const updateFilters = useCallback((updates: Partial<FlightSearchFilters>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      // Handle special cases
      if (key === 'airlines' && Array.isArray(value)) {
        if (value.length > 0) {
          newParams.set('airlines', value.join(','));
        } else {
          newParams.delete('airlines');
        }
        return;
      }

      if (key === 'departureTimeMin') {
        if (value !== undefined) {
          newParams.set('depMin', String(value));
        } else {
          newParams.delete('depMin');
        }
        return;
      }

      if (key === 'departureTimeMax') {
        if (value !== undefined) {
          newParams.set('depMax', String(value));
        } else {
          newParams.delete('depMax');
        }
        return;
      }

      // Handle undefined/empty values
      if (value === undefined || value === '' || value === null) {
        newParams.delete(key);
        return;
      }

      // Handle default values (remove from URL)
      const defaultValue = DEFAULT_FILTERS[key as keyof FlightSearchFilters];
      if (value === defaultValue) {
        newParams.delete(key);
        return;
      }

      newParams.set(key, String(value));
    });

    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Reset filters to defaults (keeping search params)
  const resetFilters = useCallback(() => {
    const newParams = new URLSearchParams();

    // Keep only essential search params
    const keepParams = ['from', 'to', 'date', 'returnDate', 'tripType', 'adults', 'children', 'cabin'];
    keepParams.forEach(key => {
      const value = searchParams.get(key);
      if (value) {
        newParams.set(key, value);
      }
    });

    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Build search URL from current params
  const buildSearchUrl = useCallback((overrides?: Partial<FlightSearchFilters>) => {
    const params = new URLSearchParams();
    const mergedFilters = { ...filters, ...overrides };

    Object.entries(mergedFilters).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === null) return;
      if (Array.isArray(value) && value.length === 0) return;

      if (key === 'airlines' && Array.isArray(value)) {
        params.set('airlines', value.join(','));
        return;
      }

      const defaultValue = DEFAULT_FILTERS[key as keyof FlightSearchFilters];
      if (value !== defaultValue) {
        params.set(key, String(value));
      }
    });

    return `/flights?${params.toString()}`;
  }, [filters]);

  // Check if filters are valid for search
  const isValidSearch = useMemo(() => {
    return Boolean(filters.from && filters.to && filters.date);
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.stops !== 'any' ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.airlines.length > 0 ||
      filters.departureTimeMin !== undefined ||
      filters.departureTimeMax !== undefined
    );
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    buildSearchUrl,
    isValidSearch,
    hasActiveFilters,
  };
}

// Helper to format filters for API call
export function filtersToApiParams(filters: FlightSearchFilters) {
  return {
    from: filters.from,
    to: filters.to,
    date: filters.date,
    returnDate: filters.returnDate || undefined,
    tripType: filters.tripType,
    adults: filters.adults,
    children: filters.children,
    cabin: filters.cabin,
    stops: filters.stops,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    airlines: filters.airlines.length > 0 ? filters.airlines : undefined,
    departureTimeMin: filters.departureTimeMin,
    departureTimeMax: filters.departureTimeMax,
    sortBy: filters.sortBy,
  };
}
