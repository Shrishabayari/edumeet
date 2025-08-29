import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, Plus, Eye, X, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

// Import your actual API - adjust the import path as needed
import { apiMethods, tokenManager, constants } from '../../services/api';

const TeacherScheduleAppointment = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [appointments, setAppointments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [confirmedAppointments, setConfirmedAppointments] = useState([]);
  const [directBookings, setDirectBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAction, setRequestAction] = useState('');
  
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
    }
  });

  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  // Get current teacher data
  const currentTeacher = tokenManager.getCurrentTeacher();
  const teacherId = tokenManager.getTeacherId();

  useEffect(() => {
    if (!currentTeacher || !teacherId) {
      setSubmitStatus({ 
        type: 'error', 
        message: 'Teacher authentication required. Please log in again.' 
      });
      return;
    }
    
    loadAllAppointmentData();
  }, [teacherId]);

  const loadAllAppointmentData = async () => {
    await Promise.all([
      loadTeacherAppointments(),
      loadPendingRequests(),
      loadConfirmedAppointments(),
      loadDirectBookings()
    ]);
  };

  const loadTeacherAppointments = async () => {
    if (!teacherId) return;
    
    try {
      setLoading(true);
      const response = await apiMethods.getTeacherAppointments(teacherId);
      
      console.log('Teacher appointments response:', response.data);
      
      let appointmentsData = [];
      if (response.data?.success && response.data?.data) {
        appointmentsData = response.data.data;
      } else if (Array.isArray(response.data?.data)) {
        appointmentsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        appointmentsData = response.data;
      }
      
      setAppointments(appointmentsData);
      console.log('Loaded teacher appointments:', appointmentsData.length);
    } catch (error) {
      console.error('Error loading teacher appointments:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load appointments';
      setSubmitStatus({ type: 'error', message: errorMessage });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    if (!teacherId) return;
    
    try {
      const response = await apiMethods.getTeacherPendingRequests(teacherId);
      
      let pendingData = [];
      if (response.data?.success && response.data?.data) {
        pendingData = response.data.data;
      } else if (Array.isArray(response.data?.data)) {
        pendingData = response.data.data;
      } else if (Array.isArray(response.data)) {
        pendingData = response.data;
      }
      
      setPendingRequests(pendingData);
      console.log('Loaded pending requests:', pendingData.length);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      setPendingRequests([]);
    }
  };

  const loadConfirmedAppointments = async () => {
    if (!teacherId) return;
    
    try {
      const response = await apiMethods.getConfirmedAppointments({ teacherId });
      
      let confirmedData = [];
      if (response.data?.success && response.data?.data) {
        confirmedData = response.data.data;
      } else if (Array.isArray(response.data?.data)) {
        confirmedData = response.data.data;
      } else if (Array.isArray(response.data)) {
        confirmedData = response.data;
      }
      
      setConfirmedAppointments(confirmedData);
      console.log('Loaded confirmed appointments:', confirmedData.length);
    } catch (error) {
      console.error('Error loading confirmed appointments:', error);
      setConfirmedAppointments([]);
    }
  };

  const loadDirectBookings = async () => {
    if (!teacherId) return;
    
    try {
      const response = await apiMethods.getDirectBookings({ teacherId });
      
      let bookingsData = [];
      if (response.data?.success && response.data?.data) {
        bookingsData = response.data.data;
      } else if (Array.isArray(response.data?.data)) {
        bookingsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        bookingsData = response.data;
      }
      
      setDirectBookings(bookingsData);
      console.log('Loaded direct bookings:', bookingsData.length);
    } catch (error) {
      console.error('Error loading direct bookings:', error);
      setDirectBookings([]);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.day) {
      newErrors.day = 'Please select a day';
    }
    
    if (!formData.time) {
      newErrors.time = 'Please select a time slot';
    }
    
    if (!formData.date) {
      newErrors.date = 'Please select a date';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Please select a future date';
      }
    }
    
    if (!formData.student.name?.trim()) {
      newErrors.studentName = 'Please enter student name';
    }
    
    if (!formData.student.email?.trim()) {
      newErrors.studentEmail = 'Please enter student email';
    } else if (!/\S+@\S+\.\S+/.test(formData.student.email.trim())) {
      newErrors.studentEmail = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('student.')) {
      const fieldName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        student: {
          ...prev.student,
          [fieldName]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear corresponding error when user starts typing
    if (errors[name] || (name.startsWith('student.') && errors[name.replace('student.', 'student')])) {
      const errorKey = name.startsWith('student.') ? 
        'student' + name.charAt(7).toUpperCase() + name.slice(8) : name;
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handleDirectBooking = async () => {
    setSubmitStatus({ type: '', message: '' });
    
    if (!validateForm()) {
      setSubmitStatus({ type: 'error', message: 'Please fix the errors above' });
      return;
    }

    if (!currentTeacher || !teacherId) {
      setSubmitStatus({ type: 'error', message: 'Teacher authentication required' });
      return;
    }

    setLoading(true);

    try {
      // Use the API validation helper
      if (typeof apiMethods.validateAppointmentData === 'function') {
        const validation = apiMethods.validateAppointmentData(formData, true);
        if (!validation.isValid) {
          setSubmitStatus({ type: 'error', message: validation.errors.join(', ') });
          setLoading(false);
          return;
        }
      }

      // Prepare the data for teacher booking
      const appointmentData = {
        teacherId: teacherId,
        teacherName: tokenManager.getTeacherName(),
        day: formData.day,
        time: formData.time,
        date: formData.date,
        student: {
          name: formData.student.name.trim(),
          email: formData.student.email.trim(),
          phone: formData.student.phone?.trim() || '',
          subject: formData.student.subject?.trim() || '',
          message: formData.student.message?.trim() || ''
        },
        status: 'booked',
        createdBy: 'teacher'
      };

      console.log('Teacher booking appointment data:', appointmentData);

      const response = await apiMethods.teacherBookAppointment(appointmentData);
      
      console.log('Teacher booking response:', response);

      const isSuccess = response.data?.success !== false && 
                       (response.status === 200 || response.status === 201);
      
      if (isSuccess) {
        const message = response.data?.message || 'Appointment booked successfully!';
        setSubmitStatus({ type: 'success', message });
        
        // Reset form
        setFormData({
          day: '',
          time: '',
          date: '',
          student: { name: '', email: '', phone: '', subject: '', message: '' }
        });
        setErrors({});
        
        // Reload appointment data
        await loadAllAppointmentData();
        
        // Auto switch to bookings tab after successful submission
        setTimeout(() => {
          setActiveTab('bookings');
          setSubmitStatus({ type: '', message: '' });
        }, 2000);
      } else {
        throw new Error(response.data?.message || response.data?.error || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      
      let errorMessage = 'Failed to book appointment';
      
      if (error.response?.data) {
        errorMessage = error.response.data.message || 
                      error.response.data.error || 
                      error.response.data.msg || 
                      `Server error (${error.response.status})`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitStatus({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentRequest = async (appointmentId, action, responseMessage = '') => {
    if (!appointmentId || !action) return;

    setLoading(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      let response;
      let successMessage;

      if (action === 'accept') {
        response = await apiMethods.acceptAppointmentRequest(appointmentId, responseMessage);
        successMessage = 'Appointment request accepted successfully!';
      } else if (action === 'reject') {
        response = await apiMethods.rejectAppointmentRequest(appointmentId, responseMessage);
        successMessage = 'Appointment request rejected successfully!';
      }

      if (response) {
        setSubmitStatus({ type: 'success', message: successMessage });
        await loadAllAppointmentData();
        setShowRequestModal(false);
        setSelectedAppointment(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSubmitStatus({ type: '', message: '' });
        }, 3000);
      }
    } catch (error) {
      console.error(`Error ${action}ing appointment:`, error);
      const errorMessage = error.message || `Failed to ${action} appointment request`;
      setSubmitStatus({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = (appointment, action) => {
    setSelectedAppointment(appointment);
    setRequestAction(action);
    setShowRequestModal(true);
  };

  const getStatusIcon = (status) => {
    if (!status) return <AlertCircle className="h-5 w-5 text-gray-500" />;
    
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'booked':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Unknown';
    
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending Approval';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      case 'booked':
        return 'Booked';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-600';
    
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'booked':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'rejected':
      case 'cancelled':
        return 'text-red-600';
      case 'completed':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const viewAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedAppointment(null);
    setRequestAction('');
  };

  // Check if teacher is authenticated
  if (!currentTeacher || !teacherId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Authentication Required</h3>
              <p className="mt-2 text-sm text-red-700">
                Please log in as a teacher to access this feature.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Appointment Management</h1>
        <p className="text-gray-600">
          Welcome, {tokenManager.getTeacherName()}! Manage your appointments and student requests.
        </p>
      </div>

      {/* Global Status Messages */}
      {submitStatus.message && (
        <div className={`mb-6 p-4 rounded-md ${
          submitStatus.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {submitStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{submitStatus.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'schedule'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="h-4 w-4 inline-block mr-2" />
          Book Appointment
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'requests'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <AlertCircle className="h-4 w-4 inline-block mr-2" />
          Pending Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'confirmed'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CheckCircle className="h-4 w-4 inline-block mr-2" />
          Confirmed ({confirmedAppointments.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'bookings'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="h-4 w-4 inline-block mr-2" />
          My Bookings ({directBookings.length})
        </button>
      </div>

      {/* Book New Appointment Tab */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Book New Appointment</h2>
            <p className="text-gray-600">
              Directly book an appointment for a student. This will create a confirmed booking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day *
              </label>
              <select
                name="day"
                value={formData.day}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.day ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select day...</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
              {errors.day && <p className="mt-1 text-sm text-red-600">{errors.day}</p>}
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Slot *
              </label>
              <select
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.time ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select time...</option>
                {(constants?.AVAILABILITY_SLOTS || [
                  '9:00 AM - 10:00 AM',
                  '10:00 AM - 11:00 AM',
                  '11:00 AM - 12:00 PM',
                  '12:00 PM - 1:00 PM',
                  '2:00 PM - 3:00 PM',
                  '3:00 PM - 4:00 PM',
                  '4:00 PM - 5:00 PM',
                  '5:00 PM - 6:00 PM'
                ]).map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
            </div>

            {/* Student Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Name *
              </label>
              <input
                type="text"
                name="student.name"
                value={formData.student.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.studentName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter student's full name"
                required
              />
              {errors.studentName && <p className="mt-1 text-sm text-red-600">{errors.studentName}</p>}
            </div>

            {/* Student Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Email *
              </label>
              <input
                type="email"
                name="student.email"
                value={formData.student.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.studentEmail ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="student.email@example.com"
                required
              />
              {errors.studentEmail && <p className="mt-1 text-sm text-red-600">{errors.studentEmail}</p>}
            </div>

            {/* Student Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Phone (Optional)
              </label>
              <input
                type="tel"
                name="student.phone"
                value={formData.student.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Student's phone number"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject/Topic (Optional)
              </label>
              <input
                type="text"
                name="student.subject"
                value={formData.student.subject}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Discussion topic or subject"
              />
            </div>

            {/* Message */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="student.message"
                value={formData.student.message}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional notes about the appointment..."
              />
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleDirectBooking}
                disabled={loading}
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Booking Appointment...
                  </span>
                ) : (
                  'Book Appointment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Pending Appointment Requests</h2>
                <p className="text-gray-600 mt-2">Review and respond to student appointment requests</p>
              </div>
              <button
                onClick={loadPendingRequests}
                disabled={loading}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-600">You don't have any pending appointment requests at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((appointment) => {
                  const appointmentId = appointment._id || appointment.id;
                  const studentName = appointment.student?.name || appointment.studentName || 'Unknown Student';

                  return (
                    <div
                      key={appointmentId}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(appointment.status)}
                            <span className={`text-sm font-medium ${getStatusColor(appointment.status)}`}>
                              {getStatusText(appointment.status)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Requested: {new Date(appointment.createdAt || appointment.date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="font-medium">{studentName}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span>{appointment.day || 'No day'} - {formatDate(appointment.date)}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span>{appointment.time || 'No time'}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-xs truncate">{appointment.student?.email || appointment.studentEmail || 'No email'}</span>
                            </div>
                          </div>

                          {(appointment.student?.subject || appointment.subject) && (
                            <div className="mt-3 p-2 bg-gray-50 rounded">
                              <div className="text-xs font-medium text-gray-700 mb-1">Subject:</div>
                              <div className="text-sm text-gray-900">{appointment.student?.subject || appointment.subject}</div>
                            </div>
                          )}

                          {(appointment.student?.message || appointment.message) && (
                            <div className="mt-3 p-2 bg-blue-50 rounded">
                              <div className="text-xs font-medium text-blue-700 mb-1">Student's Message:</div>
                              <div className="text-sm text-blue-900">{appointment.student?.message || appointment.message}</div>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleRequestAction(appointment, 'accept')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRequestAction(appointment, 'reject')}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => viewAppointmentDetails(appointment)}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmed Appointments Tab */}
      {activeTab === 'confirmed' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Confirmed Appointments</h2>
                <p className="text-gray-600 mt-2">Appointments that have been confirmed and scheduled</p>
              </div>
              <button
                onClick={loadConfirmedAppointments}
                disabled={loading}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {confirmedAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No confirmed appointments</h3>
                <p className="text-gray-600">You don't have any confirmed appointments yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {confirmedAppointments.map((appointment) => {
                  const appointmentId = appointment._id || appointment.id;
                  const studentName = appointment.student?.name || appointment.studentName || 'Unknown Student';

                  return (
                    <div
                      key={appointmentId}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(appointment.status)}
                          <span className={`text-sm font-medium ${getStatusColor(appointment.status)}`}>
                            {getStatusText(appointment.status)}
                          </span>
                        </div>
                        <button
                          onClick={() => viewAppointmentDetails(appointment)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{studentName}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm">{appointment.day || 'No day specified'}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm">{appointment.time || 'No time specified'}</span>
                        </div>

                        <div className="text-xs text-gray-500">
                          {formatDate(appointment.date)}
                        </div>

                        {(appointment.student?.subject || appointment.subject) && (
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm truncate">{appointment.student?.subject || appointment.subject}</span>
                          </div>
                        )}
                      </div>

                      {appointment.teacherResponse?.responseMessage && (
                        <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                          <div className="font-medium text-green-800 mb-1">Your Response:</div>
                          <div className="text-green-700 text-xs">
                            {appointment.teacherResponse.responseMessage.length > 60 
                              ? `${appointment.teacherResponse.responseMessage.substring(0, 60)}...`
                              : appointment.teacherResponse.responseMessage
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">My Direct Bookings</h2>
                <p className="text-gray-600 mt-2">Appointments you've booked directly for students</p>
              </div>
              <button
                onClick={loadDirectBookings}
                disabled={loading}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {directBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No direct bookings yet</h3>
                <p className="text-gray-600 mb-4">You haven't made any direct appointments yet.</p>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Book Your First Appointment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {directBookings.map((appointment) => {
                  const appointmentId = appointment._id || appointment.id;
                  const studentName = appointment.student?.name || appointment.studentName || 'Unknown Student';

                  return (
                    <div
                      key={appointmentId}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(appointment.status)}
                          <span className={`text-sm font-medium ${getStatusColor(appointment.status)}`}>
                            {getStatusText(appointment.status)}
                          </span>
                        </div>
                        <button
                          onClick={() => viewAppointmentDetails(appointment)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{studentName}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm">{appointment.day || 'No day specified'}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm">{appointment.time || 'No time specified'}</span>
                        </div>

                        <div className="text-xs text-gray-500">
                          {formatDate(appointment.date)}
                        </div>

                        {(appointment.student?.subject || appointment.subject) && (
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm truncate">{appointment.student?.subject || appointment.subject}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                        <div className="font-medium text-blue-800 text-xs">Direct Booking</div>
                        <div className="text-blue-700 text-xs">
                          Booked on: {new Date(appointment.createdAt || appointment.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {showModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Appointment Details</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedAppointment.status)}
                  <span className={`font-medium ${getStatusColor(selectedAppointment.status)}`}>
                    {getStatusText(selectedAppointment.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-gray-700 block mb-1">Date</label>
                      <p className="text-gray-900">{formatDate(selectedAppointment.date)}</p>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-700 block mb-1">Day</label>
                      <p className="text-gray-900">{selectedAppointment.day || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Time</label>
                    <p className="text-gray-900">{selectedAppointment.time || 'Not specified'}</p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-md">
                    <label className="font-medium text-gray-700 block mb-1">Student Information</label>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-600">Name: </span>
                        <span className="text-gray-900">
                          {selectedAppointment.student?.name || 
                           selectedAppointment.studentName || 
                           'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Email: </span>
                        <span className="text-gray-900">
                          {selectedAppointment.student?.email || 
                           selectedAppointment.studentEmail || 
                           'Not specified'}
                        </span>
                      </div>
                      {(selectedAppointment.student?.phone || selectedAppointment.studentPhone) && (
                        <div>
                          <span className="text-xs text-gray-600">Phone: </span>
                          <span className="text-gray-900">
                            {selectedAppointment.student?.phone || selectedAppointment.studentPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(selectedAppointment.student?.subject || selectedAppointment.subject) && (
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Subject</label>
                    <p className="text-sm text-gray-900">
                      {selectedAppointment.student?.subject || selectedAppointment.subject}
                    </p>
                  </div>
                )}

                {(selectedAppointment.student?.message || selectedAppointment.message) && (
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Student's Message</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedAppointment.student?.message || selectedAppointment.message}
                    </p>
                  </div>
                )}

                {(selectedAppointment.teacherResponse?.responseMessage || 
                  selectedAppointment.responseMessage || 
                  selectedAppointment.teacherNote) && (
                  <div className="p-3 bg-green-50 rounded-md border border-green-200">
                    <label className="font-medium text-green-800 block mb-1">Your Response</label>
                    <p className="text-sm text-green-700">
                      {selectedAppointment.teacherResponse?.responseMessage || 
                       selectedAppointment.responseMessage || 
                       selectedAppointment.teacherNote}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      Created: {new Date(selectedAppointment.createdAt || selectedAppointment.date).toLocaleString()}
                    </div>
                    {(selectedAppointment.teacherResponse?.respondedAt || selectedAppointment.respondedAt) && (
                      <div>
                        Responded: {new Date(selectedAppointment.teacherResponse?.respondedAt || selectedAppointment.respondedAt).toLocaleString()}
                      </div>
                    )}
                    {selectedAppointment.updatedAt && selectedAppointment.updatedAt !== selectedAppointment.createdAt && (
                      <div>Last updated: {new Date(selectedAppointment.updatedAt).toLocaleString()}</div>
                    )}
                    {selectedAppointment.createdBy && (
                      <div>Created by: {selectedAppointment.createdBy}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'booked') && (
                  <button
                    onClick={() => {
                      // Handle start meeting logic here
                      console.log('Start meeting for appointment:', selectedAppointment._id || selectedAppointment.id);
                      closeModal();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Start Meeting
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Action Modal (Accept/Reject) */}
      {showRequestModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {requestAction === 'accept' ? 'Accept' : 'Reject'} Appointment Request
                </h3>
                <button
                  onClick={closeRequestModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="text-sm">
                  <div className="font-medium">
                    {selectedAppointment.student?.name || selectedAppointment.studentName || 'Unknown Student'}
                  </div>
                  <div className="text-gray-600">
                    {selectedAppointment.day} - {selectedAppointment.time}
                  </div>
                  <div className="text-gray-600">
                    {formatDate(selectedAppointment.date)}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Message (Optional)
                </label>
                <textarea
                  id="responseMessage"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder={requestAction === 'accept' 
                    ? "Add a message for the student (optional)..."
                    : "Provide a reason for rejection (optional)..."
                  }
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={closeRequestModal}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const responseMessage = document.getElementById('responseMessage')?.value || '';
                    handleAppointmentRequest(
                      selectedAppointment._id || selectedAppointment.id,
                      requestAction,
                      responseMessage
                    );
                  }}
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded transition-colors ${
                    requestAction === 'accept' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <RefreshCw className="animate-spin h-4 w-4 inline mr-2" />
                  ) : null}
                  {requestAction === 'accept' ? 'Accept Request' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherScheduleAppointment;