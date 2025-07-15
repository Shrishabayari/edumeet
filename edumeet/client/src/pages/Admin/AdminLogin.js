import React, { useState } from "react";
import {
  Mail, Lock, AlertCircle, CheckCircle,
  Eye, EyeOff, User, Shield
} from 'lucide-react';
import { useNavigate, Link } from "react-router-dom";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Use the same API base URL structure as your api.js
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://edumeet-server.onrender.com' || 'http://localhost:5000';

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

      console.log("Attempting admin login with URL:", `${API_BASE_URL}/admin/login`);

      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      console.log("Admin Login Response:", data);

      if (!response.ok) {
        // Fixed: Create proper Error object instead of throwing plain object
        const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      // Store admin token specifically
      if (data.token) {
        localStorage.setItem("adminToken", data.token);
        console.log("Admin token stored:", data.token);
      }

      // Store admin user data if available
      if (data.admin) {
        localStorage.setItem("admin", JSON.stringify(data.admin));
        console.log("Admin data stored:", data.admin);
      }

      setMessage("Login successful! Redirecting to admin dashboard...");

      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1500);

    } catch (err) {
      console.error("Admin login error:", err);
      
      if (err.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.status === 403) {
        setError('Account access is restricted. Please contact support.');
      } else if (err.status === 429) {
        setError('Too many login attempts. Please try again later.');
      } else if (err.status === 0 || !err.status) {
        setError('Network error. Please check your connection and server status.');
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
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row pt-10 pb-10">
        {/* Left Side */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
          <div className="max-w-lg">
            <div className="flex items-center mb-6">
              <div className="bg-red-600 bg-opacity-20 p-4 rounded-full mr-4">
                <Shield className="h-10 w-10 text-red-300" />
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Admin<br />Portal
              </h1>
            </div>
            <p className="text-lg text-gray-200 mb-8 leading-relaxed">
              Welcome to the administrative hub. Manage users, oversee system operations, configure settings, and maintain the platform with full administrative control.
            </p>
            <div className="flex items-center space-x-4 text-gray-300">
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                <span className="text-sm">Secure Access</span>
              </div>
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <span className="text-sm">User Management</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex items-center px-8 lg:px-16">
          <div className="w-full max-w-md">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white border-opacity-20">
              <div className="text-center mb-8">
                <div className="bg-red-600 bg-opacity-30 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-red-200" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">Admin Sign in</h2>
                <p className="text-gray-200">
                  Access the administrative dashboard
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
                      className="w-full pl-10 pr-4 py-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-red-400 focus:outline-none backdrop-blur-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@school.edu"
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
                      className="w-full pl-10 pr-12 py-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-red-400 focus:outline-none backdrop-blur-sm"
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 hover:scale-105 shadow-lg"
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

              {/* Additional Links */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                  <Link to="/teacher/login" className="hover:text-white underline">
                    Teacher Login
                  </Link>
                  <span>|</span>
                  <Link to="/user/login" className="hover:text-white underline">
                    Student Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;