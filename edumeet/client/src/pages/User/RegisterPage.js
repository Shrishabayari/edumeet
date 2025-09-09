import React, { useState } from 'react';
import { User, Mail, Lock, Phone, GraduationCap, AlertCircle, CheckCircle } from 'lucide-react';
import Navbar from '../../components/navbar';

const StudentRegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    grade: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const API_URL = process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL || 'https://edumeet.onrender.com/api'
    : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email))
      newErrors.email = 'Enter a valid email';
    if (!formData.password || formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    if (formData.phone && !/^\d{10}$/.test(formData.phone))
      newErrors.phone = 'Enter a valid 10-digit phone number';
    if (!formData.grade) newErrors.grade = 'Grade is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (submitStatus) setSubmitStatus(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    setSubmitStatus(null);

    try {
      const studentData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        role: 'student',
        profile: {
          grade: formData.grade,
          ...(formData.phone && { phone: formData.phone }),
        }
      };

      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });

      const result = await res.json();

      if (res.ok) {
        setSubmitStatus('success');
        if (result.token) localStorage.setItem('token', result.token);
        setTimeout(() => {
          setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            phone: '',
            grade: ''
          });
          setSubmitStatus(null);
          window.location.href = '/user/login';
        }, 3000);
      } else {
        setSubmitStatus('error');
        const apiErrors = {};
        if (result.errors) {
          result.errors.forEach(err => {
            const field = err.field?.replace('profile.', '') || err.path;
            apiErrors[field] = err.message || err.msg;
          });
          setErrors(apiErrors);
        } else if (result.message) {
          setErrors({ general: result.message });
        } else {
          setErrors({ general: 'Registration failed. Try again.' });
        }
      }
    } catch (err) {
      setSubmitStatus('error');
      setErrors({ general: err.message || 'Unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-purple-50 to-pink-50 px-4 py-10 flex justify-center items-center">
        <div className="bg-white shadow-2xl rounded-3xl p-10 w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-md">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Student Registration</h2>
            <p className="text-gray-500 mt-1">Join our learning community</p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="font-semibold text-green-800 text-sm">Registration Successful!</p>
                  <p className="text-green-700 text-sm">Redirecting to login...</p>
                </div>
              </div>
            </div>
          )}
          {submitStatus === 'error' && errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Error</p>
                  <p className="text-red-700 text-sm">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl bg-white text-gray-800 placeholder-gray-500 ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl bg-white text-gray-800 placeholder-gray-500 ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a password"
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl bg-white text-gray-800 placeholder-gray-500 ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl bg-white text-gray-800 placeholder-gray-500 ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Phone (optional) */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl bg-white text-gray-800 placeholder-gray-500 ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
            </div>

            {/* Grade */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Grade *</label>
              <select
                name="grade"
                value={formData.grade}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl bg-white text-gray-800 ${errors.grade ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              >
                <option value="">Select your grade</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              {errors.grade && <p className="text-sm text-red-600 mt-1">{errors.grade}</p>}
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <a href="/user/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentRegistrationForm;