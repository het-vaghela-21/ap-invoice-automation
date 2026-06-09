import React, { createContext, useState, useEffect, useContext } from 'react';
import authService, { apiClient } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and verify authentication on app load
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // Set token in Axios globally via localStorage configuration inside authService
          const response = await authService.getCurrentUser();
          if (response?.user) {
            setUser(response.user);
          } else {
            // Token is invalid/expired
            handleLogout();
          }
        } catch (error) {
          console.error('Verify token failed, logging out:', error);
          handleLogout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [token]);

  const handleLogin = (jwtToken, userData) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isLoading,
    login: handleLogin,
    logout: handleLogout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume the AuthContext easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
