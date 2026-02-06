import { apiClient } from './client';
import type { FlightSearchResponse, FlightDetail, PriceHistory, SearchParams, RoundTripSearchResponse } from './types';

export const flightsApi = {
  /**
   * Search flights using SerpAPI Google Flights integration
   * 
   * @param params - Search parameters including:
   *   - from: Departure city/airport code (e.g., "HKG", "北京", "PEK")
   *   - to: Arrival city/airport code (e.g., "NRT", "东京", "LHR")
   *   - date: Departure date (YYYY-MM-DD)
   *   - cabin: Cabin class (economy/business/first)
   *   - returnDate: Optional return date for round trips
   *   - adults: Number of adult passengers (1-9)
   *   - currency: Currency code (USD, CNY, EUR, etc.)
   *   - stops: Stop filter (0=any, 1=nonstop only, 2=1 stop or fewer)
   *   - travelerType: User profile type (student/business/family) for personalized scoring
   *   - limit: Number of flights per page (default 40)
   *   - offset: Number of flights to skip (for pagination)
   */
  search: async (params: SearchParams & { limit?: number; offset?: number }): Promise<FlightSearchResponse> => {
    // Map travelerType to traveler_type for backend
    const apiParams = {
      ...params,
      traveler_type: params.travelerType || 'default',
      limit: params.limit || 200, // Fetch all flights for accuracy
      offset: params.offset || 0,
    };
    const response = await apiClient.get('/v1/flights/search', { params: apiParams });
    return response.data;
  },

  /**
   * Get detailed flight information including:
   * - Full flight details
   * - Score breakdown
   * - Facilities/amenities
   * - Price history
   * - Booking token for purchase link
   */
  getDetail: async (flightId: string): Promise<FlightDetail> => {
    const response = await apiClient.get(`/v1/flights/${flightId}`);
    return response.data;
  },

  /**
   * Get price history and insights from SerpAPI:
   * - Historical price points
   * - Price trend (rising/falling/stable)
   * - Price level (low/typical/high)
   * - Typical price range for the route
   */
  getPriceHistory: async (flightId: string): Promise<PriceHistory> => {
    const response = await apiClient.get(`/v1/flights/${flightId}/price-history`);
    return response.data;
  },

  /**
   * Get booking URL for a flight
   * Uses the booking_token from SerpAPI to construct a Google Flights deep link
   * 
   * @param bookingToken - The booking_token from the flight search results
   * @returns URL to complete booking
   */
  getBookingUrl: (bookingToken?: string): string => {
    if (!bookingToken) {
      return 'https://www.google.com/travel/flights';
    }
    // SerpAPI booking tokens can be used with Google Flights URLs
    // This is a simplified version - in production you may want to use
    // SerpAPI's booking API endpoint for more accurate deep links
    return `https://www.google.com/travel/flights?booking_token=${encodeURIComponent(bookingToken)}`;
  },

  /**
   * Get return flight options for a selected departure flight (Round Trip)
   * 
   * @param params - Parameters including:
   *   - departureToken: The departure_token from the selected outbound flight
   *   - from: Original departure city/airport code
   *   - to: Original arrival city/airport code
   *   - date: Outbound date (YYYY-MM-DD)
   *   - returnDate: Return date (YYYY-MM-DD)
   *   - cabin: Cabin class
   *   - adults: Number of passengers
   *   - currency: Currency code
   *   - travelerType: User profile type
   * 
   * @returns Return flight options with combined round trip prices
   */
  getReturnFlights: async (params: {
    departureToken: string;
    from: string;
    to: string;
    date: string;
    returnDate: string;
    cabin?: string;
    adults?: number;
    currency?: string;
    travelerType?: string;
  }): Promise<FlightSearchResponse> => {
    const apiParams = {
      departure_token: params.departureToken,
      from: params.from,
      to: params.to,
      date: params.date,
      return_date: params.returnDate,
      cabin: params.cabin || 'economy',
      adults: params.adults || 1,
      currency: params.currency || 'USD',
      traveler_type: params.travelerType || 'default',
    };
    const response = await apiClient.get('/v1/flights/return-flights', { params: apiParams });
    return response.data;
  },

  /**
   * Search round trip flights with separate one-way prices
   * 
   * Makes two separate one-way searches to get individual prices for each leg.
   * This shows the exact cost of departure and return flights separately.
   * 
   * Note: One-way prices may be higher than bundled round-trip prices.
   * 
   * @param params - Search parameters
   * @returns Separate departure and return flights with individual prices
   */
  searchRoundTrip: async (params: {
    from: string;
    to: string;
    date: string;
    returnDate: string;
    cabin?: string;
    adults?: number;
    currency?: string;
    stops?: number;
    travelerType?: string;
  }): Promise<RoundTripSearchResponse> => {
    const apiParams = {
      from: params.from,
      to: params.to,
      date: params.date,
      return_date: params.returnDate,
      cabin: params.cabin || 'economy',
      adults: params.adults || 1,
      currency: params.currency || 'USD',
      stops: params.stops,
      traveler_type: params.travelerType || 'default',
    };
    const response = await apiClient.get('/v1/flights/search-roundtrip', { params: apiParams });
    return response.data;
  },

  /**
   * Get airline user reviews on-demand
   * 
   * This is called when user selects a specific flight to view details.
   * Reviews are NOT included in initial search results for performance.
   * 
   * @param airline - Airline name (e.g., "Cathay Pacific", "Japan Airlines")
   * @param cabin - Cabin class (economy/business)
   * @param limit - Maximum number of reviews
   */
  getAirlineReviews: async (
    airline: string,
    cabin: string = 'economy',
    limit: number = 10
  ): Promise<{
    airline: string;
    cabin: string;
    count: number;
    reviews: Array<{
      title: string;
      review: string;
      foodRating: number;
      groundServiceRating: number;
      seatComfortRating: number;
      serviceRating: number;
      recommended: boolean;
      travelType: string;
      route: string;
      aircraft: string;
      cabinType: string;
      ratings: {
        food: number;
        groundService: number;
        seatComfort: number;
        service: number;
        overall: number | null;
      };
    }>;
  }> => {
    const response = await apiClient.get('/v1/flights/reviews', {
      params: { airline, cabin, limit }
    });
    return response.data;
  },

  /**
   * Search multi-city flights - searches each leg independently
   * 
   * @param legs - Array of flight legs with from, to, date
   * @param options - Common options like cabin, adults, currency
   * @returns Array of search results, one per leg
   */
  searchMultiCity: async (
    legs: Array<{ from: string; to: string; date: string }>,
    options: {
      cabin?: string;
      adults?: number;
      currency?: string;
      stops?: number;
      travelerType?: string;
    } = {}
  ): Promise<FlightSearchResponse[]> => {
    // Search each leg in parallel
    const results = await Promise.all(
      legs.map(async (leg) => {
        const apiParams = {
          from: leg.from,
          to: leg.to,
          date: leg.date,
          cabin: options.cabin || 'economy',
          adults: options.adults || 1,
          currency: options.currency || 'USD',
          stops: options.stops,
          traveler_type: options.travelerType || 'default',
          limit: 200,
        };
        const response = await apiClient.get('/v1/flights/search', { params: apiParams });
        return response.data as FlightSearchResponse;
      })
    );
    return results;
  },
};
