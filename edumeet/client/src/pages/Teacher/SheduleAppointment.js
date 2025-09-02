import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, AlertCircle, Plus, Users } from 'lucide-react';
import { apiMethods } from '../../services/api';
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

  const VALID_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    
    return targetDate.toISOString().split('T')[0];// eslint-disable-next-line
  }, []);

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

    if (Array.isArray(teacherData.availability) && 
        teacherData.availability.length > 0 && 
        teacherData.availability[0].day && 
        Array.isArray(teacherData.availability[0].slots)) {
      console.log('Availability already in correct format');
      return teacherData.availability;
    }

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

  // Fetch teacher appointments
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
      
      const response = await apiMethods.getTeacherAppointments(teacherId);
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
      setError('Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [currentTeacher]);

  // Load teacher from localStorage
  useEffect(() => {
    const teacherData = localStorage.getItem('teacher');
    if (teacherData) {
      try {
        const teacher = JSON.parse(teacherData);
        console.log('Loaded teacher from localStorage:', teacher);
        setCurrentTeacher(teacher);
        
        const availability = processTeacherAvailability(teacher);
        setTeacherAvailability(availability);
        
      } catch (error) {
        console.error('Error parsing teacher data:', error);
        setError('Unable to load teacher information');
      }
    } else {
      setError('Please log in to access your schedule');
    }
  }, [processTeacherAvailability]);

  // Fetch appointments when teacher is loaded
  useEffect(() => {
    if (currentTeacher) {
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

  // Create appointment - FIXED
  const handleCreateAppointment = async () => {
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
      
      const appointmentData = {
        teacherId: currentTeacher.id || currentTeacher._id,
        day: selectedDay,
        time: selectedTime,
        date: appointmentDate,
        student: {
          name: studentInfo.name.trim(),
          email: studentInfo.email.trim(),
          phone: studentInfo.phone.trim() || null,
          subject: studentInfo.subject.trim() || null,
          message: studentInfo.message.trim() || null
        },
        status: 'booked',
        createdBy: 'teacher'
      };

      console.log('Creating appointment with data:', appointmentData);

      const response = await apiMethods.teacherBookAppointment(appointmentData);
      console.log('Appointment creation response:', response);

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
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.map(e => e.msg || e.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment - FIXED
  const cancelAppointment = async (appointmentId) => {
    if (!appointmentId) {
      setError('Invalid appointment ID');
      return;
    }
    
    try {
      setLoading(true);
      setError('');

      await apiMethods.cancelAppointment(appointmentId, 'Cancelled by teacher');
      
      setAppointments(prev => 
        prev.filter(apt => (apt.id || apt._id) !== appointmentId)
      );

    } catch (error) {
      console.error('Error canceling appointment:', error);
      setError('Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setStudentInfo(prev => ({ ...prev, [name]: value }));
  }, []);

  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 text-center max-w-md w-full border border-white/20">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Access Required</h2>
          <p className="text-gray-300 mb-8">Please log in as a teacher to access this dashboard.</p>
          <button
            onClick={() => window.location.href = '/teacher/login'}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-4 w-72 h-72 bg-gradient-to-r from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 p-6">
          {/* Enhanced Header with Glassmorphism */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white"></div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                    Welcome back, {currentTeacher.name}
                  </h1>
                  <p className="text-gray-600 text-lg">Transform education with seamless appointment management</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right space-y-2">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">{currentTeacher.subject || 'Multi-Subject'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{currentTeacher.email}</span>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex space-x-4">
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm px-4 py-3 rounded-2xl border border-green-200/50">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700">{safeAppointments.length}</div>
                      <div className="text-xs text-green-600 font-medium">Total</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm px-4 py-3 rounded-2xl border border-blue-200/50">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700">{safeAppointments.filter(apt => apt.status === 'booked').length}</div>
                      <div className="text-xs text-blue-600 font-medium">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Error Alert */}
          {error && (
            <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 backdrop-blur-xl border border-red-200/50 rounded-3xl p-6 mb-8 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">Attention Required</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 hover:bg-red-100/50 p-2 rounded-xl transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {/* Modern Loading Overlay */}
          {loading && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-12 text-center shadow-2xl border border-white/20">
                <div className="relative mb-8">
                  <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-purple-600 rounded-full animate-pulse mx-auto"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing</h3>
                <p className="text-gray-600">Please wait while we handle your request...</p>
              </div>
            </div>
          )}

          {/* Enhanced Navigation Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl mb-8 overflow-hidden border border-white/30">
            <div className="flex">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-6 px-8 text-lg font-semibold transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group
                  ${activeTab === 'create' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-transparent text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50'
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Plus className="w-6 h-6 relative z-10" />
                <span className="relative z-10">Create Session</span>
                {activeTab === 'create' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex-1 py-6 px-8 text-lg font-semibold transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group
                  ${activeTab === 'appointments' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-transparent text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50'
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Calendar className="w-6 h-6 relative z-10" />
                <span className="relative z-10">My Schedule</span>
                <span className="bg-white/20 text-black px-2 py-1 rounded-full text-sm font-bold relative z-10">
                  {safeAppointments.length}
                </span>
                {activeTab === 'appointments' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
                )}
              </button>
            </div>
          </div>

          {/* Create Tab - Enhanced */}
          {activeTab === 'create' && (
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                    Schedule New Session
                  </h2>
                  <p className="text-gray-600 text-lg">Create meaningful learning experiences for your students</p>
                </div>
                <button
                  onClick={openBookingModal}
                  className="mt-6 lg:mt-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white px-8 py-4 rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold flex items-center space-x-3 group"
                >
                  <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                  <span>New Appointment</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-100/50 backdrop-blur-sm rounded-2xl p-8 border border-blue-200/30 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-6 flex items-center justify-center group-hover:rotate-3 transition-transform">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Smart Scheduling</h3>
                  <p className="text-gray-600">AI-powered time slot recommendations based on your availability and student preferences.</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50/50 to-emerald-100/50 backdrop-blur-sm rounded-2xl p-8 border border-green-200/30 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-6 flex items-center justify-center group-hover:rotate-3 transition-transform">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Flexible Duration</h3>
                  <p className="text-gray-600">Customize session lengths from quick consultations to comprehensive tutorials.</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50/50 to-pink-100/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-200/30 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg mb-6 flex items-center justify-center group-hover:rotate-3 transition-transform">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Student Profiles</h3>
                  <p className="text-gray-600">Comprehensive student information management with learning progress tracking.</p>
                </div>
              </div>
            </div>
          )}

          {/* Appointments Tab - Enhanced */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {safeAppointments.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-16 text-center">
                  <div className="w-32 h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full mx-auto mb-8 flex items-center justify-center">
                    <Calendar className="w-16 h-16 text-gray-500" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-700 mb-4">Your Schedule Awaits</h3>
                  <p className="text-gray-500 text-xl mb-8 max-w-md mx-auto">
                    Ready to inspire minds? Schedule your first appointment and begin transforming student learning.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold inline-flex items-center space-x-3"
                  >
                    <Plus className="w-6 h-6" />
                    <span>Create Your First Session</span>
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {safeAppointments
                    .sort((a, b) => new Date(a.date || a.appointmentDate) - new Date(b.date || b.appointmentDate))
                    .map(appointment => (
                      <div key={appointment.id || appointment._id} 
                           className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 group">
                        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between space-y-6 xl:space-y-0">
                          <div className="flex items-start space-x-6 flex-1">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center">
                                <User className="w-8 h-8 text-white" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white"></div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                    {appointment.student?.name || 'Unknown Student'}
                                  </h3>
                                  <div className="space-y-2">
                                    <p className="text-gray-600 flex items-center">
                                      <Mail className="w-4 h-4 mr-2 text-blue-500"/>
                                      {appointment.student?.email || 'N/A'}
                                    </p>
                                    {appointment.student?.phone && (
                                      <p className="text-gray-600 flex items-center">
                                        <Phone className="w-4 h-4 mr-2 text-green-500"/>
                                        {appointment.student.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="text-gray-700 flex items-center font-semibold text-lg mb-1">
                                      <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                                      {formatDateForDisplay(appointment.date || appointment.appointmentDate)}
                                    </p>
                                    <p className="text-gray-600 flex items-center">
                                      <Clock className="w-4 h-4 mr-2 text-purple-500" />
                                      {appointment.day} at {appointment.time}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div className={`inline-flex items-center px-4 py-2 rounded-2xl text-sm font-semibold border-2 shadow-sm ${
                                appointment.status === 'booked' || appointment.status === 'confirmed' 
                                  ? 'text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                                  : appointment.status === 'pending'
                                  ? 'text-yellow-700 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                                  : appointment.status === 'cancelled'
                                  ? 'text-red-700 bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                                  : 'text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  appointment.status === 'booked' || appointment.status === 'confirmed' ? 'bg-green-500' :
                                  appointment.status === 'pending' ? 'bg-yellow-500' :
                                  appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                                }`}></div>
                                <span className="capitalize">{appointment.status || 'Scheduled'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={() => cancelAppointment(appointment.id || appointment._id)}
                              className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-2xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold flex items-center space-x-2 group"
                            >
                              <XCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                        
                        {/* Additional Info Section */}
                        {(appointment.student?.subject || appointment.student?.message) && (
                          <div className="mt-6 p-6 bg-gradient-to-r from-gray-50/50 to-blue-50/50 backdrop-blur-sm rounded-2xl border border-gray-200/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {appointment.student?.subject && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                                    <BookOpen className="w-4 h-4 mr-2 text-purple-500" />
                                    Subject Focus
                                  </h4>
                                  <p className="text-gray-700 bg-white/70 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/50">
                                    {appointment.student.subject}
                                  </p>
                                </div>
                              )}
                              {appointment.student?.message && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />
                                    Session Notes
                                  </h4>
                                  <p className="text-gray-700 bg-white/70 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/50">
                                    {appointment.student.message}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {/* Enhanced Booking Modal */}
          {showBookingModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 rounded-t-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">Create New Session</h2>
                      <p className="text-blue-100">Schedule a personalized learning experience</p>
                    </div>
                    <button
                      onClick={closeBookingModal}
                      className="text-white/80 hover:text-white hover:bg-white/20 p-3 rounded-2xl transition-all duration-300"
                    >
                      <XCircle className="w-8 h-8" />
                    </button>
                  </div>
                </div>
                
                <div className="p-8 space-y-8">
                  {error && (
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <div>
                          <h4 className="font-semibold text-red-800">Validation Error</h4>
                          <p className="text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Day Selection */}
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-4">
                      Select Day <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {availabilityToShow.map(daySlot => (
                        <button
                          key={daySlot.day}
                          onClick={() => {
                            setSelectedDay(daySlot.day);
                            setSelectedTime('');
                          }}
                          className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 group
                            ${selectedDay === daySlot.day
                              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 text-blue-700 shadow-xl'
                              : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 text-gray-800'
                            }`}
                        >
                          <div className="text-center">
                            <div className="font-bold text-lg mb-2">{daySlot.day}</div>
                            <div className="text-sm text-gray-500 mb-2">{formatDateForDisplay(getNextDateForDay(daySlot.day))}</div>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              selectedDay === daySlot.day ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {daySlot.slots?.length || 0} slots
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection */}
                  {selectedDay && (
                    <div>
                      <label className="block text-lg font-semibold text-gray-800 mb-4">
                        Select Time <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {(() => {
                          const selectedDayData = availabilityToShow.find(day => day.day === selectedDay);
                          const availableSlots = selectedDayData?.slots || [];
                          
                          return availableSlots.length > 0 ? (
                            availableSlots.map((time, index) => (
                              <button
                                key={`${time}-${index}`}
                                onClick={() => setSelectedTime(time)}
                                className={`p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 group
                                  ${selectedTime === time
                                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 text-purple-700 shadow-lg'
                                    : 'border-gray-200 hover:border-purple-300 bg-white hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 text-gray-800'
                                  }`}
                              >
                                <Clock className="w-5 h-5 mx-auto mb-2 text-gray-500 group-hover:text-purple-500" />
                                <div className="text-sm font-semibold text-center">{time}</div>
                              </button>
                            ))
                          ) : (
                            <div className="col-span-full text-center py-8 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border-2 border-gray-200">
                              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500 font-medium">No available slots for {selectedDay}</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Student Information Form */}
                  <div className="bg-gradient-to-br from-gray-50/50 to-blue-50/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                      <User className="w-6 h-6 mr-3 text-blue-600" />
                      Student Information
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                        <input
                          type="text"
                          name="name"
                          placeholder="Student Full Name *"
                          value={studentInfo.name}
                          onChange={handleInputChange}
                          className="w-full p-4 pl-12 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/70 backdrop-blur-sm font-medium"
                          required
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                        <input
                          type="email"
                          name="email"
                          placeholder="Student Email Address *"
                          value={studentInfo.email}
                          onChange={handleInputChange}
                          className="w-full p-4 pl-12 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/70 backdrop-blur-sm font-medium"
                          required
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Phone Number (Optional)"
                          value={studentInfo.phone}
                          onChange={handleInputChange}
                          className="w-full p-4 pl-12 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/70 backdrop-blur-sm"
                        />
                      </div>
                      <div className="relative">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                        <input
                          type="text"
                          name="subject"
                          placeholder="Subject/Topic (Optional)"
                          value={studentInfo.subject}
                          onChange={handleInputChange}
                          className="w-full p-4 pl-12 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/70 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-6">
                      <textarea
                        name="message"
                        placeholder="Session agenda, learning objectives, or special requirements..."
                        value={studentInfo.message}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 resize-none bg-white/70 backdrop-blur-sm"
                      ></textarea>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={closeBookingModal}
                      className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAppointment}
                      disabled={loading || !selectedDay || !selectedTime || !studentInfo.name || !studentInfo.email}
                      className="flex-1 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span>Creating Session...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-6 h-6" />
                          <span>Create Appointment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Confirmation Modal */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-12 max-w-lg w-full text-center shadow-2xl border border-white/20">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                  Session Created!
                </h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  Your appointment has been successfully scheduled. The student will receive a confirmation notification shortly.
                </p>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold"
                >
                  Perfect!
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