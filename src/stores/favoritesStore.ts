import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Favorite, FlightWithScore } from '../api/types';
import { favoritesApi } from '../api/auth';

interface FavoritesState {
  favorites: Favorite[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchFavorites: () => Promise<void>;
  addFavorite: (flight: FlightWithScore) => Promise<void>;
  removeFavorite: (flightId: string) => Promise<void>;
  isFavorite: (flightId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isLoading: false,
      error: null,

      fetchFavorites: async () => {
        set({ isLoading: true, error: null });
        try {
          const favorites = await favoritesApi.getAll();
          set({ favorites, isLoading: false });
        } catch (error) {
          set({ 
            error: 'Failed to fetch favorites', 
            isLoading: false 
          });
        }
      },

      addFavorite: async (flight: FlightWithScore) => {
        // Bug 2548089: skip the API call entirely if this flight is already
        // favorited locally. Combined with the backend's existing duplicate
        // guard this prevents the same flight appearing twice (which used to
        // happen when the heart was double-clicked or when an outdated
        // persisted store let the optimistic prepend slip through).
        if (get().favorites.some(f => f.flightId === flight.flight.id)) {
          return;
        }
        try {
          const favorite = await favoritesApi.add({
            flightId: flight.flight.id,
            flightNumber: flight.flight.flightNumber,
            airline: flight.flight.airline,
            departureCity: flight.flight.departureCityCode,
            arrivalCity: flight.flight.arrivalCityCode,
            departureTime: flight.flight.departureTime,
            // Bug 2548275: snapshot arrival time so the favorites card can
            // show both ends of the leg (matches the search result card).
            arrivalTime: flight.flight.arrivalTime,
            price: flight.flight.price,
            // Bug 2548059: keep the precise score (e.g. 8.7). Math.round here
            // used to push 8.7 → 9, then ScoreBadge rendered 4.5/5 in the
            // favorites view while the search result kept showing 4.4/5.
            score: flight.score.overallScore,
          });
          
          set(state => ({
            // Bug 2548089: defensively de-dupe again here in case a stale
            // backend record was returned while the local guard above let
            // through a race.
            favorites: [favorite, ...state.favorites.filter(f => f.flightId !== favorite.flightId)]
          }));
        } catch (error) {
          console.error('Failed to add favorite:', error);
          throw error;
        }
      },

      removeFavorite: async (flightId: string) => {
        try {
          await favoritesApi.remove(flightId);
          set(state => ({
            favorites: state.favorites.filter(f => f.flightId !== flightId)
          }));
        } catch (error) {
          console.error('Failed to remove favorite:', error);
          throw error;
        }
      },

      isFavorite: (flightId: string) => {
        return get().favorites.some(f => f.flightId === flightId);
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: 'airease-favorites',
      version: 1,
    }
  )
);

// Selector hooks
export const useFavorites = () => useFavoritesStore(state => state.favorites);
export const useFavoritesCount = () => useFavoritesStore(state => state.favorites.length);
