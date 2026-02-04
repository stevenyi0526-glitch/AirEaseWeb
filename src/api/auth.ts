import { apiClient } from './client';
import type { AuthToken, LoginCredentials, RegisterData, User, UpdateUserData, CitySearchResult, Favorite, CreateFavorite, Traveler, CreateTraveler, UpdateTraveler } from './types';

export const authApi = {
  register: async (data: RegisterData): Promise<AuthToken> => {
    const response = await apiClient.post('/v1/auth/register', data);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthToken> => {
    const response = await apiClient.post('/v1/auth/login', credentials);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/v1/auth/me');
    return response.data;
  },

  updateMe: async (data: UpdateUserData): Promise<User> => {
    const response = await apiClient.put('/v1/auth/me', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/v1/auth/logout');
  },
};

export const citiesApi = {
  search: async (query: string): Promise<CitySearchResult[]> => {
    const response = await apiClient.get('/v1/cities/search', { params: { q: query } });
    return response.data;
  },
};

export const favoritesApi = {
  getAll: async (): Promise<Favorite[]> => {
    const response = await apiClient.get('/v1/users/favorites');
    return response.data;
  },

  add: async (data: CreateFavorite): Promise<Favorite> => {
    const response = await apiClient.post('/v1/users/favorites', data);
    return response.data;
  },

  remove: async (flightId: string): Promise<void> => {
    await apiClient.delete(`/v1/users/favorites/${flightId}`);
  },
};

export const travelersApi = {
  getAll: async (): Promise<Traveler[]> => {
    const response = await apiClient.get('/v1/users/travelers');
    return response.data;
  },

  add: async (data: CreateTraveler): Promise<Traveler> => {
    const response = await apiClient.post('/v1/users/travelers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTraveler): Promise<Traveler> => {
    const response = await apiClient.put(`/v1/users/travelers/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/users/travelers/${id}`);
  },
};
