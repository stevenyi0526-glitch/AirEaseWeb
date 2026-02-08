import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { User, LoginCredentials, RegisterData, UpdateUserData, VerificationResponse } from '../api/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<VerificationResponse>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<VerificationResponse>;
  updateUser: (data: UpdateUserData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('airease_token')
  );
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('airease_token');
  }, []);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch {
        // Token is invalid, clear it
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token, logout]);

  // Listen for logout events from API client
  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    setToken(response.accessToken);
    setUser(response.user);
    localStorage.setItem('airease_token', response.accessToken);
  };

  const register = async (data: RegisterData): Promise<VerificationResponse> => {
    // Step 1: Initiate registration — sends verification code, does NOT create user yet
    const response = await authApi.register(data);
    return response;
  };

  const verifyEmail = async (email: string, code: string) => {
    // Step 2: Verify code and complete registration — returns JWT token
    const response = await authApi.verifyEmail(email, code);
    setToken(response.accessToken);
    setUser(response.user);
    localStorage.setItem('airease_token', response.accessToken);
  };

  const resendVerification = async (email: string): Promise<VerificationResponse> => {
    return await authApi.resendVerification(email);
  };

  const updateUser = async (data: UpdateUserData) => {
    const updatedUser = await authApi.updateMe(data);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        verifyEmail,
        resendVerification,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
