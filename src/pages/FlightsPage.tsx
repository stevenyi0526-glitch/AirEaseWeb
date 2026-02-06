import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plane, SlidersHorizontal, Search, Calendar, ChevronDown } from 'lucide-react';
import { flightsApi } from '../api/flights';
import { generateRecommendations } from '../api/recommendations';
import { trackSortAction, trackFlightSelection } from '../api/preferences';
import { AIRLINES } from '../lib/mockApi';
import { useFlightSearchParams, filtersToApiParams, type SortBy } from '../hooks/useFlightSearchParams';
import { useAuth } from '../contexts/AuthContext';
import FilterPanel from '../components/filters/FilterPanel';
import SortDropdown from '../components/filters/SortDropdown';
import FlightCard from '../components/flights/FlightCard';
import FlightCardSkeleton from '../components/flights/FlightCardSkeleton';
import PriceTrendChart from '../components/flights/PriceTrendChart';
import CompareTray from '../components/compare/CompareTray';
import FilterBottomSheet from '../components/filters/FilterBottomSheet';
import SearchLoading from '../components/common/SearchLoading';
import CurrencySelector, { type CurrencyCode } from '../components/common/CurrencySelector';
import AIRecommendations from '../components/flights/AIRecommendations';
import PassengerSelector from '../components/search/PassengerSelector';
import { cn } from '../utils/cn';
import type { FlightWithScore } from '../api/types';

/**
 * Flight Search Results Page
 * - Desktop: 3-column layout (Filters | Results | Compare Tray)
 * - Mobile: Single column with bottom sheets for filters
 * 
 * For round trips: Uses sub-tabs to switch between Departure/Return flights
 * Uses the SAME FlightCard UI for all trip types
 */
const FlightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { filters, updateFilters, resetFilters, isValidSearch, hasActiveFilters } = useFlightSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  
  // Local date state for editing before search
  const [editDepartDate, setEditDepartDate] = useState(filters.date);
  const [editReturnDate, setEditReturnDate] = useState(filters.returnDate);
  
  // Round trip sub-tab state: 'departure' or 'return'
  const [activeFlightTab, setActiveFlightTab] = useState<'departure' | 'return'>('departure');
  
  // Selected flights for round trip (stored to show in detail page)
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<FlightWithScore | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<FlightWithScore | null>(null);
  
  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<Array<FlightWithScore & {
    recommendation_score?: number;
    recommendation_reasons?: string[];
  }>>([]);
  const [recommendationExplanation, setRecommendationExplanation] = useState('');
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // Pagination state - show 40 flights at a time
  const FLIGHTS_PER_PAGE = 40;
  const [displayCount, setDisplayCount] = useState(FLIGHTS_PER_PAGE);

  // Get user's traveler type for personalized scoring
  const travelerType = user?.label || 'default';

  // Determine if this is effectively a one-way search
  // (explicit one-way, OR roundtrip without return date)
  const isEffectivelyOneWay = filters.tripType === 'oneway' || 
    (filters.tripType === 'roundtrip' && !filters.returnDate);

  // Fetch flights using real SerpAPI - always sort by price initially (Google Flights default)
  // This query is used for one-way searches (or roundtrip without return date as fallback)
  const { data: rawData, isLoading, error, isFetching } = useQuery({
    queryKey: ['flights', filters.from, filters.to, filters.date, filters.returnDate, filters.cabin, filters.adults, filters.children, currency, filters.stops, travelerType],
    queryFn: async () => {
      const apiParams = filtersToApiParams(filters);
      // Convert stops to number for SerpAPI
      let stopsNum: number | undefined;
      if (apiParams.stops === '0') stopsNum = 1;      // Nonstop only
      else if (apiParams.stops === '1') stopsNum = 2;  // 1 stop or fewer
      else if (apiParams.stops === '2+') stopsNum = 3; // 2 stops or fewer
      else stopsNum = undefined;                       // Any
      
      const response = await flightsApi.search({
        from: apiParams.from,
        to: apiParams.to,
        date: apiParams.date,
        returnDate: apiParams.returnDate,
        cabin: apiParams.cabin,
        adults: apiParams.adults,
        children: apiParams.children,
        currency,
        stops: stopsNum,
        maxPrice: apiParams.maxPrice,
        // Always fetch sorted by price from API (Google Flights default)
        sortBy: 'price',
        // Pass traveler type for personalized scoring
        travelerType: travelerType as 'student' | 'business' | 'family' | 'default',
      });
      
      // Filter out flights with price = 0 (invalid data)
      const validFlights = response.flights.filter(f => f.flight.price > 0);
      
      return {
        ...response,
        flights: validFlights,
        meta: {
          ...response.meta,
          total: validFlights.length,
        }
      };
    },
    // Run for one-way searches OR roundtrip without return date (fallback)
    enabled: isValidSearch && isEffectivelyOneWay && filters.tripType !== 'multicity',
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Round trip query - uses separate one-way searches for individual pricing
  const { 
    data: roundTripData, 
    isLoading: isLoadingRoundTrip, 
    isFetching: isFetchingRoundTrip 
  } = useQuery({
    queryKey: ['roundtrip-flights', filters.from, filters.to, filters.date, filters.returnDate, filters.cabin, filters.adults, currency, filters.stops, travelerType],
    queryFn: async () => {
      const apiParams = filtersToApiParams(filters);
      let stopsNum: number | undefined;
      if (apiParams.stops === '0') stopsNum = 1;
      else if (apiParams.stops === '1') stopsNum = 2;
      else if (apiParams.stops === '2+') stopsNum = 3;
      else stopsNum = undefined;
      
      const response = await flightsApi.searchRoundTrip({
        from: apiParams.from,
        to: apiParams.to,
        date: apiParams.date,
        returnDate: filters.returnDate!,
        cabin: apiParams.cabin,
        adults: apiParams.adults,
        currency,
        stops: stopsNum,
        travelerType: travelerType as 'student' | 'business' | 'family' | 'default',
      });
      
      // Filter out flights with price = 0
      const result = {
        ...response,
        departureFlights: response.departureFlights.filter(f => f.flight.price > 0),
        returnFlights: response.returnFlights.filter(f => f.flight.price > 0),
      };
      
      // Debug logging for round trip data
      console.log('[RoundTrip API Response]', {
        departureFlightsCount: result.departureFlights.length,
        returnFlightsCount: result.returnFlights.length,
        departurePriceInsights: response.departurePriceInsights ? {
          lowestPrice: response.departurePriceInsights.lowestPrice,
          priceLevel: response.departurePriceInsights.priceLevel,
        } : 'NOT AVAILABLE',
        returnPriceInsights: response.returnPriceInsights ? {
          lowestPrice: response.returnPriceInsights.lowestPrice,
          priceLevel: response.returnPriceInsights.priceLevel,
        } : 'NOT AVAILABLE',
      });
      
      return result;
    },
    // Only run for round trip searches with return date
    enabled: isValidSearch && filters.tripType === 'roundtrip' && !!filters.returnDate,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Multi-city query - searches each leg independently
  const {
    data: multiCityData,
    isLoading: isLoadingMultiCity,
    isFetching: isFetchingMultiCity,
  } = useQuery({
    queryKey: ['multicity-flights', filters.multiCityLegs, filters.cabin, filters.adults, currency, filters.stops, travelerType],
    queryFn: async () => {
      let stopsNum: number | undefined;
      if (filters.stops === '0') stopsNum = 1;
      else if (filters.stops === '1') stopsNum = 2;
      else if (filters.stops === '2+') stopsNum = 3;
      else stopsNum = undefined;
      
      const results = await flightsApi.searchMultiCity(
        filters.multiCityLegs,
        {
          cabin: filters.cabin,
          adults: filters.adults,
          currency,
          stops: stopsNum,
          travelerType: travelerType as 'student' | 'business' | 'family' | 'default',
        }
      );
      
      // Filter out flights with price = 0 from each leg
      return results.map(legData => ({
        ...legData,
        flights: legData.flights.filter(f => f.flight.price > 0),
      }));
    },
    // Only run for multi-city searches with valid legs
    enabled: isValidSearch && filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Active leg tab for multi-city (0-indexed)
  const [activeMultiCityLeg, setActiveMultiCityLeg] = useState(0);

  // Filter and sort flights locally based on user's filter/sort selection (no API call needed)
  const sortedFlights = useMemo(() => {
    if (!rawData?.flights) return [];
    
    // First apply all filters
    let flights = [...rawData.flights];
    
    // Filter by stops
    if (filters.stops !== 'any') {
      const stopsFilter = filters.stops;
      flights = flights.filter(f => {
        const stops = f.flight.stops;
        if (stopsFilter === '0') return stops === 0; // Direct only
        if (stopsFilter === '1') return stops <= 1;   // 1 stop or less
        if (stopsFilter === '2+') return stops >= 2;  // 2+ stops
        return true;
      });
    }
    
    // Filter by departure time
    if (filters.departureTimeMin !== undefined && filters.departureTimeMax !== undefined) {
      flights = flights.filter(f => {
        const depHour = new Date(f.flight.departureTime).getHours();
        // Handle overnight time range (e.g., 22-6)
        if (filters.departureTimeMin! > filters.departureTimeMax!) {
          return depHour >= filters.departureTimeMin! || depHour < filters.departureTimeMax!;
        }
        return depHour >= filters.departureTimeMin! && depHour < filters.departureTimeMax!;
      });
    }
    
    // Filter by price range
    if (filters.minPrice !== undefined) {
      flights = flights.filter(f => f.flight.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      flights = flights.filter(f => f.flight.price <= filters.maxPrice!);
    }
    
    // Filter by airlines
    if (filters.airlines.length > 0) {
      flights = flights.filter(f => filters.airlines.includes(f.flight.airlineCode));
    }
    
    // Filter by aircraft type (widebody vs narrowbody)
    if (filters.aircraftType) {
      const widebodyModels = ['777', '787', '747', 'A350', 'A380', 'A330', 'A340'];
      const narrowbodyModels = ['737', 'A320', 'A321', 'A319', 'A220', 'E190', 'E175', 'CRJ'];
      
      flights = flights.filter(f => {
        const aircraft = f.flight.aircraftModel?.toUpperCase() || '';
        if (filters.aircraftType === 'widebody') {
          return widebodyModels.some(model => aircraft.includes(model));
        } else if (filters.aircraftType === 'narrowbody') {
          return narrowbodyModels.some(model => aircraft.includes(model));
        }
        return true;
      });
    }
    
    // Then apply sorting
    switch (filters.sortBy) {
      case 'score':
        return flights.sort((a, b) => b.score.overallScore - a.score.overallScore);
      case 'price':
        return flights.sort((a, b) => a.flight.price - b.flight.price);
      case 'duration':
        return flights.sort((a, b) => a.flight.durationMinutes - b.flight.durationMinutes);
      case 'departure':
        return flights.sort((a, b) => 
          new Date(a.flight.departureTime).getTime() - new Date(b.flight.departureTime).getTime()
        );
      case 'arrival':
        return flights.sort((a, b) => 
          new Date(a.flight.arrivalTime).getTime() - new Date(b.flight.arrivalTime).getTime()
        );
      default:
        return flights;
    }
  }, [rawData?.flights, filters.sortBy, filters.stops, filters.departureTimeMin, filters.departureTimeMax, filters.minPrice, filters.maxPrice, filters.airlines, filters.aircraftType]);

  // Helper function to filter and sort flights (reusable for both one-way and round trip)
  const filterAndSortFlights = (flights: FlightWithScore[]): FlightWithScore[] => {
    let result = [...flights];
    
    // Filter by stops
    if (filters.stops !== 'any') {
      const stopsFilter = filters.stops;
      result = result.filter(f => {
        const stops = f.flight.stops;
        if (stopsFilter === '0') return stops === 0;
        if (stopsFilter === '1') return stops <= 1;
        if (stopsFilter === '2+') return stops >= 2;
        return true;
      });
    }
    
    // Filter by departure time
    if (filters.departureTimeMin !== undefined && filters.departureTimeMax !== undefined) {
      result = result.filter(f => {
        const depHour = new Date(f.flight.departureTime).getHours();
        if (filters.departureTimeMin! > filters.departureTimeMax!) {
          return depHour >= filters.departureTimeMin! || depHour < filters.departureTimeMax!;
        }
        return depHour >= filters.departureTimeMin! && depHour < filters.departureTimeMax!;
      });
    }
    
    // Filter by price range
    if (filters.minPrice !== undefined) {
      result = result.filter(f => f.flight.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter(f => f.flight.price <= filters.maxPrice!);
    }
    
    // Filter by airlines
    if (filters.airlines.length > 0) {
      result = result.filter(f => filters.airlines.includes(f.flight.airlineCode));
    }
    
    // Filter by aircraft type
    if (filters.aircraftType) {
      const widebodyModels = ['777', '787', '747', 'A350', 'A380', 'A330', 'A340'];
      const narrowbodyModels = ['737', 'A320', 'A321', 'A319', 'A220', 'E190', 'E175', 'CRJ'];
      
      result = result.filter(f => {
        const aircraft = f.flight.aircraftModel?.toUpperCase() || '';
        if (filters.aircraftType === 'widebody') {
          return widebodyModels.some(model => aircraft.includes(model));
        } else if (filters.aircraftType === 'narrowbody') {
          return narrowbodyModels.some(model => aircraft.includes(model));
        }
        return true;
      });
    }
    
    // Apply sorting
    switch (filters.sortBy) {
      case 'score':
        return result.sort((a, b) => b.score.overallScore - a.score.overallScore);
      case 'price':
        return result.sort((a, b) => a.flight.price - b.flight.price);
      case 'duration':
        return result.sort((a, b) => a.flight.durationMinutes - b.flight.durationMinutes);
      case 'departure':
        return result.sort((a, b) => 
          new Date(a.flight.departureTime).getTime() - new Date(b.flight.departureTime).getTime()
        );
      case 'arrival':
        return result.sort((a, b) => 
          new Date(a.flight.arrivalTime).getTime() - new Date(b.flight.arrivalTime).getTime()
        );
      default:
        return result;
    }
  };

  // Filtered and sorted round trip flights
  const filteredDepartureFlights = useMemo(() => {
    if (!roundTripData?.departureFlights) return [];
    return filterAndSortFlights(roundTripData.departureFlights);
  }, [roundTripData?.departureFlights, filters.sortBy, filters.stops, filters.departureTimeMin, filters.departureTimeMax, filters.minPrice, filters.maxPrice, filters.airlines, filters.aircraftType]);

  const filteredReturnFlights = useMemo(() => {
    if (!roundTripData?.returnFlights) return [];
    return filterAndSortFlights(roundTripData.returnFlights);
  }, [roundTripData?.returnFlights, filters.sortBy, filters.stops, filters.departureTimeMin, filters.departureTimeMax, filters.minPrice, filters.maxPrice, filters.airlines, filters.aircraftType]);

  // ============================================================================
  // UNIFIED ACTIVE LEG FLIGHTS
  // ============================================================================
  // All trip types are ultimately single-way searches:
  // - One-way: 1 search
  // - Round-trip: 2 single-way searches (departure + return)
  // - Multi-city: N single-way searches (leg1, leg2, ...)
  //
  // This computed value returns the CURRENTLY ACTIVE leg's flights,
  // which powers AI Recommendations and Price Analysis consistently.
  // ============================================================================
  const currentLegFlights = useMemo(() => {
    const isRoundTrip = filters.tripType === 'roundtrip' && filters.returnDate;
    const isMultiCity = filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2;
    
    if (isMultiCity) {
      // Multi-city: return the active leg's flights
      return multiCityData?.[activeMultiCityLeg]?.flights || [];
    }
    
    if (isRoundTrip) {
      // Round-trip: return departure or return flights based on active tab
      return activeFlightTab === 'departure' 
        ? filteredDepartureFlights 
        : filteredReturnFlights;
    }
    
    // One-way (or round-trip without return date as fallback)
    return sortedFlights;
  }, [
    filters.tripType, 
    filters.returnDate, 
    filters.multiCityLegs.length,
    activeFlightTab, 
    activeMultiCityLeg,
    sortedFlights, 
    filteredDepartureFlights, 
    filteredReturnFlights,
    multiCityData
  ]);

  // Current leg's price insights (for Price Analysis chart)
  const currentLegPriceInsights = useMemo(() => {
    const isRoundTrip = filters.tripType === 'roundtrip' && filters.returnDate;
    const isMultiCity = filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2;
    
    // Debug logging for price insights
    console.log('[PriceInsights Debug]', {
      tripType: filters.tripType,
      returnDate: filters.returnDate,
      activeFlightTab,
      isRoundTrip,
      isMultiCity,
      departurePriceInsights: roundTripData?.departurePriceInsights ? 'YES' : 'NO',
      returnPriceInsights: roundTripData?.returnPriceInsights ? 'YES' : 'NO',
      rawDataPriceInsights: rawData?.priceInsights ? 'YES' : 'NO',
    });
    
    if (isMultiCity) {
      return multiCityData?.[activeMultiCityLeg]?.priceInsights || null;
    }
    
    if (isRoundTrip) {
      const result = activeFlightTab === 'departure' 
        ? roundTripData?.departurePriceInsights 
        : roundTripData?.returnPriceInsights;
      console.log('[PriceInsights] Selected for', activeFlightTab, ':', result ? 'Available' : 'Not available');
      return result;
    }
    
    return rawData?.priceInsights || null;
  }, [
    filters.tripType, 
    filters.returnDate, 
    filters.multiCityLegs.length,
    activeFlightTab, 
    activeMultiCityLeg,
    rawData?.priceInsights,
    roundTripData?.departurePriceInsights,
    roundTripData?.returnPriceInsights,
    multiCityData
  ]);

  // Current leg's route info (for Price Analysis chart labels)
  const currentLegRoute = useMemo(() => {
    const isRoundTrip = filters.tripType === 'roundtrip' && filters.returnDate;
    const isMultiCity = filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2;
    
    if (isMultiCity) {
      const leg = filters.multiCityLegs[activeMultiCityLeg];
      return { from: leg?.from || '', to: leg?.to || '' };
    }
    
    if (isRoundTrip) {
      return activeFlightTab === 'departure' 
        ? { from: filters.from, to: filters.to }
        : { from: filters.to, to: filters.from }; // Reversed for return
    }
    
    return { from: filters.from, to: filters.to };
  }, [
    filters.tripType, 
    filters.returnDate, 
    filters.multiCityLegs,
    filters.from,
    filters.to,
    activeFlightTab, 
    activeMultiCityLeg
  ]);

  // Is currently loading the active leg?
  const isLoadingCurrentLeg = useMemo(() => {
    const isRoundTrip = filters.tripType === 'roundtrip' && filters.returnDate;
    const isMultiCity = filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2;
    
    if (isMultiCity) {
      return isLoadingMultiCity || isFetchingMultiCity;
    }
    
    if (isRoundTrip) {
      return isLoadingRoundTrip || isFetchingRoundTrip;
    }
    
    return isLoading || isFetching;
  }, [
    filters.tripType, 
    filters.returnDate, 
    filters.multiCityLegs.length,
    isLoading, 
    isFetching,
    isLoadingRoundTrip, 
    isFetchingRoundTrip,
    isLoadingMultiCity, 
    isFetchingMultiCity
  ]);

  // Handle date change and search
  const handleNewSearch = () => {
    updateFilters({ 
      date: editDepartDate, 
      returnDate: editReturnDate 
    });
  };

  // Sync local date state when filters change externally
  React.useEffect(() => {
    setEditDepartDate(filters.date);
    setEditReturnDate(filters.returnDate);
  }, [filters.date, filters.returnDate]);

  // Reset display count when filters or sort changes
  React.useEffect(() => {
    setDisplayCount(FLIGHTS_PER_PAGE);
  }, [filters.sortBy, filters.stops, filters.departureTimeMin, filters.departureTimeMax, filters.minPrice, filters.maxPrice, filters.airlines, filters.aircraftType]);

  // ============================================================================
  // AI RECOMMENDATIONS - Always based on currentLegFlights (single-way focus)
  // ============================================================================
  // Since all searches are ultimately single-way:
  // - One-way: direct search result
  // - Round-trip: departure leg OR return leg (based on active tab)
  // - Multi-city: active leg's search result
  // We always generate recommendations for the CURRENT ACTIVE LEG.
  // ============================================================================
  useEffect(() => {
    const fetchRecommendations = async () => {
      // Use currentLegFlights - works for all trip types!
      if (!currentLegFlights || currentLegFlights.length === 0) {
        setRecommendations([]);
        return;
      }
      
      setIsLoadingRecommendations(true);
      try {
        const result = await generateRecommendations(currentLegFlights);
        setRecommendations(result.recommendations);
        setRecommendationExplanation(result.explanation);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        // Fallback: use top 3 by score
        const top3 = [...currentLegFlights]
          .sort((a, b) => b.score.overallScore - a.score.overallScore)
          .slice(0, 3);
        setRecommendations(top3);
        setRecommendationExplanation('Top rated flights based on our scoring algorithm.');
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [currentLegFlights]); // Simple dependency - just the current leg's flights!

  // Track sort preference changes
  const handleSortChange = (sortBy: SortBy) => {
    updateFilters({ sortBy });
    
    // Track sort preference for AI recommendations (fire and forget)
    if (isAuthenticated) {
      trackSortAction(sortBy);
    }
  };

  // Track flight selection when user clicks to view details
  const handleFlightClick = (flight: FlightWithScore) => {
    if (isAuthenticated) {
      const depTime = flight.flight.departureTime;
      trackFlightSelection({
        flight_id: flight.flight.id,
        flight_number: flight.flight.flightNumber,
        departure_city: flight.flight.departureCityCode,
        arrival_city: flight.flight.arrivalCityCode,
        departure_time: typeof depTime === 'string' ? depTime : String(depTime),
        airline: flight.flight.airline,
        airline_code: flight.flight.airlineCode,
        price: flight.flight.price,
        overall_score: flight.score.overallScore,
        cabin: flight.flight.cabin,
      });
    }
  };

  // Calculate available airlines with counts
  const availableAirlines = useMemo(() => {
    if (!rawData?.flights) {
      return AIRLINES.map(a => ({ code: a.code, name: a.name }));
    }

    const counts: Record<string, number> = {};
    rawData.flights.forEach((f: { flight: { airlineCode: string } }) => {
      counts[f.flight.airlineCode] = (counts[f.flight.airlineCode] || 0) + 1;
    });

    return AIRLINES
      .filter(a => counts[a.code])
      .map(a => ({ code: a.code, name: a.name, count: counts[a.code] }));
  }, [rawData?.flights]);

  // Calculate price range
  const priceRange = useMemo(() => {
    if (!rawData?.flights || rawData.flights.length === 0) {
      return { min: 100, max: 2000 };
    }
    const prices = rawData.flights.map((f: { flight: { price: number } }) => f.flight.price);
    return {
      min: Math.floor(Math.min(...prices) / 50) * 50,
      max: Math.ceil(Math.max(...prices) / 50) * 50,
    };
  }, [rawData?.flights]);

  // Redirect if no valid search params
  if (!isValidSearch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Plane className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            No search parameters
          </h2>
          <p className="text-text-secondary mb-6">
            Please start a new search from the home page.
          </p>
          <Link to="/" className="btn-primary">
            Start New Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-surface shadow-sticky">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back + Route */}
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <button
                onClick={() => navigate('/')}
                className="flex-shrink-0 p-2 -ml-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-alt transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 md:gap-3">
                  {filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2 ? (
                    // Multi-city: show all cities in sequence
                    <div className="flex items-center gap-1 flex-wrap">
                      {filters.multiCityLegs.map((leg, i) => (
                        <React.Fragment key={i}>
                          {i === 0 && (
                            <span className="text-lg md:text-xl font-bold text-text-primary">
                              {leg.from}
                            </span>
                          )}
                          <Plane className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-lg md:text-xl font-bold text-text-primary">
                            {leg.to}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    // One-way or Round-trip: simple from → to
                    <>
                      <span className="text-lg md:text-xl font-bold text-text-primary">
                        {filters.from}
                      </span>
                      {filters.tripType === 'roundtrip' ? (
                        <div className="flex items-center gap-1 text-primary">
                          <Plane className="w-4 h-4 md:w-5 md:h-5" />
                          <Plane className="w-4 h-4 md:w-5 md:h-5 rotate-180" />
                        </div>
                      ) : (
                        <Plane className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                      )}
                      <span className="text-lg md:text-xl font-bold text-text-primary">
                        {filters.to}
                      </span>
                    </>
                  )}
                </div>
                {/* Trip Type Badge */}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    filters.tripType === 'roundtrip' 
                      ? "bg-primary/10 text-primary" 
                      : filters.tripType === 'multicity'
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                  )}>
                    {filters.tripType === 'roundtrip' ? 'Round Trip' : 
                     filters.tripType === 'multicity' ? `Multi-city (${filters.multiCityLegs.length} flights)` : 'One Way'}
                  </span>
                  {filters.tripType === 'roundtrip' && filters.returnDate && (
                    <span className="text-xs text-text-muted">
                      Return: {filters.returnDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Date Pickers + Search Button */}
            <div className="hidden md:flex items-center gap-2 bg-surface-alt rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-text-secondary" />
              <input
                type="date"
                value={editDepartDate}
                onChange={(e) => setEditDepartDate(e.target.value)}
                className="bg-transparent text-sm text-text-primary border-none outline-none cursor-pointer"
                min={new Date().toISOString().split('T')[0]}
              />
              {filters.tripType === 'roundtrip' && (
                <>
                  <span className="text-text-muted">-</span>
                  <input
                    type="date"
                    value={editReturnDate}
                    onChange={(e) => setEditReturnDate(e.target.value)}
                    className="bg-transparent text-sm text-text-primary border-none outline-none cursor-pointer"
                    min={editDepartDate}
                  />
                </>
              )}
              <button
                onClick={handleNewSearch}
                disabled={isFetching || (editDepartDate === filters.date && editReturnDate === filters.returnDate)}
                className={cn(
                  "ml-2 p-1.5 rounded-lg transition-colors",
                  editDepartDate === filters.date && editReturnDate === filters.returnDate
                    ? "text-text-muted cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary-dark"
                )}
                aria-label="Search with new dates"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Search Info + Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Passenger Selector */}
              <PassengerSelector
                adults={filters.adults}
                children={filters.children}
                onChange={(adults, children) => updateFilters({ adults, children })}
                compact
              />

              {/* Currency Selector */}
              <CurrencySelector
                value={currency}
                onChange={setCurrency}
                compact
              />

              <SortDropdown
                value={filters.sortBy}
                onChange={handleSortChange}
              />

              {/* Mobile filter button */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className={cn(
                  'lg:hidden p-2 rounded-lg border transition-colors',
                  hasActiveFilters
                    ? 'bg-primary-light border-primary text-primary'
                    : 'border-border text-text-secondary hover:text-text-primary hover:bg-surface-alt'
                )}
                aria-label="Open filters"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left: Filters (Desktop only) - Independent scroll */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 scrollbar-thin">
              <FilterPanel
                filters={filters}
                onUpdateFilters={updateFilters}
                onResetFilters={resetFilters}
                availableAirlines={availableAirlines}
                priceRange={priceRange}
                trackPreferences={isAuthenticated}
              />
            </div>
          </div>

          {/* Center: Flight Results */}
          <div className="flex-1 min-w-0">
            {/* AI Recommendations Section - Uses currentLegFlights (single-way focus) */}
            {!isLoadingCurrentLeg && !error && currentLegFlights.length > 0 && (
              <AIRecommendations
                recommendations={recommendations}
                explanation={recommendationExplanation}
                isLoading={isLoadingRecommendations}
                onFlightClick={handleFlightClick}
              />
            )}

            {/* Price Insights Chart - Uses currentLegPriceInsights (single-way focus) */}
            {!isLoadingCurrentLeg && !error && currentLegPriceInsights && (
              <PriceTrendChart
                priceInsights={currentLegPriceInsights}
                currency={currency}
                departureCity={currentLegRoute.from}
                arrivalCity={currentLegRoute.to}
                className="mb-4"
              />
            )}

            {/* Results Header */}
            <div className="mb-4">
              <h1 className="text-xl md:text-2xl font-bold text-text-primary">
                {isLoadingCurrentLeg ? (
                  'Searching...'
                ) : error ? (
                  'Search error'
                ) : (
                  // Show correct count based on current leg
                  `${currentLegFlights.length} Flights Available`
                )}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {currentLegRoute.from} → {currentLegRoute.to}
                {' • '}Sorted by {filters.sortBy === 'score' 
                  ? (travelerType === 'student' ? 'Best Price' : 'Airease Score') 
                  : filters.sortBy}
                {hasActiveFilters && ' • Filters applied'}
              </p>
            </div>

            {/* Round Trip Notice Banner */}
            {filters.tripType === 'roundtrip' && filters.returnDate && !isLoadingCurrentLeg && currentLegFlights.length > 0 && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Plane className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    Round Trip - Select Departure & Return
                  </p>
                  <p className="text-xs text-text-secondary">
                    Choose a departure flight, then select your return flight. Prices shown are round trip totals.
                  </p>
                </div>
              </div>
            )}

            {/* Multi-city Notice Banner */}
            {filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2 && !isLoadingMultiCity && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <Plane className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    Multi-city Trip - {filters.multiCityLegs.length} Flights
                  </p>
                  <p className="text-xs text-amber-700">
                    Select flights for each leg using the tabs above. Each leg is priced independently.
                  </p>
                </div>
              </div>
            )}

            {/* Flight List - Uses currentLegFlights (single-way focus) */}
            <div className="space-y-4">
              {/* Loading state */}
              {isLoadingCurrentLeg ? (
                // Loading state with animated plane and skeletons
                <>
                  <SearchLoading from={currentLegRoute.from} to={currentLegRoute.to} />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <FlightCardSkeleton key={i} />
                  ))}
                </>
              ) : error ? (
                // Error state
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-4">
                    <Plane className="w-8 h-8 text-danger" />
                  </div>
                  <p className="text-text-primary font-medium mb-2">
                    Failed to load flights
                  </p>
                  <p className="text-text-secondary mb-4">
                    Please try again or adjust your search.
                  </p>
                  <button onClick={() => navigate(0)} className="btn-primary">
                    Try Again
                  </button>
                </div>
              ) : currentLegFlights.length === 0 ? (
                // Empty state
                <div className="text-center py-12">
                  <Plane className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <p className="text-text-primary font-medium mb-2">
                    No flights found
                  </p>
                  <p className="text-text-secondary mb-4">
                    Try adjusting your filters or search criteria.
                  </p>
                  {hasActiveFilters && (
                    <button onClick={resetFilters} className="btn-secondary">
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                // Flight cards - SAME UI for all trip types, with sub-tabs for round trip
                <>
                  {/* Sub-tabs for Round Trip */}
                  {filters.tripType === 'roundtrip' && filters.returnDate && (
                    <div className="mb-4">
                      {/* Tab buttons */}
                      <div className="flex border-b border-divider bg-white rounded-t-xl overflow-hidden">
                        <button
                          onClick={() => setActiveFlightTab('departure')}
                          className={cn(
                            "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                            activeFlightTab === 'departure' 
                              ? "text-primary bg-primary/5" 
                              : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Plane className="w-4 h-4" />
                            <span>Departure: {filters.from} → {filters.to}</span>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                              {filters.date}
                            </span>
                          </div>
                          {activeFlightTab === 'departure' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                          {selectedDepartureFlight && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </button>
                        <button
                          onClick={() => setActiveFlightTab('return')}
                          className={cn(
                            "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                            activeFlightTab === 'return' 
                              ? "text-primary bg-primary/5" 
                              : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Plane className="w-4 h-4 rotate-180" />
                            <span>Return: {filters.to} → {filters.from}</span>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                              {filters.returnDate}
                            </span>
                          </div>
                          {activeFlightTab === 'return' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                          {selectedReturnFlight && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </button>
                      </div>
                      
                      {/* Selected flights summary */}
                      {(selectedDepartureFlight || selectedReturnFlight) && (
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-3 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium">Selected:</span>
                            {selectedDepartureFlight && (
                              <span className="bg-white px-2 py-1 rounded shadow-sm">
                                ✈️ {selectedDepartureFlight.flight.flightNumber} - ${selectedDepartureFlight.flight.price}
                              </span>
                            )}
                            {selectedReturnFlight && (
                              <span className="bg-white px-2 py-1 rounded shadow-sm">
                                ✈️ {selectedReturnFlight.flight.flightNumber} - ${selectedReturnFlight.flight.price}
                              </span>
                            )}
                            {selectedDepartureFlight && selectedReturnFlight && (
                              <span className="font-bold text-primary">
                                Total: ${selectedDepartureFlight.flight.price + selectedReturnFlight.flight.price}
                              </span>
                            )}
                          </div>
                          {selectedDepartureFlight && selectedReturnFlight && (
                            <button
                              onClick={() => {
                                navigate(`/flights/${selectedDepartureFlight.flight.id}`, {
                                  state: {
                                    flightWithScore: selectedDepartureFlight,
                                    returnFlight: selectedReturnFlight,
                                    isRoundTrip: true,
                                    totalPrice: selectedDepartureFlight.flight.price + selectedReturnFlight.flight.price,
                                  }
                                });
                              }}
                              className="btn-primary text-sm px-4 py-2"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tabs for Multi-city */}
                  {filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2 && (
                    <div className="mb-4">
                      {/* Tab buttons for each leg */}
                      <div className="flex border-b border-divider bg-white rounded-t-xl overflow-hidden">
                        {filters.multiCityLegs.map((leg, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveMultiCityLeg(index)}
                            className={cn(
                              "flex-1 px-3 py-3 text-sm font-medium transition-colors relative",
                              activeMultiCityLeg === index 
                                ? "text-primary bg-primary/5" 
                                : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                            )}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                                <Plane className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-semibold">{leg.from} → {leg.to}</span>
                              <span className="text-xs text-gray-400">{leg.date}</span>
                            </div>
                            {activeMultiCityLeg === index && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                      
                      {/* Current leg info banner */}
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 flex items-center gap-3 border-x border-b border-amber-200">
                        <div className="p-2 rounded-full bg-amber-100">
                          <Plane className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900">
                            Flight {activeMultiCityLeg + 1}: {filters.multiCityLegs[activeMultiCityLeg]?.from} → {filters.multiCityLegs[activeMultiCityLeg]?.to}
                          </p>
                          <p className="text-xs text-amber-700">
                            {filters.multiCityLegs[activeMultiCityLeg]?.date} • {multiCityData?.[activeMultiCityLeg]?.flights?.length || 0} flights available
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Flight List - Uses currentLegFlights (single-way focus) */}
                  {(() => {
                    // All trip types use currentLegFlights - already computed above!
                    const isRoundTrip = filters.tripType === 'roundtrip' && filters.returnDate;
                    
                    // For round-trip, clicking selects the flight for that leg
                    const handleFlightSelect = isRoundTrip 
                      ? (flight: FlightWithScore) => {
                          if (activeFlightTab === 'departure') {
                            setSelectedDepartureFlight(flight);
                            // Auto-switch to return tab after selecting departure
                            if (!selectedReturnFlight) {
                              setActiveFlightTab('return');
                            }
                          } else {
                            setSelectedReturnFlight(flight);
                          }
                        }
                      : undefined;
                    
                    return (
                      <>
                        {currentLegFlights.slice(0, displayCount).map((flight) => (
                          <div 
                            key={flight.flight.id}
                            onClick={() => handleFlightSelect?.(flight)}
                            className={cn(
                              isRoundTrip && "cursor-pointer",
                              isRoundTrip && activeFlightTab === 'departure' && selectedDepartureFlight?.flight.id === flight.flight.id && "ring-2 ring-primary rounded-xl",
                              isRoundTrip && activeFlightTab === 'return' && selectedReturnFlight?.flight.id === flight.flight.id && "ring-2 ring-primary rounded-xl"
                            )}
                          >
                            <FlightCard
                              flightWithScore={flight}
                            />
                          </div>
                        ))}
                        
                        {/* Load More Button */}
                        {displayCount < currentLegFlights.length && (
                          <div className="flex justify-center pt-4">
                            <button
                              onClick={() => setDisplayCount(prev => prev + FLIGHTS_PER_PAGE)}
                              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-colors shadow-lg hover:shadow-xl"
                            >
                              <ChevronDown className="w-5 h-5" />
                              Load More Flights
                              <span className="text-sm opacity-80">
                                ({currentLegFlights.length - displayCount} more)
                              </span>
                            </button>
                          </div>
                        )}
                        
                        {/* Showing count indicator */}
                        {currentLegFlights.length > FLIGHTS_PER_PAGE && (
                          <p className="text-center text-sm text-text-muted pt-2">
                            Showing {Math.min(displayCount, currentLegFlights.length)} of {currentLegFlights.length} flights
                          </p>
                        )}

                        {/* Login prompt for non-authenticated users */}
                        {!isAuthenticated && rawData?.meta?.restrictedCount && rawData.meta.restrictedCount > 0 && (
                          <div className="flex flex-col items-center justify-center py-6 mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">
                                {rawData.meta.restrictedCount} more flight{rawData.meta.restrictedCount > 1 ? 's' : ''} available
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              Login to see all search results
                            </p>
                            <button
                              onClick={() => {
                                // Trigger login modal - dispatch custom event
                                window.dispatchEvent(new CustomEvent('open-login-modal'));
                              }}
                              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
                            >
                              Login to see more results
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

          {/* Right: Compare Tray (Desktop) */}
          <CompareTray />
        </div>
      </main>

      {/* Mobile Filter Bottom Sheet */}
      <FilterBottomSheet
        open={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        onUpdateFilters={updateFilters}
        onResetFilters={resetFilters}
        availableAirlines={availableAirlines}
        priceRange={priceRange}
      />
    </div>
  );
};

export default FlightsPage;
