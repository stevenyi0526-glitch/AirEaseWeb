/**
 * Search History API
 * Handles flight search history operations
 */

import { apiClient } from './client';

export interface SearchHistoryItem {
  id: number;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  return_date: string | null;
  passengers: number;
  cabin_class: string;
  created_at: string;
}

export interface CreateSearchHistoryRequest {
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  return_date?: string | null;
  passengers: number;
  cabin_class: string;
}

/**
 * Get user's search history
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  const response = await apiClient.get<SearchHistoryItem[]>('/v1/users/search-history');
  return response.data;
}

/**
 * Add a search to history
 */
export async function addSearchHistory(data: CreateSearchHistoryRequest): Promise<SearchHistoryItem> {
  const response = await apiClient.post<SearchHistoryItem>('/v1/users/search-history', data);
  return response.data;
}

/**
 * Delete a search history item
 */
export async function deleteSearchHistory(id: number): Promise<void> {
  await apiClient.delete(`/v1/users/search-history/${id}`);
}

/**
 * Clear all search history
 */
export async function clearSearchHistory(): Promise<void> {
  await apiClient.delete('/v1/users/search-history');
}
