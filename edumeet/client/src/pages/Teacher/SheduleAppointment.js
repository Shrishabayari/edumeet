import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, MessageSquare, Save, X, CheckCircle, AlertCircle } from 'lucide-react';

// Import the real API instead of mock
import { apiMethods, tokenManager } from '../../services/api';

const TeacherScheduleAppointment = () => {
  const [formData, setFormData] = useState({
    day: '',
    time: '',
    date: '',
    student: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    },
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [errors, setErrors] = useState({});

  // Available time slots based on your backend constants
  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 1:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM',
    '5:00 PM - 6:00 PM'
  ];

  const daysOfWeek = [
    'Monday',
    'Tuesday', 
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  // Check if teacher is authenticated
  useEffect(() => {
    const isAuthenticated = tokenManager.isTeacherLoggedIn();
    if (!isAuthenticated) {
      showNotification('error', 'Please log in as a teacher to book appointments');
    }
  }, []);

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get day of week from date
  const getDayFromDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Adjust for Monday start
  };

  // Handle date change and auto-set day
  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    const dayOfWeek = getDayFromDate(selectedDate);
    
    setFormData(prev => ({
      ...prev,
      date: selectedDate,
      day: dayOfWeek
    }));
    
    // Clear date error if it exists
    if (errors.date) {
      setErrors(prev => ({ ...prev, date: '' }));
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('student.')) {
      const studentField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        student: {
          ...prev.student,
          [studentField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Required field validation
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time slot is required';
    if (!formData.student.name.trim()) newErrors['student.name'] = 'Student name is required';
    if (!formData.student.email.trim()) newErrors['student.email'] = 'Student email is required';

    // Email validation
    if (formData.student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.student.email)) {
      newErrors['student.email'] = 'Please provide a valid email address';
    }

    // Phone validation (optional but if provided should be valid)
    if (formData.student.phone && !/^[\+]?[\d\s\-\(\)]{7,20}$/.test(formData.student.phone)) {
      newErrors['student.phone'] = 'Please provide a valid phone number';
    }

    // Date validation - must be future date
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.date = 'Appointment date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission - FIXED to use real API
  const handleSubmit = async () => {
    console.log('🔄 Starting appointment booking process...');
    
    if (!validateForm()) {
      showNotification('error', 'Please fix the errors below');
      return;
    }

    // Check authentication
    if (!tokenManager.isTeacherLoggedIn()) {
      showNotification('error', 'Please log in as a teacher to book appointments');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data according to your backend structure
      const appointmentData = {
        day: formData.day,
        time: formData.time,
        date: formData.date,
        student: {
          name: formData.student.name.trim(),
          email: formData.student.email.trim().toLowerCase(),
          phone: formData.student.phone.trim() || '',
          subject: formData.student.subject.trim() || '',
          message: formData.student.message.trim() || ''
        },
        notes: formData.notes.trim() || ''
      };

      console.log('📤 Sending appointment data:', appointmentData);

      // Use the real API method instead of mock
      const response = await apiMethods.teacherBookAppointment(appointmentData);
      
      console.log('✅ API Response:', response);

      if (response.data.success) {
        showNotification('success', 'Appointment booked successfully!');
        resetForm();
      } else {
        throw new Error(response.data.message || 'Failed to book appointment');
      }
      
    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      
      // Handle different types of errors
      if (error.response) {
        const { status, data } = error.response;
        console.error('HTTP Error:', status, data);
        
        switch (status) {
          case 400:
            if (data.message?.includes('Validation failed')) {
              showNotification('error', 'Please check your input and try again.');
            } else {
              showNotification('error', data.message || 'Invalid data provided');
            }
            break;
          case 401:
            showNotification('error', 'Please log in again to continue');
            // Optionally redirect to login
            break;
          case 403:
            showNotification('error', 'You do not have permission to book appointments');
            break;
          case 409:
            showNotification('error', 'This time slot is already booked. Please select a different time.');
            break;
          case 500:
            showNotification('error', 'Server error. Please try again later.');
            break;
          default:
            showNotification('error', data.message || 'Failed to book appointment. Please try again.');
        }
      } else if (error.request) {
        console.error('Network Error:', error.request);
        showNotification('error', 'Network error. Please check your connection and try again.');
      } else {
        console.error('Error:', error.message);
        showNotification('error', error.message || 'Failed to book appointment. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 5000);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      day: '',
      time: '',
      date: '',
      student: {
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      },
      notes: ''
    });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule New Appointment</h1>
          <p className="mt-2 text-gray-600">Book an appointment directly for a student</p>
        </div>

        {/* Notification */}
        {notification.show && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="space-y-6">
            
            {/* Date and Time Section */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Date & Time
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleDateChange}
                    min={getMinDate()}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                </div>
                
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time Slot *
                  </label>
                  <select
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.time ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select time slot</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
                </div>
              </div>
              
              {formData.day && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Day:</strong> {formData.day}
                  </p>
                </div>
              )}
            </div>

            {/* Student Information Section */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Student Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name *
                  </label>
                  <input
                    type="text"
                    id="studentName"
                    name="student.name"
                    value={formData.student.name}
                    onChange={handleInputChange}
                    placeholder="Enter student's full name"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors['student.name'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors['student.name'] && <p className="mt-1 text-sm text-red-600">{errors['student.name']}</p>}
                </div>
                
                <div>
                  <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      id="studentEmail"
                      name="student.email"
                      value={formData.student.email}
                      onChange={handleInputChange}
                      placeholder="student@example.com"
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors['student.email'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors['student.email'] && <p className="mt-1 text-sm text-red-600">{errors['student.email']}</p>}
                </div>
                
                <div>
                  <label htmlFor="studentPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      id="studentPhone"
                      name="student.phone"
                      value={formData.student.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors['student.phone'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors['student.phone'] && <p className="mt-1 text-sm text-red-600">{errors['student.phone']}</p>}
                </div>
                
                <div>
                  <label htmlFor="studentSubject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject/Topic
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      id="studentSubject"
                      name="student.subject"
                      value={formData.student.subject}
                      onChange={handleInputChange}
                      placeholder="e.g., Mathematics, Physics"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                Additional Information
              </h3>
              
              <div>
                <label htmlFor="studentMessage" className="block text-sm font-medium text-gray-700 mb-1">
                  Student Message/Request
                </label>
                <textarea
                  id="studentMessage"
                  name="student.message"
                  value={formData.student.message}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any specific topics or questions the student wants to discuss..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Internal notes about this appointment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Booking...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Book Appointment</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">📝 Booking Guidelines:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Appointments can only be scheduled for future dates</li>
            <li>• Each time slot can only have one appointment</li>
            <li>• Student will receive confirmation via email</li>
            <li>• You can manage booked appointments from your dashboard</li>
          </ul>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-2">🔧 Debug Info:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Teacher Logged In: {tokenManager.isTeacherLoggedIn() ? 'Yes' : 'No'}</p>
              <p>Teacher ID: {tokenManager.getTeacherId() || 'Not found'}</p>
              <p>Teacher Name: {tokenManager.getTeacherName() || 'Not found'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherScheduleAppointment;