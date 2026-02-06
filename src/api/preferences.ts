/**
 * User Preferences API
 * 
 * Tracks user behavior for personalized recommendations:
 * - Sort actions (which dimension user sorts by)
 * - Time filter actions (which time ranges user prefers)
 * - Flight selections (which airlines user selects)
 */

import { apiClient } from './client';

// ============================================================
// Types
// ============================================================

export interface UserPreferences {
  preferred_sort: string;
  preferred_time_range: string;
  preferred_airlines: string[];
  price_sensitivity: 'high' | 'medium' | 'low';
  sort_counts: Record<string, number>;
  time_range_counts: Record<string, number>;
  airline_counts: Record<string, number>;
  total_sort_actions: number;
  total_selections: number;
  has_preferences: boolean;
}

export interface PreferencesForRecommendation {
  preferred_sort: string;
  preferred_time_range: string;
  preferred_airlines: string[];
  price_sensitivity: 'high' | 'medium' | 'low';
  has_preferences: boolean;
}

export interface FlightSelectionData {
  flight_id: string;
  flight_number?: string;
  airline: string;
  airline_code?: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  price: number;
  overall_score: number;
  cabin?: string;
}

// ============================================================
// Tracking Functions (fire and forget - don't wait for response)
// ============================================================

/**
 * Track when user clicks a sort option.
 * Call this when user changes the sort dropdown.
 * 
 * @param sortBy - The sort option selected (price, duration, score, departure, arrival)
 */
export function trackSortAction(sortBy: string): void {
  // Fire and forget - don't await
  apiClient.post('/v1/preferences/track/sort', { sort_by: sortBy })
    .catch(err => {
      // Silently fail - tracking should not interrupt user experience
      console.debug('Failed to track sort action:', err.message);
    });
}

/**
 * Track when user applies a time filter.
 * Call this when user selects a departure time range.
 * 
 * @param timeRange - The time range selected (e.g., "6-12", "morning")
 */
export function trackTimeFilter(timeRange: string): void {
  // Fire and forget
  apiClient.post('/v1/preferences/track/time-filter', { time_range: timeRange })
    .catch(err => {
      console.debug('Failed to track time filter:', err.message);
    });
}

/**
 * Track when user selects/clicks on a flight.
 * Call this when user clicks "View Details" on a flight card.
 * 
 * @param flightData - The flight information
 */
export function trackFlightSelection(flightData: FlightSelectionData): void {
  // Fire and forget
  apiClient.post('/v1/preferences/track/flight-selection', flightData)
    .catch(err => {
      console.debug('Failed to track flight selection:', err.message);
    });
}

// ============================================================
// Retrieval Functions
// ============================================================

/**
 * Get current user's full preference profile.
 * Use for debugging or preference management UI.
 */
export async function getMyPreferences(): Promise<UserPreferences> {
  const response = await apiClient.get<UserPreferences>('/v1/preferences/my-preferences');
  return response.data;
}

/**
 * Get minimal preferences for the recommendation engine.
 * Returns only fields needed for recommendations.
 */
export async function getPreferencesForRecommendations(): Promise<PreferencesForRecommendation> {
  const response = await apiClient.get<PreferencesForRecommendation>('/v1/preferences/for-recommendations');
  return response.data;
}

/**
 * Clear all tracked preferences.
 * Useful for testing or resetting preferences.
 */
export async function clearPreferences(): Promise<void> {
  await apiClient.delete('/v1/preferences/clear');
}
