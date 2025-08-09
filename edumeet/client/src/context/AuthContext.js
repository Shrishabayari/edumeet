import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenManager, apiMethods } from '../services/api';

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

  // Helper function to store auth data in localStorage ONLY
  const storeAuthDataInLocalStorage = (token, userInfo, tokenType = 'userToken') => {
    console.log('🔧 === FORCING LOCALSTORAGE STORAGE ===');
    console.log('Token type:', tokenType);
    console.log('Token:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('User Info:', userInfo);

    try {
      // FORCE localStorage storage - bypass tokenManager defaults
      localStorage.setItem(tokenType, token);
      sessionStorage.removeItem(tokenType); // Remove from session
      console.log(`✅ ${tokenType} stored in localStorage`);

      // Store user info in localStorage
      const userInfoString = JSON.stringify(userInfo);
      localStorage.setItem('user', userInfoString);
      localStorage.setItem('userRole', userInfo.role);
      
      // Remove from sessionStorage to avoid conflicts
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('userRole');
      console.log('✅ User data stored in localStorage');

      // Verify storage
      const storedToken = localStorage.getItem(tokenType);
      const storedUser = localStorage.getItem('user');
      const storedRole = localStorage.getItem('userRole');

      console.log('✅ Storage verification:');
      console.log('- Token in localStorage:', !!storedToken);
      console.log('- User in localStorage:', !!storedUser);
      console.log('- Role in localStorage:', !!storedRole);
      console.log('- Token in sessionStorage:', !!sessionStorage.getItem(tokenType));
      console.log('- User in sessionStorage:', !!sessionStorage.getItem('user'));

      if (!storedToken || !storedUser) {
        throw new Error('localStorage storage verification failed');
      }

      return true;
    } catch (error) {
      console.error('❌ Auth data storage failed:', error);
      throw error;
    }
  };

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status...');
      
      // Check localStorage first, then sessionStorage
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      const teacherToken = localStorage.getItem('teacherToken') || sessionStorage.getItem('teacherToken');
      const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

      console.log('Tokens found:', {
        userToken: !!userToken,
        teacherToken: !!teacherToken,
        adminToken: !!adminToken
      });

      // If tokens exist in sessionStorage, move them to localStorage
      if (sessionStorage.getItem('userToken')) {
        localStorage.setItem('userToken', sessionStorage.getItem('userToken'));
        sessionStorage.removeItem('userToken');
        console.log('🔄 Moved userToken from sessionStorage to localStorage');
      }
      if (sessionStorage.getItem('teacherToken')) {
        localStorage.setItem('teacherToken', sessionStorage.getItem('teacherToken'));
        sessionStorage.removeItem('teacherToken');
        console.log('🔄 Moved teacherToken from sessionStorage to localStorage');
      }
      if (sessionStorage.getItem('adminToken')) {
        localStorage.setItem('adminToken', sessionStorage.getItem('adminToken'));
        sessionStorage.removeItem('adminToken');
        console.log('🔄 Moved adminToken from sessionStorage to localStorage');
      }

      // Move user data to localStorage if in sessionStorage
      if (sessionStorage.getItem('user')) {
        localStorage.setItem('user', sessionStorage.getItem('user'));
        sessionStorage.removeItem('user');
        console.log('🔄 Moved user data from sessionStorage to localStorage');
      }
      if (sessionStorage.getItem('userRole')) {
        localStorage.setItem('userRole', sessionStorage.getItem('userRole'));
        sessionStorage.removeItem('userRole');
        console.log('🔄 Moved userRole from sessionStorage to localStorage');
      }

      if (userToken) {
        try {
          const response = await apiMethods.verifyToken();
          const userData = response.data.user;
          setUser(userData);
          setUserRole('user');
          setIsAuthenticated(true);
          console.log('✅ User token verified successfully');
        } catch (error) {
          console.error('❌ User token verification failed:', error);
          localStorage.removeItem('userToken');
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
        }
      } else if (teacherToken) {
        try {
          const response = await apiMethods.getTeacherProfile();
          const userData = response.data;
          setUser(userData);
          setUserRole('teacher');
          setIsAuthenticated(true);
          console.log('✅ Teacher token verified successfully');
        } catch (error) {
          console.error('❌ Teacher token verification failed:', error);
          localStorage.removeItem('teacherToken');
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
        }
      } else if (adminToken) {
        try {
          const response = await apiMethods.getAdminProfile();
          const userData = response.data;
          setUser(userData);
          setUserRole('admin');
          setIsAuthenticated(true);
          console.log('✅ Admin token verified successfully');
        } catch (error) {
          console.error('❌ Admin token verification failed:', error);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
        }
      } else {
        console.log('ℹ️ No tokens found - user not authenticated');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials, role = 'user', rememberMe = true) => {
    try {
      console.log(`🔄 Logging in as ${role}...`);
      console.log('Remember Me (will be ignored - always using localStorage):', rememberMe);
      
      let response;
      let token;
      let userData;

      switch (role) {
        case 'teacher':
          response = await apiMethods.teacherLogin(credentials);
          token = response.data.token || response.token;
          userData = response.data.teacher || response.data.user || response.data;
          
          // FORCE localStorage storage
          const teacherInfo = {
            id: userData._id || userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role || 'teacher',
            profile: userData.profile,
            approvalStatus: userData.approvalStatus
          };
          
          storeAuthDataInLocalStorage(token, teacherInfo, 'teacherToken');
          setUser(teacherInfo);
          setUserRole('teacher');
          break;
          
        case 'admin':
          response = await apiMethods.adminLogin(credentials);
          token = response.data.token || response.token;
          userData = response.data.admin || response.data.user || response.data;
          
          // FORCE localStorage storage
          const adminInfo = {
            id: userData._id || userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role || 'admin',
            profile: userData.profile,
            approvalStatus: userData.approvalStatus
          };
          
          storeAuthDataInLocalStorage(token, adminInfo, 'adminToken');
          setUser(adminInfo);
          setUserRole('admin');
          break;
          
        default:
          response = await apiMethods.login(credentials);
          token = response.data.token || response.token;
          userData = response.data.user || response.data;
          
          // FORCE localStorage storage
          const userInfo = {
            id: userData._id || userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role || 'student',
            profile: userData.profile,
            approvalStatus: userData.approvalStatus
          };
          
          storeAuthDataInLocalStorage(token, userInfo, 'userToken');
          setUser(userInfo);
          setUserRole('user');
      }

      if (!token) {
        throw new Error('No token received from server');
      }

      setIsAuthenticated(true);

      console.log('🎉 Login successful! All data stored in localStorage ONLY');
      console.log('Final verification:');
      console.log('- localStorage userToken:', !!localStorage.getItem('userToken'));
      console.log('- localStorage teacherToken:', !!localStorage.getItem('teacherToken'));
      console.log('- localStorage adminToken:', !!localStorage.getItem('adminToken'));
      console.log('- localStorage user:', !!localStorage.getItem('user'));
      console.log('- sessionStorage userToken:', !!sessionStorage.getItem('userToken'));
      console.log('- sessionStorage teacherToken:', !!sessionStorage.getItem('teacherToken'));
      console.log('- sessionStorage adminToken:', !!sessionStorage.getItem('adminToken'));
      console.log('- sessionStorage user:', !!sessionStorage.getItem('user'));

      return response.data || response;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log(`🔄 Logging out ${userRole}...`);
      
      // Call appropriate logout endpoint based on role
      switch (userRole) {
        case 'teacher':
          try {
            await apiMethods.teacherLogout();
          } catch (error) {
            console.warn('Teacher logout API call failed:', error);
          }
          break;
          
        case 'admin':
          try {
            // await apiMethods.adminLogout(); // If you have this endpoint
          } catch (error) {
            console.warn('Admin logout API call failed:', error);
          }
          break;
          
        default:
          try {
            await apiMethods.logout();
          } catch (error) {
            console.warn('User logout API call failed:', error);
          }
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      // FORCE clear both localStorage and sessionStorage
      const itemsToClear = [
        'userToken', 'adminToken', 'teacherToken',
        'user', 'admin', 'teacher', 'userRole'
      ];
      
      itemsToClear.forEach(item => {
        localStorage.removeItem(item);
        sessionStorage.removeItem(item);
      });
      
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
      console.log('✅ Logout completed - all tokens and data cleared from BOTH storages');
    }
  };

  const updateUser = (updatedUserData) => {
    const newUser = {
      ...user,
      ...updatedUserData
    };
    
    setUser(newUser);
    
    // Update localStorage ONLY
    localStorage.setItem('user', JSON.stringify(newUser));
    sessionStorage.removeItem('user'); // Remove from session
    console.log('✅ User data updated in state and localStorage only');
  };

  const refreshAuthData = async () => {
    try {
      console.log('🔄 Refreshing auth data...');
      await checkAuthStatus();
    } catch (error) {
      console.error('❌ Failed to refresh auth data:', error);
    }
  };

  // Debug function to check current storage
  const debugStorage = () => {
    console.log('🔍 CURRENT STORAGE DEBUG:');
    console.log('localStorage:', {
      userToken: !!localStorage.getItem('userToken'),
      teacherToken: !!localStorage.getItem('teacherToken'),
      adminToken: !!localStorage.getItem('adminToken'),
      user: !!localStorage.getItem('user'),
      userRole: localStorage.getItem('userRole')
    });
    console.log('sessionStorage:', {
      userToken: !!sessionStorage.getItem('userToken'),
      teacherToken: !!sessionStorage.getItem('teacherToken'),
      adminToken: !!sessionStorage.getItem('adminToken'),
      user: !!sessionStorage.getItem('user'),
      userRole: sessionStorage.getItem('userRole')
    });
  };

  const value = {
    user,
    userRole,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    refreshAuthData,
    checkAuthStatus,
    debugStorage
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};