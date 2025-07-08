import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, Users, Globe, Zap, LogOut, User, AlertCircle } from 'lucide-react';
import apiServices from "../../services/api"; // Adjust path as needed

// API Helper functions for token management
const apiHelpers = {
  initializeToken: () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      apiServices.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
  
  getToken: () => {
    return localStorage.getItem('adminToken');
  },
  
  setToken: (token) => {
    localStorage.setItem('adminToken', token);
    apiServices.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  
  removeToken: () => {
    localStorage.removeItem('adminToken');
    delete apiServices.api.defaults.headers.common['Authorization'];
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('adminToken');
  },
  
  logout: () => {
    apiHelpers.removeToken();
  }
};

// Admin API functions
const adminAPI = {
  getProfile: async () => {
    try {
      const response = await apiServices.api.get('/admin/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getDashboardStats: async () => {
    try {
      const response = await apiServices.api.get('/admin/dashboard-stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await apiServices.api.post('/admin/logout');
      apiHelpers.logout();
      return { success: true };
    } catch (error) {
      // Force logout even if API call fails
      apiHelpers.logout();
      return { success: true };
    }
  }
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Array of dashboard items with their details
  const dashboardItems = [
    {
      title: "Add Teacher",
      description: "Register a new electric vehicle charging station to the system.",
      icon: <PlusCircle className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-blue-50",
      hoverBg: "hover:bg-blue-600",
      textColor: "text-blue-800",
      path: "/admin/teacher-register",
    },
    {
      title: "Student Approval",
      description: "View, edit, and manage all registered EV charging stations.",
      icon: <MapPin className="w-10 h-10 text-green-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-green-50",
      hoverBg: "hover:bg-green-600",
      textColor: "text-green-800",
      path: "/admin/approval",
    },
    {
      title: "View Bunk Locations",
      description: "See all EV bunk locations on an interactive map.",
      icon: <Globe className="w-10 h-10 text-yellow-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-yellow-50",
      hoverBg: "hover:bg-yellow-600",
      textColor: "text-yellow-800",
      path: "/admin/view-bunk-locations",
    },
    {
      title: "Manage Users",
      description: "View and manage all registered user accounts.",
      icon: <Users className="w-10 h-10 text-red-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-red-50",
      hoverBg: "hover:bg-red-600",
      textColor: "text-red-800",
      path: "/admin/registered-users",
    },
    {
      title: "My Profile",
      description: "Get a high-level overview of system performance and statistics.",
      icon: <Zap className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-indigo-50",
      hoverBg: "hover:bg-indigo-600",
      textColor: "text-indigo-800",
      path: "/admin/my-profile",
    },
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Initialize token first
        apiHelpers.initializeToken();
        
        // Check if authenticated
        if (!apiHelpers.isAuthenticated()) {
          navigate('/admin/login');
          return;
        }

        // Load admin profile
        try {
          const profile = await adminAPI.getProfile();
          setAdminData(profile);
        } catch (profileError) {
          console.log('Profile loading failed, continuing without profile data');
        }

        // Load dashboard stats
        try {
          const dashboardStats = await adminAPI.getDashboardStats();
          setStats(dashboardStats);
        } catch (statsError) {
          console.log('Stats loading failed, continuing without stats');
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try refreshing the page.');
        
        // If it's an authentication error, redirect to login
        if (error.response?.status === 401 || error.response?.status === 403) {
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
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
                  Welcome to the administration panel. Manage your EV Charge Hub efficiently.
                </p>
              </div>
              
              <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                {adminData && (
                  <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-4 py-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{adminData.name}</p>
                      <p className="text-xs text-gray-600">{adminData.email}</p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
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
                  <div key={key} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                    <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
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

          {/* Token Status (Debug - remove in production) */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Token Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                apiHelpers.getToken() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {apiHelpers.getToken() ? 'Valid' : 'Invalid'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;