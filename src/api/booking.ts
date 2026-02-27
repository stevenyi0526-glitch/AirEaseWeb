/**
 * AirEase Frontend - Booking API
 * 
 * Handles flight booking redirects to airline websites.
 * Uses the booking_token from SerpAPI to redirect users to the airline's booking page.
 */

// Use relative URL so Vite proxy handles routing (works on localhost & ngrok)
const API_URL = import.meta.env.VITE_API_URL || '';

export interface BookingRedirectParams {
  bookingToken: string;
  airlineName?: string;
  preferDeparting?: boolean;
  preferReturning?: boolean;
  preferExpedia?: boolean;
  // Flight route context - required for SerpAPI booking token to work
  departureId?: string;
  arrivalId?: string;
  outboundDate?: string;  // YYYY-MM-DD format
  returnDate?: string;    // YYYY-MM-DD format (for round trips)
}

/** A single booking platform link returned by the backend */
export interface BookingLink {
  name: string;
  url: string;
  price: number | null;
  isAirline: boolean;
  logoHint: string;
}

/**
 * Fetch all available booking platform links for a flight.
 * Used for the mixed-airline hover menu that lets users pick a platform.
 * 
 * Accepts multiple booking tokens (e.g. departure + return) and merges/deduplicates
 * the results so all platforms across both legs are shown.
 */
export async function fetchBookingLinks(params: {
  bookingTokens: string[];
  departureId?: string;
  arrivalId?: string;
  outboundDate?: string;
  returnDate?: string;
  airlineName?: string;
}): Promise<BookingLink[]> {
  const baseUrl = API_URL || window.location.origin;

  const validTokens = params.bookingTokens.filter(Boolean);
  console.log('[fetchBookingLinks] fetching for', validTokens.length, 'tokens');

  // Fetch links for each token in parallel
  const allResults = await Promise.all(
    validTokens.map(async (token, i) => {
      const url = new URL(`${baseUrl}/v1/booking/booking-links`);
      url.searchParams.set('booking_token', token);
      if (params.departureId) url.searchParams.set('departure_id', params.departureId);
      if (params.arrivalId) url.searchParams.set('arrival_id', params.arrivalId);
      if (params.outboundDate) url.searchParams.set('outbound_date', params.outboundDate);
      if (params.returnDate) url.searchParams.set('return_date', params.returnDate);
      if (params.airlineName) url.searchParams.set('airline_name', params.airlineName);

      try {
        const response = await fetch(url.toString());
        if (!response.ok) {
          console.warn(`[fetchBookingLinks] token[${i}] returned ${response.status}`);
          return [];
        }
        const data = await response.json();
        const links = (data.links ?? []) as BookingLink[];
        console.log(`[fetchBookingLinks] token[${i}] returned ${links.length} links:`, links.map(l => l.name));
        return links;
      } catch (err) {
        console.error(`[fetchBookingLinks] token[${i}] error:`, err);
        return [] as BookingLink[];
      }
    })
  );

  // Merge and deduplicate by platform name
  const seen = new Set<string>();
  const merged: BookingLink[] = [];
  for (const links of allResults) {
    for (const link of links) {
      const key = link.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(link);
      }
    }
  }
  return merged;
}

/**
 * Get the booking redirect URL
 * This URL can be used in an iframe or opened in a new window
 */
export function getBookingRedirectUrl(params: BookingRedirectParams): string {
  // When API_URL is empty (using proxy), use current origin as base for URL construction
  const baseUrl = API_URL || window.location.origin;
  const url = new URL(`${baseUrl}/v1/booking/redirect`);
  
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
  if (params.preferExpedia) {
    url.searchParams.set('prefer_expedia', 'true');
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
  fetchBookingLinks,
};
