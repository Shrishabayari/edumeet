import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, Plus, Eye, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Import your actual API
import { apiMethods } from '../../services/api';

const AVAILABILITY_SLOTS = [
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM', 
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM',
  '5:00 PM - 6:00 PM'
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const StudentScheduleAppointment = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [teachers, setTeachers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  const [formData, setFormData] = useState({
    teacherId: '',
    teacherName: '',
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

  useEffect(() => {
    loadTeachers();
    loadAppointments();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await apiMethods.getAllTeachers();
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
      setSubmitStatus({ type: 'error', message: error.message || 'Failed to load teachers' });
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await apiMethods.getAllAppointments();
      setAppointments(response.data.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setSubmitStatus({ type: 'error', message: error.message || 'Failed to load appointments' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.teacherId) newErrors.teacherId = 'Please select a teacher';
    if (!formData.day) newErrors.day = 'Please select a day';
    if (!formData.time) newErrors.time = 'Please select a time slot';
    if (!formData.date) newErrors.date = 'Please select a date';
    else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Please select a future date';
      }
    }
    
    if (!formData.student.name) newErrors.studentName = 'Please enter your name';
    if (!formData.student.email) newErrors.studentEmail = 'Please enter your email';
    else if (!/\S+@\S+\.\S+/.test(formData.student.email)) {
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
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTeacherSelect = (teacherId) => {
    const selectedTeacher = teachers.find(t => t._id === teacherId);
    setFormData(prev => ({
      ...prev,
      teacherId,
      teacherName: selectedTeacher ? selectedTeacher.name : ''
    }));
    
    // Clear teacher selection error
    if (errors.teacherId) {
      setErrors(prev => ({ ...prev, teacherId: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setSubmitStatus({ type: 'error', message: 'Please fix the errors above' });
      return;
    }

    setLoading(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      // Use the API validation helper first
      const validation = apiMethods.validateAppointmentData(formData, false);
      if (!validation.isValid) {
        setSubmitStatus({ type: 'error', message: validation.errors.join(', ') });
        setLoading(false);
        return;
      }

      // Use the requestAppointment method from your API
      const response = await apiMethods.requestAppointment(formData);
      
      if (response.data.success) {
        setSubmitStatus({ type: 'success', message: response.data.message || 'Appointment request sent successfully!' });
        setFormData({
          teacherId: '',
          teacherName: '',
          day: '',
          time: '',
          date: '',
          student: { name: '', email: '', phone: '', subject: '', message: '' }
        });
        setErrors({});
        await loadAppointments();
        
        // Auto switch to appointments tab after successful submission
        setTimeout(() => {
          setActiveTab('appointments');
          setSubmitStatus({ type: '', message: '' });
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting appointment:', error);
      const errorMessage = error.message || 'Failed to request appointment';
      setSubmitStatus({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
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
    switch (status) {
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
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
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
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const viewAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  // Sort appointments by date (newest first)
  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Appointment</h1>
        <p className="text-gray-600">Book appointments with your teachers or view your scheduled meetings</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 max-w-md">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'schedule'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="h-4 w-4 inline-block mr-2" />
          New Appointment
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'appointments'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="h-4 w-4 inline-block mr-2" />
          My Appointments ({appointments.length})
        </button>
      </div>

      {/* Schedule New Appointment Tab */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Request New Appointment</h2>
            <p className="text-gray-600">Fill out the form below to request an appointment with a teacher. You'll receive a confirmation once the teacher approves your request.</p>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teacher Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Teacher *
              </label>
              <select
                name="teacherId"
                value={formData.teacherId}
                onChange={(e) => handleTeacherSelect(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.teacherId ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Choose a teacher...</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} - {teacher.department} ({teacher.subject})
                  </option>
                ))}
              </select>
              {errors.teacherId && <p className="mt-1 text-sm text-red-600">{errors.teacherId}</p>}
            </div>

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
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
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
                {AVAILABILITY_SLOTS.map((slot) => (
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
                Your Name *
              </label>
              <input
                type="text"
                name="student.name"
                value={formData.student.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.studentName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
                required
              />
              {errors.studentName && <p className="mt-1 text-sm text-red-600">{errors.studentName}</p>}
            </div>

            {/* Student Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="student.email"
                value={formData.student.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.studentEmail ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="your.email@example.com"
                required
              />
              {errors.studentEmail && <p className="mt-1 text-sm text-red-600">{errors.studentEmail}</p>}
            </div>

            {/* Student Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                name="student.phone"
                value={formData.student.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your phone number"
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
                placeholder="What would you like to discuss?"
              />
            </div>

            {/* Message */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                name="student.message"
                value={formData.student.message}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional information you'd like to share..."
              />
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </span>
                ) : (
                  'Request Appointment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-semibold text-gray-900">My Appointments</h2>
            <p className="text-gray-600 mt-2">View and manage your scheduled appointments</p>
          </div>

          <div className="p-6">
            {sortedAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
                <p className="text-gray-600 mb-4">You haven't scheduled any appointments.</p>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Schedule Your First Appointment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
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
                        <span className="text-sm font-medium truncate">{appointment.teacherName}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm">{appointment.day}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm">{appointment.time}</span>
                      </div>

                      <div className="text-xs text-gray-500">
                        {formatDate(appointment.date)}
                      </div>

                      {appointment.student.subject && (
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm truncate">{appointment.student.subject}</span>
                        </div>
                      )}
                    </div>

                    {appointment.teacherResponse?.responseMessage && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                        <div className="font-medium text-blue-800 mb-1">Teacher's Note:</div>
                        <div className="text-blue-700 text-xs">
                          {appointment.teacherResponse.responseMessage.length > 60 
                            ? `${appointment.teacherResponse.responseMessage.substring(0, 60)}...`
                            : appointment.teacherResponse.responseMessage
                          }
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                  <div className="p-3 bg-gray-50 rounded-md">
                    <label className="font-medium text-gray-700 block mb-1">Teacher</label>
                    <p className="text-gray-900">{selectedAppointment.teacherName}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-gray-700 block mb-1">Date</label>
                      <p className="text-gray-900">{formatDate(selectedAppointment.date)}</p>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-700 block mb-1">Day</label>
                      <p className="text-gray-900">{selectedAppointment.day}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Time</label>
                    <p className="text-gray-900">{selectedAppointment.time}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="font-medium text-gray-700 block mb-1">Student</label>
                      <p className="text-gray-900">{selectedAppointment.student.name}</p>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-700 block mb-1">Email</label>
                      <p className="text-gray-900">{selectedAppointment.student.email}</p>
                    </div>
                  </div>
                </div>

                {selectedAppointment.student.subject && (
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Subject</label>
                    <p className="text-sm text-gray-900">{selectedAppointment.student.subject}</p>
                  </div>
                )}

                {selectedAppointment.student.message && (
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Your Message</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedAppointment.student.message}</p>
                  </div>
                )}

                {selectedAppointment.teacherResponse?.responseMessage && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <label className="font-medium text-blue-800 block mb-1">Teacher's Response</label>
                    <p className="text-sm text-blue-700">{selectedAppointment.teacherResponse.responseMessage}</p>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Requested on: {new Date(selectedAppointment.createdAt).toLocaleString()}</div>
                    {selectedAppointment.teacherResponse?.respondedAt && (
                      <div>Teacher responded: {new Date(selectedAppointment.teacherResponse.respondedAt).toLocaleString()}</div>
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
                    onClick={closeModal}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Join Meeting
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentScheduleAppointment;