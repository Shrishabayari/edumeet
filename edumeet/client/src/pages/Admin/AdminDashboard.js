import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { PlusCircle, LogOut, User, AlertCircle, BookOpen, UserCheck } from 'lucide-react';
import AdminNavbar from "../../components/adminNavbar";

// Fixed API configuration to match your server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://edumeet.onrender.com/api';

// API Helper functions for token management
const apiHelpers = {
  initializeToken: () => {
    const token = localStorage.getItem('adminToken');
    return token;
  },
  
  getToken: () => {
    return localStorage.getItem('adminToken');
  },
  
  setToken: (token) => {
    localStorage.setItem('adminToken', token);
  },
  
  removeToken: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('adminToken');
  },
  
  logout: () => {
    apiHelpers.removeToken();
  }
};

// Admin API functions using fetch (consistent with your login component)
const adminAPI = {
  getProfile: async () => {
    try {
      const token = apiHelpers.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('Attempting to fetch profile with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}/admin/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      console.log('Profile response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Profile fetch failed:', errorData);
        
        if (response.status === 401) {
          throw new Error('Unauthorized - Please login again');
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Profile data received:', data);
      return data;
    } catch (error) {
      console.error('Profile API error:', error);
      throw error;
    }
  },
  
  getDashboardStats: async () => {
    try {
      const token = apiHelpers.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Try both endpoints - first the main dashboard endpoint
      let response;
      try {
        console.log('Trying dashboard endpoint...');
        response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      } catch (err) {
        console.log('Dashboard endpoint failed, trying stats endpoint...');
        response = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      }
      
      console.log('Stats response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stats fetch failed:', errorData);
        
        if (response.status === 401) {
          throw new Error('Unauthorized - Please login again');
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Stats data received:', data);
      
      // Handle different response formats
      if (data.data && typeof data.data === 'object') {
        return data.data;
      } else if (data.stats && typeof data.stats === 'object') {
        return data.stats;
      } else {
        // Return the data as-is if it's already in the right format
        return data;
      }
    } catch (error) {
      console.error('Dashboard stats API error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      const token = apiHelpers.getToken();
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/admin/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
          });
        } catch (logoutError) {
          console.warn('Logout API call failed, but continuing with local cleanup:', logoutError);
        }
      }
      
      apiHelpers.logout();
      return { success: true };
    } catch (error) {
      console.error('Logout API error:', error);
      // Force logout even if API call fails
      apiHelpers.logout();
      return { success: true };
    }
  }
};

// Helper function to format stat values for display
const formatStatValue = (value) => {
  if (value === null || value === undefined) {
    return '0';
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length.toString();
    }
    // If it's an object, try to get a meaningful count
    return Object.keys(value).length.toString();
  }
  return value.toString();
};

// Helper function to format stat keys for display
const formatStatKey = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, (str) => str.toUpperCase());
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Updated dashboard items to match educational platform
  const dashboardItems = [
    {
      title: "Add Teacher",
      description: "Register a new teacher and send them setup credentials.",
      icon: <PlusCircle className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-blue-50",
      hoverBg: "hover:bg-blue-600",
      textColor: "text-blue-800",
      path: "/admin/teacher-register",
    },
    {
      title: "View Teachers",
      description: "Manage all registered teachers and their profiles.",
      icon: <BookOpen className="w-10 h-10 text-purple-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-purple-50",
      hoverBg: "hover:bg-purple-600",
      textColor: "text-purple-800",
      path: "/admin/view-teachers",
    },
    {
      title: "Student Approval",
      description: "Review and approve pending student registrations.",
      icon: <UserCheck className="w-10 h-10 text-green-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-green-50",
      hoverBg: "hover:bg-green-600",
      textColor: "text-green-800",
      path: "/admin/approval",
    },
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Check if authenticated
        if (!apiHelpers.isAuthenticated()) {
          console.log('Not authenticated, redirecting to login');
          navigate('/admin/login');
          return;
        }

        // Try to get admin data from localStorage first
        const storedAdmin = localStorage.getItem('admin');
        if (storedAdmin) {
          try {
            const parsed = JSON.parse(storedAdmin);
            setAdminData(parsed);
            console.log('Loaded admin data from storage:', parsed);
          } catch (e) {
            console.log('Error parsing stored admin data:', e);
          }
        }

        // Load admin profile from API
        try {
          console.log('Loading admin profile...');
          const profileResponse = await adminAPI.getProfile();
          
          // Handle different response formats
          let profileData;
          if (profileResponse.data && typeof profileResponse.data === 'object') {
            profileData = profileResponse.data;
          } else if (profileResponse.admin && typeof profileResponse.admin === 'object') {
            profileData = profileResponse.admin;
          } else if (profileResponse.success && profileResponse.user) {
            profileData = profileResponse.user;
          } else {
            profileData = profileResponse;
          }
          
          setAdminData(profileData);
          console.log('Profile loaded successfully:', profileData);
          
          // Update localStorage with fresh data
          if (profileData) {
            localStorage.setItem('admin', JSON.stringify(profileData));
          }
          
        } catch (profileError) {
          console.log('Profile loading failed:', profileError);
          
          // If it's an authentication error, redirect to login
          if (profileError.message.includes('Unauthorized') || 
              profileError.message.includes('401') || 
              profileError.message.includes('403')) {
            console.log('Authentication error, redirecting to login');
            apiHelpers.logout();
            navigate('/admin/login');
            return;
          }
          
          // Set a user-friendly error message but continue loading
          setError('Failed to load profile. Some features may not work correctly.');
        }

        // Load dashboard stats
        try {
          console.log('Loading dashboard stats...');
          const dashboardStats = await adminAPI.getDashboardStats();
          console.log('Dashboard stats received:', dashboardStats);
          setStats(dashboardStats);
        } catch (statsError) {
          console.log('Stats loading failed:', statsError);
          
          // If it's an authentication error, redirect to login
          if (statsError.message.includes('Unauthorized') || 
              statsError.message.includes('401') || 
              statsError.message.includes('403')) {
            console.log('Stats authentication error, redirecting to login');
            apiHelpers.logout();
            navigate('/admin/login');
            return;
          }
          
          // Continue without stats - not critical for basic functionality
          console.log('Continuing without stats');
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try refreshing the page.');
        
        // If it's an authentication error, redirect to login
        if (error.message.includes('Unauthorized') || 
            error.message.includes('401') || 
            error.message.includes('403')) {
          apiHelpers.logout();
          navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await adminAPI.logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      apiHelpers.logout();
      navigate('/admin/login');
    }
  };

  const handleNavigation = (path) => {
    // Ensure user is still authenticated before navigation
    if (!apiHelpers.isAuthenticated()) {
      navigate('/admin/login');
      return;
    }
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminNavbar/>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 sm:p-10 lg:p-12">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 lg:p-10">
          {/* Header Section with Admin Info */}
          <div className="mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-3 lg:text-5xl">
                  Admin Dashboard
                </h1>
                <p className="text-xl text-gray-600 lg:text-2xl">
                  Welcome to the administration panel. Manage your EduMeet platform efficiently.
                </p>
              </div>
              
              <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                {adminData && (
                  <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-4 py-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {adminData.name || adminData.username || 'Admin'}
                      </p>
                      <p className="text-xs text-gray-600">{adminData.email}</p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  disabled={loading}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Stats Section */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Object.entries(stats).map(([key, value]) => (
                  <div key={key} className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-100">
                    <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                      {formatStatKey(key)}
                    </h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatStatValue(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grid of Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {dashboardItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className={`group flex flex-col items-center text-center p-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg
                  ${item.bgColor} ${item.hoverBg}
                  border border-gray-100 
                `}
              >
                <div className="mb-4">
                  {item.icon}
                </div>
                <h2 className={`text-2xl font-bold mb-2 group-hover:text-white transition-colors duration-300 ${item.textColor}`}>
                  {item.title}
                </h2>
                <p className="text-gray-600 group-hover:text-white transition-colors duration-300 text-base">
                  {item.description}
                </p>
              </button>
            ))}
          </div>

          {/* Debug Info - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Debug Info:</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Token Status: 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  apiHelpers.getToken() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {apiHelpers.getToken() ? 'Valid' : 'Invalid'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                API URL: {API_BASE_URL}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Token: {apiHelpers.getToken() ? `${apiHelpers.getToken().substring(0, 20)}...` : 'None'}
              </p>
              {stats && (
                <p className="text-xs text-gray-500 mt-1">
                  Stats: {JSON.stringify(stats)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;