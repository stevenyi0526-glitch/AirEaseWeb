/**
 * AI Natural Language Search Service
 * 
 * Parses natural language flight search queries and automatically fills in
 * missing information based on user's location, current time, and defaults.
 */

import { findNearestAirport, type AirportCoordinates } from './airports';
import { apiClient } from './client';

// ============================================================
// Types
// ============================================================

export interface ParsedSearchParams {
  departure_city: string;
  departure_city_code: string;
  arrival_city: string;
  arrival_city_code: string;
  date: string;
  time_preference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  passengers: number;
  cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
  sort_by: 'score' | 'price' | 'duration' | 'comfort';
  stops: 'any' | '0' | '1' | '2+';
  aircraft_type: 'widebody' | 'narrowbody' | 'any';
  alliance: 'star' | 'oneworld' | 'skyteam' | 'any';
  max_price: number | null;
  preferred_airlines: string[];
}

export interface AISearchResult {
  success: boolean;
  params?: ParsedSearchParams;
  error?: string;
  message?: string;
}

// ============================================================
// Geolocation Service
// ============================================================

/**
 * Get user's current location using the browser's Geolocation API
 */
export function getUserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please allow location access to auto-detect your departure city.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out.'));
            break;
          default:
            reject(new Error('An unknown error occurred while getting location.'));
        }
      },
      {
        enableHighAccuracy: false, // We don't need high accuracy for city-level
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
}

/**
 * Get the nearest airport to user's current location
 */
export async function getNearestAirportFromLocation(): Promise<AirportCoordinates | null> {
  try {
    const position = await getUserLocation();
    const { latitude, longitude } = position.coords;
    
    // Find nearest airport within 150km
    const airport = await findNearestAirport(latitude, longitude, 150);
    return airport;
  } catch (error) {
    console.error('Failed to get nearest airport:', error);
    return null;
  }
}

// ============================================================
// Time & Date Utilities
// ============================================================

/**
 * Get time preference based on current time
 */
function getTimePreferenceFromCurrentTime(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date formatted
 */
function getToday(): string {
  return formatDate(new Date());
}

// ============================================================
// AI Parser
// ============================================================

/**
 * Parse natural language query using the backend AI service.
 * The backend proxies the call to Gemini, so the frontend
 * doesn't need direct access to Google's API.
 */
async function parseQueryWithAI(query: string): Promise<{
  has_destination: boolean;
  destination_city: string;
  destination_code: string;
  departure_city: string;
  departure_code: string;
  date: string;
  time_preference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  passengers: number;
  cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
  sort_by: 'score' | 'price' | 'duration' | 'comfort';
  stops: 'any' | '0' | '1' | '2+';
  aircraft_type: 'widebody' | 'narrowbody' | 'any';
  alliance: 'star' | 'oneworld' | 'skyteam' | 'any';
  max_price: number | null;
  preferred_airlines: string[];
}> {
  const response = await apiClient.post('/v1/ai/parse-query', { query });
  return response.data;
}

// ============================================================
// Main AI Search Function
// ============================================================

/**
 * Parse a natural language search query and return complete search parameters
 * 
 * This function:
 * 1. Uses Gemini AI to extract intent from the query
 * 2. Auto-fills departure city from user's location if not specified
 * 3. Defaults date to today if not specified
 * 4. Defaults time preference based on current time if not specified
 * 5. Defaults passengers to 1, cabin to economy, sort to overall score
 */
export async function parseNaturalLanguageSearch(
  query: string,
  userLocation?: { lat: number; lng: number }
): Promise<AISearchResult> {
  try {
    // Step 1: Parse the query with AI (retry up to 2 times on truncation)
    let parsed;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        parsed = await parseQueryWithAI(query);
        break;
      } catch (e) {
        lastError = e;
        if (e instanceof Error && e.message.includes('truncated')) {
          console.warn(`parseQueryWithAI attempt ${attempt + 1} truncated, retrying...`);
          continue;
        }
        throw e; // non-truncation error, don't retry
      }
    }
    if (!parsed) {
      throw lastError || new Error('Failed to parse query after retries');
    }
    
    // Step 2: Validate destination (required)
    if (!parsed.has_destination || !parsed.destination_code) {
      return {
        success: false,
        error: 'Please specify a destination. For example: "fly to Tokyo" or "去上海"'
      };
    }

    // Step 3: Get departure city
    let departureCity = parsed.departure_city;
    let departureCode = parsed.departure_code;
    
    if (!departureCode) {
      // Try to get from user's location
      if (userLocation) {
        try {
          const nearestAirport = await findNearestAirport(
            userLocation.lat, 
            userLocation.lng, 
            150
          );
          departureCity = nearestAirport.municipality || nearestAirport.name;
          departureCode = nearestAirport.iataCode;
        } catch (e) {
          return {
            success: false,
            error: 'Could not determine your location. Please specify where you are flying from.'
          };
        }
      } else {
        // Try to get location now
        try {
          const nearestAirport = await getNearestAirportFromLocation();
          if (nearestAirport) {
            departureCity = nearestAirport.municipality || nearestAirport.name;
            departureCode = nearestAirport.iataCode;
          } else {
            return {
              success: false,
              error: 'Could not determine your location. Please specify where you are flying from, e.g., "from Hong Kong to Tokyo"'
            };
          }
        } catch (e) {
          return {
            success: false,
            error: 'Location access denied. Please specify where you are flying from, e.g., "from Hong Kong to Tokyo"'
          };
        }
      }
    }

    // Step 4: Get date (default to today)
    let date = parsed.date;
    if (!date) {
      date = getToday();
    }

    // Step 5: Get time preference
    // If the user didn't specify a time preference, auto-detect from current time of day
    let timePreference = parsed.time_preference;
    if (timePreference === 'any') {
      timePreference = getTimePreferenceFromCurrentTime();
    }

    // Step 6: Build final params
    const params: ParsedSearchParams = {
      departure_city: departureCity,
      departure_city_code: departureCode,
      arrival_city: parsed.destination_city,
      arrival_city_code: parsed.destination_code,
      date: date,
      time_preference: timePreference,
      passengers: parsed.passengers || 1,
      cabin_class: parsed.cabin_class || 'economy',
      sort_by: parsed.sort_by || 'score',
      stops: parsed.stops || 'any',
      aircraft_type: parsed.aircraft_type || 'any',
      alliance: parsed.alliance || 'any',
      max_price: parsed.max_price ?? null,
      preferred_airlines: parsed.preferred_airlines || [],
    };

    // Build descriptive message
    const msgParts: string[] = [];
    msgParts.push(timePreference);
    if (params.stops === '0') msgParts.push('direct');
    else if (params.stops === '1') msgParts.push('1-stop');
    if (params.aircraft_type !== 'any') msgParts.push(params.aircraft_type);
    msgParts.push('flights');
    msgParts.push(`from ${departureCity} to ${parsed.destination_city}`);
    msgParts.push(`on ${date}`);
    if (params.max_price !== null) msgParts.push(`under $${params.max_price}`);
    if (params.preferred_airlines.length > 0) msgParts.push(`(${params.preferred_airlines.join(', ')})`);

    return {
      success: true,
      params,
      message: `Searching for ${msgParts.join(' ')}`
    };

  } catch (error) {
    console.error('AI Search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse search query'
    };
  }
}

