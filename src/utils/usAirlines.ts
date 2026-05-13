/**
 * Bug 2548138: NTSB only oversees aviation incidents within the United States,
 * so showing an "NTSB Safety" badge on flights operated by carriers based
 * outside the US (e.g. Cathay Pacific, Singapore Airlines) is misleading.
 *
 * This utility lists the IATA airline codes for major US-headquartered carriers.
 * The list is conservative — when the carrier is unknown the badge falls back
 * to a generic "Safety" label instead of the NTSB branded one.
 */
const US_AIRLINE_IATA_CODES: ReadonlySet<string> = new Set([
  'AA', // American Airlines
  'AS', // Alaska Airlines
  'B6', // JetBlue
  'DL', // Delta Air Lines
  'F9', // Frontier
  'G4', // Allegiant
  'HA', // Hawaiian
  'NK', // Spirit
  'SY', // Sun Country
  'UA', // United Airlines
  'WN', // Southwest
  '9K', // Cape Air
  'KS', // PenAir
  'OO', // SkyWest (regional)
  'YX', // Republic Airways
  'MQ', // Envoy Air
  'OH', // PSA Airlines
  '9E', // Endeavor Air
  'YV', // Mesa Airlines
  'C5', // CommutAir
  'PT', // Piedmont Airlines
  'ZW', // Air Wisconsin
  'EM', // Empire Airlines
  '5Y', // Atlas Air (cargo, but US-based)
  'FX', // FedEx Express
  '5X', // UPS Airlines
  'GK', // Polar Air Cargo
]);

/** Return true when the IATA code belongs to a US-headquartered carrier. */
export function isUsAirline(airlineCode?: string | null): boolean {
  if (!airlineCode) return false;
  return US_AIRLINE_IATA_CODES.has(airlineCode.toUpperCase());
}
