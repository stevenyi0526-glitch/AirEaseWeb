import { apiClient } from './client';
import type { FlightSearchResponse, FlightDetail, PriceHistory, SearchParams } from './types';

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
   */
  search: async (params: SearchParams): Promise<FlightSearchResponse> => {
    const response = await apiClient.get('/v1/flights/search', { params });
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
};
