/**
 * Gemini AI Service for Smart Flight Search
 * 
 * This service provides multi-turn conversational AI for flight search.
 * All Gemini API calls are proxied through the backend to avoid
 * exposing API keys and regional access issues.
 */

import { apiClient } from './client';

export interface AISearchParams {
  departure_city: string;
  departure_city_code: string;
  arrival_city: string;
  arrival_city_code: string;
  date: string;
  return_date?: string;
  time_preference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
  max_stops: number | null;
  priority: 'cheapest' | 'fastest' | 'most_comfortable' | 'best_value' | 'balanced';
  additional_requirements: string[];
  is_complete: boolean;
  missing_fields: string[];
}

export interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Send a message to the AI chat service via the backend.
 * The backend proxies the call to Gemini, so the frontend
 * doesn't need direct access to Google's API.
 */
export async function sendMessageToGemini(
  userMessage: string,
  conversationHistory: AIConversationMessage[] = []
): Promise<{ message: string; search_params: AISearchParams }> {
  try {
    const response = await apiClient.post('/v1/ai/chat', {
      message: userMessage,
      conversation_history: conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });

    return response.data;
  } catch (error) {
    console.error('Error calling AI chat API:', error);
    throw error;
  }
}

/**
 * Check if the search parameters are complete enough to perform a search
 */
export function isSearchComplete(params: AISearchParams): boolean {
  return (
    params.departure_city_code.length === 3 &&
    params.arrival_city_code.length === 3 &&
    params.date.length === 10 &&
    params.is_complete
  );
}

/**
 * Convert AI search params to the format expected by the flights API
 */
export function convertToSearchParams(params: AISearchParams) {
  return {
    from: params.departure_city_code,
    to: params.arrival_city_code,
    date: params.date,
    cabin: params.cabin_class,
    adults: params.passengers.adults,
    children: params.passengers.children,
    stops: params.max_stops,
    timePreference: params.time_preference,
    priority: params.priority,
  };
}
