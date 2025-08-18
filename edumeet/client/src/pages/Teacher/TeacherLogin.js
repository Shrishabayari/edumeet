import React, { useState, useEffect } from "react";
import {
  Mail, Lock, AlertCircle, CheckCircle,
  Eye, EyeOff, User, BookOpen
} from 'lucide-react';
import { useNavigate, Link } from "react-router-dom";
import TeacherNavbar from "../../components/teacherNavbar";
// Import the enhanced API service
import { apiMethods, tokenManager } from "../../services/api";

const TeacherLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Default to true for localStorage
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkExistingLogin = () => {
      if (tokenManager.isTeacherLoggedIn()) {
        const teacherData = tokenManager.getTeacherData();
        if (teacherData) {
          console.log('✅ Teacher already logged in:', teacherData.name);
          setMessage('Already logged in! Redirecting to dashboard...');
          setTimeout(() => {
            navigate("/teacher/dashboard");
          }, 1000);
        }
      }
    };

    checkExistingLogin();
  }, [navigate]);

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

      console.log('🔄 Starting teacher login process...');
      console.log('📧 Email:', email);
      console.log('💾 Remember me (use localStorage):', rememberMe);
      console.log('🔍 Storage info before login:', tokenManager.getStorageState());

      // Use the enhanced API service for teacher login
      const response = await apiMethods.teacherLogin({
        email,
        password,
      });

      console.log('✅ Login API Response:', response.data);

      // Extract token and teacher data from response
      const { token, data } = response.data;
      const teacherData = data?.teacher;

      if (!token) {
        console.error('❌ No token received in response');
        setError("Login successful, but authentication token not received. Please try again.");
        setLoading(false);
        return;
      }

      if (!teacherData) {
        console.error('❌ No teacher data received in response');
        setError("Login successful, but teacher profile could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      console.log('💾 Storing teacher token and data with enhanced localStorage support...');
      
      // ✅ ENHANCED: Use the new localStorage-guaranteed methods
      let tokenResult;
      let dataResult;
      
      if (rememberMe) {
        // Force localStorage usage for persistent storage
        console.log('🔧 Using forceTeacherTokenToLocalStorage for guaranteed localStorage storage...');
        tokenResult = tokenManager.forceTeacherTokenToLocalStorage(token);
        
        // Also force teacher data to localStorage
        try {
          localStorage.setItem('teacherData', JSON.stringify(teacherData));
          dataResult = { success: true, storageType: 'localStorage' };
          console.log('✅ Teacher data forced to localStorage');
        } catch (error) {
          console.error('❌ Failed to force teacher data to localStorage:', error);
          dataResult = { success: false, error: error.message };
        }
      } else {
        // Use normal storage methods (will try localStorage first anyway)
        tokenResult = tokenManager.safeSetTeacherToken(token, rememberMe);
        dataResult = tokenManager.setTeacherData(teacherData, rememberMe);
      }
      
      // Check token storage result
      if (!tokenResult.success) {
        console.error('❌ Token storage failed:', tokenResult.error);
        setError(`Authentication failed: ${tokenResult.error}`);
        setLoading(false);
        return;
      }

      // Check data storage result
      if (!dataResult.success) {
        console.error('❌ Teacher data storage failed:', dataResult.error);
        setError("Teacher profile could not be saved. Please try again.");
        setLoading(false);
        return;
      }

      // Log where the data was actually stored
      console.log(`✅ Token stored successfully in: ${tokenResult.storageType}`);
      console.log(`✅ Data stored successfully in: ${dataResult.storageType}`);

      // ✅ Verify storage worked by retrieving the data
      const storedToken = tokenManager.getTeacherToken();
      const storedTeacher = tokenManager.getTeacherData();
      
      if (!storedToken) {
        console.error('❌ Token verification failed after storage');
        setError("Authentication storage failed. Please try again.");
        setLoading(false);
        return;
      }

      if (!storedTeacher) {
        console.error('❌ Teacher data verification failed after storage');
        setError("Teacher profile storage failed. Please try again.");
        setLoading(false);
        return;
      }

      console.log('✅ Token retrieved successfully:', storedToken.substring(0, 20) + "...");
      console.log('✅ Teacher data retrieved successfully:', storedTeacher.name);
      
      // ✅ Debug the current storage state
      const finalStorageState = tokenManager.getStorageState();
      console.log('🔍 Final storage state:', finalStorageState);
      
      // ✅ Verify localStorage specifically if we intended to use it
      if (rememberMe && finalStorageState?.directStorageCheck) {
        if (finalStorageState.directStorageCheck.teacherTokenInLocalStorage) {
          console.log('✅ Confirmed: Teacher token is in localStorage');
          setMessage(`Login successful! Token stored in localStorage. Redirecting to dashboard...`);
        } else {
          console.warn('⚠️ Warning: Token not found in localStorage despite rememberMe being true');
          setMessage(`Login successful! Token stored in ${tokenResult.storageType}. Redirecting to dashboard...`);
        }
      } else {
        setMessage(`Login successful! Token stored in ${tokenResult.storageType}. Redirecting to dashboard...`);
      }
      
      // Small delay to show success message
      setTimeout(() => {
        navigate("/teacher/dashboard");
      }, 1500);

    } catch (err) {
      console.error('❌ Teacher login error:', err);

      // Enhanced error handling
      let displayMessage = 'Login failed. Please try again.';
      
      if (err.message) {
        displayMessage = err.message;
      } else if (err.response) {
        const { status, data } = err.response;
        console.error(`HTTP Error ${status}:`, data);
        
        switch (status) {
          case 400:
            displayMessage = data.message || 'Invalid login credentials format.';
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
            displayMessage = data.message || `Login failed with error ${status}.`;
        }
      } else if (err.request) {
        displayMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout (for testing purposes)
  const handleTestLogout = () => {
    tokenManager.removeTeacherToken();
    setMessage('Logged out successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  // ✅ NEW: Test localStorage directly
  const handleTestLocalStorage = () => {
    try {
      // Test if localStorage is working
      localStorage.setItem('test', 'working');
      const test = localStorage.getItem('test');
      localStorage.removeItem('test');
      
      if (test === 'working') {
        setMessage('✅ localStorage is working properly!');
        console.log('✅ localStorage test passed');
      } else {
        setError('❌ localStorage test failed');
        console.error('❌ localStorage test failed');
      }
    } catch (error) {
      setError(`❌ localStorage error: ${error.message}`);
      console.error('❌ localStorage error:', error);
    }
    
    setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
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

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-200">
                      Keep me logged in (forces localStorage storage)
                    </label>
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

                {/* Debug Info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-800 bg-opacity-50 rounded text-xs text-gray-300">
                    <div className="mb-2 font-semibold">Debug Information:</div>
                    <div>Token Status: {tokenManager.getTeacherToken() ? '✅ Stored' : '❌ Not Found'}</div>
                    <div>Teacher Data: {tokenManager.getTeacherData() ? '✅ Stored' : '❌ Not Found'}</div>
                    <div>Auth Status: {tokenManager.isTeacherLoggedIn() ? '✅ Logged In' : '❌ Not Logged In'}</div>
                    {tokenManager.getTeacherData() && (
                      <div>Teacher Name: {tokenManager.getTeacherData().name}</div>
                    )}
                    <div>Storage Available: {tokenManager.getStorageState()?.storageInfo?.localStorageAvailable ? '✅ localStorage' : '❌ localStorage'} | {tokenManager.getStorageState()?.storageInfo?.sessionStorageAvailable ? '✅ sessionStorage' : '❌ sessionStorage'}</div>
                    {tokenManager.getStorageState()?.directStorageCheck && (
                      <div>Direct Check: Token in localStorage: {tokenManager.getStorageState().directStorageCheck.teacherTokenInLocalStorage ? '✅' : '❌'}</div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          console.log('🔍 Current Storage State:', tokenManager.getStorageState());
                          console.log('🔍 Authentication Status:', tokenManager.getAuthenticationStatus());
                        }}
                        className="px-2 py-1 bg-blue-600 rounded text-white text-xs"
                      >
                        Debug Storage
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleTestLocalStorage}
                        className="px-2 py-1 bg-purple-600 rounded text-white text-xs"
                      >
                        Test localStorage
                      </button>
                      
                      {tokenManager.isTeacherLoggedIn() && (
                        <button
                          type="button"
                          onClick={handleTestLogout}
                          className="px-2 py-1 bg-red-600 rounded text-white text-xs"
                        >
                          Test Logout
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeacherLogin;