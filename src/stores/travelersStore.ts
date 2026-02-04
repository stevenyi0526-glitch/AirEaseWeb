import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Traveler, CreateTraveler, UpdateTraveler } from '../api/types';
import { travelersApi } from '../api/auth';

interface TravelersState {
  travelers: Traveler[];
  isLoading: boolean;
  defaultTravelerId: number | null;
  
  // Actions
  fetchTravelers: () => Promise<void>;
  addTraveler: (traveler: CreateTraveler) => Promise<Traveler | null>;
  updateTraveler: (id: number, traveler: UpdateTraveler) => Promise<Traveler | null>;
  removeTraveler: (id: number) => Promise<boolean>;
  getTraveler: (id: number) => Traveler | undefined;
  setDefaultTraveler: (id: number) => void;
  getDefaultTraveler: () => Traveler | undefined;
}

// Simple encryption for sensitive data (passport numbers)
const encryptData = (data: string): string => {
  // In production, use proper encryption library
  return btoa(data);
};

const decryptData = (data: string): string => {
  try {
    return atob(data);
  } catch {
    return data;
  }
};

export const useTravelersStore = create<TravelersState>()(
  persist(
    (set, get) => ({
      travelers: [],
      isLoading: false,
      defaultTravelerId: null,

      fetchTravelers: async () => {
        set({ isLoading: true });
        try {
          const travelers = await travelersApi.getAll();
          // Decrypt passport numbers for display
          const decryptedTravelers = travelers.map((t: Traveler) => ({
            ...t,
            passportNumber: t.passportNumber ? decryptData(t.passportNumber) : undefined,
          }));
          set({ travelers: decryptedTravelers });
        } catch (error) {
          console.error('Failed to fetch travelers:', error);
          // Use local data if API fails
        } finally {
          set({ isLoading: false });
        }
      },

      addTraveler: async (traveler) => {
        set({ isLoading: true });
        try {
          // Encrypt sensitive data before sending
          const encryptedTraveler: CreateTraveler = {
            ...traveler,
            passportNumber: traveler.passportNumber 
              ? encryptData(traveler.passportNumber) 
              : undefined,
          };
          
          const newTraveler = await travelersApi.add(encryptedTraveler);
          const decryptedTraveler = {
            ...newTraveler,
            passportNumber: traveler.passportNumber, // Keep original for local
          };
          set(state => ({
            travelers: [...state.travelers, decryptedTraveler],
            defaultTravelerId: state.defaultTravelerId ?? decryptedTraveler.id,
          }));
          return decryptedTraveler;
        } catch (error) {
          console.error('Failed to add traveler:', error);
          // Don't add locally - let the error propagate so user knows to retry
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateTraveler: async (id, updates) => {
        set({ isLoading: true });
        try {
          const encryptedUpdates: UpdateTraveler = {
            ...updates,
            passportNumber: updates.passportNumber 
              ? encryptData(updates.passportNumber) 
              : undefined,
          };
          
          const updatedTraveler = await travelersApi.update(id, encryptedUpdates);
          const decryptedTraveler = {
            ...updatedTraveler,
            passportNumber: updates.passportNumber || get().getTraveler(id)?.passportNumber,
          };
          set(state => ({
            travelers: state.travelers.map(t =>
              t.id === id ? decryptedTraveler : t
            ),
          }));
          return decryptedTraveler;
        } catch (error) {
          console.error('Failed to update traveler:', error);
          // Update locally
          const existing = get().getTraveler(id);
          if (existing) {
            const updated = { ...existing, ...updates };
            set(state => ({
              travelers: state.travelers.map(t =>
                t.id === id ? updated : t
              ),
            }));
            return updated;
          }
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      removeTraveler: async (id) => {
        set({ isLoading: true });
        try {
          await travelersApi.remove(id);
          set(state => ({
            travelers: state.travelers.filter(t => t.id !== id),
            defaultTravelerId: state.defaultTravelerId === id 
              ? state.travelers.find(t => t.id !== id)?.id ?? null 
              : state.defaultTravelerId,
          }));
          return true;
        } catch (error) {
          console.error('Failed to remove traveler:', error);
          // Remove locally
          set(state => ({
            travelers: state.travelers.filter(t => t.id !== id),
            defaultTravelerId: state.defaultTravelerId === id 
              ? state.travelers.find(t => t.id !== id)?.id ?? null 
              : state.defaultTravelerId,
          }));
          return true;
        } finally {
          set({ isLoading: false });
        }
      },

      getTraveler: (id) => {
        return get().travelers.find(t => t.id === id);
      },

      setDefaultTraveler: (id) => {
        set({ defaultTravelerId: id });
      },

      getDefaultTraveler: () => {
        const { travelers, defaultTravelerId } = get();
        return travelers.find(t => t.id === defaultTravelerId) || travelers[0];
      },
    }),
    {
      name: 'airease-travelers',
      // Only persist non-sensitive fields
      partialize: (state) => ({
        defaultTravelerId: state.defaultTravelerId,
        travelers: state.travelers.map(t => ({
          ...t,
          // Don't persist full passport number
          passportNumber: t.passportNumber 
            ? `****${t.passportNumber.slice(-4)}` 
            : undefined,
        })),
      }),
    }
  )
);
