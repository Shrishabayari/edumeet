import React, { useState } from "react";
import {
  Mail, Lock, AlertCircle, CheckCircle,
  Eye, EyeOff, User, BookOpen
} from 'lucide-react';
import { useNavigate, Link } from "react-router-dom";
import TeacherNavbar from "../../components/teacherNavbar";
import { apiMethods, tokenManager } from "../../services/api";

const TeacherLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Client-side form validation
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

  // Handle form submission for login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      console.log("🔄 Attempting teacher login...");
      const response = await apiMethods.teacherLogin({
        email,
        password,
      });

      console.log("✅ Login Response:", response.data);

      // Store the authentication token using the centralized token manager
      if (response.data.token) {
        tokenManager.setTeacherToken(response.data.token, true); // true for persistent storage
        console.log("✅ Teacher token stored successfully");
      } else {
        console.warn("No token received in login response");
        setError("Login failed: No authentication token received");
        setLoading(false);
        return;
      }

      // Store teacher data in localStorage
      if (response.data.data && response.data.data.teacher) {
        localStorage.setItem("teacher", JSON.stringify(response.data.data.teacher));
        console.log("✅ Teacher data stored successfully");
      } else if (response.data.teacher) {
        localStorage.setItem("teacher", JSON.stringify(response.data.teacher));
        console.log("✅ Teacher data stored successfully (fallback structure)");
      } else {
        console.warn("Teacher data not found in login response:", response.data);
        setError("Login successful, but teacher data could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      setMessage("Login successful! Redirecting...");
      
      // Small delay to show success message before redirect
      setTimeout(() => {
        navigate("/teacher/dashboard");
      }, 1500);

    } catch (err) {
      console.error("❌ Teacher login error:", err);

      // Enhanced error handling for different error types
      let displayMessage = 'Login failed. Please try again.';
      
      if (err.response) {
        // HTTP error response
        const { status, data } = err.response;
        console.error(`HTTP ${status} Error:`, data);
        
        switch (status) {
          case 400:
            displayMessage = data.message || 'Invalid login credentials format';
            break;
          case 401:
            displayMessage = 'Invalid email or password. Please check your credentials.';
            break;
          case 403:
            displayMessage = 'Account access is restricted. Please contact admin.';
            break;
          case 404:
            displayMessage = 'Teacher account not found. Please contact admin.';
            break;
          case 429:
            displayMessage = 'Too many login attempts. Please try again later.';
            break;
          case 500:
            displayMessage = 'Server error. Please try again in a few moments.';
            break;
          default:
            displayMessage = data.message || `Server error (${status}). Please try again.`;
        }
      } else if (err.request) {
        // Network error
        console.error("Network error - no response received");
        displayMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        // Other errors (validation, etc.)
        displayMessage = err.message || 'An unexpected error occurred. Please try again.';
      }
      
      setError(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TeacherNavbar/>
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=2070&q=80')`
          }}
          aria-hidden="true"
        />

        {/* Content Container */}
        <div className="relative z-10 min-h-screen flex flex-col lg:flex-row pt-10 pb-10">
          {/* Left Section (Marketing/Branding) */}
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
              <p className="text-lg text-gray-200 mb-8">
                Welcome to your teaching hub. Access your classes, manage students and appointments.
              </p>
            </div>
          </div>

          {/* Right Section (Login Form) */}
          <div className="flex-1 flex items-center px-8 lg:px-16">
            <div className="w-full max-w-md">
              <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white border-opacity-20">
                <div className="text-center mb-8">
                  <div className="bg-blue-600 bg-opacity-30 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <User className="h-8 w-8 text-blue-200" />
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-2">Teacher Sign in</h2>
                  <p className="text-gray-200 text-sm">
                    Don't have an account?{' '}
                    <Link to="/admin/login" className="text-blue-300 hover:text-white underline">
                      Contact Admin
                    </Link>
                  </p>
                </div>

                {/* Error Message Display */}
                {error && (
                  <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-3 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Success Message Display */}
                {message && (
                  <div className="bg-green-500 bg-opacity-20 border border-green-400 text-green-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-3 text-sm">
                    <CheckCircle className="w-5 h-5" />
                    <span>{message}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm text-gray-200 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teacher@school.edu"
                        required
                        className="w-full pl-10 pr-4 py-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none backdrop-blur-sm"
                        aria-label="Email Address"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm text-gray-200 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-300" />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-10 pr-12 py-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none backdrop-blur-sm"
                        aria-label="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

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
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeacherLogin;