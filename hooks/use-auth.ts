import { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  email: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null
  });

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth/status');
      const { authenticated, user } = response.data;
      
      setAuthState({
        isAuthenticated: authenticated,
        isLoading: false,
        user: authenticated ? user : null
      });
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null
      });
    }
  };

  const login = () => {
    window.location.href = '/api/auth/google';
  };

  const logout = async () => {
    try {
      await axios.get('/api/auth/logout');
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null
      });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuthStatus
  };
} 