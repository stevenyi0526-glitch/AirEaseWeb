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
  // Bug 2548104: Round-trip support — null/empty when one-way.
  return_date?: string | null;
  time_preference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
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
  /** Stable backend error code that the UI can translate via i18n. */
  errorCode?: string;
  message?: string;
}

// ============================================================
// Geolocation Service
// ============================================================

/**
 * Get user's current location using the browser's Geolocation API.
 *
 * macOS / Safari can transiently return `kCLErrorLocationUnknown`
 * (POSITION_UNAVAILABLE) when CoreLocation hasn't warmed up yet — for example
 * on the first call after a sleep / wake or in a fresh tab. We retry up to
 * two more times with progressive backoff before giving up so we don't
 * surface a noisy error for what is almost always a temporary failure.
 */
export function getUserLocation(): Promise<GeolocationPosition> {
  const baseOpts: PositionOptions = {
    enableHighAccuracy: false, // city-level accuracy is plenty
    timeout: 10000,
    maximumAge: 600000, // accept up to 10 min cached fix
  };

  const tryOnce = (opts: PositionOptions): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, opts);
    });

  // attempt 0: cached fix OK, no high accuracy
  // attempt 1: still cached, longer timeout
  // attempt 2: force fresh fix with high accuracy
  const attempts: PositionOptions[] = [
    baseOpts,
    { ...baseOpts, timeout: 15000 },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  ];
  const delays = [0, 1000, 2500];

  const run = async (i: number): Promise<GeolocationPosition> => {
    if (i > 0) await new Promise(r => setTimeout(r, delays[i]));
    try {
      return await tryOnce(attempts[i]);
    } catch (err) {
      const error = err as GeolocationPositionError;
      // Permission denied is final — no point retrying.
      if (error && error.code === error.PERMISSION_DENIED) {
        throw _translateGeoError(error);
      }
      if (i + 1 < attempts.length) {
        return run(i + 1);
      }
      throw _translateGeoError(error);
    }
  };

  return run(0);
}

function _translateGeoError(error: GeolocationPositionError): Error {
  switch (error?.code) {
    case error?.PERMISSION_DENIED:
      return new Error('Location permission denied. Please allow location access to auto-detect your departure city.');
    case error?.POSITION_UNAVAILABLE:
      return new Error('Location information is unavailable.');
    case error?.TIMEOUT:
      return new Error('Location request timed out.');
    default:
      return new Error('An unknown error occurred while getting location.');
  }
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
    console.warn('Geolocation unavailable; falling back to manual airport selection:', error);
    return null;
  }
}

// ============================================================
// Time & Date Utilities
// ============================================================

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
  return_date?: string | null;
  time_preference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  // Backend now returns structured passengers. Tolerate legacy int responses.
  passengers: { adults: number; children: number; infants: number } | number;
  cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
  sort_by: 'score' | 'price' | 'duration' | 'comfort';
  stops: 'any' | '0' | '1' | '2+';
  aircraft_type: 'widebody' | 'narrowbody' | 'any';
  alliance: 'star' | 'oneworld' | 'skyteam' | 'any';
  max_price: number | null;
  preferred_airlines: string[];
  // Backend may signal an unsupported intent (e.g. flight-number lookup).
  // The frontend translates `error_code` into a localized message.
  unsupported_intent?: string;
  error_code?: string;
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

    // Step 1.5: Short-circuit on unsupported intents (e.g. flight-number
    // lookup like "American AA 1313"). The backend tags these with a stable
    // error_code that the UI maps to a localized message.
    if (parsed.error_code === 'FLIGHT_NUMBER_LOOKUP_NOT_SUPPORTED' ||
        parsed.unsupported_intent === 'flight_number_lookup') {
      return {
        success: false,
        errorCode: 'FLIGHT_NUMBER_LOOKUP_NOT_SUPPORTED',
        error: 'Direct flight-number lookup is not supported. Please describe your trip with origin, destination, and date.',
      };
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

    // Did the user explicitly type a "from <X>" / "從 <X>" departure clause?
    // If so and the AI didn't resolve it to an airport code, the user's intent
    // was a specific city — don't silently overwrite it with their current
    // location. Ask them to clarify instead.
    const explicitFromMatch = query.match(
      /\b(?:from|departing\s+from|leaving\s+from|出發於|从|從)\s+([\p{L}\p{N}\s'.\-]{2,40}?)(?=\s+(?:to|going\s+to|去|到|至|往|→|->)\b|$)/iu
    );

    if (!departureCode) {
      if (explicitFromMatch) {
        const userTyped = explicitFromMatch[1].trim();
        return {
          success: false,
          error: `Could not recognize departure city "${userTyped}". Please use the city name or its 3-letter IATA code (e.g. "from San Francisco to ${parsed.destination_city || parsed.destination_code}" or "SFO to ${parsed.destination_code}").`
        };
      }
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

    // Step 4: Get date (default to today for nearest flights)
    let date = parsed.date;
    if (!date) {
      date = getToday();
    }

    // Bug 2548193: 用户用 AI 搜索查询过去日期时(例如 "上周一去东京")，应直接
    // 提示无法搜索历史航班，而不是把日期落到 today 让结果页误以为这是今天的查询。
    const today = getToday();
    if (date < today) {
      return {
        success: false,
        error: `Cannot search flights for a past date (${date}). Please specify a future date.`,
      };
    }
    // Bug 2548212/2548272: 当 AI 把出发城市解析成跟到达城市完全一样的代码
    // (常见于 "我想去当前定位城市"/"今天/后天" 这类没有真正目的地的指令)，
    // 服务端会返回空结果且 UI 看起来像是搜索成功，要在这里拦截。
    if (
      departureCode &&
      parsed.destination_code &&
      departureCode.toUpperCase() === parsed.destination_code.toUpperCase()
    ) {
      return {
        success: false,
        error: 'Departure and destination cannot be the same city. Please specify a different destination.',
      };
    }

    // Step 5: Get time preference (default to all-day / no time filter)
    const timePreference = parsed.time_preference;
    // Keep 'any' as-is — the URL builder will simply not add depMin/depMax filters

    // Step 6: Build final params
    // Defaults: all flights (no stops filter), sort by latest model
    // Bug: "1 adult 1 child" was being parsed as 2 adults because the backend
    // used to return passengers as a single int. Backend now returns
    // {adults, children, infants}; we still tolerate int for back-compat.
    const rawPax = parsed.passengers;
    const passengers = (typeof rawPax === 'object' && rawPax !== null)
      ? {
          adults: Math.max(1, Number(rawPax.adults || 0)),
          children: Math.max(0, Number(rawPax.children || 0)),
          infants: Math.max(0, Number(rawPax.infants || 0)),
        }
      : { adults: Math.max(1, Number(rawPax) || 1), children: 0, infants: 0 };

    const params: ParsedSearchParams = {
      departure_city: departureCity,
      departure_city_code: departureCode,
      arrival_city: parsed.destination_city,
      arrival_city_code: parsed.destination_code,
      date: date,
      // Bug 2548104: forward AI-detected return date so the URL marks the trip as round-trip.
      return_date: parsed.return_date || null,
      time_preference: timePreference,
      passengers,
      cabin_class: parsed.cabin_class || 'economy',
      sort_by: parsed.sort_by || 'score',
      stops: parsed.stops && parsed.stops !== 'any' ? parsed.stops : 'any',
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
  // Bug 2548104: respect AI-detected return date and switch trip type to round-trip.
  const isRoundTrip = !!(params.return_date && params.return_date.length > 0);
  const urlParams = new URLSearchParams({
    from: params.departure_city_code,
    to: params.arrival_city_code,
    date: params.date,
    cabin: params.cabin_class,
    adults: String(params.passengers.adults),
    children: String(params.passengers.children),
    tripType: isRoundTrip ? 'roundtrip' : 'oneway',
    sortBy: 'model',
  });
  if (params.passengers.infants > 0) {
    urlParams.set('infants', String(params.passengers.infants));
  }
  if (isRoundTrip && params.return_date) {
    urlParams.set('returnDate', params.return_date);
  }

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
