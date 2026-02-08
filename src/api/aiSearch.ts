/**
 * AI Natural Language Search Service
 * 
 * Parses natural language flight search queries and automatically fills in
 * missing information based on user's location, current time, and defaults.
 */

import { findNearestAirport, type AirportCoordinates } from './airports';

// Load API key from environment variables - NEVER hardcode API keys!
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

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

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        thoughtSignature?: string;
      }>;
    };
    finishReason?: string;
  }>;
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

const AI_PARSER_PROMPT = `You are an AI flight search parser. Parse the user's natural language query and extract flight search parameters.

IMPORTANT: Always respond in English. Always use English city names in your response.

## Your Task:
Extract the following from the user's query:
1. **destination** (REQUIRED) - The arrival city/airport (must be provided by user)
2. **departure** (optional) - The departure city/airport (if not provided, will be auto-detected)
3. **date** (optional) - Travel date (if not provided, defaults to today)
4. **time_preference** (optional) - morning(6-12), afternoon(12-18), evening(18-22), night(22-6)
5. **passengers** (optional) - Number of passengers (defaults to 1)
6. **cabin_class** (optional) - economy, premium_economy, business, first (defaults to economy)
7. **sort_preference** (optional) - What to prioritize: comfort, price, duration, or balanced
8. **stops** (optional) - Number of stops: "0" for direct/nonstop, "1" for 1 stop, "2+" for 2+ stops, "any" if not mentioned
9. **aircraft_type** (optional) - "widebody" (777, A350, 787) or "narrowbody" (A320, 737, A321) or "any"
10. **alliance** (optional) - "star" (Star Alliance), "oneworld" (Oneworld), "skyteam" (SkyTeam) or "any"
11. **max_price** (optional) - Maximum price budget in USD if mentioned (e.g. "under $500"), null if not mentioned
12. **preferred_airlines** (optional) - Specific airline IATA codes if mentioned (e.g. ["CX", "SQ"])

## Airport Code Reference:
- Hong Kong: HKG
- Shanghai: PVG (Pudong), SHA (Hongqiao) - use PVG as default
- Beijing: PEK (Capital), PKX (Daxing) - use PEK as default
- Tokyo: NRT (Narita), HND (Haneda) - use NRT as default
- Singapore: SIN
- Seoul: ICN (Incheon)
- Bangkok: BKK
- Taipei: TPE
- New York: JFK
- Los Angeles: LAX
- London: LHR
- Paris: CDG
- Dubai: DXB
- Osaka: KIX
- Sydney: SYD
- Melbourne: MEL

## Date Interpretation (Today is ${getToday()}):
- "today" → ${getToday()}
- "tomorrow" → calculate actual date
- "next Friday" / "下周五" → calculate actual date (Friday of next week)
- "this weekend" → coming Saturday

## Time Interpretation:
- "morning flight" / "早班机" / "早上" → morning
- "afternoon" / "下午" → afternoon  
- "evening" / "晚上" / "傍晚" → evening
- "red-eye" / "night" / "凌晨" → night

## Sort Preference Interpretation:
- "most comfortable" / "舒服" / "舒适" → comfort
- "cheapest" / "cheap" / "便宜" / "budget" → price
- "fastest" / "quickest" / "快" → duration
- No preference mentioned → score (balanced)

## Stops Interpretation:
- "direct" / "nonstop" / "non-stop" / "直飞" → 0
- "1 stop" / "one stop" / "转一次" → 1
- "2 stops" / "multiple stops" → 2+
- Not mentioned → any

## Aircraft Type Interpretation:
- "widebody" / "large plane" / "777" / "A350" / "787" / "大飞机" → widebody
- "narrowbody" / "small plane" / "A320" / "737" / "小飞机" → narrowbody
- Not mentioned → any

## Alliance Interpretation:
- "Star Alliance" / "星空联盟" → star
- "Oneworld" / "寰宇一家" → oneworld
- "SkyTeam" / "天合联盟" → skyteam
- Not mentioned → any

## Airline Interpretation:
- "Cathay Pacific" / "CX" / "国泰" → CX
- "Singapore Airlines" / "SQ" / "新航" → SQ
- "Emirates" / "EK" / "阿联酋" → EK
- "ANA" / "NH" / "全日空" → NH
- "JAL" / "JL" / "日航" → JL
- "Korean Air" / "KE" / "大韩" → KE
- "China Airlines" / "CI" / "华航" → CI
- "EVA Air" / "BR" / "长荣" → BR
- "Delta" / "DL" → DL
- "United" / "UA" → UA
- "American" / "AA" → AA
- "British Airways" / "BA" → BA
- "Lufthansa" / "LH" → LH
- "Qantas" / "QF" → QF
- "Thai Airways" / "TG" / "泰航" → TG
- Use IATA 2-letter codes in the array

## Price Budget Interpretation:
- "under $500" / "less than 500" / "budget 500" → max_price: 500
- "500以下" / "五百以内" → max_price: 500
- Not mentioned → max_price: null

## Response Format (JSON only, no markdown):
{
  "has_destination": true/false,
  "destination_city": "City name or empty",
  "destination_code": "IATA code or empty",
  "departure_city": "City name or empty",
  "departure_code": "IATA code or empty",
  "date": "YYYY-MM-DD or empty",
  "time_preference": "morning|afternoon|evening|night|any",
  "passengers": 1,
  "cabin_class": "economy|premium_economy|business|first",
  "sort_by": "score|price|duration|comfort",
  "stops": "any|0|1|2+",
  "aircraft_type": "any|widebody|narrowbody",
  "alliance": "any|star|oneworld|skyteam",
  "max_price": null,
  "preferred_airlines": []
}

## Examples:

Query: "fly to Shanghai next Friday morning, most comfortable"
{
  "has_destination": true,
  "destination_city": "Shanghai",
  "destination_code": "PVG",
  "departure_city": "",
  "departure_code": "",
  "date": "2026-02-13",
  "time_preference": "morning",
  "passengers": 1,
  "cabin_class": "economy",
  "sort_by": "comfort",
  "stops": "any",
  "aircraft_type": "any",
  "alliance": "any",
  "max_price": null,
  "preferred_airlines": []
}

Query: "I want to fly to Tokyo"
{
  "has_destination": true,
  "destination_city": "Tokyo",
  "destination_code": "NRT",
  "departure_city": "",
  "departure_code": "",
  "date": "",
  "time_preference": "any",
  "passengers": 1,
  "cabin_class": "economy",
  "sort_by": "score",
  "stops": "any",
  "aircraft_type": "any",
  "alliance": "any",
  "max_price": null,
  "preferred_airlines": []
}

Query: "cheapest direct flight to Bangkok tomorrow under $300 on a widebody"
{
  "has_destination": true,
  "destination_city": "Bangkok",
  "destination_code": "BKK",
  "departure_city": "",
  "departure_code": "",
  "date": "2026-02-08",
  "time_preference": "any",
  "passengers": 1,
  "cabin_class": "economy",
  "sort_by": "price",
  "stops": "0",
  "aircraft_type": "widebody",
  "alliance": "any",
  "max_price": 300,
  "preferred_airlines": []
}

Query: "find me a Cathay Pacific flight to London, Star Alliance is fine too"
{
  "has_destination": true,
  "destination_city": "London",
  "destination_code": "LHR",
  "departure_city": "",
  "departure_code": "",
  "date": "",
  "time_preference": "any",
  "passengers": 1,
  "cabin_class": "economy",
  "sort_by": "score",
  "stops": "any",
  "aircraft_type": "any",
  "alliance": "any",
  "max_price": null,
  "preferred_airlines": ["CX"]
}

Query: "find me a cheap flight"
{
  "has_destination": false,
  "destination_city": "",
  "destination_code": "",
  "departure_city": "",
  "departure_code": "",
  "date": "",
  "time_preference": "any",
  "passengers": 1,
  "cabin_class": "economy",
  "sort_by": "price",
  "stops": "any",
  "aircraft_type": "any",
  "alliance": "any",
  "max_price": null,
  "preferred_airlines": []
}`;

