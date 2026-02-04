import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FlightWithScore } from '../api/types';

const MAX_COMPARE_FLIGHTS = 3;

interface CompareState {
  flights: FlightWithScore[];
  addFlight: (flight: FlightWithScore) => void;
  removeFlight: (flightId: string) => void;
  clearAll: () => void;
  isInCompare: (flightId: string) => boolean;
  canAddMore: () => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      flights: [],

      addFlight: (flight: FlightWithScore) => {
        const { flights } = get();

        // Don't add if already at max
        if (flights.length >= MAX_COMPARE_FLIGHTS) {
          return;
        }

        // Don't add if already in compare
        if (flights.some(f => f.flight.id === flight.flight.id)) {
          return;
        }

        set({ flights: [...flights, flight] });
      },

      removeFlight: (flightId: string) => {
        set({
          flights: get().flights.filter(f => f.flight.id !== flightId)
        });
      },

      clearAll: () => {
        set({ flights: [] });
      },

      isInCompare: (flightId: string) => {
        return get().flights.some(f => f.flight.id === flightId);
      },

      canAddMore: () => {
        return get().flights.length < MAX_COMPARE_FLIGHTS;
      },
    }),
    {
      name: 'airease-compare', // localStorage key
      version: 1,
    }
  )
);

// Selector hooks for common use cases
export const useCompareFlights = () => useCompareStore(state => state.flights);
export const useCompareCount = () => useCompareStore(state => state.flights.length);
export const useCanCompare = () => useCompareStore(state => state.flights.length >= 2);
