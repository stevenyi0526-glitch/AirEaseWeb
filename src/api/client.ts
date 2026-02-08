import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';

// Use relative URL by default so requests go through Vite's proxy.
// This ensures both localhost and ngrok (external) access work —
// the browser sends API requests to the same host that served the page,
// and Vite's dev server proxies /v1/* to localhost:8000.
const API_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('airease_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('airease_token');
          // Dispatch custom event for auth state update
          window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
      }
    );
  }

  get instance() {
    return this.client;
  }
}

export const apiClient = new ApiClient().instance;