/**
 * Fetch with retry logic for transient errors (429, 503, etc.)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) {
      return response;
    }

    // Only retry on transient errors (429 rate limit, 503 overloaded)
    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000); // 1s, 2s, 4s, max 8s
      console.warn(`Gemini API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    // Non-retryable error or max retries exceeded
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Failed to call Gemini API: ${response.status}`);
  }

  // Should not reach here, but just in case
  throw new Error('Failed to call Gemini API after retries');
}

/**
 * Parse natural language query using Gemini AI
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
  const response = await fetchWithRetry(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${AI_PARSER_PROMPT}\n\nUser Query: "${query}"\n\nRespond with JSON only, no explanation:`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      }
    })
  });

  const data: GeminiResponse = await response.json();
  console.log('Gemini raw response:', data);
  
  // Navigate the response structure carefully
  const candidates = data.candidates;
  console.log('Candidates:', candidates);
  
  if (!candidates || candidates.length === 0) {
    console.error('No candidates in response:', data);
    throw new Error('Empty response from AI');
  }

  // Check if response was truncated due to token limit
  const finishReason = candidates[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    console.warn('Gemini response truncated (MAX_TOKENS), retrying...');
    throw new Error('AI response truncated, retrying');
  }
  
  const content = candidates[0]?.content;
  console.log('Content:', content);
  
  const parts = content?.parts;
  console.log('Parts:', parts);
  
  // Extract text from all parts that have a text field (parts may also contain thoughtSignature alongside text)
  const text = (parts || [])
    .filter((p: { text?: string }) => typeof p.text === 'string' && p.text.length > 0)
    .map((p: { text?: string }) => p.text)
    .join('');
  console.log('Extracted text:', text);
  
  if (!text) {
    console.error('Empty text in response:', data);
    throw new Error('Empty response from AI');
  }
  
  // Extract JSON from response
  let jsonText = text.trim();
  
  // Try direct parse first (response may already be clean JSON)
  try {
    const parsed = JSON.parse(jsonText);
    console.log('Successfully parsed (direct):', parsed);
    return parsed;
  } catch {
    // Not direct JSON, try extracting it
  }
  
  // Remove markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
    console.log('Extracted from code block:', jsonText);
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Could not find JSON in response. Text was:', text);
    throw new Error('Failed to parse AI response');
  }
  
  console.log('JSON match:', jsonMatch[0]);

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Successfully parsed:', parsed);
    return parsed;
  } catch (e) {
    console.error('JSON parse error:', e, 'Text:', jsonMatch[0]);
    throw new Error('Failed to parse AI response JSON');
  }
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
export function paramsToSearchURL(params: ParsedSearchParams): string {
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
