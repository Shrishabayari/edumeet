import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiMethods } from '../../services/api'; // Assuming this path is correct
import UserNavbar from "../../components/userNavbar";

// Valid day names for validation
const VALID_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper function to get next date for a given day
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

// Default availability to use if teacher's availability is not provided or invalid
const getDefaultAvailability = () => {
  return [
    {
      day: 'Monday',
      slots: ['9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM']
    },
    {
      day: 'Tuesday',
      slots: ['9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM']
    },
    {
      day: 'Wednesday',
      slots: ['9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM']
    },
    {
      day: 'Thursday',
      slots: ['9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM']
    },
    {
      day: 'Friday',
      slots: ['9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '1:00 PM - 2:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM']
    }
  ];
};

const BookAppointment = ({ onAppointmentBooked }) => {
  const [teachers, setTeachers] = useState([]);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiMethods.getAllTeachers();
      const data = response.data;

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

      const validTeachers = teachersArray.filter(teacher => {
        const hasValidId = teacher.id || teacher._id;
        if (!hasValidId) {
          console.warn('Teacher missing ID:', teacher);
        }
        return hasValidId;
      }).map(teacher => ({
        ...teacher,
        availability: teacher.availability && Array.isArray(teacher.availability) && teacher.availability.length > 0
          ? teacher.availability
          : getDefaultAvailability()
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

  // Availability fetching with comprehensive slot handling
  const fetchTeacherAvailability = async (teacherId) => {
    try {
      const teacher = teachers.find(t => (t.id || t._id) === teacherId);

      if (teacher && teacher.availability) {
        console.log('Raw teacher availability:', teacher.availability);

        if (Array.isArray(teacher.availability)) {
          const validAvailability = teacher.availability.filter(daySlot => {
            if (!daySlot || typeof daySlot !== 'object') return false;
            if (!daySlot.day || typeof daySlot.day !== 'string') return false;
            if (daySlot.day.includes(':') || daySlot.day.includes('AM') || daySlot.day.includes('PM')) return false;

            const normalizedDay = daySlot.day.charAt(0).toUpperCase() + daySlot.day.slice(1).toLowerCase();
            if (!VALID_DAYS.includes(normalizedDay)) return false;

            daySlot.day = normalizedDay;
            if (!Array.isArray(daySlot.slots)) daySlot.slots = [];

            return true;
          });

          if (validAvailability.length > 0) {
            console.log('Valid object-format availability found:', validAvailability);
            return validAvailability;
          }

          const timeSlots = teacher.availability.filter(item =>
            typeof item === 'string' && (item.includes(':') || item.includes('AM') || item.includes('PM'))
          );

          if (timeSlots.length > 0) {
            console.log('Found time slots, converting to weekly format:', timeSlots);

            const cleanTimeSlots = timeSlots.map(slot => {
              const parts = slot.split(' - ');
              if (parts.length === 2) {
                return `${parts[0].trim()} - ${parts[1].trim()}`;
              }
              return slot.trim();
            }).filter(time => time);

            const sortedSlots = cleanTimeSlots.sort((a, b) => {
              const timeA = new Date(`2000/01/01 ${a}`);
              const timeB = new Date(`2000/01/01 ${b}`);
              return timeA - timeB;
            });

            const weeklyAvailability = [];
            const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

            weekdays.forEach(day => {
              weeklyAvailability.push({
                day: day,
                slots: [...sortedSlots]
              });
            });

            console.log('Converted to weekly availability:', weeklyAvailability);
            return weeklyAvailability;
          }
        }
      }

      console.log('Using default availability for teacher:', teacherId);
      return getDefaultAvailability();
    } catch (error) {
      console.error('Error fetching teacher availability:', error);
      return getDefaultAvailability();
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleBookAppointment = async () => {
    if (!selectedTeacher || !selectedDay || !selectedTime || !studentInfo.name || !studentInfo.email) {
      setError('Please fill in all required fields (Name, Email, Day, and Time).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nextDate = getNextDateForDay(selectedDay);
      const teacherId = selectedTeacher.id || selectedTeacher._id;

      if (!teacherId) {
        throw new Error('Invalid teacher selected. Please try again.');
      }

      const appointmentData = {
        teacherId: teacherId,
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

      console.log('Sending appointment data:', appointmentData);

      const response = await apiMethods.bookAppointment(appointmentData);

      setShowBookingModal(false);
      setShowConfirmation(true);

      // Notify parent component of successful booking
      if (onAppointmentBooked) {
        onAppointmentBooked(response.data);
      }

      resetForm();
      setTimeout(() => setShowConfirmation(false), 3000);

    } catch (error) {
      console.error('Error booking appointment:', error);
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
          setError(`Validation failed: ${validationErrors}`);
        } else {
          setError(error.response.data.message || 'Failed to book appointment.');
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentInfo(prev => ({ ...prev, [name]: value }));
  };

  const openBookingModal = async (teacher) => {
    setSelectedTeacher(teacher);
    setShowBookingModal(true);
    setError('');

    // Show loading state for availability inside the modal
    setSelectedTeacher({ ...teacher, availability: null, loading: true });

    try {
      const teacherId = teacher.id || teacher._id;
      const availability = await fetchTeacherAvailability(teacherId);
      setSelectedTeacher({ ...teacher, availability, loading: false });

      if (!availability || availability.length === 0) {
        setError('No availability found for this teacher.');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Failed to load teacher availability.');
      setSelectedTeacher({ ...teacher, availability: getDefaultAvailability(), loading: false });
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

  const safeTeachers = Array.isArray(teachers) ? teachers : [];

  return (
    <>
      <UserNavbar/>
      <div className="p-4">
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

        {loading && !showBookingModal && ( // Only show global loader if modal isn't open
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading teachers...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {safeTeachers.length === 0 && !loading ? (
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

        {/* Booking Modal */}
        {showBookingModal && selectedTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                          <div className="text-sm text-gray-500">{getNextDateForDay(daySlot.day)}</div> {/* Display raw date for clarity */}
                          <div className="text-xs text-gray-400">{daySlot.slots.length} slots</div>
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
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
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
    </>
  );
};

export default BookAppointment;