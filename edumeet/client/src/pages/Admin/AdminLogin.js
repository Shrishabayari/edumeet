import React, { useState, useEffect } from "react";
import apiServices from "../../services/api";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

// API Helper functions for token management
const apiHelpers = {
  initializeToken: () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Set token in API headers if it exists
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
  },
  
  testConnection: async () => {
    try {
      const response = await apiServices.api.get('/admin/test-connection');
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
};

// Admin API functions
const adminAPI = {
  login: async (credentials) => {
    try {
      const response = await apiServices.api.post('/admin/login', credentials);
      
      if (response.data.token) {
        apiHelpers.setToken(response.data.token);
        return {
          success: true,
          data: response.data,
          message: 'Login successful'
        };
      } else {
        return {
          success: false,
          message: 'No token received'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  },
  
  register: async (userData) => {
    try {
      const response = await apiServices.api.post('/admin/register', userData);
      
      if (response.data.token) {
        apiHelpers.setToken(response.data.token);
        return {
          success: true,
          data: response.data,
          message: 'Registration successful'
        };
      } else {
        return {
          success: false,
          message: 'No token received'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  },
  
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

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // Initialize token on component mount
  useEffect(() => {
    apiHelpers.initializeToken();
    
    // Check if already authenticated
    if (apiHelpers.isAuthenticated()) {
      navigate("/admin/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage(""); 
    setLoading(true); 

    try {
      console.log('Attempting admin login...');
      
      const response = await adminAPI.login({
        email,
        password,
      });

      console.log('Login response:', response);

      if (response.success) {
        setMessage("Login successful! Redirecting to dashboard...");
        
        // Redirect to admin dashboard
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 1500);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage(""); 
    setLoading(true);

    // Add name field for registration
    const registerData = {
      email,
      password,
      name: 'Admin User' // You might want to add a name field to the form
    };

    try {
      console.log('Attempting admin registration...');
      
      const response = await adminAPI.register(registerData);
      
      console.log('Registration response:', response);
      
      if (response.success) {
        setMessage('Registration successful! Redirecting to dashboard...');
        
        // Redirect to admin dashboard
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 1500);
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
        }}
      />
     <div className="relative z-20">
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row pt-10 pb-10">
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
          <div className="max-w-lg">
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Admin<br />Portal
            </h1>
            <p className="text-lg text-gray-200 mb-8 leading-relaxed">
              Empower your administrative control over the entire system. Manage bunks, bunk locations, users, and their bookings with precision and ease.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center px-8 lg:px-16">
          <div className="w-full max-w-md">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white border-opacity-20">
              <div className=" items-center mb-2 text-center">
                <h2 className="text-4xl font-bold text-white">
                  Admin Sign in
                </h2>
                </div>
                <div>
                  <p className="text-1xl text-gray-100 mb-8 text-center">
                    Don't have an account?{' '}
                  <Link to="/admin/register" className="text-blue-300 hover:text-blue-200 underline font-medium">
                    Admin Sign Up
                  </Link>
                </p>
                </div>

              {error && (
                <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="block sm:inline font-medium">{error}</span>
                </div>
              )}

              {message && (
                <div className="bg-green-500 bg-opacity-20 border border-green-400 text-green-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-3 text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="block sm:inline font-medium">{message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-300" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="w-full pl-10 pr-4 py-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-300" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      className="w-full pl-10 pr-12 py-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="form-actions space-y-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      "Admin Sign in"
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center space-y-2">
                <Link
                  to="/user/login" 
                  className="block hover:font-bold text-white font-semibold py-2"
                >
                  User Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20">
      </div>
    </div>
  );
};

export default AdminLogin;

// Export the API helpers and admin API for use in other components
export { apiHelpers, adminAPI };