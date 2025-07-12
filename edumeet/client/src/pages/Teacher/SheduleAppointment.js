import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, AlertCircle, Plus, Edit } from 'lucide-react';
import { apiMethods } from '../../services/api';

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
  const [activeTab, setActiveTab] = useState('appointments');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Valid day names for validation
  const VALID_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get logged-in teacher info
  useEffect(() => {
    const teacherData = localStorage.getItem('teacher');
    if (teacherData) {
      try {
        const teacher = JSON.parse(teacherData);
        setCurrentTeacher(teacher);
      } catch (error) {
        console.error('Error parsing teacher data:', error);
        setError('Unable to load teacher information');
      }
    } else {
      setError('Please log in to access your schedule');
    }
  }, []);

  const getNextDateForDay = (dayName) => {
    if (!dayName || typeof dayName !== 'string') {
      console.error('Invalid day name (not a string):', dayName);
      return new Date().toISOString().split('T')[0];
    }

    const normalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
    
    if (!VALID_DAYS.includes(normalizedDay)) {
      console.error('Invalid day name:', dayName, 'normalized:', normalizedDay);
      return new Date().toISOString().split('T')[0];
    }
    
    const today = new Date();
    const targetDay = VALID_DAYS.indexOf(normalizedDay);
    const todayDay = today.getDay();
    
    let daysUntilTarget = targetDay - todayDay;
    
    // If target day is today or has passed this week, get next week's date
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    
    return targetDate.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getDefaultAvailability = () => {
    return [
      { 
        day: 'Monday', 
        slots: [
          '9:00 AM - 10:00 AM',
          '10:00 AM - 11:00 AM',
          '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM',
          '2:00 PM - 3:00 PM',
          '3:00 PM - 4:00 PM',
          '4:00 PM - 5:00 PM'
        ] 
      },
      { 
        day: 'Tuesday', 
        slots: [
          '9:00 AM - 10:00 AM',
          '10:00 AM - 11:00 AM',
          '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM',
          '2:00 PM - 3:00 PM',
          '3:00 PM - 4:00 PM',
          '4:00 PM - 5:00 PM'
        ] 
      },
      { 
        day: 'Wednesday', 
        slots: [
          '9:00 AM - 10:00 AM',
          '10:00 AM - 11:00 AM',
          '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM',
          '2:00 PM - 3:00 PM',
          '3:00 PM - 4:00 PM',
          '4:00 PM - 5:00 PM'
        ] 
      },
      { 
        day: 'Thursday', 
        slots: [
          '9:00 AM - 10:00 AM',
          '10:00 AM - 11:00 AM',
          '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM',
          '2:00 PM - 3:00 PM',
          '3:00 PM - 4:00 PM',
          '4:00 PM - 5:00 PM'
        ] 
      },
      { 
        day: 'Friday', 
        slots: [
          '9:00 AM - 10:00 AM',
          '10:00 AM - 11:00 AM',
          '11:00 AM - 12:00 PM',
          '1:00 PM - 2:00 PM',
          '2:00 PM - 3:00 PM',
          '3:00 PM - 4:00 PM',
          '4:00 PM - 5:00 PM'
        ] 
      }
    ];
  };

  // Fetch appointments for the current teacher only
  const fetchTeacherAppointments = async () => {
    if (!currentTeacher) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await apiMethods.getTeacherAppointments(currentTeacher.id || currentTeacher._id);
      const data = response.data;
      
      // Handle different response formats
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
      setError('Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Get teacher's availability
  const getTeacherAvailability = () => {
    if (!currentTeacher) return [];
    
    // Use teacher's availability if available, otherwise use default
    if (currentTeacher.availability && Array.isArray(currentTeacher.availability) && currentTeacher.availability.length > 0) {
      return currentTeacher.availability;
    }
    
    return getDefaultAvailability();
  };

  // Load appointments when teacher is loaded
  useEffect(() => {
    if (currentTeacher) {
      fetchTeacherAppointments();
    }
  }, [currentTeacher]);

  // Handle creating new appointment (teacher creates on behalf of student)
  const handleCreateAppointment = async () => {
    if (!currentTeacher || !selectedDay || !selectedTime || !studentInfo.name || !studentInfo.email) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Format the date properly
      const nextDate = getNextDateForDay(selectedDay);

      const appointmentData = {
        teacherId: currentTeacher.id || currentTeacher._id,
        day: selectedDay,
        time: selectedTime,
        date: nextDate,
        student: {
          name: studentInfo.name.trim(),
          email: studentInfo.email.trim(),
          phone: studentInfo.phone.trim() || '',
          subject: studentInfo.subject.trim() || '',
          message: studentInfo.message.trim() || ''
        }
      };

      console.log('Creating appointment data:', appointmentData);

      const response = await apiMethods.bookAppointment(appointmentData);

      // Update local state
      setAppointments(prevAppointments => 
        Array.isArray(prevAppointments) ? [...prevAppointments, response.data] : [response.data]
      );
      
      // Refresh appointments
      await fetchTeacherAppointments();
      
      setShowBookingModal(false);
      setShowConfirmation(true);
      
      // Reset form
      resetForm();

      setTimeout(() => setShowConfirmation(false), 3000);

    } catch (error) {
      console.error('Error creating appointment:', error);
      
      // Handle different error types
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
          setError(`Validation failed: ${validationErrors}`);
        } else {
          setError(error.response.data.message || 'Failed to create appointment');
        }
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to create appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      setError('');

      await apiMethods.cancelAppointment(appointmentId);

      // Update local state
      setAppointments(prevAppointments => 
        Array.isArray(prevAppointments) 
          ? prevAppointments.filter(apt => (apt.id || apt._id) !== appointmentId)
          : []
      );

    } catch (error) {
      setError('Failed to cancel appointment. Please try again.');
      console.error('Error canceling appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentInfo(prev => ({ ...prev, [name]: value }));
  };

  const openBookingModal = () => {
    setShowBookingModal(true);
    setError('');
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    resetForm();
  };

  const resetForm = () => {
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
  };

  // Ensure arrays are always arrays for safe rendering
  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const teacherAvailability = getTeacherAvailability();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Welcome, {currentTeacher.name}
              </h1>
              <p className="text-gray-600">Manage your appointments and schedule</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Subject: {currentTeacher.subject}</p>
              <p className="text-sm text-gray-500">Email: {currentTeacher.email}</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-xl mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex-1 py-4 px-6 rounded-tl-2xl transition-all duration-200 ${
                activeTab === 'appointments' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-5 h-5 inline mr-2" />
              My Appointments ({safeAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-4 px-6 rounded-tr-2xl transition-all duration-200 ${
                activeTab === 'create' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create Appointment
            </button>
          </div>
        </div>

        {/* My Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {safeAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No appointments yet</h3>
                <p className="text-gray-500">Create your first appointment to get started!</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Appointment
                </button>
              </div>
            ) : (
              safeAppointments.map(appointment => (
                <div key={appointment.id || appointment._id} className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-green-400 to-blue-500 p-3 rounded-full">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">{appointment.student?.name || 'Student'}</h3>
                        <p className="text-gray-600">{appointment.student?.email}</p>
                        <p className="text-gray-600">{formatDateForDisplay(appointment.date || appointment.appointmentDate)}</p>
                        <p className="text-sm text-gray-500">{appointment.day} at {appointment.time}</p>
                        {appointment.student?.subject && (
                          <p className="text-sm text-gray-500">Subject: {appointment.student.subject}</p>
                        )}
                        {appointment.student?.phone && (
                          <p className="text-sm text-gray-500">Phone: {appointment.student.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-5 h-5 mr-1" />
                        <span className="text-sm font-medium capitalize">{appointment.status || 'Scheduled'}</span>
                      </div>
                      <button
                        onClick={() => cancelAppointment(appointment.id || appointment._id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  {appointment.student?.message && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Message:</strong> {appointment.student.message}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Create Appointment Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Create New Appointment</h2>
              <button
                onClick={openBookingModal}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Appointment
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                <Calendar className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Schedule</h3>
                <p className="text-gray-600 text-sm">Create appointments for students quickly and efficiently</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
                <Clock className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Flexible Timing</h3>
                <p className="text-gray-600 text-sm">Choose from your available time slots</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <User className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Student Details</h3>
                <p className="text-gray-600 text-sm">Collect necessary student information</p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Create Appointment</h2>
                  <button
                    onClick={closeBookingModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-blue-100 mt-2">Schedule a new appointment</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Day Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Day</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {(teacherAvailability || []).map(daySlot => (
                      <button
                        key={daySlot.day}
                        onClick={() => {
                          setSelectedDay(daySlot.day);
                          setSelectedTime('');
                        }}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedDay === daySlot.day
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{daySlot.day}</div>
                        <div className="text-sm text-gray-500">{formatDateForDisplay(getNextDateForDay(daySlot.day))}</div>
                        <div className="text-xs text-gray-400">{(daySlot.slots || []).length} slots</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Time</label>
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                      {(() => {
                        const selectedDayData = (teacherAvailability || []).find(day => day.day === selectedDay);
                        const availableSlots = selectedDayData?.slots || [];
                        
                        return availableSlots.length > 0 ? (
                          availableSlots.map((time, index) => (
                            <button
                              key={`${time}-${index}`}
                              onClick={() => setSelectedTime(time)}
                              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                selectedTime === time
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Clock className="w-4 h-4 mx-auto mb-1" />
                              <div className="text-sm font-medium">{time}</div>
                            </button>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-4">
                            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No available slots for {selectedDay}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Student Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Student Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="name"
                      placeholder="Student Name *"
                      value={studentInfo.name}
                      onChange={handleInputChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Student Email *"
                      value={studentInfo.email}
                      onChange={handleInputChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Student Phone"
                      value={studentInfo.phone}
                      onChange={handleInputChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      name="subject"
                      placeholder="Subject/Topic"
                      value={studentInfo.subject}
                      onChange={handleInputChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <textarea
                    name="message"
                    placeholder="Additional notes or agenda..."
                    value={studentInfo.message}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  ></textarea>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeBookingModal}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAppointment}
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Appointment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Appointment Created!</h3>
              <p className="text-gray-600 mb-4">
                The appointment has been successfully created and the student will be notified.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSchedule;