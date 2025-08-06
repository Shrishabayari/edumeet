import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenManager, apiMethods } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'user', 'teacher', 'admin'
  const [loading, setLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for different types of tokens
      const userToken = tokenManager.getUserToken();
      const teacherToken = tokenManager.getTeacherToken();
      const adminToken = tokenManager.getAdminToken();

      if (userToken) {
        // Verify user token
        const response = await apiMethods.verifyToken();
        setUser(response.data.user);
        setUserRole('user');
        setIsAuthenticated(true);
      } else if (teacherToken) {
        // Verify teacher token
        const response = await apiMethods.getTeacherProfile();
        setUser(response.data);
        setUserRole('teacher');
        setIsAuthenticated(true);
      } else if (adminToken) {
        // Verify admin token
        const response = await apiMethods.getAdminProfile();
        setUser(response.data);
        setUserRole('admin');
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      tokenManager.clearAllTokens();
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials, role = 'user') => {
    try {
      let response;
      
      switch (role) {
        case 'teacher':
          response = await apiMethods.teacherLogin(credentials);
          tokenManager.setTeacherToken(response.data.token);
          break;
        case 'admin':
          response = await apiMethods.adminLogin(credentials);
          tokenManager.setAdminToken(response.data.token);
          break;
        default:
          response = await apiMethods.login(credentials);
          tokenManager.setUserToken(response.data.token);
      }

      setUser(response.data.user || response.data);
      setUserRole(role);
      setIsAuthenticated(true);
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call appropriate logout endpoint based on role
      switch (userRole) {
        case 'teacher':
          await apiMethods.teacherLogout();
          tokenManager.removeTeacherToken();
          break;
        case 'admin':
          // Assuming you have an admin logout endpoint
          tokenManager.removeAdminToken();
          break;
        default:
          await apiMethods.logout();
          tokenManager.removeUserToken();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear state regardless of API success
      tokenManager.clearAllTokens();
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    userRole,
    isAuthenticated,
    loading,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};