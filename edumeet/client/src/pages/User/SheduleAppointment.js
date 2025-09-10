import React, { useState, useEffect } from 'react';
import { Clock, X, CheckCircle, XCircle, AlertCircle, Calendar, User, Mail, Phone, BookOpen, MessageSquare, ChevronRight } from 'lucide-react';
import UserNavbar from "../../components/userNavbar";
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
  const [activeTab] = useState('schedule');
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

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <UserNavbar />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Schedule Your Appointment
          </h1>
          <p className="text-xl text-gray-600  mx-auto leading-relaxed">
            Connect with your teachers seamlessly and book personalized consultation sessions
          </p>
        </div>

        {/* Main Content */}
        {activeTab === 'schedule' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
              <h2 className="text-2xl font-semibold text-white flex items-center">
                <BookOpen className="w-6 h-6 mr-3" />
                Book New Appointment
              </h2>
            </div>

            <div className="p-8">
              {submitStatus.message && (
                <div className={`mb-8 p-5 rounded-2xl border ${
                  submitStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {submitStatus.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{submitStatus.message}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                {/* Teacher Selection */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <label className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                    <User className="w-5 h-5 mr-2 text-indigo-600" />
                    Select Your Teacher *
                  </label>
                  <select
                    name="teacherId"
                    value={formData.teacherId}
                    onChange={(e) => handleTeacherSelect(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/70 backdrop-blur-sm ${
                      errors.teacherId ? 'border-red-300 ring-red-100' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    required
                  >
                    <option value="">Choose your teacher...</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name} - {teacher.department} ({teacher.subject})
                      </option>
                    ))}
                  </select>
                  {errors.teacherId && <p className="mt-2 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.teacherId}</p>}
                </div>

                {/* Schedule Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Day Selection */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                    <label className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                      <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                      Day *
                    </label>
                    <select
                      name="day"
                      value={formData.day}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/70 backdrop-blur-sm ${
                        errors.day ? 'border-red-300 ring-red-100' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      required
                    >
                      <option value="">Select day...</option>
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    {errors.day && <p className="mt-2 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.day}</p>}
                  </div>

                  {/* Time Selection */}
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border border-green-100">
                    <label className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                      <Clock className="w-5 h-5 mr-2 text-green-600" />
                      Time Slot *
                    </label>
                    <select
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white/70 backdrop-blur-sm ${
                        errors.time ? 'border-red-300 ring-red-100' : 'border-gray-200 hover:border-green-300'
                      }`}
                      required
                    >
                      <option value="">Select time...</option>
                      {AVAILABILITY_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                    {errors.time && <p className="mt-2 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.time}</p>}
                  </div>

                  {/* Date Selection */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                    <label className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                      <Calendar className="w-5 h-5 mr-2 text-amber-600" />
                      Date *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-white/70 backdrop-blur-sm ${
                        errors.date ? 'border-red-300 ring-red-100' : 'border-gray-200 hover:border-amber-300'
                      }`}
                      required
                    />
                    {errors.date && <p className="mt-2 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.date}</p>}
                  </div>
                </div>

                {/* Student Information */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <User className="w-6 h-6 mr-3 text-gray-600" />
                    Your Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Student Name */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 mr-2" />
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="student.name"
                        value={formData.student.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white ${
                          errors.studentName ? 'border-red-300 ring-red-100' : 'border-gray-200 hover:border-indigo-300'
                        }`}
                        placeholder="Enter your full name"
                        required
                      />
                      {errors.studentName && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.studentName}</p>}
                    </div>

                    {/* Student Email */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 mr-2" />
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="student.email"
                        value={formData.student.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white ${
                          errors.studentEmail ? 'border-red-300 ring-red-100' : 'border-gray-200 hover:border-indigo-300'
                        }`}
                        placeholder="your.email@example.com"
                        required
                      />
                      {errors.studentEmail && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.studentEmail}</p>}
                    </div>

                    {/* Student Phone */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <Phone className="w-4 h-4 mr-2" />
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        name="student.phone"
                        value={formData.student.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all duration-200 bg-white"
                        placeholder="Your phone number"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Subject/Topic (Optional)
                      </label>
                      <input
                        type="text"
                        name="student.subject"
                        value={formData.student.subject}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all duration-200 bg-white"
                        placeholder="What would you like to discuss?"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mt-6">
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Additional Message (Optional)
                    </label>
                    <textarea
                      name="student.message"
                      value={formData.student.message}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all duration-200 bg-white resize-none"
                      placeholder="Any additional information you'd like to share with your teacher..."
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center ${
                      loading ? 'opacity-50 cursor-not-allowed transform-none' : ''
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Submitting Request...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Schedule Appointment
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Details Modal */}
        {showModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Appointment Details</h3>
                  <button
                    onClick={closeModal}
                    className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    {getStatusIcon(selectedAppointment.status)}
                    <span className={`font-semibold text-lg ${getStatusColor(selectedAppointment.status)}`}>
                      {getStatusText(selectedAppointment.status)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <label className="font-semibold text-gray-800 block mb-2">Teacher</label>
                      <p className="text-gray-900 text-lg">{selectedAppointment.teacherName}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <label className="font-semibold text-gray-800 block mb-2">Date</label>
                        <p className="text-gray-900">{formatDate(selectedAppointment.date)}</p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <label className="font-semibold text-gray-800 block mb-2">Time</label>
                        <p className="text-gray-900">{selectedAppointment.time}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <label className="font-semibold text-gray-800 block mb-2">Student Information</label>
                      <div className="space-y-2">
                        <p className="text-gray-900"><span className="font-medium">Name:</span> {selectedAppointment.student.name}</p>
                        <p className="text-gray-900"><span className="font-medium">Email:</span> {selectedAppointment.student.email}</p>
                      </div>
                    </div>
                  </div>

                  {selectedAppointment.student.subject && (
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                      <label className="font-semibold text-gray-800 block mb-2">Subject</label>
                      <p className="text-gray-900">{selectedAppointment.student.subject}</p>
                    </div>
                  )}

                  {selectedAppointment.student.message && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="font-semibold text-gray-800 block mb-2">Your Message</label>
                      <p className="text-gray-900">{selectedAppointment.student.message}</p>
                    </div>
                  )}

                  {selectedAppointment.teacherResponse?.responseMessage && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <label className="font-semibold text-emerald-800 block mb-2">Teacher's Response</label>
                      <p className="text-emerald-700">{selectedAppointment.teacherResponse.responseMessage}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Requested: {new Date(selectedAppointment.createdAt).toLocaleString()}</div>
                      {selectedAppointment.teacherResponse?.respondedAt && (
                        <div>Response: {new Date(selectedAppointment.teacherResponse.respondedAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                  >
                    Close
                  </button>
                  {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'booked') && (
                    <button
                      onClick={closeModal}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-medium transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
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
    </div>
  );
};

export default StudentScheduleAppointment;