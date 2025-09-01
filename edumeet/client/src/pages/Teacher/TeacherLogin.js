import React, { useState } from "react";
import {
  Mail, Lock, AlertCircle, CheckCircle,
  Eye, EyeOff, User, BookOpen
} from 'lucide-react';
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/navbar";

// ✅ API Client - Enhanced to handle authentication tokens automatically
const createApiClient = () => {
  const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://edumeet.onrender.com/api'
    : 'http://localhost:5000/api';

  // Helper to parse and handle API response errors
  const handleErrors = async (response) => {
    const data = await response.json();
    if (!response.ok) {
      // Throw a structured error object for easier handling in components
      throw new Error(JSON.stringify({
        status: response.status,
        message: data.message || `Request failed with status ${response.status}`,
        errors: data.errors || undefined, // Include specific validation errors if present
        data,
      }));
    }
    return data;
  };

  // Generic request handler to include headers and body
  const request = async (method, endpoint, body = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Automatically attach teacherToken if available in localStorage
    const token = localStorage.getItem('teacherToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      // Log requests in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 API Request: ${method} ${API_URL}${endpoint}`);
        if (token) {
          console.log(`   Token Used: ${token.substring(0, 20)}...`);
        } else {
          console.log('   No token sent for this request.');
        }
      }

      const response = await fetch(`${API_URL}${endpoint}`, config);
      const result = await handleErrors(response);

      // Log successful responses in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ API Response: ${response.status} ${endpoint}`);
        console.log('Response data:', result);
      }
      return result;
    } catch (error) {
      console.error('❌ API Error:', error);

      let parsedError = {};
      try {
        parsedError = JSON.parse(error.message);
      } catch {
        parsedError = { message: error.message || 'An unknown error occurred.' };
      }

      // Specific handling for Unauthorized errors (e.g., token expired)
      if (parsedError.status === 401) {
        console.warn('Unauthorized: Token expired or invalid. Clearing local storage and redirecting to login.');
        localStorage.removeItem('teacherToken'); // Clear invalid token
        localStorage.removeItem('teacher'); // Clear associated teacher data
        // You might want to add a small delay or a notification here before redirecting
        window.location.href = '/teacher/login'; // Redirect to login page
      }
      
      // Re-throw the parsed error for component-level handling
      throw parsedError; 
    }
  };

  return {
    post: (endpoint, body) => request('POST', endpoint, body),
    get: (endpoint) => request('GET', endpoint), // Added GET method for fetching data
    put: (endpoint, body) => request('PUT', endpoint, body), // Added PUT method for updates
    delete: (endpoint) => request('DELETE', endpoint), // Added DELETE method for deletions
  };
};

const TeacherLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Initialize the custom API client
  const api = createApiClient();

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

      const response = await api.post("/teachers/login", {
        email,
        password,
      });

      console.log("✅ Login Response:", response);

      // ✅ CRUCIAL: Save the authentication token and teacher profile data to localStorage
      if (response.token) {
        localStorage.setItem("teacherToken", response.token);
      }

      // Ensure 'teacher' object exists in the response before saving
      if (response.data && response.data.teacher) { // Assuming backend sends { data: { teacher: {...} }, token: "..." }
        localStorage.setItem("teacher", JSON.stringify(response.data.teacher));
      } else if (response.teacher) { // Fallback if backend sends { teacher: {...}, token: "..." } directly
        localStorage.setItem("teacher", JSON.stringify(response.teacher));
      } else {
        console.warn("Teacher data not found in login response.");
        setError("Login successful, but teacher data could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      setMessage("Login successful! Redirecting...");
      setTimeout(() => {
        navigate("/teacher/dashboard"); // Redirect to the teacher's schedule page
      }, 1500);
    } catch (err) {
      // Error handling from the custom API client
      console.error("❌ Teacher login error:", err);

      // Check if the error object has a 'message' property or 'errors' array
      let displayMessage = 'Login failed. Please try again.';
      if (err.message) {
        displayMessage = err.message;
      } else if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        displayMessage = err.errors.map(e => e.msg || e.message || 'Validation error').join(', ');
      } else if (err.status) {
        switch (err.status) {
          case 401:
            displayMessage = 'Invalid email or password. Please try again.';
            break;
          case 403:
            displayMessage = 'Account access is restricted. Please contact admin.';
            break;
          case 429:
            displayMessage = 'Too many login attempts. Please try again later.';
            break;
          case 0: // Network error from custom client
            displayMessage = 'Network error. Please check your connection and try again.';
            break;
          default:
            displayMessage = err.message || `Login failed with status ${err.status}.`;
        }
      }
      setError(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar/>
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=2070&q=80')`
          }}
          aria-hidden="true" // Hide from accessibility tree as it's decorative
        />

        {/* Content Container */}
        <div className="relative z-10 min-h-screen flex flex-col lg:flex-row pt-0 pb-10">
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
                    Don’t have an account?{' '}
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