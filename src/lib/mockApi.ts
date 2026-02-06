import type { FlightWithScore, FlightSearchResponse, FlightDetail, PriceHistory, Flight, FlightScore, FlightFacilities } from '../api/types';
import mockFlightsData from '../data/mockFlights.json';

// Airlines database matching iOS screenshots
export const AIRLINES = [
  { code: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' },
  { code: 'LH', name: 'Lufthansa', country: 'Germany' },
  { code: 'BA', name: 'British Airways', country: 'United Kingdom' },
  { code: 'EY', name: 'Etihad Airways', country: 'United Arab Emirates' },
  { code: 'SQ', name: 'Singapore Airlines', country: 'Singapore' },
  { code: 'EK', name: 'Emirates', country: 'United Arab Emirates' },
  { code: 'QR', name: 'Qatar Airways', country: 'Qatar' },
  { code: 'TK', name: 'Turkish Airlines', country: 'Turkey' },
  { code: 'AF', name: 'Air France', country: 'France' },
  { code: 'KL', name: 'KLM Royal Dutch Airlines', country: 'Netherlands' },
];

// Type for the raw flight data from JSON
interface RawFlightData {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departureCity: string;
  departureCityCode: string;
  departureAirport: string;
  departureAirportCode: string;
  departureTime: string;
  arrivalCity: string;
  arrivalCityCode: string;
  arrivalAirport: string;
  arrivalAirportCode: string;
  arrivalTime: string;
  arrivalNextDay: boolean;
  durationMinutes: number;
  stops: number;
  stopCities: string[] | null;
  cabin: string;
  aircraftModel: string;
  price: number;
  currency: string;
  seatsRemaining: number;
  score: {
    overallScore: number;
    dimensions: {
      reliability: number;  // On-time performance score
      comfort: number;
      service: number;
      value: number;
    };
    highlights: string[];
    explanations: Array<{
      dimension: string;
      title: string;
      detail: string;
      isPositive: boolean;
    }>;
  };
  facilities: FlightFacilities;
}

// Convert raw JSON data to FlightWithScore format
function convertToFlightWithScore(raw: RawFlightData, searchDate: string, fromCode: string, toCode: string): FlightWithScore {
  // Parse the time strings and create proper ISO dates based on search date
  const [depHour, depMin] = raw.departureTime.split(':').map(Number);
  const [arrHour, arrMin] = raw.arrivalTime.split(':').map(Number);

  const departureDate = new Date(searchDate);
  departureDate.setHours(depHour, depMin, 0, 0);

  const arrivalDate = new Date(searchDate);
  if (raw.arrivalNextDay) {
    arrivalDate.setDate(arrivalDate.getDate() + 1);
  }
  arrivalDate.setHours(arrHour, arrMin, 0, 0);

  // Use entered from/to codes or fall back to original data
  const displayFromCode = fromCode && fromCode.length >= 2 ? fromCode.toUpperCase() : raw.departureCityCode;
  const displayToCode = toCode && toCode.length >= 2 ? toCode.toUpperCase() : raw.arrivalCityCode;

  const flight: Flight = {
    id: raw.id,
    flightNumber: raw.flightNumber,
    airline: raw.airline,
    airlineCode: raw.airlineCode,
    departureCity: displayFromCode,
    departureCityCode: displayFromCode,
    departureAirport: raw.departureAirport,
    departureAirportCode: displayFromCode,
    departureTime: departureDate.toISOString(),
    arrivalCity: displayToCode,
    arrivalCityCode: displayToCode,
    arrivalAirport: raw.arrivalAirport,
    arrivalAirportCode: displayToCode,
    arrivalTime: arrivalDate.toISOString(),
    durationMinutes: raw.durationMinutes,
    stops: raw.stops,
    stopCities: raw.stopCities ?? undefined,
    cabin: raw.cabin as 'economy' | 'premium_economy' | 'business' | 'first',
    aircraftModel: raw.aircraftModel,
    price: raw.price,
    currency: raw.currency,
    seatsRemaining: raw.seatsRemaining,
  };

  const score: FlightScore = {
    overallScore: raw.score.overallScore,
    dimensions: raw.score.dimensions,
    highlights: raw.score.highlights,
    explanations: raw.score.explanations,
    personaWeightsApplied: 'default',
  };

  return {
    flight,
    score,
    facilities: raw.facilities,
  };
}

// Get all mock flights converted to proper format
function getMockFlights(searchDate: string, fromCode: string, toCode: string): FlightWithScore[] {
  return (mockFlightsData.flights as RawFlightData[]).map(raw =>
    convertToFlightWithScore(raw, searchDate, fromCode, toCode)
  );
}

// Sort flights
function sortFlights(flights: FlightWithScore[], sortBy: string): FlightWithScore[] {
  const sorted = [...flights];

  switch (sortBy) {
    case 'price':
      sorted.sort((a, b) => a.flight.price - b.flight.price);
      break;
    case 'duration':
      sorted.sort((a, b) => a.flight.durationMinutes - b.flight.durationMinutes);
      break;
    case 'departure':
      sorted.sort((a, b) => new Date(a.flight.departureTime).getTime() - new Date(b.flight.departureTime).getTime());
      break;
    case 'arrival':
      sorted.sort((a, b) => new Date(a.flight.arrivalTime).getTime() - new Date(b.flight.arrivalTime).getTime());
      break;
    case 'score':
    default:
      sorted.sort((a, b) => b.score.overallScore - a.score.overallScore);
  }

  return sorted;
}

// Filter flights
function filterFlights(
  flights: FlightWithScore[],
  params: {
    stops?: string;
    minPrice?: number;
    maxPrice?: number;
    airlines?: string[];
    departureTimeMin?: number;
    departureTimeMax?: number;
  }
): FlightWithScore[] {
  return flights.filter(f => {
    // Filter by stops
    if (params.stops && params.stops !== 'any') {
      if (params.stops === '0' && f.flight.stops !== 0) return false;
      if (params.stops === '1' && f.flight.stops !== 1) return false;
      if (params.stops === '2+' && f.flight.stops < 2) return false;
    }

    // Filter by price
    if (params.minPrice !== undefined && f.flight.price < params.minPrice) return false;
    if (params.maxPrice !== undefined && f.flight.price > params.maxPrice) return false;

    // Filter by airlines
    if (params.airlines && params.airlines.length > 0) {
      if (!params.airlines.includes(f.flight.airlineCode)) return false;
    }

    // Filter by departure time
    const depHour = new Date(f.flight.departureTime).getHours();
    if (params.departureTimeMin !== undefined && depHour < params.departureTimeMin) return false;
    if (params.departureTimeMax !== undefined && depHour > params.departureTimeMax) return false;

    return true;
  });
}

// Generate price history based on JSON data
function generatePriceHistory(flightId: string, currentPrice: number): PriceHistory {
  const basePoints = mockFlightsData.priceHistory.points;

  // Adjust prices based on current flight price
  const avgPrice = basePoints.reduce((sum, p) => sum + p.price, 0) / basePoints.length;
  const priceRatio = currentPrice / avgPrice;

  const points = basePoints.map(p => ({
    date: p.date,
    price: Math.round(p.price * priceRatio),
  }));

  // Determine trend
  const firstPrice = points[0].price;
  const lastPrice = points[points.length - 1].price;
  const priceDiff = lastPrice - firstPrice;
  const trend: 'rising' | 'falling' | 'stable' =
    priceDiff > 30 ? 'rising' : priceDiff < -30 ? 'falling' : 'stable';

  return {
    flightId,
    points,
    currentPrice,
    trend,
  };
}

// Cache for session consistency
let cachedFlights: FlightWithScore[] | null = null;
let cacheKey: string = '';

// Mock API - works for ANY location entered
export const mockApi = {
  // Search flights
  async searchFlights(params: {
    from: string;
    to: string;
    date: string;
    cabin?: string;
    stops?: string;
    minPrice?: number;
    maxPrice?: number;
    airlines?: string[];
    departureTimeMin?: number;
    departureTimeMax?: number;
    sortBy?: string;
  }): Promise<FlightSearchResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

    // Generate cache key
    const newCacheKey = `${params.from}-${params.to}-${params.date}`;

    // Get or use cached flights
    if (!cachedFlights || cacheKey !== newCacheKey) {
      // Use the search date or default to a week from now
      const searchDate = params.date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      cachedFlights = getMockFlights(searchDate, params.from, params.to);
      cacheKey = newCacheKey;
    }

    // Apply filters
    let filtered = filterFlights(cachedFlights, {
      stops: params.stops,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      airlines: params.airlines,
      departureTimeMin: params.departureTimeMin,
      departureTimeMax: params.departureTimeMax,
    });

    // Apply sort
    filtered = sortFlights(filtered, params.sortBy || 'score');

    return {
      flights: filtered,
      meta: {
        total: filtered.length,
        searchId: `search-${Date.now()}`,
        cachedAt: new Date().toISOString(),
        restrictedCount: 0,
        isAuthenticated: true,
        limit: 200,
        offset: 0,
        hasMore: false,
      },
    };
  },

  // Get flight detail
  async getFlightDetail(flightId: string): Promise<FlightDetail> {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

    // Find flight in cache or search mock data
    const searchDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const allFlights = cachedFlights || getMockFlights(searchDate, '', '');

    const found = allFlights.find(f => f.flight.id === flightId);

    if (found) {
      return {
        ...found,
        priceHistory: generatePriceHistory(flightId, found.flight.price),
      };
    }

    // Return first flight if not found (fallback)
    const fallback = allFlights[0];
    return {
      ...fallback,
      flight: { ...fallback.flight, id: flightId },
      priceHistory: generatePriceHistory(flightId, fallback.flight.price),
    };
  },

  // Get price history
  async getPriceHistory(flightId: string): Promise<PriceHistory> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));

    // Find flight price
    const searchDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const allFlights = cachedFlights || getMockFlights(searchDate, '', '');
    const found = allFlights.find(f => f.flight.id === flightId);

    return generatePriceHistory(flightId, found?.flight.price || 750);
  },

  // Get available airlines for a route
  async getAirlines(): Promise<typeof AIRLINES> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return AIRLINES;
  },
};
