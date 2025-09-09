import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, GraduationCap, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import Navbar from '../../components/navbar';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState(null);// eslint-disable-next-line
  const [debugInfo, setDebugInfo] = useState('');

  const tokenManager = {
    // User token methods - ALWAYS store in sessionStorage
    setUserToken: (token) => { 
      console.log('🔧 setUserToken called with:', { token: token?.substring(0, 20) + '...' });
      sessionStorage.setItem('userToken', token);
      console.log('✅ Token stored in sessionStorage');
    },
    
    getUserToken: () => {
      return sessionStorage.getItem('userToken');
    },
    
    removeUserToken: () => {
      sessionStorage.removeItem('userToken');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('userRole');
      console.log('🧹 User tokens and data cleared from sessionStorage');
    },
    
    // Admin token methods - ALWAYS store in sessionStorage
    setAdminToken: (token) => { 
      console.log('🔧 setAdminToken called with:', { token: token?.substring(0, 20) + '...' });
      sessionStorage.setItem('adminToken', token);
      console.log('✅ Admin token stored in sessionStorage');
    },
    
    getAdminToken: () => {
      return sessionStorage.getItem('adminToken');
    },
    
    removeAdminToken: () => {
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('admin');
      console.log('🧹 Admin tokens and data cleared from sessionStorage');
    },
    
    // Teacher token methods - ALWAYS store in sessionStorage
    setTeacherToken: (token) => { 
      console.log('🔧 setTeacherToken called with:', { token: token?.substring(0, 20) + '...' });
      sessionStorage.setItem('teacherToken', token);
      console.log('✅ Teacher token stored in sessionStorage');
    },
    
    getTeacherToken: () => {
      return sessionStorage.getItem('teacherToken');
    },
    
    removeTeacherToken: () => {
      sessionStorage.removeItem('teacherToken');
      sessionStorage.removeItem('teacher');
      console.log('🧹 Teacher tokens and data cleared from sessionStorage');
    },
    
    clearAllTokens: () => {
      const itemsToClear = [
        'userToken', 'adminToken', 'teacherToken',
        'user', 'admin', 'teacher', 'userRole'
      ];
      
      itemsToClear.forEach(item => {
        sessionStorage.removeItem(item);
      });
      
      console.log('🧹 All tokens and user data cleared from sessionStorage');
    },

    isUserLoggedIn: () => {
      return !!(tokenManager.getUserToken() || tokenManager.getTeacherToken() || tokenManager.getAdminToken());
    },

    getCurrentUser: () => {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    },

    getCurrentUserRole: () => {
      return sessionStorage.getItem('userRole');
    }
  };

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  // FIXED: Simplified token storage for session-only
  const storeAuthData = (token, userInfo) => {
    console.log('\n🔧 === STORING AUTH DATA ===');
    console.log('Token:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('User Info:', userInfo);

    try {
      tokenManager.setUserToken(token);
      
      const userInfoString = JSON.stringify(userInfo);
      sessionStorage.setItem('user', userInfoString);
      sessionStorage.setItem('userRole', userInfo.role);
      
      console.log('✅ User data stored in sessionStorage');

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
      console.log('- Storage location: sessionStorage');
      
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

        const userInfo = {
          id: result.data?.user?._id || result.data?.user?.id,
          name: result.data?.user?.name,
          email: result.data?.user?.email,
          role: result.data?.user?.role,
          profile: result.data?.user?.profile,
          approvalStatus: result.data?.user?.approvalStatus
        };

        console.log('Prepared user info:', userInfo);

        try {
          const storageSuccess = storeAuthData(result.token, userInfo);
          
          if (storageSuccess) {
            console.log('🎉 AUTHENTICATION AND STORAGE COMPLETELY SUCCESSFUL!');
            
            setDebugInfo(prev => prev + '\n\n✅ LOGIN AND STORAGE SUCCESSFUL!\n' + 
              `Token: ${result.token.substring(0, 30)}...\n` +
              `Storage: sessionStorage (session-only)\n` +
              `User: ${userInfo.name} (${userInfo.role})\n` +
              `Is Logged In: ${tokenManager.isUserLoggedIn()}`);
            
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

  const handleSignUpRedirect = () => {
    console.log('🔄 Redirecting to registration page...');
    window.location.href = '/user/register';
  };

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
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
                        <p className="text-sm font-semibold text-green-800">Login Successful! Redirecting...</p>
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
    </>
  );
};

export default LoginPage;
