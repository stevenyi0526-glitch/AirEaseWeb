/**
 * AirEase - Airport Coordinates API
 * Fetches airport coordinates for flight route maps
 */

import { apiClient } from './client';

export interface AirportCoordinates {
  iataCode: string;
  name: string;
  municipality?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface FlightRouteCoordinates {
  departure: AirportCoordinates;
  arrival: AirportCoordinates;
  layovers: AirportCoordinates[];
}

/**
 * Get coordinates for a single airport
 */
export async function getAirportCoordinates(iataCode: string): Promise<AirportCoordinates> {
  const response = await apiClient.get(`/v1/airports/coordinates/${iataCode}`);
  return response.data;
}

/**
 * Get coordinates for a flight route (departure, arrival, layovers)
 */
export async function getFlightRouteCoordinates(
  departure: string,
  arrival: string,
  layovers?: string[]
): Promise<FlightRouteCoordinates> {
  const params = new URLSearchParams({
    departure,
    arrival,
  });
  
  if (layovers && layovers.length > 0) {
    params.set('layovers', layovers.join(','));
  }
  
  const response = await apiClient.get(`/v1/airports/route?${params.toString()}`);
  return response.data;
}

/**
 * Search airports by name, city, or code
 */
export async function searchAirports(query: string, limit = 10): Promise<AirportCoordinates[]> {
  const response = await apiClient.get(`/v1/airports/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
}

/**
 * Find the nearest airport to given GPS coordinates
 */
export async function findNearestAirport(
  lat: number, 
  lng: number, 
  maxDistanceKm = 100
): Promise<AirportCoordinates> {
  const response = await apiClient.get(
    `/v1/airports/nearest?lat=${lat}&lng=${lng}&max_distance_km=${maxDistanceKm}`
  );
  return response.data;
}
