import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plane, SlidersHorizontal, Search, Calendar } from 'lucide-react';
import { flightsApi } from '../api/flights';
import { generateRecommendations, updateSortPreference, trackFlightSelection } from '../api/recommendations';
import { AIRLINES } from '../lib/mockApi';
import { useFlightSearchParams, filtersToApiParams, type SortBy } from '../hooks/useFlightSearchParams';
import { useAuth } from '../contexts/AuthContext';
import FilterPanel from '../components/filters/FilterPanel';
import SortDropdown from '../components/filters/SortDropdown';
import FlightCard from '../components/flights/FlightCard';
import FlightCardSkeleton from '../components/flights/FlightCardSkeleton';
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
 */
const FlightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { filters, updateFilters, resetFilters, isValidSearch, hasActiveFilters } = useFlightSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  
  // Local date state for editing before search
  const [editDepartDate, setEditDepartDate] = useState(filters.date);
  const [editReturnDate, setEditReturnDate] = useState(filters.returnDate);
  
  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<Array<FlightWithScore & {
    recommendation_score?: number;
    recommendation_reasons?: string[];
  }>>([]);
  const [recommendationExplanation, setRecommendationExplanation] = useState('');
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Fetch flights using real SerpAPI - always sort by price initially (Google Flights default)
  const { data: rawData, isLoading, error, isFetching } = useQuery({
    queryKey: ['flights', filters.from, filters.to, filters.date, filters.returnDate, filters.cabin, filters.adults, filters.children, currency, filters.stops],
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
    enabled: isValidSearch,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes to avoid extra API calls
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

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

  // Fetch AI recommendations when flights are loaded
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!rawData?.flights || rawData.flights.length === 0) {
        setRecommendations([]);
        return;
      }
      
      setIsLoadingRecommendations(true);
      try {
        const result = await generateRecommendations(rawData.flights);
        setRecommendations(result.recommendations);
        setRecommendationExplanation(result.explanation);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        // Fallback: use top 3 by score
        const top3 = [...rawData.flights]
          .sort((a, b) => b.score.overallScore - a.score.overallScore)
          .slice(0, 3);
        setRecommendations(top3);
        setRecommendationExplanation('Top rated flights based on our scoring algorithm.');
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [rawData?.flights]);

  // Track sort preference changes
  const handleSortChange = async (sortBy: SortBy) => {
    updateFilters({ sortBy });
    
    // Track sort preference for AI recommendations (fire and forget)
    if (isAuthenticated) {
      updateSortPreference(sortBy).catch(console.error);
    }
  };

  // Track flight selection when user clicks to view details
  const handleFlightClick = async (flight: FlightWithScore) => {
    if (isAuthenticated) {
      trackFlightSelection({
        flight_id: flight.flight.id,
        departure_city: flight.flight.departureCityCode,
        arrival_city: flight.flight.arrivalCityCode,
        departure_time: flight.flight.departureTime,
        airline: flight.flight.airline,
        price: flight.flight.price,
        overall_score: flight.score.overallScore,
        cabin_class: flight.flight.cabin,
      }).catch(console.error);
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
                     filters.tripType === 'multicity' ? 'Multi-city' : 'One Way'}
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
              />
            </div>
          </div>

          {/* Center: Flight Results */}
          <div className="flex-1 min-w-0">
            {/* AI Recommendations Section */}
            {!isLoading && !isFetching && !error && sortedFlights.length > 0 && (
              <AIRecommendations
                recommendations={recommendations}
                explanation={recommendationExplanation}
                isLoading={isLoadingRecommendations}
                onFlightClick={handleFlightClick}
              />
            )}

            {/* Results Header */}
            <div className="mb-4">
              <h1 className="text-xl md:text-2xl font-bold text-text-primary">
                {isLoading ? (
                  'Searching...'
                ) : error ? (
                  'Search error'
                ) : (
                  `${sortedFlights.length} Flights Available`
                )}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Sorted by {filters.sortBy === 'score' ? 'Airease Score' : filters.sortBy}
                {hasActiveFilters && ' • Filters applied'}
              </p>
            </div>

            {/* Round Trip Notice Banner */}
            {filters.tripType === 'roundtrip' && filters.returnDate && !isLoading && sortedFlights.length > 0 && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Plane className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    Round Trip Prices
                  </p>
                  <p className="text-xs text-text-secondary">
                    Prices shown include outbound ({filters.date}) and return ({filters.returnDate}) flights
                  </p>
                </div>
              </div>
            )}

            {/* Flight List */}
            <div className="space-y-4">
              {isLoading || isFetching ? (
                // Loading state with animated plane and skeletons
                <>
                  <SearchLoading from={filters.from} to={filters.to} />
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
              ) : sortedFlights.length === 0 ? (
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
                // Flight cards
                sortedFlights.map((flight) => (
                  <FlightCard
                    key={flight.flight.id}
                    flightWithScore={flight}
                  />
                ))
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
