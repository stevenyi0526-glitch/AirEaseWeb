import { apiClient } from './client';
import type { AuthToken, LoginCredentials, RegisterData, User, UpdateUserData, CitySearchResult, Favorite, CreateFavorite, Traveler, CreateTraveler, UpdateTraveler, VerificationResponse } from './types';

/**
 * Encode sensitive fields (password) with Base64 before transmission.
 * This is NOT encryption — it simply prevents the plaintext password from
 * being trivially readable in browser DevTools / network logs.
 * Real security is provided by HTTPS (TLS) in production.
 */
function encodePassword(plain: string): string {
  return btoa(unescape(encodeURIComponent(plain)));
}

export const authApi = {
  /** Step 1: Initiate registration — sends verification code to email */
  register: async (data: RegisterData): Promise<VerificationResponse> => {
    const payload = { ...data, password: encodePassword(data.password), _enc: 'base64' };
    const response = await apiClient.post('/v1/auth/register', payload);
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
    const payload = { ...credentials, password: encodePassword(credentials.password), _enc: 'base64' };
    const response = await apiClient.post('/v1/auth/login', payload);
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
    const response = await apiClient.post('/v1/auth/reset-password', { email, code, new_password: encodePassword(newPassword), _enc: 'base64' });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/v1/auth/change-password', { current_password: encodePassword(currentPassword), new_password: encodePassword(newPassword), _enc: 'base64' });
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
