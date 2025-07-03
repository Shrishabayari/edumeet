import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, GraduationCap, AlertCircle, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState(null);

  // API configuration
  const API_URL = process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL || 'https://edumeet.onrender.com/api'
    : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear login status when user makes changes
    if (loginStatus) {
      setLoginStatus(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setLoginStatus(null);

    try {
      // Prepare the data for API submission
      const loginData = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      };

      // Debug: Log the data being sent
      console.log('Sending login data:', { email: loginData.email });
      console.log('API URL:', `${API_URL}/auth/login`);

      // Make API call to login endpoint
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      // Debug: Log response details
      console.log('Response status:', response.status);

      let result;
      try {
        result = await response.json();
        console.log('Response data:', result);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }

      if (response.ok) {
        // Login successful
        setLoginStatus('success');
        
        // Store authentication data
        if (result.token) {
          if (formData.rememberMe) {
            // Note: localStorage not available in Claude.ai artifacts
            console.log('Would store token in localStorage');
          } else {
            // Note: sessionStorage not available in Claude.ai artifacts
            console.log('Would store token in sessionStorage');
          }
        }

        // Store user info if returned
        if (result.user) {
          const userInfo = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            profile: result.user.profile
          };
          
          console.log('Would store user info:', userInfo);
        }

        // Redirect to dashboard after successful login
        setTimeout(() => {
          console.log('Redirecting to dashboard...');
          window.location.href = '/user/dashboard';
        }, 2000);

      } else {
        // Handle login errors
        setLoginStatus('error');
        
        // Debug: Log the error details
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: result
        });
        
        // Handle specific error types
        if (response.status === 401) {
          setErrors({ general: 'Invalid email or password. Please try again.' });
        } else if (response.status === 403) {
          setErrors({ general: 'Account is disabled. Please contact support.' });
        } else if (response.status === 429) {
          setErrors({ general: 'Too many login attempts. Please try again later.' });
        } else if (result && result.message) {
          setErrors({ general: result.message });
        } else {
          setErrors({ general: `Login failed (${response.status}): ${response.statusText}` });
        }
      }

    } catch (error) {
      console.error('Login error:', error);
      setLoginStatus('error');
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      } else {
        setErrors({ general: `An unexpected error occurred: ${error.message}` });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
  };

  const handleSignUpRedirect = () => {
    console.log('Redirecting to registration page...');
    window.location.href = '/user/register';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Main Login Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Welcome Back
                </h1>
                <p className="mt-2 text-gray-600 font-medium">Sign in to continue your journey</p>
              </div>

              {/* Status Messages */}
              {loginStatus === 'success' && (
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-green-800">Login Successful!</p>
                      <p className="text-sm text-green-700">Redirecting you to your dashboard...</p>
                    </div>
                  </div>
                </div>
              )}

              {loginStatus === 'error' && errors.general && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-red-800">Login Failed</p>
                      <p className="text-sm text-red-700">{errors.general}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 font-medium ${
                        errors.email ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Enter your email address"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-600 font-medium">{errors.email}</p>}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-14 py-4 bg-gray-50/50 border-2 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 font-medium ${
                        errors.password ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-600 font-medium">{errors.password}</p>}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                    />
                    <label htmlFor="rememberMe" className="ml-3 block text-sm font-medium text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/80 text-gray-500 font-medium">New to our platform?</span>
                  </div>
                </div>
              </div>

              {/* Sign Up Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSignUpRedirect}
                  className="w-full bg-white text-gray-700 py-4 px-6 rounded-2xl font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 focus:ring-4 focus:ring-gray-200/50 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                >
                  Create New Account
                </button>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/80 transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Students</h3>
                <p className="text-xs text-gray-600 mt-1">Access courses & assignments</p>
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/80 transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-center">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Teachers</h3>
                <p className="text-xs text-gray-600 mt-1">Manage classes & grades</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;