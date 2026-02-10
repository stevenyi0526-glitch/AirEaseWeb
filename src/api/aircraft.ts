/**
 * Aircraft Database API
 * Looks up aircraft engine type and age from the OpenSky database.
 */

import { apiClient } from './client';

export interface AircraftInfo {
  registration: string | null;
  typecode: string | null;
  model: string | null;
  manufacturer: string | null;
  engines: string | null;
  engineType: string | null;
  firstFlight: string | null;
  builtYear: number | null;
  aircraftAge: number | null;
  aircraftAgeLabel: string | null;
  operator: string | null;
  operatorIata: string | null;
  country: string | null;
  serialNumber: string | null;
}

// ── NTSB Safety Profile types ──

export interface SafetyAccident {
  ev_id: string;
  date: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  injury_severity: string | null;
  cause: string | null;
  description: string | null;
}

export interface SafetyProfile {
  flight_info: {
    flight_code: string | null;
    tail_number: string | null;
    airline: string | null;
    model: string | null;
    built_year: number | null;
    age_years: number | null;
    age_label: string | null;
  };
  technical_specs: {
    engine: string | null;
    eng_mfgr: string | null;
    eng_model: string | null;
    eng_type: string | null;
  };
  safety_records: {
    this_plane_accidents: SafetyAccident[] | null;
    airline_total_accidents: number;
    model_total_accidents: number;
  };
}

export interface FleetStats {
  fleetSize: number;
  averageAge: number | null;
  oldestYear: number | null;
  newestYear: number | null;
  commonEngine: string | null;
}

interface AircraftLookupResponse {
  status: 'found' | 'not_found';
  aircraft: AircraftInfo | null;
}

interface FleetStatsResponse {
  status: 'found' | 'not_found';
  fleet: FleetStats | null;
}

/**
 * Look up aircraft details by registration, typecode, or model name.
 */
export async function lookupAircraft(params: {
  registration?: string;
  typecode?: string;
  model?: string;
  airline?: string;
}): Promise<AircraftInfo | null> {
  try {
    const searchParams = new URLSearchParams();
    if (params.registration) searchParams.set('registration', params.registration);
    if (params.typecode) searchParams.set('typecode', params.typecode);
    if (params.model) searchParams.set('model', params.model);
    if (params.airline) searchParams.set('airline', params.airline);

    const response = await apiClient.get<AircraftLookupResponse>(
      `/v1/aircraft/lookup?${searchParams.toString()}`
    );
    return response.data.aircraft;
  } catch (error) {
    console.error('Aircraft lookup failed:', error);
    return null;
  }
}

/**
 * Get fleet statistics for an airline.
 */
export async function getFleetStats(
  airline: string,
  typecode?: string
): Promise<FleetStats | null> {
  try {
    const searchParams = new URLSearchParams({ airline });
    if (typecode) searchParams.set('typecode', typecode);

    const response = await apiClient.get<FleetStatsResponse>(
      `/v1/aircraft/fleet?${searchParams.toString()}`
    );
    return response.data.fleet;
  } catch (error) {
    console.error('Fleet stats lookup failed:', error);
    return null;
  }
}

/**
 * Admin-only: Update aircraft data directly in the database.
 */
export async function updateAircraft(params: {
  typecode: string;
  operatorIata?: string;
  engines?: string;
  engineType?: string;
  builtYear?: number;
}): Promise<{ status: string; rowsAffected: number }> {
  const response = await apiClient.put<{ status: string; rowsAffected: number }>(
    '/v1/aircraft/update',
    {
      typecode: params.typecode,
      operator_iata: params.operatorIata,
      engines: params.engines,
      engine_type: params.engineType,
      built_year: params.builtYear,
    }
  );
  return response.data;
}

/**
 * Fetch NTSB safety profile for a flight.
 * Resolves flight code → tail number via FlightRadar24, then queries NTSB data.
 */
export async function fetchSafetyProfile(params: {
  flightCode?: string;
  airline?: string;
  airlineIata?: string;
  model?: string;
}): Promise<SafetyProfile | null> {
  try {
    const searchParams = new URLSearchParams();
    if (params.flightCode) searchParams.set('flight_code', params.flightCode);
    if (params.airline) searchParams.set('airline', params.airline);
    if (params.airlineIata) searchParams.set('airline_iata', params.airlineIata);
    if (params.model) searchParams.set('model', params.model);

    const response = await apiClient.get<SafetyProfile>(
      `/v1/aircraft/safety-profile?${searchParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error('Safety profile fetch failed:', error);
    return null;
  }
}
