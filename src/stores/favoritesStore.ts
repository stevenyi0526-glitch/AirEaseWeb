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
        try {
          const favorite = await favoritesApi.add({
            flightId: flight.flight.id,
            flightNumber: flight.flight.flightNumber,
            airline: flight.flight.airline,
            departureCity: flight.flight.departureCityCode,
            arrivalCity: flight.flight.arrivalCityCode,
            departureTime: flight.flight.departureTime,
            price: flight.flight.price,
            score: Math.round(flight.score.overallScore),
          });
          
          set(state => ({
            favorites: [favorite, ...state.favorites]
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
