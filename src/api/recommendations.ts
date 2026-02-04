/**
 * Recommendations API
 * AI-powered flight recommendation endpoints
 */

import { apiClient } from './client';
import type { FlightWithScore } from './types';

export interface UserPreferences {
  top_routes: Array<{ from: string; to: string; count: number }>;
  time_range_preferences: Record<string, number>;
  sort_preferences: Record<string, number>;
  preferred_sort: string;
  preferred_time_range: string;
  user_label: string;
}

export interface RecommendationResult {
  recommendations: Array<FlightWithScore & {
    recommendation_score: number;
    recommendation_reasons: string[];
  }>;
  explanation: string;
  preferences_used: {
    preferred_sort?: string;
    preferred_time_range?: string;
    user_label?: string;
    top_routes_count?: number;
  };
}

export interface QuickRecommendation {
  has_preferences: boolean;
  is_frequent_route?: boolean;
  preferred_time_range?: string;
  preferred_sort?: string;
  user_label?: string;
  suggestions: string[];
}

export interface FlightSelectionData {
  flight_id: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  airline: string;
  price: number;
  overall_score: number;
  cabin_class: string;
}

/**
 * Get user's preference profile
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const response = await apiClient.get<UserPreferences>('/v1/recommendations/preferences');
  return response.data;
}

/**
 * Track when user changes sort option
 */
export async function updateSortPreference(sortBy: string): Promise<void> {
  await apiClient.post('/v1/recommendations/sort-preference', { sort_by: sortBy });
}

/**
 * Track when user clicks to view flight details
 */
export async function trackFlightSelection(data: FlightSelectionData): Promise<void> {
  await apiClient.post('/v1/recommendations/flight-selection', data);
}

/**
 * Generate AI recommendations from flight search results
 */
export async function generateRecommendations(
  flights: FlightWithScore[]
): Promise<RecommendationResult> {
  const response = await apiClient.post<RecommendationResult>(
    '/v1/recommendations/generate',
    flights
  );
  return response.data;
}

/**
 * Get quick recommendation hints for a route
 */
export async function getQuickRecommendations(
  fromCity: string,
  toCity: string
): Promise<QuickRecommendation> {
  const response = await apiClient.get<QuickRecommendation>(
    `/v1/recommendations/quick?from_city=${fromCity}&to_city=${toCity}`
  );
  return response.data;
}
