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
      // 后端偏慎时（AI/SerpAPI 调用）一般几秒内返回，30s 足够覆盖常规路径；
      // 超时后 axios 会抛 ECONNABORTED，拦截器会发送 service-busy 事件提示用户。
      timeout: 30000,
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
          // Don't treat 401 on login/register/change-password as a session expiry
          const url = error.config?.url || '';
          const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/change-password');
          if (!isAuthEndpoint) {
            localStorage.removeItem('airease_token');
            // Dispatch custom event for auth state update
            window.dispatchEvent(new Event('auth:logout'));
          }
        }

        // Service-busy gentle reminder: 后端超时 / 网络不可达 / 5xx 时提示用户服务繁忙，
        // 避免页面沉默等待。不覆盖原始 error，调用方仍可自行补充处理。
        const status = error.response?.status;
        const isTimeout = error.code === 'ECONNABORTED' || error.message === 'Network Error';
        if (typeof window !== 'undefined' && (isTimeout || (typeof status === 'number' && status >= 500))) {
          window.dispatchEvent(new CustomEvent('airease:service-busy', {
            detail: { status: status ?? 0, isTimeout, url: error.config?.url || '' },
          }));
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
