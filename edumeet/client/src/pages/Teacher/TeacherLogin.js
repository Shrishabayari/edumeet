import React, { useState } from "react";
import {
  Mail, Lock, AlertCircle, CheckCircle,
  Eye, EyeOff, User, BookOpen
} from 'lucide-react';

// ✅ Reusable API Client
const createApiClient = () => {
  const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://edumeet.onrender.com/api'
    : 'http://localhost:5000/api';

  let authToken = null;

  const handleErrors = async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || `Request failed with status ${response.status}`,
        data,
      };
    }
    return data;
  };

  return {
    post: async (endpoint, body) => {
      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        return await handleErrors(response);
      } catch (error) {
        if (error.status) throw error;
        throw {
          status: 0,
          message: 'Network error. Please check your connection and server status.',
        };
      }
    },
    setAuthToken: (token) => {
      authToken = token;
    },
    getToken: () => authToken,
    clearAuthToken: () => {
      authToken = null;
    },
    isAuthenticated: () => !!authToken,
  };
};

const TeacherLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const api = createApiClient();

  const validateForm = () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!validateForm()) return;

      const response = await api.post("/teachers/login", {
        email,
        password,
      });

      console.log("Teacher Login Response Data:", response);
      console.log("Token received from Teacher Login:", response.token);

      localStorage.setItem("token", response.token);
      setMessage("Login successful! Redirecting to dashboard...");

      setTimeout(() => {
        setMessage("Login successful! You would be redirected to the teacher dashboard.");
        // Example: navigate("/teacher/dashboard");
      }, 1500);
    } catch (err) {
      console.error("Teacher login error:", err);
      if (err.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.status === 403) {
        setError('Account access is restricted. Please contact support.');
      } else if (err.status === 429) {
        setError('Too many login attempts. Please try again later.');
      } else if (err.status === 0) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row pt-10 pb-10">
        {/* Left Side */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
          <div className="max-w-lg">
            <div className="flex items-center mb-6">
              <div className="bg-blue-600 bg-opacity-20 p-4 rounded-full mr-4">
                <BookOpen className="h-10 w-10 text-blue-300" />
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Teacher<br />Portal
              </h1>
            </div>
            <p className="text-lg text-gray-200 mb-8 leading-relaxed">
              Welcome to your teaching hub. Access your classes, manage student progress, create assignments, and inspire learning with our comprehensive educational platform.
            </p>
            <div className="flex items-center space-x-4 text-gray-300">
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <span className="text-sm">Secure Access</span>
              </div>
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                <span className="text-sm">Class Management</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex items-center px-8 lg:px-16">
          <div className="w-full max-w-md">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white border-opacity-20">
              <div className="text-center mb-8">
                <div className="bg-blue-600 bg-opacity-30 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-200" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">Teacher Sign in</h2>
                <p className="text-gray-200">
                  Don't have an account?{" "}
                  <button className="text-blue-300 hover:text-blue-200 underline font-medium">
                    Contact Admin
                  </button>
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {message && (
                <div className="bg-green-500 bg-opacity-20 border border-green-400 text-green-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-3 text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                    <input
                      type="email"
                      id="email"
                      className="w-full pl-10 pr-4 py-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none backdrop-blur-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teacher@school.edu"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      className="w-full pl-10 pr-12 py-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none backdrop-blur-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me / Forgot */}
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded" />
                    Remember me
                  </label>
                  <button type="button" className="text-blue-300 hover:text-blue-200 underline">
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 hover:scale-105 shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign in to Dashboard"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-white">
                <button className="hover:text-blue-200">Need Help? Contact Support</button>
              </div>

              <div className="mt-4 text-center pt-4 border-t border-white border-opacity-20">
                <p className="text-xs text-gray-300 mb-2">
                  Demo: Try logging in with any valid email and password
                </p>
                <p className="text-xs text-gray-400">
                  Auth Status: {api.getToken() ? 'Authenticated' : 'Not authenticated'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin;
