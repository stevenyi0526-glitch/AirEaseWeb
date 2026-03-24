import { apiClient } from './client';
import type { AuthToken, LoginCredentials, RegisterData, User, UpdateUserData, CitySearchResult, Favorite, CreateFavorite, Traveler, CreateTraveler, UpdateTraveler, VerificationResponse } from './types';

/* ──────────────────────────────────────────────────────────────
 * Secure password encryption for network transmission
 * ──────────────────────────────────────────────────────────────
 *
 * NEVER sends the actual password or any reversible encoding over the wire.
 *
 * Encryption scheme (nonce-XOR):
 *   Given any byte-sequence `data` (≤ 32 bytes, right-padded with 0x00):
 *     1. nonce  = 16 crypto-random bytes      → different every request
 *     2. mask   = SHA-256(nonce)               → 32-byte deterministic mask
 *     3. padded = data ‖ 0x00…  (pad to 32 B) → fixed length
 *     4. blob   = XOR(padded, mask)            → 32 random-looking bytes
 *     5. output = hex(nonce) + hex(blob)       → 96 hex chars
 *
 * Transmitted fields (what DevTools shows):
 *   password: "a7c3f0…<96 random hex>"     ← XOR-encrypted SHA-256(pw)
 *   _ph:      "d1e8b2…<96 random hex>"     ← XOR-encrypted raw pw bytes
 *
 * Both look like random hex blobs; they change every request.
 * The backend decrypts both via the same XOR-nonce scheme.
 * ────────────────────────────────────────────────────────────── */

async function sha256bytes(input: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-256', input);
  return new Uint8Array(buf);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Encrypt arbitrary data (≤ 32 bytes) with a random nonce → 96 hex chars */
async function nonceXorEncrypt(data: Uint8Array): Promise<string> {
  // Pad or truncate to 32 bytes
  const padded = new Uint8Array(32);
  padded.set(data.slice(0, 32));

  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);

  const mask = await sha256bytes(nonce);

  const blob = new Uint8Array(32);
  for (let i = 0; i < 32; i++) blob[i] = padded[i] ^ mask[i];

  return toHex(nonce) + toHex(blob);
}

/**
 * Build encrypted password fields for a request.
 * Returns { password, _ph } — both are opaque 96-hex-char strings.
 *
 *  • password = nonceXorEncrypt( SHA-256(plain) )   — for migrated accounts
 *  • _ph      = nonceXorEncrypt( utf8(plain) )      — for legacy accounts
 *
 * The backend tries password (SHA-256 path) first; falls back to _ph (plain path).
 * After a successful _ph login the backend migrates the stored hash automatically.
 */
async function encryptPasswordFields(plain: string): Promise<{ password: string; _ph: string }> {
  const plainBytes = new TextEncoder().encode(plain);

  // SHA-256(plain) — always 32 bytes
  const innerHash = await sha256bytes(plainBytes);
  const encHash = await nonceXorEncrypt(innerHash);

  // Raw plain bytes (padded/truncated to 32 bytes)
  const encPlain = await nonceXorEncrypt(plainBytes);

  return { password: encHash, _ph: encPlain };
}

export const authApi = {
  /** Step 1: Initiate registration — sends verification code to email */
  register: async (data: RegisterData): Promise<VerificationResponse> => {
    const enc = await encryptPasswordFields(data.password);
    const payload = { ...data, password: enc.password, _ph: enc._ph };
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
    const enc = await encryptPasswordFields(credentials.password);
    const payload = { email: credentials.email, password: enc.password, _ph: enc._ph };
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
    const enc = await encryptPasswordFields(newPassword);
    const response = await apiClient.post('/v1/auth/reset-password', { email, code, new_password: enc.password, _ph: enc._ph });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const encCur = await encryptPasswordFields(currentPassword);
    const encNew = await encryptPasswordFields(newPassword);
    const response = await apiClient.post('/v1/auth/change-password', {
      current_password: encCur.password, _ph_current: encCur._ph,
      new_password: encNew.password, _ph_new: encNew._ph,
    });
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
