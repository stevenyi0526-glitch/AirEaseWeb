import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plane, SlidersHorizontal, Search, ChevronDown, CloudSun, X, Snowflake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import EnglishDateInput from '../components/common/EnglishDateInput';
import { flightsApi } from '../api/flights';
import { generateRecommendations } from '../api/recommendations';
import { trackSortAction, trackFlightSelection } from '../api/preferences';
import { bookingApi } from '../api/booking';
import { AIRLINES } from '../lib/mockApi';
import { useFlightSearchParams, filtersToApiParams, type SortBy } from '../hooks/useFlightSearchParams';
import { useAuth } from '../contexts/AuthContext';
import { getUserLocation } from '../api/aiSearch';
import { findNearestAirport } from '../api/airports';
import FilterDropdown from '../components/filters/FilterDropdown';
import SortDropdown from '../components/filters/SortDropdown';
import FlightCard from '../components/flights/FlightCard';
import FlightCardSkeleton from '../components/flights/FlightCardSkeleton';
import FloatingSelectedBar from '../components/flights/FloatingSelectedBar';
import FilterBottomSheet from '../components/filters/FilterBottomSheet';
import SearchLoading from '../components/common/SearchLoading';
import CurrencySelector, { CURRENCIES, type CurrencyCode, formatPriceWithCurrency, setLiveExchangeRates, convertPrice } from '../components/common/CurrencySelector';
import AIRecommendations from '../components/flights/AIRecommendations';
import WeatherForecast from '../components/weather/WeatherForecast';
import { fetchExchangeRates } from '../api/exchangeRates';
import { cn } from '../utils/cn';
import type { FlightWithScore } from '../api/types';

// ============================================================================
// AI Query-Based Recommendation: Find the best flight matching user's intent
// ============================================================================
// For AI searches like "cheapest morning flight to JP", instead of using
// user preference history, we score flights based on the query's intent:
//   - aiSortBy: 'price' | 'duration' | 'comfort' | 'score' → primary ranking
//   - aiTimePreference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any' → time filter
//
// Each user requirement is tracked as a checklist item (met ✓ / not met ✗)
// so the AI recommendation card can show ticks for all matched criteria.
// ============================================================================

import { getAircraftModelYear } from '../utils/aircraftModelYears';

/** A single requirement check for the AI recommendation checklist */
export interface AIRequirementCheck {
  label: string;    // e.g. "Morning flight", "Cheapest", "Direct"
  met: boolean;     // whether this flight meets the requirement
}

function findBestFlightForQuery(
  flights: FlightWithScore[],
  sortBy: string,
  timePreference: string,
): {
  recommendations: Array<FlightWithScore & {
    recommendation_score?: number;
    recommendation_reasons?: string[];
    ai_requirement_checks?: AIRequirementCheck[];
  }>;
  explanation: string;
} {
  if (!flights || flights.length === 0) {
    return { recommendations: [], explanation: '' };
  }

  // Time preference ranges
  const timeRanges: Record<string, [number, number]> = {
    morning: [6, 12],
    afternoon: [12, 18],
    evening: [18, 22],
    night: [22, 6],
  };

  // Pre-compute pool-wide stats for normalization
  const allPrices = flights.map(f => f.flight.price);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  const allDurations = flights.map(f => f.flight.durationMinutes);
  const minDur = Math.min(...allDurations);
  const maxDur = Math.max(...allDurations);
  const durRange = maxDur - minDur || 1;

  // Score each flight based on how well it matches the AI query intent
  const scored = flights.map(flight => {
    let pts = 0;
    const reasons: string[] = [];
    const checks: AIRequirementCheck[] = [];
    const depHour = new Date(flight.flight.departureTime).getHours();

    // --- Requirement: Time preference ---
    if (timePreference !== 'any' && timeRanges[timePreference]) {
      const [start, end] = timeRanges[timePreference];
      let inRange: boolean;
      if (start > end) {
        inRange = depHour >= start || depHour < end;
      } else {
        inRange = depHour >= start && depHour < end;
      }

      const timeLabels: Record<string, string> = {
        morning: i18n.t('flights.aiMorningFlight'),
        afternoon: i18n.t('flights.aiAfternoonFlight'),
        evening: i18n.t('flights.aiEveningFlight'),
        night: i18n.t('flights.aiNightFlight'),
      };
      checks.push({ label: timeLabels[timePreference] || i18n.t('flights.aiPreferredTime'), met: inRange });

      if (inRange) {
        pts += 30;
        reasons.push(`🌅 ${timeLabels[timePreference]}`);
      }
    }

    // --- Requirement: Sort priority ---
    switch (sortBy) {
      case 'price': {
        const normalized = 1 - (flight.flight.price - minPrice) / priceRange;
        pts += normalized * 40;
        const isCheapest = normalized >= 0.8;
        checks.push({ label: i18n.t('flights.aiCheapest'), met: isCheapest });
        if (isCheapest) reasons.push(i18n.t('flights.aiLowestPrice'));
        else if (normalized >= 0.5) reasons.push(i18n.t('flights.aiGoodValue'));
        break;
      }
      case 'duration': {
        const normalized = 1 - (flight.flight.durationMinutes - minDur) / durRange;
        pts += normalized * 40;
        const isFastest = normalized >= 0.8;
        checks.push({ label: i18n.t('flights.aiFastest'), met: isFastest });
        if (isFastest) reasons.push(i18n.t('flights.aiFastestOption'));
        else if (normalized >= 0.5) reasons.push(i18n.t('flights.aiQuickFlight'));
        break;
      }
      case 'comfort': {
        const comfortScore = flight.score.dimensions?.comfort || 5;
        pts += (comfortScore / 10) * 40;
        const isComfy = comfortScore >= 7;
        checks.push({ label: i18n.t('flights.aiMostComfortable'), met: isComfy });
        if (comfortScore >= 8) reasons.push(i18n.t('flights.aiMostComfortableReason'));
        else if (comfortScore >= 6) reasons.push(i18n.t('flights.aiGoodComfort'));
        break;
      }
      default: {
        pts += (flight.score.overallScore / 100) * 40;
        const isTop = flight.score.overallScore >= 80;
        checks.push({ label: i18n.t('flights.aiTopRated'), met: isTop });
        if (flight.score.overallScore >= 85) reasons.push(i18n.t('flights.aiExcellentScore', { score: flight.score.overallScore }));
        else if (flight.score.overallScore >= 75) reasons.push(i18n.t('flights.aiGreatScore', { score: flight.score.overallScore }));
        break;
      }
    }

    // --- Requirement: Direct flight ---
    // Show "Direct flight" check chip only when user explicitly filters for direct (stops=0).
    // Give direct flights a bonus UNLESS user explicitly chose 1-stop or 2-stop filters,
    // which signals they prefer connecting flights (e.g. cheaper options).
    const isDirect = flight.flight.stops === 0;
    const stopsFilterValue = new URLSearchParams(window.location.search).get('stops');
    if (stopsFilterValue === '0') {
      checks.push({ label: i18n.t('flights.aiDirectFlight'), met: isDirect });
    }
    const userExplicitlyWantsStops = stopsFilterValue === '1' || stopsFilterValue === '2';
    if (isDirect && !userExplicitlyWantsStops) {
      pts += 15;
      reasons.push(i18n.t('flights.aiDirectFlightReason'));
    }

    // --- Overall score baseline (+15 pts max) ---
    pts += (flight.score.overallScore / 100) * 15;

    return {
      ...flight,
      recommendation_score: Math.round(pts * 10) / 10,
      recommendation_reasons: reasons.slice(0, 4),
      ai_requirement_checks: checks,
    };
  });

  // Sort by recommendation score
  scored.sort((a, b) => (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0));

  // Build explanation based on what the user asked for
  const explParts: string[] = [];
  const sortLabels: Record<string, string> = {
    price: i18n.t('flights.aiCheapest').toLowerCase(),
    duration: i18n.t('flights.aiFastest').toLowerCase(),
    comfort: i18n.t('flights.aiMostComfortable').toLowerCase(),
    score: i18n.t('flights.aiTopRated').toLowerCase(),
  };
  const timeLabelsExpl: Record<string, string> = {
    morning: i18n.t('flights.aiMorningFlight').toLowerCase(),
    afternoon: i18n.t('flights.aiAfternoonFlight').toLowerCase(),
    evening: i18n.t('flights.aiEveningFlight').toLowerCase(),
    night: i18n.t('flights.aiNightFlight').toLowerCase(),
  };
  if (timePreference !== 'any' && timeLabelsExpl[timePreference]) {
    explParts.push(timeLabelsExpl[timePreference]);
  }
  explParts.push(sortLabels[sortBy] || i18n.t('flights.aiTopRated').toLowerCase());
  const explanation = i18n.t('flights.aiTopPick', { criteria: explParts.join(' ') });

  return {
    recommendations: scored.slice(0, 3),
    explanation,
  };
}

/**
 * Flight Search Results Page
 * - Desktop: 3-column layout (Filters | Results | Compare Tray)
 * - Mobile: Single column with bottom sheets for filters
 * 
 * For round trips: Uses sub-tabs to switch between Departure/Return flights
 * Uses the SAME FlightCard UI for all trip types
 */
const FlightsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { filters, updateFilters, resetFilters, isValidSearch, hasActiveFilters } = useFlightSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileWeather, setShowMobileWeather] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  
  // Auto-detect currency based on user's location (country of nearest airport)
  useEffect(() => {
    const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
      CN: 'CNY', US: 'USD', GB: 'GBP', JP: 'JPY', HK: 'HKD',
      SG: 'SGD', AU: 'AUD', CA: 'CAD', KR: 'KRW', IN: 'INR', TH: 'THB',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', PT: 'EUR',
      BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
    };
    const detectCurrency = async () => {
      try {
        const pos = await getUserLocation();
        const airport = await findNearestAirport(pos.coords.latitude, pos.coords.longitude, 200);
        if (airport.country) {
          const code = airport.country.toUpperCase();
          const mapped = COUNTRY_CURRENCY_MAP[code];
          if (mapped && CURRENCIES.find(c => c.code === mapped)) {
            setCurrency(mapped);
          }
        }
      } catch {
        // Geolocation denied or failed — keep USD default
      }
    };
    detectCurrency();
  }, []);
  
  // Local date state for editing before search
  const [editDepartDate, setEditDepartDate] = useState(filters.date);
  const [editReturnDate, setEditReturnDate] = useState(filters.returnDate);
  
  // Round trip sub-tab state: 'departure' or 'return'
  const [activeFlightTab, setActiveFlightTab] = useState<'departure' | 'return'>('departure');
  
  // Selected flights for round trip (stored to show in detail page)
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<FlightWithScore | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<FlightWithScore | null>(null);
  
  // Selected flights for multi-city (one per leg)
  const [selectedMultiCityFlights, setSelectedMultiCityFlights] = useState<(FlightWithScore | null)[]>([]);
  
  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<Array<FlightWithScore & {
    recommendation_score?: number;
    recommendation_reasons?: string[];
  }>>([]);
  const [recommendationExplanation, setRecommendationExplanation] = useState('');
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // Pagination state
  // Page 1: 5 cards, "Next Page" button
  // Page 2: 5 cards initially, then "Show More" adds 20 at a time
  const PAGE1_SIZE = 5;
  const PAGE2_INITIAL = 5;
  const SHOW_MORE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [page2Extra, setPage2Extra] = useState(0); // how many extra batches loaded on page 2

  // Get user's traveler type for personalized scoring
  const travelerType = user?.label || 'default';

  // Determine if this is effectively a one-way search
  // (explicit one-way, OR roundtrip without return date)
  const isEffectivelyOneWay = filters.tripType === 'oneway' || 
    (filters.tripType === 'roundtrip' && !filters.returnDate);

  // Fetch flights using real SerpAPI - always sort by price initially (Google Flights default)
  // This query is used for one-way searches (or roundtrip without return date as fallback)
  const { data: rawData, isLoading, error, isFetching } = useQuery({
    queryKey: ['flights', filters.from, filters.to, filters.date, filters.returnDate, filters.cabin, filters.adults, filters.children, travelerType],
    queryFn: async () => {
      const apiParams = filtersToApiParams(filters);
      // NOTE: Stops filter is applied client-side to avoid extra SerpAPI charges
      // Always fetch all flights (any stops) and filter locally
      
      const response = await flightsApi.search({
        from: apiParams.from,
        to: apiParams.to,
        date: apiParams.date,
        returnDate: apiParams.returnDate,
        cabin: apiParams.cabin,
        adults: apiParams.adults,
        children: apiParams.children,
        currency: 'USD',
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
    queryKey: ['roundtrip-flights', filters.from, filters.to, filters.date, filters.returnDate, filters.cabin, filters.adults, travelerType],
    queryFn: async () => {
      const apiParams = filtersToApiParams(filters);
      // NOTE: Stops filter is applied client-side to avoid extra SerpAPI charges
      
      const response = await flightsApi.searchRoundTrip({
        from: apiParams.from,
        to: apiParams.to,
        date: apiParams.date,
        returnDate: filters.returnDate!,
        cabin: apiParams.cabin,
        adults: apiParams.adults,
        currency: 'USD',
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

  // ============================================================================
  // COMBINED RETURN FLIGHTS QUERY
  // ============================================================================
  // When a departure flight is selected, re-fetch return flights using its
  // departure_token via SerpAPI's proper round-trip flow. This gives return
  // flights with COMBINED booking tokens that encode BOTH legs, so booking
  // platforms like Jettzy/Expedia will book the full round trip.
  // ============================================================================
  const selectedDepartureToken = selectedDepartureFlight?.flight.departureToken;
  const {
    data: combinedReturnFlights,
    isLoading: isLoadingCombinedReturn,
    isFetching: isFetchingCombinedReturn,
  } = useQuery({
    queryKey: ['combined-return-flights', selectedDepartureToken, filters.from, filters.to, filters.date, filters.returnDate, filters.cabin, filters.adults, travelerType],
    queryFn: async () => {
      if (!selectedDepartureToken || !filters.returnDate) return null;
      console.log('[CombinedReturn] Fetching return flights with departure_token for combined booking tokens');
      const response = await flightsApi.getReturnFlights({
        departureToken: selectedDepartureToken,
        from: filters.from,
        to: filters.to,
        date: filters.date,
        returnDate: filters.returnDate,
        cabin: filters.cabin,
        adults: filters.adults,
        currency: 'USD',
        travelerType: travelerType as 'student' | 'business' | 'family' | 'default',
      });
      // Filter out flights with price = 0
      const valid = response.flights.filter(f => f.flight.price > 0);
      console.log('[CombinedReturn] Got', valid.length, 'return flights with combined booking tokens');
      return valid;
    },
    enabled: !!selectedDepartureToken && filters.tripType === 'roundtrip' && !!filters.returnDate,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Multi-city query - searches each leg independently
  const {
    data: multiCityData,
    isLoading: isLoadingMultiCity,
    isFetching: isFetchingMultiCity,
  } = useQuery({
    queryKey: ['multicity-flights', filters.multiCityLegs, filters.cabin, filters.adults, travelerType],
    queryFn: async () => {
      // NOTE: Stops filter is applied client-side to avoid extra SerpAPI charges
      
      const results = await flightsApi.searchMultiCity(
        filters.multiCityLegs,
        {
          cabin: filters.cabin,
          adults: filters.adults,
          currency: 'USD',
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

  // ============================================================================
  // Seat Availability: ONE batch API call per route using Amadeus API
  // Supports all trip types: one-way, round trip, and multi-city.
  // Each route+date gets its own cached query (no per-flight calls).
  // ============================================================================

  // --- One-way availability (also used for round-trip-without-return fallback) ---
  const firstFlight = rawData?.flights?.[0]?.flight;
  const { data: availabilityData, isFetching: isAvailabilityLoading } = useQuery({
    queryKey: ['flight-availability', firstFlight?.departureCityCode, firstFlight?.arrivalCityCode, filters.date, filters.cabin],
    queryFn: () => flightsApi.getAvailability({
      origin: firstFlight!.departureCityCode,
      destination: firstFlight!.arrivalCityCode,
      date: filters.date,
      cabin: filters.cabin,
    }),
    enabled: !!firstFlight?.departureCityCode && !!firstFlight?.arrivalCityCode && !!filters.date,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  // --- Round trip: departure leg availability ---
  const firstDepartureFlight = roundTripData?.departureFlights?.[0]?.flight;
  const { data: rtDepartureAvailability, isFetching: isRtDepAvailLoading } = useQuery({
    queryKey: ['flight-availability', firstDepartureFlight?.departureCityCode, firstDepartureFlight?.arrivalCityCode, filters.date, filters.cabin],
    queryFn: () => flightsApi.getAvailability({
      origin: firstDepartureFlight!.departureCityCode,
      destination: firstDepartureFlight!.arrivalCityCode,
      date: filters.date,
      cabin: filters.cabin,
    }),
    enabled: !!firstDepartureFlight?.departureCityCode && !!firstDepartureFlight?.arrivalCityCode && !!filters.date,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  // --- Round trip: return leg availability ---
  const firstReturnFlight = roundTripData?.returnFlights?.[0]?.flight;
  const { data: rtReturnAvailability, isFetching: isRtRetAvailLoading } = useQuery({
    queryKey: ['flight-availability', firstReturnFlight?.departureCityCode, firstReturnFlight?.arrivalCityCode, filters.returnDate, filters.cabin],
    queryFn: () => flightsApi.getAvailability({
      origin: firstReturnFlight!.departureCityCode,
      destination: firstReturnFlight!.arrivalCityCode,
      date: filters.returnDate!,
      cabin: filters.cabin,
    }),
    enabled: !!firstReturnFlight?.departureCityCode && !!firstReturnFlight?.arrivalCityCode && !!filters.returnDate,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  // --- Multi-city: one availability query per leg ---
  const multiCityAvailabilityQueries = (filters.tripType === 'multicity' ? filters.multiCityLegs : []).map((leg, idx) => {
    const legFirstFlight = multiCityData?.[idx]?.flights?.[0]?.flight;
    return {
      origin: legFirstFlight?.departureCityCode || '',
      destination: legFirstFlight?.arrivalCityCode || '',
      date: leg.date,
      enabled: !!legFirstFlight?.departureCityCode && !!legFirstFlight?.arrivalCityCode && !!leg.date,
    };
  });
  // Fetch availability for multi-city leg 0
  const { data: mcAvailability0, isFetching: isMcAvail0Loading } = useQuery({
    queryKey: ['flight-availability', multiCityAvailabilityQueries[0]?.origin, multiCityAvailabilityQueries[0]?.destination, multiCityAvailabilityQueries[0]?.date, filters.cabin],
    queryFn: () => flightsApi.getAvailability({
      origin: multiCityAvailabilityQueries[0].origin,
      destination: multiCityAvailabilityQueries[0].destination,
      date: multiCityAvailabilityQueries[0].date,
      cabin: filters.cabin,
    }),
    enabled: !!multiCityAvailabilityQueries[0]?.enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
  // Fetch availability for multi-city leg 1
  const { data: mcAvailability1, isFetching: isMcAvail1Loading } = useQuery({
    queryKey: ['flight-availability', multiCityAvailabilityQueries[1]?.origin, multiCityAvailabilityQueries[1]?.destination, multiCityAvailabilityQueries[1]?.date, filters.cabin],
    queryFn: () => flightsApi.getAvailability({
      origin: multiCityAvailabilityQueries[1].origin,
      destination: multiCityAvailabilityQueries[1].destination,
      date: multiCityAvailabilityQueries[1].date,
      cabin: filters.cabin,
    }),
    enabled: !!multiCityAvailabilityQueries[1]?.enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
  // Fetch availability for multi-city leg 2 (optional third leg)
  const { data: mcAvailability2, isFetching: isMcAvail2Loading } = useQuery({
    queryKey: ['flight-availability', multiCityAvailabilityQueries[2]?.origin, multiCityAvailabilityQueries[2]?.destination, multiCityAvailabilityQueries[2]?.date, filters.cabin],
    queryFn: () => flightsApi.getAvailability({
      origin: multiCityAvailabilityQueries[2]?.origin || '__none__',
      destination: multiCityAvailabilityQueries[2]?.destination || '__none__',
      date: multiCityAvailabilityQueries[2]?.date || '__none__',
      cabin: filters.cabin,
    }),
    enabled: !!multiCityAvailabilityQueries[2]?.enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
  // Collect multi-city availability into an array
  const multiCityAvailability = [mcAvailability0, mcAvailability1, mcAvailability2];

  // Active leg tab for multi-city (0-indexed)
  const [activeMultiCityLeg, setActiveMultiCityLeg] = useState(0);

  // Unified loading state for seat availability across all trip types
  const isTicketAvailabilityLoading = useMemo(() => {
    if (filters.tripType === 'multicity') {
      const loadingArr = [isMcAvail0Loading, isMcAvail1Loading, isMcAvail2Loading];
      return loadingArr[activeMultiCityLeg] ?? false;
    }
    if (filters.tripType === 'roundtrip' && filters.returnDate) {
      return activeFlightTab === 'departure' ? isRtDepAvailLoading : isRtRetAvailLoading;
    }
    return isAvailabilityLoading;
  }, [filters.tripType, filters.returnDate, activeFlightTab, activeMultiCityLeg,
      isAvailabilityLoading, isRtDepAvailLoading, isRtRetAvailLoading,
      isMcAvail0Loading, isMcAvail1Loading, isMcAvail2Loading]);

  // Filter and sort flights locally based on user's filter/sort selection (no API call needed)
  // Also merges seat availability data from Amadeus when available
  const sortedFlights = useMemo(() => {
    if (!rawData?.flights) return [];
    
    // First apply all filters
    let flights = [...rawData.flights];

    // Merge seat availability data from Amadeus (if available)
    if (availabilityData && Object.keys(availabilityData).length > 0) {
      flights = flights.map(f => {
        const flightNum = f.flight.flightNumber; // e.g. "CX 888"
        const seats = availabilityData[flightNum];
        if (seats !== undefined) {
          return {
            ...f,
            flight: { ...f.flight, seatsRemaining: seats },
          };
        }
        return f;
      });
    }
    
    // Filter by stops
    if (filters.stops !== 'any') {
      const stopsFilter = filters.stops;
      flights = flights.filter(f => {
        const stops = f.flight.stops;
        if (stopsFilter === '0') return stops === 0; // Direct only
        if (stopsFilter === '1') return stops === 1;   // Exactly 1 stop
        if (stopsFilter === '2') return stops === 2;   // Exactly 2 stops
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
      flights = flights.filter(f => convertPrice(f.flight.price, currency) >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      flights = flights.filter(f => convertPrice(f.flight.price, currency) <= filters.maxPrice!);
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
      case 'model':
        return flights.sort((a, b) => getAircraftModelYear(b.flight.aircraftModel) - getAircraftModelYear(a.flight.aircraftModel));
      default:
        return flights;
    }
  }, [rawData?.flights, availabilityData, filters.sortBy, filters.stops, filters.departureTimeMin, filters.departureTimeMax, filters.minPrice, filters.maxPrice, filters.airlines, filters.aircraftType]);

  // Helper function to filter, sort, and merge availability for flights
  // Used by round trip and multi-city legs
  const filterAndSortFlights = (flights: FlightWithScore[], seatAvailability?: Record<string, number>): FlightWithScore[] => {
    let result = [...flights];

    // Merge seat availability data from Amadeus (if available)
    if (seatAvailability && Object.keys(seatAvailability).length > 0) {
      result = result.map(f => {
        const flightNum = f.flight.flightNumber;
        const seats = seatAvailability[flightNum];
        if (seats !== undefined) {
          return { ...f, flight: { ...f.flight, seatsRemaining: seats } };
        }
        return f;
      });
    }
    
    // Filter by stops
    if (filters.stops !== 'any') {
      const stopsFilter = filters.stops;
      result = result.filter(f => {
        const stops = f.flight.stops;
        if (stopsFilter === '0') return stops === 0;
        if (stopsFilter === '1') return stops === 1;
        if (stopsFilter === '2') return stops === 2;
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
      result = result.filter(f => convertPrice(f.flight.price, currency) >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter(f => convertPrice(f.flight.price, currency) <= filters.maxPrice!);
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
      case 'model':
        return result.sort((a, b) => getAircraftModelYear(b.flight.aircraftModel) - getAircraftModelYear(a.flight.aircraftModel));
      default:
        return result;
    }
  };

  // Filtered and sorted round trip flights
  const filteredDepartureFlights = useMemo(() => {
    if (!roundTripData?.departureFlights) return [];
    return filterAndSortFlights(roundTripData.departureFlights, rtDepartureAvailability);
  }, [roundTripData?.departureFlights, rtDepartureAvailability, filters.sortBy, filters.stops, filters.departureTimeMin, filters.departureTimeMax, filters.minPrice, filters.maxPrice, filters.airlines, filters.aircraftType]);

  const filteredReturnFlights = useMemo(() => {
    // ============================================================================
    // ONLY use combined return flights (fetched via departure_token).
    // These are the ACTUAL paired return flights from Google Flights' round-trip
    // system, ensuring we only show airlines/flights that are valid round-trip
    // pairings with the selected departure flight.
    //
    // We NO LONGER fall back to one-way return flights because those can include
    // airlines (e.g. Cathay Pacific) that don't exist as round-trip options in
    // Google Flights, leading to confusing results.
    // ============================================================================
    if (combinedReturnFlights && combinedReturnFlights.length > 0) {
      console.log('[filteredReturnFlights] Pre-filter:', combinedReturnFlights.length, 'flights');
      console.log('[filteredReturnFlights] Active filters:', {
        airlines: filters.airlines,
        stops: filters.stops,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        aircraftType: filters.aircraftType,
      });
      const filtered = filterAndSortFlights(combinedReturnFlights, rtReturnAvailability);
      console.log('[filteredReturnFlights] Post-filter:', filtered.length, 'flights');
      if (filtered.length === 0 && combinedReturnFlights.length > 0) {
        console.warn('[filteredReturnFlights] All return flights were filtered out! Raw flights:', 
          combinedReturnFlights.map(f => ({
            airline: f.flight.airlineCode,
            price: f.flight.price,
            stops: f.flight.stops,
            flight: f.flight.flightNumber
          }))
        );
      }
      return filtered;
    }
    // No combined return flights yet (departure not selected or still loading)
    console.log('[filteredReturnFlights] No combined return flights available', { 
      hasCombined: !!combinedReturnFlights, 
      length: combinedReturnFlights?.length 
    });
    return [];
  }, [combinedReturnFlights, rtReturnAvailability, filters.sortBy, filters.stops, filters.departureTimeMin, filters.departureTimeMax, filters.minPrice, filters.maxPrice, filters.airlines, filters.aircraftType]);

  // When using combined return flights, prices are ROUND-TRIP TOTALS (both legs),
  // NOT individual leg prices. The departure price from the initial round-trip
  // search is also the round-trip total. So we must NOT sum them.
  const usingCombinedPricing = !!(combinedReturnFlights && combinedReturnFlights.length > 0);

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
      // Multi-city: return the active leg's flights, filtered client-side
      const rawFlights = multiCityData?.[activeMultiCityLeg]?.flights || [];
      return filterAndSortFlights(rawFlights, multiCityAvailability[activeMultiCityLeg]);
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
    multiCityData,
    multiCityAvailability
  ]);

  // Current leg's route info (for route labels)
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
      // When on return tab and fetching combined return flights, show loading
      if (activeFlightTab === 'return' && (isLoadingCombinedReturn || isFetchingCombinedReturn)) {
        return true;
      }
      // Also show loading on return tab if a departure is selected but
      // combined return data hasn't arrived yet (query just started or
      // React Query hasn't transitioned to loading state yet)
      if (activeFlightTab === 'return' && selectedDepartureFlight && combinedReturnFlights === undefined) {
        return true;
      }
      return isLoadingRoundTrip || isFetchingRoundTrip;
    }
    
    return isLoading || isFetching;
  }, [
    filters.tripType, 
    filters.returnDate, 
    filters.multiCityLegs.length,
    activeFlightTab,
    selectedDepartureFlight,
    combinedReturnFlights,
    isLoading, 
    isFetching,
    isLoadingRoundTrip, 
    isFetchingRoundTrip,
    isLoadingCombinedReturn,
    isFetchingCombinedReturn,
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

  // When combined return flights load, update selectedReturnFlight to use the
  // combined token version (which encodes both departure + return legs).
  // This ensures the booking button uses the proper round-trip token.
  React.useEffect(() => {
    if (!combinedReturnFlights || combinedReturnFlights.length === 0) return;
    if (!selectedReturnFlight) return;

    // Find the same flight in the combined list (match by flight number)
    const match = combinedReturnFlights.find(
      f => f.flight.flightNumber === selectedReturnFlight.flight.flightNumber
    );
    if (match && match.flight.bookingToken !== selectedReturnFlight.flight.bookingToken) {
      console.log('[CombinedReturn] Updating selectedReturnFlight with combined token for', match.flight.flightNumber);
      setSelectedReturnFlight(match);
    }
  }, [combinedReturnFlights, selectedReturnFlight]);

  // Initialize multi-city selected flights array when legs change
  React.useEffect(() => {
    if (filters.tripType === 'multicity') {
      setSelectedMultiCityFlights(new Array(filters.multiCityLegs.length).fill(null));
    }
  }, [filters.tripType, filters.multiCityLegs.length]);

  // Fetch live exchange rates once on mount (no re-fetch on currency change)
  React.useEffect(() => {
    fetchExchangeRates().then((rates) => {
      setLiveExchangeRates(rates);
    });
  }, []);

  // Reset pagination when filters or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
    setPage2Extra(0);
  }, [filters.sortBy, filters.stops, filters.departureTimeMin, filters.departureTimeMax, filters.minPrice, filters.maxPrice, filters.airlines, filters.aircraftType]);

  // ============================================================================
  // AI RECOMMENDATIONS - Always based on currentLegFlights (single-way focus)
  // ============================================================================
  // For CLASSIC search: use old preference-based recommendations (user behavior)
  // For AI search: pick the flight that best matches the user's QUERY INTENT
  //   e.g. "cheapest morning flight" → find the cheapest flight in the morning window
  // ============================================================================
  
  // Detect if this search came from AI natural language search
  const isAISearch = searchParams.get('aiSearch') === '1';
  const aiSortBy = searchParams.get('aiSortBy') || 'score';
  const aiTimePreference = searchParams.get('aiTimePreference') || 'any';

  useEffect(() => {
    const fetchRecommendations = async () => {
      // Use currentLegFlights - works for all trip types!
      if (!currentLegFlights || currentLegFlights.length === 0) {
        setRecommendations([]);
        return;
      }
      
      setIsLoadingRecommendations(true);
      try {
        if (isAISearch) {
          // ============================================================
          // AI SEARCH MODE: Match flights to the user's query intent
          // Instead of user preference history, score based on what
          // the user explicitly asked for in their natural language query.
          // ============================================================
          const queryRecommendation = findBestFlightForQuery(
            currentLegFlights,
            aiSortBy,
            aiTimePreference,
          );
          setRecommendations(queryRecommendation.recommendations);
          // No explanation text for AI search
          setRecommendationExplanation('');
        } else {
          // ============================================================
          // CLASSIC SEARCH MODE: Use old preference-based recommendations
          // ============================================================
          const result = await generateRecommendations(currentLegFlights);
          setRecommendations(result.recommendations);
          setRecommendationExplanation(result.explanation);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        // Fallback: use top 3 by score
        const top3 = [...currentLegFlights]
          .sort((a, b) => b.score.overallScore - a.score.overallScore)
          .slice(0, 3);
        setRecommendations(top3);
        setRecommendationExplanation(t('flights.aiTopPick', { criteria: t('flights.aiTopRated').toLowerCase() }));
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [currentLegFlights, isAISearch, aiSortBy, aiTimePreference]);

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

  // ============================================================================
  // FLIGHT SELECTION HANDLERS (used by both AI Recommendations and Flight Cards)
  // ============================================================================
  const isRoundTrip = filters.tripType === 'roundtrip' && !!filters.returnDate;
  const isMultiCity = filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2;

  // For round-trip, the "Select" button on each card selects the flight for that leg
  const handleFlightSelect: ((flight: FlightWithScore) => void) | undefined = isRoundTrip 
    ? (flight: FlightWithScore) => {
        if (activeFlightTab === 'departure') {
          setSelectedDepartureFlight(flight);
          // Clear return selection since combined return flights
          // will be re-fetched for this new departure
          setSelectedReturnFlight(null);
          // Reset ALL filters when switching to return tab —
          // return flights may have different airlines, prices, times, etc.
          // (e.g., SQ departure pairs with CX return in Google Flights)
          updateFilters({ 
            airlines: [], 
            stops: 'any',
            minPrice: undefined,
            maxPrice: undefined,
            departureTimeMin: undefined,
            departureTimeMax: undefined,
            aircraftType: undefined,
          });
          // Auto-switch to return tab after selecting departure
          setActiveFlightTab('return');
        } else {
          setSelectedReturnFlight(flight);
        }
      }
    : isMultiCity
      ? (flight: FlightWithScore) => {
          setSelectedMultiCityFlights(prev => {
            const next = [...prev];
            next[activeMultiCityLeg] = flight;
            return next;
          });
          // Auto-switch to next unselected leg
          const nextEmptyLeg = selectedMultiCityFlights.findIndex((f, i) => i > activeMultiCityLeg && f === null);
          if (nextEmptyLeg !== -1) {
            setActiveMultiCityLeg(nextEmptyLeg);
          }
        }
      : undefined;
  
  // Determine if a flight is selected
  const isFlightSelected = (flight: FlightWithScore): boolean => {
    if (isRoundTrip) {
      if (activeFlightTab === 'departure') {
        return selectedDepartureFlight?.flight.id === flight.flight.id;
      }
      return selectedReturnFlight?.flight.id === flight.flight.id;
    }
    if (isMultiCity) {
      return selectedMultiCityFlights[activeMultiCityLeg]?.flight.id === flight.flight.id;
    }
    return false;
  };

  // Determine the price label for flight cards in this leg
  const cardPriceLabel: 'round trip' | 'per person' = (() => {
    if (isRoundTrip) {
      if (activeFlightTab === 'departure') return 'round trip';
      // Return tab: combined = round trip total, fallback = per-leg
      return usingCombinedPricing ? 'round trip' : 'per person';
    }
    return 'per person';
  })();

  // Calculate available airlines with counts — built dynamically from API data
  // so ALL airlines on the route appear, not just those in the hardcoded AIRLINES list
  const availableAirlines = useMemo(() => {
    // Collect flights from whichever data source is active
    let allFlights: FlightWithScore[] = [];

    if (rawData?.flights) {
      allFlights = rawData.flights;
    } else if (roundTripData) {
      allFlights = [
        ...(roundTripData.departureFlights || []),
        ...(roundTripData.returnFlights || []),
      ];
    }
    if (multiCityData) {
      multiCityData.forEach(leg => {
        if (leg?.flights) allFlights = [...allFlights, ...leg.flights];
      });
    }

    if (allFlights.length === 0) {
      return AIRLINES.map(a => ({ code: a.code, name: a.name }));
    }

    // Count occurrences & collect names per airline code
    const counts: Record<string, number> = {};
    const names: Record<string, string> = {};
    allFlights.forEach(f => {
      const code = f.flight.airlineCode;
      const name = f.flight.airline;
      if (!code) return;
      counts[code] = (counts[code] || 0) + 1;
      if (!names[code]) names[code] = name || code;
    });

    // Build list: prefer name from AIRLINES constant (more polished), fall back to API name
    const airlineMap = new Map(AIRLINES.map(a => [a.code, a.name]));
    return Object.keys(counts)
      .map(code => ({
        code,
        name: airlineMap.get(code) || names[code],
        count: counts[code],
      }))
      .sort((a, b) => b.count - a.count); // Most flights first
  }, [rawData?.flights, roundTripData, multiCityData]);

  // Calculate price range in the selected display currency
  const priceRange = useMemo(() => {
    const allFlights = [
      ...(rawData?.flights || []),
      ...(roundTripData?.departureFlights || []),
      ...(roundTripData?.returnFlights || []),
    ];
    if (allFlights.length === 0) {
      return { min: convertPrice(100, currency), max: convertPrice(2000, currency) };
    }
    const prices = allFlights.map((f: { flight: { price: number } }) => convertPrice(f.flight.price, currency));
    const step = currency === 'JPY' || currency === 'KRW' ? 500 : 50;
    return {
      min: 0,
      max: Math.ceil(Math.max(...prices) / step) * step,
    };
  }, [rawData?.flights, roundTripData, currency]);

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  // ============================================================================
  // BOOKING REDIRECT FOR ROUND TRIP & MULTI-CITY
  // ============================================================================
  /**
   * Handles booking redirect following Google Flights patterns:
   * 
   * Always uses SerpAPI booking_token to fetch real booking options.
   * 
   * Case 1: All selected flights are from the SAME airline
   *   → Backend picks the airline's official booking site from SerpAPI options
   *   → Falls back to Expedia or first available option
   *
   * Case 2: Selected flights are from DIFFERENT airlines
   *   → Backend prefers Expedia from SerpAPI options (prefer_expedia=true)
   *   → Falls back to first available option if Expedia not listed
   *
   * Fallback: If no booking token available, builds an Expedia search URL directly
   */
  const handleMultiFlightBooking = (flights: FlightWithScore[]) => {
    if (flights.length === 0) return;
    
    // Check if all flights are from the same airline
    const airlines = new Set(flights.map(f => f.flight.airlineCode));
    const allSameAirline = airlines.size === 1;
    
    // For round-trip: check if there's a combined token in combinedReturnFlights
    // that encodes both legs (departure + return) for proper round-trip booking
    let combinedToken: string | null = null;
    if (flights.length === 2 && combinedReturnFlights) {
      const returnFlight = flights[1]; // Second flight is the return
      const combinedMatch = combinedReturnFlights.find(
        f => f.flight.flightNumber === returnFlight.flight.flightNumber
      );
      if (combinedMatch?.flight.bookingToken) {
        combinedToken = combinedMatch.flight.bookingToken;
      }
    }
    
    // Try to use a booking token from any of the selected flights
    // Note: Round-trip departure flights may only have departureToken (not bookingToken)
    const bookingToken = combinedToken
      || flights.find(f => f.flight.bookingToken)?.flight.bookingToken
      || flights.find(f => f.flight.departureToken)?.flight.departureToken;
    
    if (bookingToken) {
      // Use booking token via backend → SerpAPI booking_options
      const firstFlight = flights[0].flight;
      // Use the search date from URL params (filters.date) to avoid timezone issues.
      // new Date(departureTime).toISOString() converts to UTC, which can shift the date
      // back by 1 day for timezones ahead of UTC (e.g. HKG = UTC+8).
      const outboundDate = filters.date || firstFlight.departureTime.slice(0, 10);
      
      const params: Parameters<typeof bookingApi.openBookingPage>[0] = {
        bookingToken,
        airlineName: firstFlight.airline,
        departureId: firstFlight.departureAirportCode || firstFlight.departureCityCode,
        arrivalId: firstFlight.arrivalAirportCode || firstFlight.arrivalCityCode,
        outboundDate,
        // Different airlines → prefer Expedia/third-party aggregator
        // Same airline → prefer airline's official site (default behavior)
        preferExpedia: !allSameAirline,
      };
      
      // For round-trip bookings with combined tokens (encoding both legs),
      // pass returnDate so the backend uses type=1 (round-trip) for SerpAPI.
      // This ensures booking platforms receive both departure and return legs.
      if (filters.tripType === 'roundtrip' && filters.returnDate) {
        params.returnDate = filters.returnDate;
      }
      
      bookingApi.openBookingPage(params);
    } else {
      // No booking token available - fallback to Expedia URL
      const expediaUrl = buildExpediaUrl(flights);
      window.open(expediaUrl, '_blank', 'noopener,noreferrer');
    }
  };
  
  /**
   * Build an Expedia Flights search URL with pre-filled legs.
   * 
   * Expedia URL format:
   *   /Flights-search?trip=roundtrip|multicity&leg1=from:XXX,to:YYY,departure:MM/DD/YYYYTANYT&leg2=...&passengers=adults:N
   */
  const buildExpediaUrl = (flights: FlightWithScore[]): string => {
    const adults = filters.adults || 1;
    const isRoundTripBooking = flights.length === 2;
    const trip = isRoundTripBooking ? 'roundtrip' : 'multicity';
    
    const legs = flights.map((f, idx) => {
      const from = f.flight.departureAirportCode || f.flight.departureCityCode;
      const to = f.flight.arrivalAirportCode || f.flight.arrivalCityCode;
      const depDate = new Date(f.flight.departureTime);
      const mm = String(depDate.getMonth() + 1).padStart(2, '0');
      const dd = String(depDate.getDate()).padStart(2, '0');
      const yyyy = depDate.getFullYear();
      return `leg${idx + 1}=from:${from},to:${to},departure:${mm}/${dd}/${yyyy}TANYT`;
    });
    
    return `https://www.expedia.com/Flights-search?mode=search&trip=${trip}&${legs.join('&')}&passengers=adults:${adults}`;
  };

  // Redirect if no valid search params
  if (!isValidSearch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Plane className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {t('flights.noFlightsFound')}
          </h2>
          <p className="text-text-secondary mb-6">
            {t('flights.noFlightsDesc')}
          </p>
          <Link to="/" className="btn-primary">
            {t('flights.newSearch')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-surface shadow-sticky">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 md:py-4">
          {/* Row 1: Back + Route + Actions */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Back + Route */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              <button
                onClick={() => navigate('/')}
                className="flex-shrink-0 p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-alt transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                  {filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {filters.multiCityLegs.map((leg, i) => (
                        <React.Fragment key={i}>
                          {i === 0 && (
                            <span className="text-base sm:text-lg md:text-xl font-bold text-text-primary">
                              {leg.from}
                            </span>
                          )}
                          <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                          <span className="text-base sm:text-lg md:text-xl font-bold text-text-primary">
                            {leg.to}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <>
                      <span className="text-base sm:text-lg md:text-xl font-bold text-text-primary truncate">
                        {filters.from}
                      </span>
                      {filters.tripType === 'roundtrip' ? (
                        <div className="flex items-center gap-0.5 text-primary flex-shrink-0">
                          <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                          <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rotate-180" />
                        </div>
                      ) : (
                        <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                      )}
                      <span className="text-base sm:text-lg md:text-xl font-bold text-text-primary truncate">
                        {filters.to}
                      </span>
                    </>
                  )}
                </div>
                {/* Trip Type Badge (mobile) / Switcher (desktop) */}
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                  {/* Static trip type badge */}
                  <span className={cn(
                    "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium",
                    filters.tripType === 'roundtrip' 
                      ? "bg-primary/10 text-primary" 
                      : filters.tripType === 'multicity'
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                  )}>
                    {filters.tripType === 'roundtrip' ? t('search.roundTrip') : 
                     filters.tripType === 'multicity' ? `${t('search.multiCity')} (${filters.multiCityLegs.length})` : t('search.oneWay')}
                  </span>
                  {filters.tripType === 'roundtrip' && filters.returnDate && (
                    <span className="text-[10px] sm:text-xs text-text-muted hidden sm:inline">
                      Return: {filters.returnDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Search Info + Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
              {/* Date Pickers - hidden on mobile */}
              <div className="hidden md:flex items-center gap-2 bg-surface-alt rounded-lg px-3 py-1.5">
                <EnglishDateInput
                  value={editDepartDate}
                  onChange={(val) => setEditDepartDate(val)}
                  min={new Date().toISOString().split('T')[0]}
                  className="bg-transparent text-sm text-text-primary border-none outline-none cursor-pointer"
                  showIcon
                  iconClassName="text-text-secondary"
                />
                {filters.tripType === 'roundtrip' && filters.returnDate && (
                  <>
                    <span className="text-text-muted">-</span>
                    <EnglishDateInput
                      value={editReturnDate}
                      onChange={(val) => setEditReturnDate(val)}
                      min={editDepartDate}
                      className="bg-transparent text-sm text-text-primary border-none outline-none cursor-pointer"
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

              {/* Currency Selector */}
              <div>
                <CurrencySelector
                  value={currency}
                  onChange={setCurrency}
                  compact
                />
              </div>

              {/* Ski Finder Button */}
              <button
                onClick={() => alert(t('flights.skiFinderComingSoon'))}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#0ABAB5', color: '#fff' }}
                title={t('flights.skiFinder')}
              >
                <Snowflake className="w-4 h-4" />
                <span>{t('flights.skiFinder')}</span>
              </button>

              <SortDropdown
                value={filters.sortBy}
                onChange={handleSortChange}
              />

              {/* Filter Dropdown - next to Sort */}
              <FilterDropdown
                filters={filters}
                onUpdateFilters={updateFilters}
                onResetFilters={resetFilters}
                availableAirlines={availableAirlines}
                priceRange={priceRange}
                hasActiveFilters={hasActiveFilters}
                trackPreferences={isAuthenticated}
                currencySymbol={currencySymbol}
              />

              {/* Mobile filter button */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className={cn(
                  'lg:hidden hidden p-2 rounded-lg border transition-colors',
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

      {/* Main Content - Responsive Layout */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex gap-6">
          {/* Left: Weather Forecast (Desktop only) */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <WeatherForecast
              destinationCode={currentLegRoute.to}
              departureCode={currentLegRoute.from}
              travelDate={filters.date}
            />
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
                onSelect={handleFlightSelect}
                isSelected={isFlightSelected}
                displayCurrency={currency}
                isAISearch={isAISearch}
                priceLabel={cardPriceLabel}
                isTicketLoading={isTicketAvailabilityLoading}
              />
            )}

            {/* Results Header */}
            <div className="mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-text-secondary">
                {currentLegRoute.from} → {currentLegRoute.to}
                {' • '}{t('flights.sortedBy', { criteria: filters.sortBy === 'score' 
                  ? t('flights.bestExperience')
                  : filters.sortBy === 'model' ? t('flights.latestModel') : filters.sortBy })}
                {hasActiveFilters && ` • ${t('flights.filtersApplied')}`}
              </p>
            </div>

            {/* Round Trip Notice Banner */}
            {filters.tripType === 'roundtrip' && filters.returnDate && !isLoadingCurrentLeg && currentLegFlights.length > 0 && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 flex-shrink-0">
                  <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-text-primary">
                    {t('flights.roundTripSelectBanner')}
                  </p>
                  <p className="text-[10px] sm:text-xs text-text-secondary hidden sm:block">
                    {t('flights.roundTripSelectDesc')}
                  </p>
                </div>
              </div>
            )}

            {/* Multi-city Notice Banner */}
            {filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2 && !isLoadingMultiCity && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-full bg-blue-100 flex-shrink-0">
                  <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-900">
                    {t('flights.multiCityBanner', { count: filters.multiCityLegs.length })}
                  </p>
                  <p className="text-[10px] sm:text-xs text-blue-700 hidden sm:block">
                    {t('flights.multiCityDesc')}
                  </p>
                </div>
              </div>
            )}

            {/* Flight List - Uses currentLegFlights (single-way focus) */}
            <div className={cn("space-y-4", 
              (selectedDepartureFlight || selectedReturnFlight || selectedMultiCityFlights.some(f => f !== null)) && "pb-28"
            )}>
              {/* Sub-tabs for Round Trip - ALWAYS visible so user can switch tabs */}
              {filters.tripType === 'roundtrip' && filters.returnDate && (
                <div className="mb-4">
                  {/* Tab buttons */}
                  <div className="flex border-b border-divider bg-white rounded-t-xl overflow-hidden">
                    <button
                      onClick={() => setActiveFlightTab('departure')}
                      className={cn(
                        "flex-1 px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative",
                        activeFlightTab === 'departure' 
                          ? "text-primary bg-primary/5" 
                          : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="truncate">{filters.from} → {filters.to}</span>
                        <span className="hidden sm:inline text-xs bg-gray-100 px-2 py-0.5 rounded-full">
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
                        "flex-1 px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative",
                        activeFlightTab === 'return' 
                          ? "text-primary bg-primary/5" 
                          : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
                        <span className="truncate">{filters.to} → {filters.from}</span>
                        <span className="hidden sm:inline text-xs bg-gray-100 px-2 py-0.5 rounded-full">
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
                </div>
              )}

              {/* Sub-tabs for Multi-city - ALWAYS visible */}
              {filters.tripType === 'multicity' && filters.multiCityLegs.length >= 2 && (
                <div className="mb-4">
                  {/* Tab buttons for each leg */}
                  <div className="flex border-b border-divider bg-white rounded-t-xl overflow-hidden">
                    {filters.multiCityLegs.map((leg, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveMultiCityLeg(index)}
                        className={cn(
                          "flex-1 px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative",
                          activeMultiCityLeg === index 
                            ? "text-primary bg-primary/5" 
                            : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400">#{index + 1}</span>
                            <Plane className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
                          <span className="text-[10px] sm:text-xs font-semibold truncate max-w-full">{leg.from} → {leg.to}</span>
                          <span className="hidden sm:block text-xs text-gray-400">{leg.date}</span>
                        </div>
                        {activeMultiCityLeg === index && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                        {selectedMultiCityFlights[index] && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Current leg info banner */}
                  <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-3 flex items-center gap-3 border-x border-b border-blue-200">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Plane className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        {t('flights.flightLeg', { number: activeMultiCityLeg + 1, from: filters.multiCityLegs[activeMultiCityLeg]?.from, to: filters.multiCityLegs[activeMultiCityLeg]?.to })}
                      </p>
                      <p className="text-xs text-blue-700">
                        {filters.multiCityLegs[activeMultiCityLeg]?.date} • {t('flights.flightsAvailable', { count: multiCityData?.[activeMultiCityLeg]?.flights?.length || 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                    {t('flights.failedToLoad')}
                  </p>
                  <p className="text-text-secondary mb-4">
                    {t('flights.failedToLoadDesc')}
                  </p>
                  <button onClick={() => navigate(0)} className="btn-primary">
                    {t('flights.tryAgain')}
                  </button>
                </div>
              ) : currentLegFlights.length === 0 ? (
                // Empty state - with special handling for round-trip return tab
                (() => {
                  const isRoundTripReturn = filters.tripType === 'roundtrip' && filters.returnDate && activeFlightTab === 'return';
                  
                  if (isRoundTripReturn && !selectedDepartureFlight) {
                    // Return tab but no departure selected yet
                    return (
                      <div className="text-center py-12 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                          <Plane className="w-8 h-8 text-blue-500" />
                        </div>
                        <p className="text-text-primary font-semibold mb-2">
                          {t('flights.selectDepartureFirst')}
                        </p>
                        <p className="text-text-secondary mb-4 max-w-md mx-auto">
                          {t('flights.selectDepartureFirstDesc')}
                        </p>
                        <button 
                          onClick={() => setActiveFlightTab('departure')}
                          className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
                        >
                          {t('flights.goToDepartureTab')}
                        </button>
                      </div>
                    );
                  }
                  
                  if (isRoundTripReturn && selectedDepartureFlight) {
                    // Return tab, departure selected, but no return flights found
                    return (
                      <div className="text-center py-12 bg-amber-50/50 rounded-xl border border-amber-200">
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                          <Plane className="w-8 h-8 text-amber-500" />
                        </div>
                        <p className="text-text-primary font-semibold mb-2">
                          {t('flights.noReturnFlights')}
                        </p>
                        <p className="text-text-secondary mb-4 max-w-md mx-auto">
                          {t('flights.noReturnFlightsDesc')}
                        </p>
                        <button 
                          onClick={() => {
                            setSelectedDepartureFlight(null);
                            setActiveFlightTab('departure');
                          }}
                          className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
                        >
                          {t('flights.chooseDifferentDeparture')}
                        </button>
                      </div>
                    );
                  }
                  
                  // Default empty state for other cases
                  return (
                    <div className="text-center py-12">
                      <Plane className="w-16 h-16 text-text-muted mx-auto mb-4" />
                      <p className="text-text-primary font-medium mb-2">
                        {t('flights.noFlightsForDate', { date: filters.date })}
                      </p>
                      <p className="text-text-secondary mb-4">
                        {t('flights.noFlightsDesc')}
                      </p>
                      {/* Try next day button */}
                      {(() => {
                        const nextDay = new Date(filters.date);
                        nextDay.setDate(nextDay.getDate() + 1);
                        const nextDayStr = nextDay.toISOString().split('T')[0];
                        return (
                          <button
                            onClick={() => {
                              setEditDepartDate(nextDayStr);
                              updateFilters({ date: nextDayStr });
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors mb-3"
                          >
                            {t('flights.tryNextDay', { date: nextDayStr })} →
                          </button>
                        );
                      })()}
                      {hasActiveFilters && (
                        <div>
                          <button onClick={resetFilters} className="btn-secondary">
                            {t('flights.resetFilters')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                // Flight cards - SAME UI for all trip types
                <>
                  {/* Flight List - Uses currentLegFlights (single-way focus) */}
                  {(() => {
                    // Pagination logic:
                    // Page 1: first 5 flights + "Next Page" button
                    // Page 2: next 5 flights + "Show More" (20 at a time)
                    const page2DisplayCount = PAGE2_INITIAL + page2Extra * SHOW_MORE_SIZE;
                    const visibleFlights = currentPage === 1
                      ? currentLegFlights.slice(0, PAGE1_SIZE)
                      : currentLegFlights.slice(PAGE1_SIZE, PAGE1_SIZE + page2DisplayCount);
                    const hasMorePage2 = currentPage === 2 && (PAGE1_SIZE + page2DisplayCount) < currentLegFlights.length;
                    const remainingCount = currentLegFlights.length - PAGE1_SIZE - page2DisplayCount;
                    
                    return (
                      <>
                        {visibleFlights.map((flight) => (
                          <FlightCard
                            key={flight.flight.id}
                            flightWithScore={flight}
                            onSelect={handleFlightSelect ? () => handleFlightSelect(flight) : undefined}
                            isSelected={isFlightSelected(flight)}
                            displayCurrency={currency}
                            isTicketLoading={isTicketAvailabilityLoading}
                            priceLabel={cardPriceLabel}
                          />
                        ))}
                        
                        {/* Page 1 → "Next Page" button */}
                        {currentPage === 1 && currentLegFlights.length > PAGE1_SIZE && (
                          <div className="flex flex-col items-center gap-3 pt-6">
                            <p className="text-sm text-text-muted">
                              {t('flights.pageOf', { current: 1, total: 2 })} • {t('flights.showingFlights', { shown: Math.min(PAGE1_SIZE, currentLegFlights.length), total: currentLegFlights.length })}
                            </p>
                            <button
                              onClick={() => { setCurrentPage(2); setPage2Extra(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
                            >
                              {t('flights.nextPage')}
                            </button>
                          </div>
                        )}
                        
                        {/* Page 2 → "Show More" button + page indicator */}
                        {currentPage === 2 && (
                          <div className="flex flex-col items-center gap-3 pt-6">
                            {/* Back to page 1 link */}
                            <button
                              onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="text-sm text-primary hover:underline"
                            >
                              {t('flights.backToPage1')}
                            </button>
                            <p className="text-sm text-text-muted">
                              {t('flights.page2Showing', { count: Math.min(page2DisplayCount, currentLegFlights.length - PAGE1_SIZE) })}
                            </p>
                            {hasMorePage2 && (
                              <button
                                onClick={() => setPage2Extra(prev => prev + 1)}
                                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
                              >
                                <ChevronDown className="w-5 h-5" />
                                {t('flights.showMore')}
                                <span className="text-sm opacity-80">
                                  ({Math.min(SHOW_MORE_SIZE, remainingCount)} more)
                                </span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Login prompt for non-authenticated users */}
                        {!isAuthenticated && rawData?.meta?.restrictedCount && rawData.meta.restrictedCount > 0 && (
                          <div className="flex flex-col items-center justify-center py-6 mt-4 bg-gradient-to-r from-[#E6F0FA] to-[#F0F5FA] rounded-xl border border-[#B0CCE6]">
                            <div className="flex items-center gap-2 text-[#034891] mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">
                                {t('flights.moreFlightsAvailable', { count: rawData.meta.restrictedCount })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              {t('flights.loginToSeeAll')}
                            </p>
                            <button
                              onClick={() => {
                                // Trigger login modal - dispatch custom event
                                window.dispatchEvent(new CustomEvent('open-login-modal'));
                              }}
                              className="px-5 py-2 bg-[#034891] hover:bg-[#023670] text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
                            >
                              {t('flights.loginToSeeMore')}
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
        currencySymbol={currencySymbol}
      />

      {/* Floating Selected Flight Bar */}
      <FloatingSelectedBar
        selectedDepartureFlight={selectedDepartureFlight}
        selectedReturnFlight={selectedReturnFlight}
        selectedMultiCityFlights={selectedMultiCityFlights}
        tripType={filters.tripType}
        usingCombinedPricing={usingCombinedPricing}
        combinedReturnFlights={combinedReturnFlights}
        currency={currency}
        formatPrice={formatPriceWithCurrency}
        filters={{
          tripType: filters.tripType,
          returnDate: filters.returnDate,
          from: filters.from,
          to: filters.to,
          date: filters.date,
        }}
        onBookNow={handleMultiFlightBooking}
        onClearDeparture={() => setSelectedDepartureFlight(null)}
        onClearReturn={() => setSelectedReturnFlight(null)}
      />

      {/* Mobile Weather Floating Button (visible only on mobile, hidden on lg+) */}
      <button
        type="button"
        onClick={() => setShowMobileWeather(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-lg flex items-center justify-center hover:shadow-xl active:scale-95 transition-all"
        aria-label="Show weather"
      >
        <CloudSun className="w-5 h-5" />
      </button>

      {/* Mobile Weather Bottom Sheet */}
      {showMobileWeather && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setShowMobileWeather(false)}
          />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] bg-surface rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300 flex flex-col overflow-hidden safe-bottom">
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-divider">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <CloudSun className="w-5 h-5 text-sky-500" />
                {t('flights.weatherForecast')}
              </h3>
              <button
                onClick={() => setShowMobileWeather(false)}
                className="p-2 -mr-2 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Weather Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <WeatherForecast
                destinationCode={currentLegRoute.to}
                departureCode={currentLegRoute.from}
                travelDate={filters.date}
                className="!w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightsPage;
