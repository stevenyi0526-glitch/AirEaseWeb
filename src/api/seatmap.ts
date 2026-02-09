import { apiClient } from './client';

// ============================================================
// SeatMap Types
// ============================================================

export interface SeatCharacteristic {
  code: string;
  description: string;
}

export interface SeatCoordinates {
  x: number;
  y: number;
}

export interface Seat {
  number: string;
  cabin: string;
  coordinates: SeatCoordinates;
  availability: 'AVAILABLE' | 'BLOCKED' | 'OCCUPIED' | 'UNKNOWN';
  characteristics: SeatCharacteristic[];
  isExitRow: boolean;
  hasExtraLegroom: boolean;
  isWindow: boolean;
  isAisle: boolean;
  isMiddle: boolean;
  price: string | null;
  currency: string | null;
}

export interface Facility {
  code: string;
  type: string;
  coordinates: SeatCoordinates;
  column?: string;
  row?: string;
}

export interface DeckConfiguration {
  width: number;
  length: number;
  startSeatRow: number;
  endSeatRow: number;
  startWingsRow?: number;
  endWingsRow?: number;
  exitRowsX: number[];
}

export interface Deck {
  deckType: string;
  configuration: DeckConfiguration;
  seats: Seat[];
  facilities: Facility[];
}

export interface CabinAmenities {
  power?: {
    isChargeable?: boolean;
    powerType?: string;
    usbType?: string;
  };
  seat?: {
    legSpace?: number;
    legSpaceUnit?: string;
    tilt?: string; // FULL_FLAT, ANGLE_FLAT, NORMAL
    amenityType?: string;
    medianLegSpace?: number;
  };
  wifi?: {
    isChargeable?: boolean;
    wifiCoverage?: string; // FULL, PARTIAL
  };
  entertainment?: unknown[];
  food?: Record<string, unknown>;
  beverage?: Record<string, unknown>;
}

export interface SeatMapSegment {
  segmentId: string;
  departure: Record<string, unknown>;
  arrival: Record<string, unknown>;
  carrierCode: string;
  number: string;
  aircraft: Record<string, string>;
  classOfService?: string;
  amenities: CabinAmenities;
  decks: Deck[];
}

export interface SeatMapData {
  segments: SeatMapSegment[];
  dictionaries: {
    seatCharacteristics: Record<string, string>;
    facilities: Record<string, string>;
  };
}

export interface UpdatedFacilities {
  hasWifi?: boolean;
  hasPower?: boolean;
  seatPitchInches?: number;
  seatPitchCategory?: string;
  hasIFE?: boolean;
  ifeType?: string;
  mealIncluded?: boolean;
  mealType?: string;
  wifiFree?: boolean;
  hasUSB?: boolean;
  legroom?: string;
  dataSource?: string; // "amadeus" when enriched
  // Amadeus-specific extras
  seatTilt?: string; // FULL_FLAT, ANGLE_FLAT, NORMAL
  wifiCoverage?: string; // FULL, PARTIAL
  powerType?: string; // PLUG, USB_PORT, PLUG_OR_USB_PORT
  mealChargeable?: boolean;
  hasBeverage?: boolean;
  beverageType?: string;
  beverageChargeable?: boolean;
}

export interface UpdatedScore {
  overallScore: number;
  dimensions: {
    reliability: number;
    comfort: number;
    service: number;
    value: number;
  };
  comfortDetails?: {
    dataSource: string;
    seatPitch?: number;
    seatWidth?: number;
    componentScores?: Record<string, number>;
  };
  amenitiesScore?: number;
}

export interface SeatMapResponse {
  available: boolean;
  message?: string;
  flightInfo: {
    flightNumber: string;
    route: string;
    date: string;
    carrier: string;
    aircraft?: string;
  };
  seatmap?: SeatMapData;
  /** Enriched facilities from Amadeus API (replaces DB/SerpAPI data) */
  updatedFacilities?: UpdatedFacilities;
  /** Recalculated score using Amadeus amenity data */
  updatedScore?: UpdatedScore;
}

// ============================================================
// SeatMap API
// ============================================================

export const seatmapApi = {
  /**
   * Get seat map for a flight (by cached flight ID)
   * Called on-demand when user views flight details
   */
  getByFlightId: async (flightId: string): Promise<SeatMapResponse> => {
    const response = await apiClient.get(`/v1/seatmap/${flightId}`);
    return response.data;
  },

  /**
   * Get seat map by direct flight info (no cache needed)
   */
  getByFlightInfo: async (params: {
    carrier: string;
    flightNumber: string;
    origin: string;
    destination: string;
    date: string;
    cabin?: string;
  }): Promise<SeatMapResponse> => {
    const response = await apiClient.get('/v1/seatmap/search/by-flight', { params });
    return response.data;
  },
};
