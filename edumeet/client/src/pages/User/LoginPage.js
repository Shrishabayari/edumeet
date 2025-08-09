import React, { useState, useEffect } from 'react';
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
  const [debugInfo, setDebugInfo] = useState('');

  // Fixed tokenManager - moved inline to avoid import issues
  // UPDATED tokenManager - Always uses localStorage by default
 const tokenManager = {
  // User token methods - ALWAYS store in localStorage
  setUserToken: (token, persistent = true) => { // Changed default to true
    console.log('🔧 setUserToken called with:', { token: token?.substring(0, 20) + '...', persistent });
    
    // Always store in localStorage by default, only use sessionStorage if explicitly requested
    if (persistent !== false) { // Only use sessionStorage if explicitly set to false
      localStorage.setItem('userToken', token);
      sessionStorage.removeItem('userToken'); // Clear from session
      console.log('✅ Token stored in localStorage (persistent)');
    } else {
      sessionStorage.setItem('userToken', token);
      localStorage.removeItem('userToken'); // Clear from localStorage  
      console.log('✅ Token stored in sessionStorage (session-only)');
    }
  },
  
  getUserToken: () => {
    // First check localStorage (preferred), then sessionStorage
    let token = localStorage.getItem('userToken');
    if (!token) {
      token = sessionStorage.getItem('userToken');
    }
    return token;
  },
  
  removeUserToken: () => {
    localStorage.removeItem('userToken');
    sessionStorage.removeItem('userToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('userRole');
    console.log('🧹 User tokens and data cleared from both storages');
  },
  
  // Admin token methods - ALWAYS store in localStorage by default
  setAdminToken: (token, persistent = true) => { // Changed default to true
    console.log('🔧 setAdminToken called with:', { token: token?.substring(0, 20) + '...', persistent });
    
    if (persistent !== false) {
      localStorage.setItem('adminToken', token);
      sessionStorage.removeItem('adminToken');
      console.log('✅ Admin token stored in localStorage (persistent)');
    } else {
      sessionStorage.setItem('adminToken', token);
      localStorage.removeItem('adminToken');
      console.log('✅ Admin token stored in sessionStorage (session-only)');
    }
  },
  
  getAdminToken: () => {
    // First check localStorage, then sessionStorage
    let token = localStorage.getItem('adminToken');
    if (!token) {
      token = sessionStorage.getItem('adminToken');
    }
    return token;
  },
  
  removeAdminToken: () => {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    sessionStorage.removeItem('admin');
    console.log('🧹 Admin tokens and data cleared from both storages');
  },
  
  // Teacher token methods - ALWAYS store in localStorage by default
  setTeacherToken: (token, persistent = true) => { // Changed default to true
    console.log('🔧 setTeacherToken called with:', { token: token?.substring(0, 20) + '...', persistent });
    
    if (persistent !== false) {
      localStorage.setItem('teacherToken', token);
      sessionStorage.removeItem('teacherToken');
      console.log('✅ Teacher token stored in localStorage (persistent)');
    } else {
      sessionStorage.setItem('teacherToken', token);
      localStorage.removeItem('teacherToken');
      console.log('✅ Teacher token stored in sessionStorage (session-only)');
    }
  },
  
  getTeacherToken: () => {
    // First check localStorage, then sessionStorage
    let token = localStorage.getItem('teacherToken');
    if (!token) {
      token = sessionStorage.getItem('teacherToken');
    }
    return token;
  },
  
  removeTeacherToken: () => {
    localStorage.removeItem('teacherToken');
    sessionStorage.removeItem('teacherToken');
    localStorage.removeItem('teacher');
    sessionStorage.removeItem('teacher');
    console.log('🧹 Teacher tokens and data cleared from both storages');
  },
  
  clearAllTokens: () => {
    // Clear all possible tokens and user data
    const itemsToClear = [
      'userToken', 'adminToken', 'teacherToken',
      'user', 'admin', 'teacher', 'userRole'
    ];
    
    itemsToClear.forEach(item => {
      localStorage.removeItem(item);
      sessionStorage.removeItem(item);
    });
    
    console.log('🧹 All tokens and user data cleared from both storages');
  },

  // Helper method to check if user is logged in
  isUserLoggedIn: () => {
    return !!(tokenManager.getUserToken() || tokenManager.getTeacherToken() || tokenManager.getAdminToken());
  },

  // Helper method to get current user info (prioritize localStorage)
  getCurrentUser: () => {
    let user = localStorage.getItem('user');
    if (!user) {
      user = sessionStorage.getItem('user');
    }
    return user ? JSON.parse(user) : null;
  },

  // Helper method to get current user role (prioritize localStorage)
  getCurrentUserRole: () => {
    let role = localStorage.getItem('userRole');
    if (!role) {
      role = sessionStorage.getItem('userRole');
    }
    return role;
  },

  // NEW: Method to force move all data to localStorage
  forceLocalStorage: () => {
    console.log('🔄 Moving all data to localStorage...');
    
    // Move tokens
    const sessionUserToken = sessionStorage.getItem('userToken');
    const sessionAdminToken = sessionStorage.getItem('adminToken');
    const sessionTeacherToken = sessionStorage.getItem('teacherToken');
    
    if (sessionUserToken) {
      localStorage.setItem('userToken', sessionUserToken);
      sessionStorage.removeItem('userToken');
      console.log('✅ Moved userToken to localStorage');
    }
    
    if (sessionAdminToken) {
      localStorage.setItem('adminToken', sessionAdminToken);
      sessionStorage.removeItem('adminToken');
      console.log('✅ Moved adminToken to localStorage');
    }
    
    if (sessionTeacherToken) {
      localStorage.setItem('teacherToken', sessionTeacherToken);
      sessionStorage.removeItem('teacherToken');
      console.log('✅ Moved teacherToken to localStorage');
    }
    
    // Move user data
    const sessionUser = sessionStorage.getItem('user');
    const sessionUserRole = sessionStorage.getItem('userRole');
    
    if (sessionUser) {
      localStorage.setItem('user', sessionUser);
      sessionStorage.removeItem('user');
      console.log('✅ Moved user data to localStorage');
    }
    
    if (sessionUserRole) {
      localStorage.setItem('userRole', sessionUserRole);
      sessionStorage.removeItem('userRole');
      console.log('✅ Moved userRole to localStorage');
    }
  },

  // NEW: Debug method to show current storage state
  debugStorage: () => {
    console.log('🔍 CURRENT STORAGE STATE:');
    console.log('localStorage:', {
      userToken: !!localStorage.getItem('userToken'),
      adminToken: !!localStorage.getItem('adminToken'),
      teacherToken: !!localStorage.getItem('teacherToken'),
      user: !!localStorage.getItem('user'),
      userRole: localStorage.getItem('userRole')
    });
    console.log('sessionStorage:', {
      userToken: !!sessionStorage.getItem('userToken'),
      adminToken: !!sessionStorage.getItem('adminToken'),
      teacherToken: !!sessionStorage.getItem('teacherToken'),
      user: !!sessionStorage.getItem('user'),
      userRole: sessionStorage.getItem('userRole')
    });
  }
};

  // API configuration
  const API_URL = process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL || 'https://edumeet.onrender.com/api'
    : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Debug storage capabilities on component mount
  useEffect(() => {
    const testStorage = () => {
      let debugMessage = '🔍 STORAGE DEBUG INFO:\n';
      
      try {
        if (typeof(Storage) !== "undefined") {
          debugMessage += '✅ Storage API is supported\n';
          
          // Test localStorage
          try {
            localStorage.setItem('test', 'test');
            const testValue = localStorage.getItem('test');
            if (testValue === 'test') {
              debugMessage += '✅ localStorage is working\n';
              localStorage.removeItem('test');
            } else {
              debugMessage += '❌ localStorage test failed\n';
            }
          } catch (e) {
            debugMessage += `❌ localStorage error: ${e.message}\n`;
          }
          
          // Test sessionStorage
          try {
            sessionStorage.setItem('test', 'test');
            const testValue = sessionStorage.getItem('test');
            if (testValue === 'test') {
              debugMessage += '✅ sessionStorage is working\n';
              sessionStorage.removeItem('test');
            } else {
              debugMessage += '❌ sessionStorage test failed\n';
            }
          } catch (e) {
            debugMessage += `❌ sessionStorage error: ${e.message}\n`;
          }
          
        } else {
          debugMessage += '❌ Storage API not supported\n';
        }
        
        // Check current storage contents
        debugMessage += '\n📦 CURRENT STORAGE CONTENTS:\n';
        debugMessage += `Current userToken: ${tokenManager.getUserToken() ? 'Found' : 'null'}\n`;
        debugMessage += `Current user: ${tokenManager.getCurrentUser() ? 'Found' : 'null'}\n`;
        debugMessage += `Is user logged in: ${tokenManager.isUserLoggedIn() ? 'Yes' : 'No'}\n`;
        
        debugMessage += '\n📦 RAW STORAGE CONTENTS:\n';
        debugMessage += `localStorage userToken: ${localStorage.getItem('userToken') || 'null'}\n`;
        debugMessage += `localStorage user: ${localStorage.getItem('user') || 'null'}\n`;
        debugMessage += `sessionStorage userToken: ${sessionStorage.getItem('userToken') ? 'Found' : 'null'}\n`;
        debugMessage += `sessionStorage user: ${sessionStorage.getItem('user') ? 'Found' : 'null'}\n`;
        
        // Check if we're in a secure context
        debugMessage += `\n🔒 SECURITY CONTEXT:\n`;
        debugMessage += `Secure context: ${window.isSecureContext ? 'Yes' : 'No'}\n`;
        debugMessage += `Protocol: ${window.location.protocol}\n`;
        debugMessage += `Domain: ${window.location.hostname}\n`;
        
      } catch (error) {
        debugMessage += `❌ Storage test failed: ${error.message}\n`;
      }
      
      setDebugInfo(debugMessage);
      console.log(debugMessage);
    };
    
    testStorage();
  }, []);

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

  // FIXED: Proper token storage with correct persistent flag handling
  const storeAuthData = (token, userInfo, rememberMe) => {
    console.log('\n🔧 === STORING AUTH DATA (FIXED VERSION) ===');
    console.log('Token:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('User Info:', userInfo);
    console.log('Remember Me (persistent):', rememberMe);

    try {
      // FIXED: Pass rememberMe as the persistent parameter
      tokenManager.setUserToken(token, rememberMe);
      
      // Store user info in the same location as token
      const userInfoString = JSON.stringify(userInfo);
      if (rememberMe) {
        // Store in localStorage for persistent login
        localStorage.setItem('user', userInfoString);
        localStorage.setItem('userRole', userInfo.role);
        // Remove from sessionStorage to avoid conflicts
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('userRole');
        console.log('✅ User data stored in localStorage (persistent)');
      } else {
        // Store in sessionStorage for session-only login
        sessionStorage.setItem('user', userInfoString);
        sessionStorage.setItem('userRole', userInfo.role);
        // Remove from localStorage to avoid conflicts
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        console.log('✅ User data stored in sessionStorage (session-only)');
      }

      // Verify storage
      const storedToken = tokenManager.getUserToken();
      const storedUser = tokenManager.getCurrentUser();
      const storedRole = tokenManager.getCurrentUserRole();
      const isLoggedIn = tokenManager.isUserLoggedIn();

      console.log('✅ Storage verification:');
      console.log('- Token stored:', !!storedToken);
      console.log('- User stored:', !!storedUser);
      console.log('- Role stored:', !!storedRole);
      console.log('- Is logged in:', isLoggedIn);
      console.log('- Storage location:', rememberMe ? 'localStorage' : 'sessionStorage');
      
      if (!storedToken || !storedUser || !isLoggedIn) {
        throw new Error('Storage verification failed');
      }

      return true;
    } catch (error) {
      console.error('❌ Auth data storage failed:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setLoginStatus(null);

    try {
      const loginData = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      };

      console.log('🔄 Making API call...');
      console.log('API URL:', `${API_URL}/auth/login`);
      console.log('Remember Me:', formData.rememberMe);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      console.log('📡 Response status:', response.status);

      let result;
      try {
        result = await response.json();
        console.log('📡 Response data:', result);
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }

      if (response.ok && result.success) {
        console.log('\n✅ === LOGIN SUCCESSFUL ===');
        setLoginStatus('success');
        
        if (!result.token) {
          throw new Error('No token received from server');
        }

        // Prepare user info
        const userInfo = {
          id: result.data?.user?._id || result.data?.user?.id,
          name: result.data?.user?.name,
          email: result.data?.user?.email,
          role: result.data?.user?.role,
          profile: result.data?.user?.profile,
          approvalStatus: result.data?.user?.approvalStatus
        };

        console.log('Prepared user info:', userInfo);

        // FIXED: Store auth data with proper rememberMe flag
        try {
          const storageSuccess = storeAuthData(result.token, userInfo, formData.rememberMe);
          
          if (storageSuccess) {
            console.log('🎉 AUTHENTICATION AND STORAGE COMPLETELY SUCCESSFUL!');
            
            // Update debug info for user
            setDebugInfo(prev => prev + '\n\n✅ LOGIN AND STORAGE SUCCESSFUL!\n' + 
              `Token: ${result.token.substring(0, 30)}...\n` +
              `Storage: ${formData.rememberMe ? 'localStorage (persistent)' : 'sessionStorage (session-only)'}\n` +
              `User: ${userInfo.name} (${userInfo.role})\n` +
              `Is Logged In: ${tokenManager.isUserLoggedIn()}\n` +
              `Remember Me: ${formData.rememberMe ? 'YES' : 'NO'}`);
            
            // Role-based redirection
            const userRole = userInfo.role;
            let redirectUrl = '/user/dashboard';

            switch (userRole) {
              case 'student':
                redirectUrl = '/user/dashboard';
                break;
              case 'teacher':
                redirectUrl = '/teacher/dashboard';
                break;
              case 'admin':
                redirectUrl = '/admin/dashboard';
                break;
              default:
                redirectUrl = '/user/dashboard';
            }

            console.log(`🔄 Redirecting ${userRole} to: ${redirectUrl} in 3 seconds...`);

            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 3000);
            
          } else {
            throw new Error('Storage verification failed');
          }
          
        } catch (storageError) {
          console.error('❌ STORAGE FAILED:', storageError);
          setLoginStatus('error');
          setErrors({ general: `Storage failed: ${storageError.message}. Please try again or contact support.` });
          
          setDebugInfo(prev => prev + '\n\n❌ TOKEN STORAGE FAILED!\n' + 
            `Error: ${storageError.message}\n` +
            'Please check console for details.');
        }

      } else {
        setLoginStatus('error');
        const backendMessage = result?.message || `Login failed (${response.status})`;
        setErrors({ general: backendMessage });
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      setLoginStatus('error');
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      } else {
        setErrors({ general: `An unexpected error occurred: ${error.message}` });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllStorage = () => {
    try {
      tokenManager.clearAllTokens();
      console.log('🧹 All storage cleared');
      setDebugInfo(prev => prev + '\n\n🧹 All storage cleared');
      
      // Refresh debug info
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
    }
  };

  const testTokenRetrieval = () => {
    const token = tokenManager.getUserToken();
    const user = tokenManager.getCurrentUser();
    const role = tokenManager.getCurrentUserRole();
    const isLoggedIn = tokenManager.isUserLoggedIn();
    
    console.log('🧪 TOKEN RETRIEVAL TEST:');
    console.log('Token:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('User:', user);
    console.log('Role:', role);
    console.log('Is Logged In:', isLoggedIn);
    
    setDebugInfo(prev => prev + '\n\n🧪 TOKEN RETRIEVAL TEST:\n' +
      `Token: ${token ? 'Found' : 'null'}\n` +
      `User: ${user ? user.name : 'null'}\n` +
      `Role: ${role || 'null'}\n` +
      `Is Logged In: ${isLoggedIn}\n` +
      `Token Location: ${localStorage.getItem('userToken') ? 'localStorage' : sessionStorage.getItem('userToken') ? 'sessionStorage' : 'nowhere'}`);
  };

  const handleForgotPassword = () => {
    console.log('🔄 Forgot password clicked');
  };

  const handleSignUpRedirect = () => {
    console.log('🔄 Redirecting to registration page...');
    window.location.href = '/user/register';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      
      {/* Debug Info Panel - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 w-80 max-h-96 bg-black text-green-400 p-4 rounded-lg text-xs overflow-y-auto z-50 font-mono">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-bold">Debug Info</h3>
            <div className="flex gap-2">
              <button 
                onClick={testTokenRetrieval}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                Test
              </button>
              <button 
                onClick={clearAllStorage}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Clear
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
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
                      <p className="text-sm text-green-700">
                        Token stored {formData.rememberMe ? 'persistently in localStorage' : 'temporarily in sessionStorage'}. Redirecting...
                      </p>
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
                      {formData.rememberMe && (
                        <span className="text-xs text-blue-600 block">
                          (Token will be stored in localStorage)
                        </span>
                      )}
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
        </div>
      </div>
    </div>
  );
};

export default LoginPage;