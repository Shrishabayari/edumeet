import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { apiMethods, tokenManager } from '../../services/api';
import TeacherNavbar from "../../components/teacherNavbar";

const TeacherSchedule = () => {
  const [currentTeacher, setCurrentTeacher] = useState(null); 
  const [appointments, setAppointments] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teacherAvailability, setTeacherAvailability] = useState(null);

  // Move VALID_DAYS to useMemo to make it stable across renders
  const VALID_DAYS = useMemo(() => [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ], []);

  // Get next date for a given day
  const getNextDateForDay = useCallback((dayName) => {
    if (!dayName || typeof dayName !== 'string') {
      console.error('Invalid day name:', dayName);
      return new Date().toISOString().split('T')[0]; 
    }

    const normalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
    
    if (!VALID_DAYS.includes(normalizedDay)) {
      console.error('Invalid day name:', normalizedDay);
      return new Date().toISOString().split('T')[0];
    }
    
    const today = new Date();
    const targetDay = VALID_DAYS.indexOf(normalizedDay);
    const todayDay = today.getDay();
    
    let daysUntilTarget = targetDay - todayDay;
    
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    
    return targetDate.toISOString().split('T')[0];
  }, [VALID_DAYS]);

  const formatDateForDisplay = useCallback((dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  }, []);

  // Default availability structure
  const getDefaultAvailability = useCallback(() => {
    return [
      { 
        day: 'Monday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'        ] 
      },
      { 
        day: 'Tuesday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'        ] 
      },
      { 
        day: 'Wednesday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'        ] 
      },
      { 
        day: 'Thursday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'        ] 
      },
      { 
        day: 'Friday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'        ] 
      }
    ];
  }, []);

  // Process teacher availability - simplified version
  const processTeacherAvailability = useCallback((teacherData) => {
    console.log('Processing teacher availability:', teacherData?.availability);
    
    if (!teacherData?.availability) {
      console.log('No availability found, using default');
      return getDefaultAvailability();
    }

    // If it's already in the correct format
    if (Array.isArray(teacherData.availability) && 
        teacherData.availability.length > 0 && 
        teacherData.availability[0].day && 
        Array.isArray(teacherData.availability[0].slots)) {
      console.log('Availability already in correct format');
      return teacherData.availability;
    }

    // If it's an array of time slots, convert to weekly format
    if (Array.isArray(teacherData.availability)) {
      const timeSlots = teacherData.availability.filter(item => 
        typeof item === 'string' && (item.includes(':') || item.includes('AM') || item.includes('PM'))
      );
      
      if (timeSlots.length > 0) {
        console.log('Converting time slots to weekly format');
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        return weekdays.map(day => ({
          day,
          slots: [...timeSlots]
        }));
      }
    }

    console.log('Using default availability');
    return getDefaultAvailability();
  }, [getDefaultAvailability]);

  // FIXED: Check authentication and load teacher data properly
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      // First check if we have a valid teacher token
      if (!tokenManager.isTeacherLoggedIn()) {
        console.log('❌ No teacher token found');
        setError('Please log in as a teacher to access this page');
        return;
      }

      // Try to get teacher data from localStorage first
      let teacher = tokenManager.getCurrentTeacher();
      
      if (teacher && (teacher._id || teacher.id)) {
        console.log('✅ Teacher data loaded from localStorage:', teacher);
        setCurrentTeacher(teacher);
        
        // Process availability
        const availability = processTeacherAvailability(teacher);
        setTeacherAvailability(availability);
        return;
      }

      // If no local data, try to fetch from API
      console.log('🔄 Fetching teacher profile from API...');
      const response = await apiMethods.getTeacherProfile();
      
      if (response.data && response.data.success) {
        teacher = response.data.data || response.data.teacher;
        console.log('✅ Teacher profile fetched from API:', teacher);
        
        // Store in localStorage for future use
        localStorage.setItem('teacher', JSON.stringify(teacher));
        setCurrentTeacher(teacher);
        
        // Process availability
        const availability = processTeacherAvailability(teacher);
        setTeacherAvailability(availability);
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (error) {
      console.error('❌ Failed to load teacher profile:', error);
      
      let errorMessage = 'Failed to load teacher information';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        tokenManager.removeTeacherToken();
        setTimeout(() => {
          window.location.href = '/teacher/login';
        }, 2000);
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid teacher data. Please contact support.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [processTeacherAvailability]);

  // FIXED: Fetch teacher appointments using correct API method
  const fetchTeacherAppointments = useCallback(async () => {
    if (!currentTeacher?.id && !currentTeacher?._id) {
      console.warn("No teacher ID available");
      setAppointments([]);
      return;
    }
    
    try {
      setLoading(true);
      const teacherId = currentTeacher.id || currentTeacher._id;
      console.log('Fetching appointments for teacher:', teacherId);
      
      // FIXED: Use the correct API method from api.js
      const response = await apiMethods.getTeacherAppointments({
        status: ['booked', 'confirmed', 'pending', 'completed']
      });
      
      console.log('Appointments response:', response);
      
      let appointmentsData = [];
      if (response?.data?.success && Array.isArray(response.data.data)) {
        appointmentsData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        appointmentsData = response.data;
      }
      
      console.log('Setting appointments:', appointmentsData);
      setAppointments(appointmentsData);
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      
      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        tokenManager.removeTeacherToken();
        setTimeout(() => {
          window.location.href = '/teacher/login';
        }, 2000);
      } else {
        setError('Failed to load appointments');
      }
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [currentTeacher]);

  // FIXED: Initial authentication check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch appointments when teacher is loaded
  useEffect(() => {
    if (currentTeacher && (currentTeacher.id || currentTeacher._id)) {
      fetchTeacherAppointments();
    }
  }, [currentTeacher, fetchTeacherAppointments]);

  const resetForm = useCallback(() => {
    setSelectedDay('');
    setSelectedTime('');
    setStudentInfo({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
    setError('');
  }, []);

  const openBookingModal = useCallback(() => {
    if (!currentTeacher) {
      setError('Teacher data not loaded');
      return;
    }
    setShowBookingModal(true);
    setError('');
  }, [currentTeacher]);

  const closeBookingModal = useCallback(() => {
    setShowBookingModal(false);
    resetForm();
  }, [resetForm]);

  // FIXED: Create appointment using correct API method
  const handleCreateAppointment = useCallback(async () => {
    if (!currentTeacher) {
      setError('Teacher information not loaded');
      return;
    }
    
    if (!selectedDay || !selectedTime || !studentInfo.name || !studentInfo.email) {
      setError('Please select day, time, and fill in required student information');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const appointmentDate = getNextDateForDay(selectedDay);
      
      // FIXED: Use correct appointment data structure for teacherBookAppointment
      const appointmentData = {
        teacherId: currentTeacher.id || currentTeacher._id,
        day: selectedDay,
        time: selectedTime,
        date: appointmentDate,
        student: {
          name: studentInfo.name.trim(),
          email: studentInfo.email.trim(),
          phone: studentInfo.phone.trim() || '',
          subject: studentInfo.subject.trim() || '',
          message: studentInfo.message.trim() || ''
        },
        status: 'booked', // Direct booking by teacher
        createdBy: 'teacher'
      };

      console.log('Creating appointment with data:', appointmentData);

      // FIXED: Use the correct API method from api.js
      const response = await apiMethods.teacherBookAppointment(appointmentData);
      console.log('Appointment creation response:', response);

      // Refresh appointments list
      await fetchTeacherAppointments();
      
      setShowBookingModal(false);
      setShowConfirmation(true);
      resetForm();

      setTimeout(() => setShowConfirmation(false), 3000);

    } catch (error) {
      console.error('Error creating appointment:', error);
      
      let errorMessage = 'Failed to create appointment';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.map(e => e.msg || e.message || e).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentTeacher, selectedDay, selectedTime, studentInfo, getNextDateForDay, fetchTeacherAppointments, resetForm]);

  // FIXED: Cancel appointment using correct API method
  const cancelAppointment = useCallback(async (appointmentId) => {
    if (!appointmentId) {
      setError('Invalid appointment ID');
      return;
    }
    
    try {
      setLoading(true);
      setError('');

      // FIXED: Use the correct API method from api.js
      await apiMethods.cancelAppointment(appointmentId, 'Cancelled by teacher');
      
      // Remove from local state
      setAppointments(prev => 
        prev.filter(apt => (apt.id || apt._id) !== appointmentId)
      );

    } catch (error) {
      console.error('Error canceling appointment:', error);
      
      let errorMessage = 'Failed to cancel appointment';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setStudentInfo(prev => ({ ...prev, [name]: value }));
  }, []);

  // Show loading screen while checking authentication
  if (loading && !currentTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we verify your authentication.</p>
        </div>
      </div>
    );
  }

  // Show error screen if authentication fails
  if (error && !currentTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/teacher/login'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in as a teacher to access this page.</p>
          <button
            onClick={() => window.location.href = '/teacher/login'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const availabilityToShow = teacherAvailability || getDefaultAvailability();

  return (
    <>
      <TeacherNavbar/>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  Welcome, {currentTeacher.name}
                </h1>
                <p className="text-gray-600">Manage your appointments and schedule efficiently.</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Subject: {currentTeacher.subject || 'Not Specified'}</p>
                <p className="text-sm text-gray-500">Email: {currentTeacher.email || 'Not Available'}</p>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700 font-medium text-sm">{error}</span>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'create' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Plus className="w-5 h-5" />
                Create Appointment
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'appointments' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                My Appointments ({safeAppointments.length})
              </button>
            </div>
          </div>

          {/* Create Tab */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Create New Appointment</h2>
                <button
                  onClick={openBookingModal}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-md flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 inline mr-2" />
                  Schedule New Appointment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <Calendar className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Schedule</h3>
                  <p className="text-gray-600 text-sm">Create appointments for students quickly and efficiently.</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <Clock className="w-12 h-12 text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Flexible Timing</h3>
                  <p className="text-gray-600 text-sm">Choose from your available time slots to fit student needs.</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <User className="w-12 h-12 text-purple-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Student Details</h3>
                  <p className="text-gray-600 text-sm">Collect necessary student information for personalized sessions.</p>
                </div>
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              {safeAppointments.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No appointments yet!</h3>
                  <p className="text-gray-500">Create your first appointment to get started.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Schedule Your First Appointment
                  </button>
                </div>
              ) : (
                safeAppointments
                  .sort((a, b) => new Date(a.date || a.appointmentDate) - new Date(b.date || b.appointmentDate))
                  .map(appointment => (
                    <div key={appointment.id || appointment._id} className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                          <div className="bg-gradient-to-r from-green-400 to-blue-500 p-3 rounded-full">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800">{appointment.student?.name || 'Unknown Student'}</h3>
                            <p className="text-gray-600 flex items-center text-sm mt-1">
                              <Mail className="w-4 h-4 mr-1 text-gray-500"/>
                              {appointment.student?.email || 'N/A'}
                            </p>
                            {appointment.student?.phone && (
                              <p className="text-gray-600 flex items-center text-sm">
                                <Phone className="w-4 h-4 mr-1 text-gray-500"/>
                                {appointment.student.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end space-y-2">
                          <p className="text-gray-700 flex items-center font-medium">
                            <Calendar className="w-4 h-4 mr-1 text-blue-500" />
                            {formatDateForDisplay(appointment.date || appointment.appointmentDate)}
                          </p>
                          <p className="text-gray-700 flex items-center font-medium">
                            <Clock className="w-4 h-4 mr-1 text-indigo-500" />
                            {appointment.day} at {appointment.time}
                          </p>
                          <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                            appointment.status === 'booked' || appointment.status === 'confirmed' 
                              ? 'text-green-600 bg-green-50 border-green-200'
                              : appointment.status === 'pending'
                              ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                              : appointment.status === 'cancelled'
                              ? 'text-red-600 bg-red-50 border-red-200'
                              : 'text-gray-600 bg-gray-50 border-gray-200'
                          }`}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="capitalize">{appointment.status || 'Scheduled'}</span>
                          </div>
                          <button
                            onClick={() => cancelAppointment(appointment.id || appointment._id)}
                            disabled={loading}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel Appointment
                          </button>
                        </div>
                      </div>
                      {(appointment.student?.subject || appointment.student?.message) && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          {appointment.student?.subject && (
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>Subject:</strong> {appointment.student.subject}
                            </p>
                          )}
                          {appointment.student?.message && (
                            <p className="text-sm text-gray-700">
                              <strong>Message:</strong> {appointment.student.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}

          {/* Booking Modal */}
          {showBookingModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Create New Appointment</h2>
                  <button
                    onClick={closeBookingModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <XCircle className="w-7 h-7" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-red-700 text-sm font-medium">{error}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Day Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Day <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {availabilityToShow.map(daySlot => (
                        <button
                          key={daySlot.day}
                          onClick={() => {
                            setSelectedDay(daySlot.day);
                            setSelectedTime('');
                          }}
                          className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200 
                            ${selectedDay === daySlot.day
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white text-gray-800'
                            }`}
                        >
                          <div className="font-medium text-base">{daySlot.day}</div>
                          <div className="text-sm text-gray-500">{formatDateForDisplay(getNextDateForDay(daySlot.day))}</div>
                          <div className="text-xs text-gray-400 mt-1">{daySlot.slots?.length || 0} slots</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection */}
                  {selectedDay && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Time <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        {(() => {
                          const selectedDayData = availabilityToShow.find(day => day.day === selectedDay);
                          const availableSlots = selectedDayData?.slots || [];
                          
                          return availableSlots.length > 0 ? (
                            availableSlots.map((time, index) => (
                              <button
                                key={`${time}-${index}`}
                                onClick={() => setSelectedTime(time)}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center transition-all duration-200 
                                  ${selectedTime === time
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-800'
                                  }`}
                              >
                                <Clock className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                                <div className="text-sm font-medium text-center">{time}</div>
                              </button>
                            ))
                          ) : (
                            <div className="col-span-full text-center py-4 bg-gray-50 rounded-lg">
                              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">No available slots for {selectedDay}</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Student Information Form */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Student Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input
                          type="text"
                          name="name"
                          placeholder="Student Name *"
                          value={studentInfo.name}
                          onChange={handleInputChange}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input
                          type="email"
                          name="email"
                          placeholder="Student Email *"
                          value={studentInfo.email}
                          onChange={handleInputChange}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Student Phone (Optional)"
                          value={studentInfo.phone}
                          onChange={handleInputChange}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input
                          type="text"
                          name="subject"
                          placeholder="Subject/Topic (Optional)"
                          value={studentInfo.subject}
                          onChange={handleInputChange}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                    <textarea
                      name="message"
                      placeholder="Additional notes or agenda for the appointment (Optional)..."
                      value={studentInfo.message}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
                    ></textarea>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button
                      onClick={closeBookingModal}
                      disabled={loading}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAppointment}
                      disabled={loading || !selectedDay || !selectedTime || !studentInfo.name || !studentInfo.email}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 inline mr-2" />
                          Create Appointment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border-4 border-green-200">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-3">Appointment Created! 🎉</h3>
                <p className="text-gray-600 mb-6 text-lg">
                  The appointment has been successfully created and the student will be notified.
                </p>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Got It!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TeacherSchedule;