/**
 * Autocomplete API - SerpAPI Google Flights Autocomplete
 * 
 * Provides location/airport suggestions with grouped airports per city.
 */

import { apiClient } from './client';

export interface AirportSuggestion {
  name: string;
  code: string;
  city?: string;
  cityId?: string;
  distance?: string;
}

export interface LocationSuggestion {
  position: number;
  name: string;
  type?: 'city' | 'region' | null;  // null for direct airport matches
  description?: string;
  id?: string;
  airports?: AirportSuggestion[];
}

export interface AutocompleteResponse {
  query: string;
  suggestions: LocationSuggestion[];
}

export const autocompleteApi = {
  /**
   * Get airport/location suggestions for search input
   * Uses SerpAPI Google Flights Autocomplete API
   * 
   * @param query - Search text (e.g., "Seoul", "New York", "HKG")
   * @param gl - Country code for localization (default: "us")
   * @param hl - Language code (default: "en")
   */
  getAirports: async (
    query: string,
    gl: string = 'us',
    hl: string = 'en'
  ): Promise<AutocompleteResponse> => {
    const response = await apiClient.get('/v1/autocomplete/airports', {
      params: { q: query, gl, hl }
    });
    return response.data;
  },

  /**
   * Get all location suggestions (including regions)
   */
  getLocations: async (
    query: string,
    gl: string = 'us',
    hl: string = 'en',
    excludeRegions: boolean = false
  ): Promise<AutocompleteResponse> => {
    const response = await apiClient.get('/v1/autocomplete/locations', {
      params: { q: query, gl, hl, excludeRegions }
    });
    return response.data;
  },
};

export default autocompleteApi;
