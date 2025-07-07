import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { teacherAPI, appointmentAPI } from '../../services/api'; // Adjust path as needed

const TeacherSchedule = () => {
  const [teachers, setTeachers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
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
  const [activeTab, setActiveTab] = useState('book');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Valid day names for validation
  const VALID_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Helper function to get next date for a given day
  const getNextDateForDay = (dayName) => {
    // Validate day name - handle both cases and potential undefined
    if (!dayName || typeof dayName !== 'string') {
      console.error('Invalid day name (not a string):', dayName);
      return new Date().toLocaleDateString('en-CA'); // Return today's date as fallback
    }

    // Normalize the day name to proper case
    const normalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
    
    if (!VALID_DAYS.includes(normalizedDay)) {
      console.error('Invalid day name:', dayName, 'normalized:', normalizedDay);
      return new Date().toLocaleDateString('en-CA'); // Return today's date as fallback
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
    
    return targetDate.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
  };

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await teacherAPI.getTeachers();
      
      // Handle different response formats
      let teachersArray = [];
      if (Array.isArray(data)) {
        teachersArray = data;
      } else if (data && Array.isArray(data.teachers)) {
        teachersArray = data.teachers;
      } else if (data && Array.isArray(data.data)) {
        teachersArray = data.data;
      } else if (data && data.success && Array.isArray(data.data)) {
        teachersArray = data.data;
      } else {
        console.warn('API returned unexpected data format:', data);
        teachersArray = [];
        setError('Teachers data format is invalid');
      }
      
      // Ensure each teacher has a valid ID and add default availability
      const validTeachers = teachersArray.filter(teacher => {
        const hasValidId = teacher.id || teacher._id;
        if (!hasValidId) {
          console.warn('Teacher missing ID:', teacher);
        }
        return hasValidId;
      }).map(teacher => ({
        ...teacher,
        // Add default availability if not present
        availability: teacher.availability || [
          { day: 'Monday', slots: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'] },
          { day: 'Tuesday', slots: ['9:00 AM', '11:00 AM', '1:00 PM', '4:00 PM'] },
          { day: 'Wednesday', slots: ['10:00 AM', '2:00 PM', '3:00 PM'] },
          { day: 'Thursday', slots: ['9:00 AM', '1:00 PM', '2:00 PM', '4:00 PM'] },
          { day: 'Friday', slots: ['9:00 AM', '10:00 AM', '11:00 AM', '3:00 PM'] }
        ]
      }));
      
      setTeachers(validTeachers);
    } catch (error) {
      setError('Failed to load teachers. Please try again.');
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await appointmentAPI.getAppointments();
      
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
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  const fetchTeacherAvailability = async (teacherId) => {
  try {
    // Since the availability endpoint doesn't exist, we'll use the teacher's embedded availability
    const teacher = teachers.find(t => (t.id || t._id) === teacherId);
    
    if (teacher && teacher.availability) {
      console.log('Raw teacher availability:', teacher.availability);
      
      // Check if availability is an array of strings (time slots)
      if (Array.isArray(teacher.availability)) {
        const timeSlots = teacher.availability.filter(item => 
          typeof item === 'string' && (item.includes(':') || item.includes('AM') || item.includes('PM'))
        );
        
        if (timeSlots.length > 0) {
          console.log('Found time slots, converting to weekly format:', timeSlots);
          
          // Convert time slot strings to just the start time
          const cleanTimeSlots = timeSlots.map(slot => {
            // Extract start time from "9:00 AM - 10:00 AM" format
            const startTime = slot.split(' - ')[0];
            return startTime;
          }).filter(time => time); // Remove any empty strings
          
          // Sort the time slots
          const sortedSlots = cleanTimeSlots.sort((a, b) => {
            const timeA = new Date(`2000/01/01 ${a}`);
            const timeB = new Date(`2000/01/01 ${b}`);
            return timeA - timeB;
          });
          
          // Distribute time slots across weekdays
          const slotsPerDay = Math.ceil(sortedSlots.length / 5);
          const weeklyAvailability = [];
          
          const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          
          for (let i = 0; i < weekdays.length; i++) {
            const daySlots = sortedSlots.slice(i * slotsPerDay, (i + 1) * slotsPerDay);
            if (daySlots.length > 0) {
              weeklyAvailability.push({
                day: weekdays[i],
                slots: daySlots
              });
            }
          }
          
          console.log('Converted to weekly availability:', weeklyAvailability);
          return weeklyAvailability;
        }
        
        // Check if it's already in the expected object format
        const validAvailability = teacher.availability.filter(daySlot => {
          // Check if daySlot has the expected structure
          if (!daySlot || typeof daySlot !== 'object') {
            return false;
          }
          
          // Check if day property exists and is a string
          if (!daySlot.day || typeof daySlot.day !== 'string') {
            return false;
          }
          
          // Check if it's a time slot instead of a day name
          if (daySlot.day.includes(':') || daySlot.day.includes('AM') || daySlot.day.includes('PM')) {
            return false;
          }
          
          const normalizedDay = daySlot.day.charAt(0).toUpperCase() + daySlot.day.slice(1).toLowerCase();
          if (!VALID_DAYS.includes(normalizedDay)) {
            return false;
          }
          
          // Normalize the day name
          daySlot.day = normalizedDay;
          
          // Ensure slots array exists
          if (!Array.isArray(daySlot.slots)) {
            daySlot.slots = [];
          }
          
          return true;
        });
        
        if (validAvailability.length > 0) {
          console.log('Valid object-format availability found:', validAvailability);
          return validAvailability;
        }
      }
    }
    
    console.log('Using default availability for teacher:', teacherId);
    // Return default availability if teacher not found or no valid availability
    return [
      { day: 'Monday', slots: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'] },
      { day: 'Tuesday', slots: ['9:00 AM', '11:00 AM', '1:00 PM', '4:00 PM'] },
      { day: 'Wednesday', slots: ['10:00 AM', '2:00 PM', '3:00 PM'] },
      { day: 'Thursday', slots: ['9:00 AM', '1:00 PM', '2:00 PM', '4:00 PM'] },
      { day: 'Friday', slots: ['9:00 AM', '10:00 AM', '11:00 AM', '3:00 PM'] }
    ];
  } catch (error) {
    console.error('Error fetching teacher availability:', error);
    // Return default availability on error
    return [
      { day: 'Monday', slots: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'] },
      { day: 'Tuesday', slots: ['9:00 AM', '11:00 AM', '1:00 PM', '4:00 PM'] },
      { day: 'Wednesday', slots: ['10:00 AM', '2:00 PM', '3:00 PM'] },
      { day: 'Thursday', slots: ['9:00 AM', '1:00 PM', '2:00 PM', '4:00 PM'] },
      { day: 'Friday', slots: ['9:00 AM', '10:00 AM', '11:00 AM', '3:00 PM'] }
    ];
  }
};
  // Load teachers and appointments on component mount
  useEffect(() => {
    fetchTeachers();
    fetchAppointments();
  }, []);

  const handleBookAppointment = async () => {
    if (!selectedTeacher || !selectedDay || !selectedTime || !studentInfo.name || !studentInfo.email) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Format the date properly
      const nextDate = getNextDateForDay(selectedDay);
      const formattedDate = nextDate; // Already in YYYY-MM-DD format

      // Ensure teacherId is properly formatted
      const teacherId = selectedTeacher.id || selectedTeacher._id;
      
      if (!teacherId) {
        throw new Error('Invalid teacher selected');
      }

      const appointmentData = {
        teacherId: teacherId,
        day: selectedDay,
        time: selectedTime,
        date: formattedDate,
        student: {
          name: studentInfo.name.trim(),
          email: studentInfo.email.trim(),
          phone: studentInfo.phone.trim() || '',
          subject: studentInfo.subject.trim() || '',
          message: studentInfo.message.trim() || ''
        }
      };

      console.log('Sending appointment data:', appointmentData);

      const response = await appointmentAPI.bookAppointment(appointmentData);

      // Update local state
      setAppointments(prevAppointments => 
        Array.isArray(prevAppointments) ? [...prevAppointments, response] : [response]
      );
      
      // Refresh data
      await fetchTeachers();
      await fetchAppointments();
      
      setShowBookingModal(false);
      setShowConfirmation(true);
      
      // Reset form
      resetForm();

      setTimeout(() => setShowConfirmation(false), 3000);

    } catch (error) {
      console.error('Error booking appointment:', error);
      
      // Handle different error types
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
          setError(`Validation failed: ${validationErrors}`);
        } else {
          setError(error.response.data.message || 'Failed to book appointment');
        }
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to book appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      setError('');

      await appointmentAPI.cancelAppointment(appointmentId);

      // Update local state
      setAppointments(prevAppointments => 
        Array.isArray(prevAppointments) 
          ? prevAppointments.filter(apt => (apt.id || apt._id) !== appointmentId)
          : []
      );
      
      // Refresh data
      await fetchTeachers();

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

  const openBookingModal = async (teacher) => {
    setSelectedTeacher(teacher);
    setShowBookingModal(true);
    setError('');
    
    // Show loading state
    setSelectedTeacher({ ...teacher, availability: null, loading: true });
    
    // Fetch fresh availability data
    try {
      const teacherId = teacher.id || teacher._id;
      const availability = await fetchTeacherAvailability(teacherId);
      setSelectedTeacher({ ...teacher, availability, loading: false });
      
      if (!availability || availability.length === 0) {
        setError('No availability found for this teacher');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Failed to load teacher availability');
      setSelectedTeacher({ ...teacher, availability: [], loading: false });
    }
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedTeacher(null);
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
  const safeTeachers = Array.isArray(teachers) ? teachers : [];
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">EduMeet</h1>
          <p className="text-gray-600">Schedule appointments with your teachers</p>
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
              onClick={() => setActiveTab('book')}
              className={`flex-1 py-4 px-6 rounded-tl-2xl transition-all duration-200 ${
                activeTab === 'book' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5 inline mr-2" />
              Book Appointment
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex-1 py-4 px-6 rounded-tr-2xl transition-all duration-200 ${
                activeTab === 'appointments' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-5 h-5 inline mr-2" />
              My Appointments ({safeAppointments.length})
            </button>
          </div>
        </div>

        {/* Book Appointment Tab */}
        {activeTab === 'book' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {safeTeachers.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl shadow-xl p-12 text-center">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No teachers available</h3>
                <p className="text-gray-500">Please check back later or contact support.</p>
              </div>
            ) : (
              safeTeachers.map(teacher => (
                <div key={teacher.id || teacher._id} className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="text-white">
                        <h3 className="text-xl font-bold">{teacher.name}</h3>
                        <p className="text-blue-100">{teacher.subject}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="text-sm">{teacher.email}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <span className="text-sm">{teacher.phone}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => openBookingModal(teacher)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                    >
                      Schedule Appointment
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* My Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {safeAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No appointments yet</h3>
                <p className="text-gray-500">Book your first appointment to get started!</p>
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
                        <h3 className="text-xl font-semibold text-gray-800">{appointment.teacherName}</h3>
                        <p className="text-gray-600">{appointment.appointmentDate}, {appointment.date}</p>
                        <p className="text-sm text-gray-500">{appointment.timeSlot} - {appointment.student?.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-5 h-5 mr-1" />
                        <span className="text-sm font-medium">{appointment.status}</span>
                      </div>
                      <button
                        onClick={() => cancelAppointment(appointment.id || appointment._id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && selectedTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Book Appointment</h2>
                  <button
                    onClick={closeBookingModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-blue-100 mt-2">with {selectedTeacher.name}</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Day Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Day</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedTeacher.loading ? (
                      <div className="col-span-full text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-500">Loading availability...</p>
                      </div>
                    ) : Array.isArray(selectedTeacher.availability) && selectedTeacher.availability.length > 0 ? (
                      selectedTeacher.availability.map(daySlot => (
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
                          <div className="text-sm text-gray-500">{getNextDateForDay(daySlot.day)}</div>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No availability found</p>
                        <button
                          onClick={() => openBookingModal(selectedTeacher)}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Retry loading
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Time</label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {selectedTeacher.loading ? (
                        <div className="col-span-full text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-500 text-sm">Loading times...</p>
                        </div>
                      ) : (() => {
                          const selectedDayData = Array.isArray(selectedTeacher.availability) 
                            ? selectedTeacher.availability.find(day => day.day === selectedDay)
                            : null;
                          
                          const availableSlots = selectedDayData?.slots || [];
                          
                          return availableSlots.length > 0 ? (
                            availableSlots.map(time => (
                              <button
                                key={time}
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
                        })()
                      }
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
                      placeholder="Your Name *"
                      value={studentInfo.name}
                      onChange={handleInputChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Your Email *"
                      value={studentInfo.email}
                      onChange={handleInputChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Your Phone"
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
                    placeholder="Additional message or questions..."
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
                    onClick={handleBookAppointment}
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Booking...' : 'Book Appointment'}
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
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h3>
              <p className="text-gray-600 mb-4">
                Your appointment has been successfully booked. You'll receive a confirmation email shortly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSchedule;