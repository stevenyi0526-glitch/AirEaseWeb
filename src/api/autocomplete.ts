/**
 * Autocomplete API - Amadeus Airport & City Search
 *
 * Provides airport and city suggestions via Amadeus reference data API.
 */

import { apiClient } from './client';

export interface GeoCode {
  latitude: number | null;
  longitude: number | null;
}

export interface LocationSuggestion {
  id?: string;           // Amadeus location ID (e.g., "AJFK", "CNYC")
  iataCode: string;      // IATA code (e.g., "JFK", "MUC")
  name: string;          // Short name (e.g., "JOHN F KENNEDY INTL")
  detailedName?: string; // e.g., "NEW YORK/US: JOHN F KENNEDY INTL"
  subType?: string;      // "AIRPORT" or "CITY"
  cityName?: string;
  cityCode?: string;
  countryName?: string;
  countryCode?: string;
  regionCode?: string;
  stateCode?: string;
  timeZoneOffset?: string;
  geoCode?: GeoCode;
  score?: number;        // Traveler popularity score
}

export interface AutocompleteResponse {
  query: string;
  suggestions: LocationSuggestion[];
}

export const autocompleteApi = {
  /**
   * Search airports only - suitable for flight search inputs.
   * Uses Amadeus Airport & City Search API with subType=AIRPORT.
   *
   * @param query - Search text (e.g., "JFK", "London", "MUC")
   * @param countryCode - Optional ISO country code filter (e.g., "US", "DE")
   * @param limit - Max results (default 10)
   */
  getAirports: async (
    query: string,
    countryCode?: string,
    limit: number = 10
  ): Promise<AutocompleteResponse> => {
    const params: Record<string, string | number> = { q: query, limit };
    if (countryCode) params.countryCode = countryCode;
    const response = await apiClient.get('/v1/autocomplete/airports', { params });
    return response.data;
  },

  /**
   * Search airports and cities.
   * Uses Amadeus Airport & City Search API with subType=AIRPORT,CITY.
   */
  getLocations: async (
    query: string,
    subType: string = 'AIRPORT,CITY',
    countryCode?: string,
    limit: number = 10
  ): Promise<AutocompleteResponse> => {
    const params: Record<string, string | number> = { q: query, subType, limit };
    if (countryCode) params.countryCode = countryCode;
    const response = await apiClient.get('/v1/autocomplete/locations', { params });
    return response.data;
  },
};

export default autocompleteApi;
