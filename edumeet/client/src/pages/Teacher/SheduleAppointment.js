import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { apiMethods } from '../../services/api'; // Assuming this path is correct for your project structure

const TeacherSchedule = () => {
  // currentTeacher now also holds dynamic availability and a loading state for the modal
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
  const [activeTab, setActiveTab] = useState('appointments');
  const [loading, setLoading] = useState(false); // Global loading state for API calls
  const [error, setError] = useState('');

  // Valid day names for validation
  const VALID_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Helper function to get next date for a given day
  // This function is memoized with useCallback for performance.
  const getNextDateForDay = useCallback((dayName) => {
    if (!dayName || typeof dayName !== 'string') {
      console.error('Invalid day name (not a string):', dayName);
      // Return today's date if invalid day name
      return new Date().toISOString().split('T')[0]; 
    }

    const normalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
    
    if (!VALID_DAYS.includes(normalizedDay)) {
      console.error('Invalid day name:', dayName, 'normalized:', normalizedDay);
      // Return today's date if invalid day name
      return new Date().toISOString().split('T')[0];
    }
    
    const today = new Date();
    const targetDay = VALID_DAYS.indexOf(normalizedDay);
    const todayDay = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
    
    let daysUntilTarget = targetDay - todayDay;
    
    // If target day is today or has passed this week, get next week's date
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    
    return targetDate.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }, []); // Empty dependency array as it doesn't depend on any state/props

  // Helper function to format date for display
  // This function is memoized with useCallback for performance.
  const formatDateForDisplay = useCallback((dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) { // Check for invalid date
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

  // Provides a default set of availability slots for teachers.
  // This function is memoized with useCallback for performance.
  const getDefaultAvailability = useCallback(() => {
    return [
      { 
        day: 'Monday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM'
        ] 
      },
      { 
        day: 'Tuesday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM'
        ] 
      },
      { 
        day: 'Wednesday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM'
        ] 
      },
      { 
        day: 'Thursday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM'
        ] 
      },
      { 
        day: 'Friday', 
        slots: [
          '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM'
        ] 
      }
    ];
  }, []);

  // Processes and normalizes the current teacher's availability data.
  // This function is adapted from StudentSchedule's fetchTeacherAvailability for TeacherSchedule's currentTeacher.
  const processCurrentTeacherAvailability = useCallback((teacherData) => {
    if (!teacherData || !teacherData.availability) {
      console.log('Teacher data or availability is missing, using default.');
      return getDefaultAvailability();
    }

    try {
      // Check if availability is already in a valid object format
      if (Array.isArray(teacherData.availability)) {
        const validAvailability = teacherData.availability.filter(daySlot => {
          // Basic validation for daySlot structure
          if (!daySlot || typeof daySlot !== 'object') return false;
          if (!daySlot.day || typeof daySlot.day !== 'string') return false;
          // Ensure day name doesn't contain time components
          if (daySlot.day.includes(':') || daySlot.day.includes('AM') || daySlot.day.includes('PM')) return false;
          
          const normalizedDay = daySlot.day.charAt(0).toUpperCase() + daySlot.day.slice(1).toLowerCase();
          if (!VALID_DAYS.includes(normalizedDay)) return false;
          
          // Ensure slots is an array
          if (!Array.isArray(daySlot.slots)) daySlot.slots = [];
          
          // Update day name to normalized form
          daySlot.day = normalizedDay;
          return true;
        });
        
        if (validAvailability.length > 0) {
          console.log('Valid object-format availability found for current teacher:', validAvailability);
          return validAvailability;
        }
        
        // If not valid object format, check if it's an array of time strings and convert
        const timeSlots = teacherData.availability.filter(item => 
          typeof item === 'string' && (item.includes(':') || item.includes('AM') || item.includes('PM'))
        );
        
        if (timeSlots.length > 0) {
          console.log('Found time slots for current teacher, converting to weekly format:', timeSlots);
          
          const cleanTimeSlots = timeSlots.map(slot => {
            const parts = slot.split(' - ');
            if (parts.length === 2) {
              return `${parts[0].trim()} - ${parts[1].trim()}`;
            }
            return slot.trim();
          }).filter(time => time); // Filter out any empty strings
          
          const sortedSlots = cleanTimeSlots.sort((a, b) => {
            // Use a dummy date to compare times correctly
            const timeA = new Date(`2000/01/01 ${a}`);
            const timeB = new Date(`2000/01/01 ${b}`);
            return timeA - timeB;
          });
          
          // Create availability for all weekdays with the same sorted slots
          const weeklyAvailability = [];
          const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; // Assuming standard weekdays
          
          weekdays.forEach(day => {
            weeklyAvailability.push({
              day: day,
              slots: [...sortedSlots] // Use a copy of sorted slots
            });
          });
          
          console.log('Converted current teacher availability to weekly format:', weeklyAvailability);
          return weeklyAvailability;
        }
      }
      
      console.log('No valid custom availability found for current teacher, using default.');
      return getDefaultAvailability();
    } catch (error) {
      console.error('Error processing current teacher availability:', error);
      return getDefaultAvailability();
    }
  }, [getDefaultAvailability, VALID_DAYS]); // Dependencies: getDefaultAvailability, VALID_DAYS

  // Fetches appointments for the currently logged-in teacher.
  // This function is memoized with useCallback for performance.
  const fetchTeacherAppointments = useCallback(async () => {
    if (!currentTeacher || (!currentTeacher.id && !currentTeacher._id)) {
      console.warn("No current teacher ID available to fetch appointments.");
      setAppointments([]);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const teacherIdentifier = currentTeacher.id || currentTeacher._id;
      const response = await apiMethods.getTeacherAppointments(teacherIdentifier);
      const data = response.data;
      
      let appointmentsArray = [];
      if (Array.isArray(data)) {
        appointmentsArray = data;
      } else if (data && Array.isArray(data.appointments)) {
        appointmentsArray = data.appointments;
      } else if (data && Array.isArray(data.data)) {
        appointmentsArray = data.data;
      } else if (data && data.success && Array.isArray(data.data)) {
        appointmentsArray = data.data;
      } else {
        console.warn('Appointments API returned unexpected data format:', data);
        appointmentsArray = [];
      }
      
      setAppointments(appointmentsArray);
    } catch (error) {
      console.error('Error fetching teacher appointments:', error);
      setError('Failed to load appointments. Please try again.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [currentTeacher]); // Depends on currentTeacher

  // Effect hook to load teacher information from local storage on component mount.
  useEffect(() => {
    const teacherData = localStorage.getItem('teacher');
    if (teacherData) {
      try {
        const teacher = JSON.parse(teacherData);
        setCurrentTeacher(teacher);
      } catch (error) {
        console.error('Error parsing teacher data from localStorage:', error);
        setError('Unable to load teacher information. Please log in again.');
        setCurrentTeacher(null); // Clear teacher data if parsing fails
      }
    } else {
      setError('Please log in to access your schedule');
      setCurrentTeacher(null);
    }
  }, []);

  // Effect hook to fetch appointments once the currentTeacher state is set.
  useEffect(() => {
    if (currentTeacher) {
      fetchTeacherAppointments();
    }
  }, [currentTeacher, fetchTeacherAppointments]); // Add fetchTeacherAppointments to dependencies

  // Resets the booking form fields.
  // This function is memoized with useCallback for performance.
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
  }, []); // Empty dependency array as it doesn't depend on any state/props

  // Opens the booking modal and clears any previous errors.
  // Now also fetches/processes teacher availability dynamically.
  const openBookingModal = useCallback(async () => {
    if (!currentTeacher) {
      setError('Teacher data is not loaded. Cannot open booking modal.');
      return;
    }
    setShowBookingModal(true);
    setError('');
    
    // Temporarily update currentTeacher with a loading state for availability
    setCurrentTeacher(prev => ({ ...prev, availability: null, loadingAvailability: true }));
    
    try {
      const processedAvailability = await processCurrentTeacherAvailability(currentTeacher);
      setCurrentTeacher(prev => ({ ...prev, availability: processedAvailability, loadingAvailability: false }));
      
      if (!processedAvailability || processedAvailability.length === 0) {
        setError('No availability found for your schedule. Please set your availability.');
      }
    } catch (err) {
      console.error('Error processing teacher availability for modal:', err);
      setError('Failed to load your availability. Please try again.');
      setCurrentTeacher(prev => ({ ...prev, availability: getDefaultAvailability(), loadingAvailability: false }));
    }
  }, [currentTeacher, processCurrentTeacherAvailability, getDefaultAvailability]);

  // Closes the booking modal and resets the form.
  // This function is memoized with useCallback for performance.
  const closeBookingModal = useCallback(() => {
    setShowBookingModal(false);
    resetForm();
    // Reset currentTeacher's dynamic availability and loading state after modal closes
    setCurrentTeacher(prev => prev ? { ...prev, availability: undefined, loadingAvailability: false } : null);
  }, [resetForm]);

  // Handles the creation of a new appointment by the teacher on behalf of a student.
  const handleCreateAppointment = async () => {
    if (!currentTeacher) {
      setError('Teacher information not loaded. Please log in.');
      return;
    }
    if (!selectedDay || !selectedTime || !studentInfo.name || !studentInfo.email) {
      setError('Please select a day, time, and fill in student name and email.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const nextDate = getNextDateForDay(selectedDay);

      const appointmentData = {
        teacherId: currentTeacher.id || currentTeacher._id, // Use consistent ID access
        day: selectedDay,
        time: selectedTime,
        date: nextDate,
        student: {
          name: studentInfo.name.trim(),
          email: studentInfo.email.trim(),
          phone: studentInfo.phone.trim(), 
          subject: studentInfo.subject.trim(), 
          message: studentInfo.message.trim() 
        }
      };

      console.log('Creating appointment data:', appointmentData);

      const response = await apiMethods.bookAppointment(appointmentData);

      // Assuming response.data contains the newly created appointment object
      if (response.data) {
        setAppointments(prevAppointments => 
          Array.isArray(prevAppointments) ? [...prevAppointments, response.data] : [response.data]
        );
      }
      
      // A full refresh might be better to ensure all data is consistent with the backend
      await fetchTeacherAppointments(); 
      
      setShowBookingModal(false);
      setShowConfirmation(true);
      
      resetForm();

      // Automatically hide confirmation after 3 seconds
      setTimeout(() => setShowConfirmation(false), 3000);

    } catch (error) {
      console.error('Error creating appointment:', error);
      
      let errorMessage = 'Failed to create appointment. Please try again.';
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          // Join validation errors from the backend
          errorMessage = `Validation failed: ${error.response.data.errors.map(err => err.msg).join(', ')}`;
        } else {
          // Use a generic message from the backend if available
          errorMessage = error.response.data.message || errorMessage;
        }
      } else if (error.message) {
        // Use general JavaScript error message
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handles the cancellation of an appointment.
  const cancelAppointment = async (appointmentId) => {
    if (!appointmentId) {
      setError('No appointment ID provided for cancellation.');
      return;
    }
    try {
      setLoading(true);
      setError('');

      await apiMethods.cancelAppointment(appointmentId);

      // Optimistically update local state by filtering out the cancelled appointment
      setAppointments(prevAppointments => 
        Array.isArray(prevAppointments) 
          ? prevAppointments.filter(apt => (apt.id || apt._id) !== appointmentId)
          : []
      );
      // Optionally, you might want to refetch all appointments for full consistency:
      // await fetchTeacherAppointments();

    } catch (error) {
      console.error('Error canceling appointment:', error);
      let errorMessage = 'Failed to cancel appointment. Please try again.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handles changes in student information input fields.
  // This function is memoized with useCallback for performance.
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setStudentInfo(prev => ({ ...prev, [name]: value }));
  }, []);

  // Ensure appointments array is always an array for safe rendering
  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  // teacherAvailability will now be dynamically fetched/processed when modal opens
  // For other parts of the component outside the modal, we can still use the initial availability or default.
  const initialTeacherAvailability = currentTeacher?.availability && Array.isArray(currentTeacher.availability) && currentTeacher.availability.length > 0
    ? currentTeacher.availability
    : getDefaultAvailability();


  // Render a login prompt if teacher information is not available
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter"> {/* Added font-inter */}
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
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

        {/* Global Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 font-medium text-sm">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Close error alert"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading data...</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'appointments' 
                  ? 'bg-blue-600 text-white rounded-tl-2xl' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              My Appointments ({safeAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'create' 
                  ? 'bg-blue-600 text-white rounded-tr-2xl' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-5 h-5" />
              Create Appointment
            </button>
          </div>
        </div>

        {/* My Appointments Tab Content */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {safeAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No appointments yet!</h3>
                <p className="text-gray-500">It looks like you don't have any scheduled appointments.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center mx-auto"
                >
                  <Plus className="w-5 h-5 inline mr-2" /> Schedule Your First Appointment
                </button>
              </div>
            ) : (
              safeAppointments
                .sort((a, b) => new Date(a.date || a.appointmentDate) - new Date(b.date || b.appointmentDate)) // Sort by date
                .map(appointment => (
                <div key={appointment.id || appointment._id} className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-shadow duration-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                      <div className="bg-gradient-to-r from-green-400 to-blue-500 p-3 rounded-full flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">{appointment.student?.name || 'Unknown Student'}</h3>
                        <p className="text-gray-600 flex items-center text-sm mt-1"><Mail className="w-4 h-4 mr-1 text-gray-500"/> {appointment.student?.email || 'N/A'}</p>
                        <p className="text-gray-600 flex items-center text-sm"><Phone className="w-4 h-4 mr-1 text-gray-500"/> {appointment.student?.phone || 'N/A'}</p>
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
                      <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="capitalize">{appointment.status || 'Scheduled'}</span>
                      </div>
                      <button
                        onClick={() => cancelAppointment(appointment.id || appointment._id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm mt-3 sm:mt-0 shadow-md"
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

        {/* Create Appointment Tab Content */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Booking Modal */}
        {showBookingModal && currentTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100 opacity-100">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Create New Appointment</h2>
                <button
                  onClick={closeBookingModal}
                  className="text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded-full p-1"
                  aria-label="Close booking modal"
                >
                  <XCircle className="w-7 h-7" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      <span className="text-red-700 text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}
                
                {/* Day Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Day <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {currentTeacher.loadingAvailability ? (
                      <div className="col-span-full text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-500">Loading availability...</p>
                      </div>
                    ) : Array.isArray(currentTeacher.availability) && currentTeacher.availability.length > 0 ? (
                      currentTeacher.availability.map(daySlot => (
                        <button
                          key={daySlot.day}
                          onClick={() => {
                            setSelectedDay(daySlot.day);
                            setSelectedTime(''); // Reset time when day changes
                          }}
                          className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200 
                            ${selectedDay === daySlot.day
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white text-gray-800'
                            }`}
                        >
                          <div className="font-medium text-base">{daySlot.day}</div>
                          <div className="text-sm text-gray-500">{formatDateForDisplay(getNextDateForDay(daySlot.day))}</div>
                          <div className="text-xs text-gray-400 mt-1">{(daySlot.slots || []).length} slots</div>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No availability found for your schedule.</p>
                        <button
                          onClick={openBookingModal} // Retry loading availability
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Retry loading availability
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Time <span className="text-red-500">*</span></label>
                    {/* Changed grid-cols-3 to grid-cols-6 */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {currentTeacher.loadingAvailability ? (
                        <div className="col-span-full text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-500 text-sm">Loading times...</p>
                        </div>
                      ) : (() => {
                          const selectedDayData = Array.isArray(currentTeacher.availability) 
                            ? currentTeacher.availability.find(day => day.day === selectedDay)
                            : null;
                          
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
                                <div className="text-sm font-medium">{time}</div>
                              </button>
                            ))
                          ) : (
                            <div className="col-span-full text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">No available slots for {selectedDay}. Please choose another day.</p>
                            </div>
                          );
                        })()
                      }
                    </div>
                  </div>
                )}

                {/* Student Information Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Student Information</h3>
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
                        aria-label="Student Name"
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
                        aria-label="Student Email"
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
                        aria-label="Student Phone"
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
                        aria-label="Subject or Topic"
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
                    aria-label="Additional notes or agenda"
                  ></textarea>
                </div>

                {/* Action Buttons for Modal */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={closeBookingModal}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAppointment}
                    disabled={loading || !selectedDay || !selectedTime || !studentInfo.name || !studentInfo.email || currentTeacher.loadingAvailability}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 inline mr-2" /> Create Appointment
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
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl transform scale-105">
              <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border-4 border-green-200">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-3">Appointment Created! 🎉</h3>
              <p className="text-gray-600 mb-6 text-lg">
                The appointment has been successfully created and the student will be notified.
              </p>
              <button
                onClick={() => setShowConfirmation(false)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
              >
                Got It!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSchedule;