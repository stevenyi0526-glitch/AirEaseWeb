/**
 * AirEase Frontend - Booking API
 * 
 * Handles flight booking redirects to airline websites.
 * Uses the booking_token from SerpAPI to redirect users to the airline's booking page.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface BookingRedirectParams {
  bookingToken: string;
  airlineName?: string;
  preferDeparting?: boolean;
  preferReturning?: boolean;
  // Flight route context - required for SerpAPI booking token to work
  departureId?: string;
  arrivalId?: string;
  outboundDate?: string;  // YYYY-MM-DD format
  returnDate?: string;    // YYYY-MM-DD format (for round trips)
}

/**
 * Get the booking redirect URL
 * This URL can be used in an iframe or opened in a new window
 */
export function getBookingRedirectUrl(params: BookingRedirectParams): string {
  const url = new URL(`${API_URL}/v1/booking/redirect`);
  
  url.searchParams.set('booking_token', params.bookingToken);
  
  // Add flight route context
  if (params.departureId) {
    url.searchParams.set('departure_id', params.departureId);
  }
  if (params.arrivalId) {
    url.searchParams.set('arrival_id', params.arrivalId);
  }
  if (params.outboundDate) {
    url.searchParams.set('outbound_date', params.outboundDate);
  }
  if (params.returnDate) {
    url.searchParams.set('return_date', params.returnDate);
  }
  
  if (params.airlineName) {
    url.searchParams.set('airline_name', params.airlineName);
  }
  if (params.preferDeparting) {
    url.searchParams.set('prefer_departing', 'true');
  }
  if (params.preferReturning) {
    url.searchParams.set('prefer_returning', 'true');
  }
  
  return url.toString();
}

/**
 * Open booking page in a new window/tab
 * This redirects the user to the airline's booking system
 */
export function openBookingPage(params: BookingRedirectParams): void {
  const url = getBookingRedirectUrl(params);
  
  // Open in new tab - the backend returns an HTML page that auto-redirects
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Check if a flight has booking available
 */
export function hasBookingToken(bookingToken?: string | null): boolean {
  return !!bookingToken && bookingToken.length > 0;
}

export const bookingApi = {
  getRedirectUrl: getBookingRedirectUrl,
  openBookingPage,
  hasBookingToken,
};