/**
 * Convert parsed params to URL search params for navigation
 */
export function paramsToSearchURL(params: ParsedSearchParams, originalQuery?: string): string {
  const urlParams = new URLSearchParams({
    from: params.departure_city_code,
    to: params.arrival_city_code,
    date: params.date,
    cabin: params.cabin_class,
    adults: params.passengers.toString(),
    children: '0',
    tripType: 'oneway',
    sortBy: params.sort_by,
  });

  // Mark this as an AI search so FlightsPage can use query-based recommendations
  urlParams.set('aiSearch', '1');
  urlParams.set('aiSortBy', params.sort_by);
  urlParams.set('aiTimePreference', params.time_preference);
  if (originalQuery) {
    urlParams.set('aiQuery', originalQuery);
  }

  // Stops filter
  if (params.stops !== 'any') {
    urlParams.set('stops', params.stops);
  }

  // Aircraft type filter
  if (params.aircraft_type !== 'any') {
    urlParams.set('aircraftType', params.aircraft_type);
  }

  // Alliance filter
  if (params.alliance !== 'any') {
    urlParams.set('alliance', params.alliance);
  }

  // Max price filter
  if (params.max_price !== null) {
    urlParams.set('maxPrice', params.max_price.toString());
  }

  // Preferred airlines filter
  if (params.preferred_airlines.length > 0) {
    urlParams.set('airlines', params.preferred_airlines.join(','));
  }

  // Add time filter based on preference
  // morning: 6-12, afternoon: 12-18, evening: 18-22, night: 22-6
  if (params.time_preference !== 'any') {
    switch (params.time_preference) {
      case 'morning':
        urlParams.set('depMin', '6');
        urlParams.set('depMax', '12');
        break;
      case 'afternoon':
        urlParams.set('depMin', '12');
        urlParams.set('depMax', '18');
        break;
      case 'evening':
        urlParams.set('depMin', '18');
        urlParams.set('depMax', '22');
        break;
      case 'night':
        urlParams.set('depMin', '22');
        urlParams.set('depMax', '6');
        break;
    }
  }

  return urlParams.toString();
}
