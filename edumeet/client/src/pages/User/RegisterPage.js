import React, { useState } from 'react';
import { User, Mail, Lock, Phone, GraduationCap, BookOpen, Users, AlertCircle, CheckCircle } from 'lucide-react';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    phone: '',
    // Student fields
    grade: '',
    // Teacher fields
    subject: '',
    department: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', or null

  // API configuration
  const API_URL = process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL || 'https://your-render-backend-url.onrender.com/api'
    : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    }

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

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Phone validation (optional)
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Role-specific validation
    if (formData.role === 'student' && !formData.grade) {
      newErrors.grade = 'Grade is required for students';
    }

    if (formData.role === 'teacher') {
      if (!formData.subject) {
        newErrors.subject = 'Subject is required for teachers';
      }
      if (!formData.department) {
        newErrors.department = 'Department is required for teachers';
      }
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

    // Clear submit status when user makes changes
    if (submitStatus) {
      setSubmitStatus(null);
    }
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      role,
      // Clear role-specific fields when switching
      grade: '',
      subject: '',
      department: ''
    }));
    
    // Clear role-specific errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.grade;
      delete newErrors.subject;
      delete newErrors.department;
      return newErrors;
    });

    // Clear submit status
    if (submitStatus) {
      setSubmitStatus(null);
    }
  };

  const handleLoginRedirect = () => {
    // Navigate to login page
    console.log('Redirecting to login page...');
    window.location.href = '/user/login';
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSubmitStatus(null);

    try {
      // Prepare the data for API submission
      const registrationData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        role: formData.role,
        profile: {} // Initialize profile object
      };

      // Add phone to profile if provided
      if (formData.phone) {
        registrationData.profile.phone = formData.phone;
      }

      // Add role-specific data to profile
      if (formData.role === 'student' && formData.grade) {
        registrationData.profile.grade = formData.grade;
      }

      if (formData.role === 'teacher') {
        if (formData.subject) {
          registrationData.profile.subject = formData.subject;
        }
        if (formData.department) {
          registrationData.profile.department = formData.department;
        }
      }

      // Debug: Log the data being sent
      console.log('Sending registration data:', registrationData);
      console.log('API URL:', `${API_URL}/auth/register`);

      // Make API call to register endpoint
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      // Debug: Log response details
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      let result;
      try {
        result = await response.json();
        console.log('Response data:', result);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }

      if (response.ok) {
        // Registration successful
        setSubmitStatus('success');
        
        // Optional: Store token if returned
        if (result.token) {
          localStorage.setItem('token', result.token);
        }
        
        // Reset form and redirect to login after successful registration
        setTimeout(() => {
          setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'student',
            phone: '',
            grade: '',
            subject: '',
            department: ''
          });
          setSubmitStatus(null);
          
          // Redirect to login page
          console.log('Registration successful! Redirecting to login page...');
          window.location.href = '/user/login';
        }, 3000);

      } else {
        // Handle API errors
        setSubmitStatus('error');
        
        // Debug: Log the error details
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: result
        });
        
        // Handle specific error types
        if (result && result.errors && Array.isArray(result.errors)) {
          // If backend returns validation errors, set them
          const apiErrors = {};
          result.errors.forEach(error => {
            // Map backend field names to frontend field names
            let fieldName = error.field || error.path;
            
            // Handle nested profile fields
            if (fieldName === 'profile.grade') fieldName = 'grade';
            if (fieldName === 'profile.subject') fieldName = 'subject';
            if (fieldName === 'profile.department') fieldName = 'department';
            if (fieldName === 'profile.phone') fieldName = 'phone';
            
            apiErrors[fieldName] = error.message || error.msg;
          });
          setErrors(apiErrors);
        } else if (result && result.message) {
          // General error message
          setErrors({ general: result.message });
        } else {
          setErrors({ general: `Registration failed (${response.status}): ${response.statusText}` });
        }
      }

    } catch (error) {
      console.error('Registration error:', error);
      setSubmitStatus('error');
      
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

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const subjects = ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art', 'Music', 'Physical Education'];
  const departments = ['Mathematics', 'English', 'Science', 'Social Studies', 'Languages', 'Arts', 'Physical Education', 'Computer Science', 'Special Education'];

  return (
    <div 
      className="relative min-h-screen bg-cover bg-no-repeat px-4 py-8"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
      }}
    >
      <div className="max-w-md mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              Create Account
            </h2>
            <p className="text-gray-600 text-lg">Join our learning community</p>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50/90 backdrop-blur-sm border border-green-200 rounded-xl">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Registration Successful!</p>
                  <p className="text-sm text-green-700">Redirecting you to login page...</p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === 'error' && errors.general && (
            <div className="mb-6 p-4 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-xl">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Registration Failed</p>
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-4">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    formData.role === 'student'
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white/50 backdrop-blur-sm'
                  }`}
                >
                  <Users className="h-7 w-7 mx-auto mb-3" />
                  <div className="font-semibold text-lg">Student</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('teacher')}
                  className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    formData.role === 'teacher'
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white/50 backdrop-blur-sm'
                  }`}
                >
                  <BookOpen className="h-7 w-7 mx-auto mb-3" />
                  <div className="font-semibold text-lg">Teacher</div>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 ${
                    errors.name ? 'border-red-300 bg-red-50/80' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && <p className="mt-2 text-sm text-red-600 font-medium">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 ${
                    errors.email ? 'border-red-300 bg-red-50/80' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="mt-2 text-sm text-red-600 font-medium">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 ${
                    errors.password ? 'border-red-300 bg-red-50/80' : 'border-gray-300'
                  }`}
                  placeholder="Create a password"
                />
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-600 font-medium">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 ${
                    errors.confirmPassword ? 'border-red-300 bg-red-50/80' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && <p className="mt-2 text-sm text-red-600 font-medium">{errors.confirmPassword}</p>}
            </div>

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-800 mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 ${
                    errors.phone ? 'border-red-300 bg-red-50/80' : 'border-gray-300'
                  }`}
                  placeholder="Enter 10-digit phone number"
                />
              </div>
              {errors.phone && <p className="mt-2 text-sm text-red-600 font-medium">{errors.phone}</p>}
            </div>

            {/* Student-specific fields */}
            {formData.role === 'student' && (
              <div>
                <label htmlFor="grade" className="block text-sm font-semibold text-gray-800 mb-2">
                  Grade *
                </label>
                <select
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 ${
                    errors.grade ? 'border-red-300 bg-red-50/80' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select your grade</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
                {errors.grade && <p className="mt-2 text-sm text-red-600 font-medium">{errors.grade}</p>}
              </div>
            )}

            {/* Teacher-specific fields */}
            {formData.role === 'teacher' && (
              <>
                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-800 mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 ${
                      errors.subject ? 'border-red-300 bg-red-50/80' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select your subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  {errors.subject && <p className="mt-2 text-sm text-red-600 font-medium">{errors.subject}</p>}
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-semibold text-gray-800 mb-2">
                    Department *
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-gray-800 ${
                      errors.department ? 'border-red-300 bg-red-50/80' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select your department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && <p className="mt-2 text-sm text-red-600 font-medium">{errors.department}</p>}
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-500/50 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button 
                onClick={handleLoginRedirect}
                className="text-blue-600 hover:text-blue-500 font-semibold transition-colors duration-200"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;