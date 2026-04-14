import { apiClient } from './client';
import { sha256 } from '../utils/crypto';
import type { AuthToken, LoginCredentials, RegisterData, User, UpdateUserData, CitySearchResult, Favorite, CreateFavorite, Traveler, CreateTraveler, UpdateTraveler, VerificationResponse } from './types';

export const authApi = {
  /** Step 1: Initiate registration — sends verification code to email */
  register: async (data: RegisterData): Promise<VerificationResponse> => {
    const hashed = await sha256(data.password);
    const response = await apiClient.post('/v1/auth/register', {
      ...data,
      password: hashed,
      enc: 'sha256',
    });
    return response.data;
  },

  /** Step 2: Verify email code and complete registration — returns JWT token */
  verifyEmail: async (email: string, code: string): Promise<AuthToken> => {
    const response = await apiClient.post('/v1/auth/verify-email', { email, code });
    return response.data;
  },

  /** Resend verification code */
  resendVerification: async (email: string): Promise<VerificationResponse> => {
    const response = await apiClient.post('/v1/auth/resend-verification', { email });
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthToken> => {
    const hashed = await sha256(credentials.password);
    const response = await apiClient.post('/v1/auth/login', {
      ...credentials,
      password: hashed,
      enc: 'sha256',
    });
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

  forgotPassword: async (email: string): Promise<{ message: string; email: string; expiresInMinutes: number }> => {
    const response = await apiClient.post('/v1/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email: string, code: string, newPassword: string): Promise<{ message: string }> => {
    const hashed = await sha256(newPassword);
    const response = await apiClient.post('/v1/auth/reset-password', { email, code, new_password: hashed, enc: 'sha256' });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const hashedCurrent = await sha256(currentPassword);
    const hashedNew = await sha256(newPassword);
    const response = await apiClient.post('/v1/auth/change-password', { current_password: hashedCurrent, new_password: hashedNew, enc: 'sha256' });
    return response.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete('/v1/auth/me');
    return response.data;
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
