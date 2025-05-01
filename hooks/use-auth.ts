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
  
  // Add a function to handle token refresh errors by checking if re-authentication is needed
  const handleAuthError = async (error: any) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Check if the error response indicates need for re-authentication
      const needsReauth = error.response.data?.needsReauthentication;
      
      if (needsReauth) {
        console.warn('Authentication expired, redirecting to login...');
        // Clear any stale auth state
        await logout();
        // Redirect to login after a short delay
        setTimeout(() => {
          login();
        }, 500);
        return true; // Error was handled
      }
    }
    return false; // Error was not handled
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuthStatus,
    handleAuthError // Export the new function
  };
}