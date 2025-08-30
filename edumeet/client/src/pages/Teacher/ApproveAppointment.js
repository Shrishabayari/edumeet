import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, AlertCircle, Filter, Search, RefreshCw } from 'lucide-react';
import { apiMethods } from '../../services/api';

const TeacherAppointmentManager = () => {
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [responseModal, setResponseModal] = useState({ show: false, type: '', appointmentId: '' });
  const [responseMessage, setResponseMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load teacher from localStorage
  useEffect(() => {
    const teacherData = localStorage.getItem('teacher');
    if (teacherData) {
      try {
        const teacher = JSON.parse(teacherData);
        console.log('Loaded teacher:', teacher);
        setCurrentTeacher(teacher);
      } catch (error) {
        console.error('Error parsing teacher data:', error);
        setError('Unable to load teacher information');
      }
    } else {
      setError('Please log in to access this page');
    }
  }, []);

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    if (!currentTeacher?.id && !currentTeacher?._id) return;
    
    try {
      setLoading(true);
      const teacherId = currentTeacher.id || currentTeacher._id;
      console.log('Fetching pending requests for teacher:', teacherId);
      
      const response = await apiMethods.getTeacherPendingRequests(teacherId);
      console.log('Pending requests response:', response);
      
      let requestsData = [];
      if (response?.data?.success && Array.isArray(response.data.data)) {
        requestsData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        requestsData = response.data;
      }
      
      setPendingRequests(requestsData);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setError('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  }, [currentTeacher]);

  // Fetch all appointments
  const fetchAllAppointments = useCallback(async () => {
    if (!currentTeacher?.id && !currentTeacher?._id) return;
    
    try {
      setLoading(true);
      const teacherId = currentTeacher.id || currentTeacher._id;
      console.log('Fetching all appointments for teacher:', teacherId);
      
      const response = await apiMethods.getTeacherAppointments(teacherId);
      console.log('All appointments response:', response);
      
      let appointmentsData = [];
      if (response?.data?.success && Array.isArray(response.data.data)) {
        appointmentsData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        appointmentsData = response.data;
      }
      
      // Filter out pending requests (they'll be shown separately)
      const nonPendingAppointments = appointmentsData.filter(apt => apt.status !== 'pending');
      setAppointments(nonPendingAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [currentTeacher]);

  // Fetch data when teacher is loaded
  useEffect(() => {
    if (currentTeacher) {
      fetchPendingRequests();
      fetchAllAppointments();
    }
  }, [currentTeacher, fetchPendingRequests, fetchAllAppointments]);

  const showMessage = useCallback((message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 5000);
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchPendingRequests(), fetchAllAppointments()]);
  }, [fetchPendingRequests, fetchAllAppointments]);

  // Handle appointment approval
  const handleApproveRequest = async (appointmentId, message = '') => {
    try {
      setLoading(true);
      console.log('Approving appointment:', appointmentId);
      
      await apiMethods.acceptAppointmentRequest(appointmentId, message);
      showMessage('Appointment request approved successfully!');
      
      // Refresh data
      await refreshData();
      setResponseModal({ show: false, type: '', appointmentId: '' });
      setResponseMessage('');
    } catch (error) {
      console.error('Error approving appointment:', error);
      showMessage(error.response?.data?.message || 'Failed to approve appointment', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle appointment rejection
  const handleRejectRequest = async (appointmentId, message = '') => {
    try {
      setLoading(true);
      console.log('Rejecting appointment:', appointmentId);
      
      await apiMethods.rejectAppointmentRequest(appointmentId, message);
      showMessage('Appointment request rejected');
      
      // Refresh data
      await refreshData();
      setResponseModal({ show: false, type: '', appointmentId: '' });
      setResponseMessage('');
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      showMessage(error.response?.data?.message || 'Failed to reject appointment', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment
  const cancelAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      await apiMethods.cancelAppointment(appointmentId, 'Cancelled by teacher');
      showMessage('Appointment cancelled successfully');
      await refreshData();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      showMessage('Failed to cancel appointment', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Complete appointment
  const completeAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      await apiMethods.completeAppointment(appointmentId);
      showMessage('Appointment marked as completed');
      await refreshData();
    } catch (error) {
      console.error('Error completing appointment:', error);
      showMessage('Failed to complete appointment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.includes(' - ') ? timeString.split(' - ')[0] : timeString;
  };

  const openResponseModal = (type, appointmentId) => {
    setResponseModal({ show: true, type, appointmentId });
    setResponseMessage('');
  };

  const closeResponseModal = () => {
    setResponseModal({ show: false, type: '', appointmentId: '' });
    setResponseMessage('');
  };

  const handleModalSubmit = () => {
    const { type, appointmentId } = responseModal;
    if (type === 'approve') {
      handleApproveRequest(appointmentId, responseMessage);
    } else if (type === 'reject') {
      handleRejectRequest(appointmentId, responseMessage);
    }
  };

  // Filter appointments based on search and status
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = !searchTerm || 
      apt.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.student?.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredPendingRequests = pendingRequests.filter(req => {
    const matchesSearch = !searchTerm || 
      req.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.student?.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Appointment Management
              </h1>
              <p className="text-gray-600">Welcome, {currentTeacher.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-700 font-medium">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 font-medium">{error}</span>
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

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'pending' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              Pending Requests ({filteredPendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              All Appointments ({filteredAppointments.length})
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by student name, email, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {activeTab === 'all' && (
                <div className="flex items-center gap-2">
                  <Filter className="text-gray-400 w-4 h-4" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="booked">Booked</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {filteredPendingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No pending requests!</h3>
                <p className="text-gray-500">All caught up! No student appointment requests to review.</p>
              </div>
            ) : (
              filteredPendingRequests.map(request => (
                <div key={request.id || request._id} className="bg-white rounded-2xl shadow-xl p-6 border border-orange-200">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-gradient-to-r from-orange-400 to-red-500 p-3 rounded-full">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">{request.student?.name || 'Unknown Student'}</h3>
                        <div className="space-y-1">
                          <p className="text-gray-600 flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2 text-gray-500"/>
                            {request.student?.email || 'N/A'}
                          </p>
                          {request.student?.phone && (
                            <p className="text-gray-600 flex items-center text-sm">
                              <Phone className="w-4 h-4 mr-2 text-gray-500"/>
                              {request.student.phone}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center text-blue-600 font-medium">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(request.date || request.appointmentDate)}
                            </span>
                            <span className="flex items-center text-indigo-600 font-medium">
                              <Clock className="w-4 h-4 mr-1" />
                              {request.day} at {formatTime(request.time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      <button
                        onClick={() => openResponseModal('approve', request.id || request._id)}
                        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => openResponseModal('reject', request.id || request._id)}
                        className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-md flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>

                  {(request.student?.subject || request.student?.message) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {request.student?.subject && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Subject:</strong> {request.student.subject}
                        </p>
                      )}
                      {request.student?.message && (
                        <p className="text-sm text-gray-700">
                          <strong>Message:</strong> {request.student.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500">
                    Requested on: {formatDate(request.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* All Appointments Tab */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No appointments found</h3>
                <p className="text-gray-500">No appointments match your current filters.</p>
              </div>
            ) : (
              filteredAppointments
                .sort((a, b) => new Date(a.date || a.appointmentDate) - new Date(b.date || b.appointmentDate))
                .map(appointment => (
                  <div key={appointment.id || appointment._id} className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-full">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">{appointment.student?.name || 'Unknown Student'}</h3>
                          <div className="space-y-1">
                            <p className="text-gray-600 flex items-center text-sm">
                              <Mail className="w-4 h-4 mr-2 text-gray-500"/>
                              {appointment.student?.email || 'N/A'}
                            </p>
                            {appointment.student?.phone && (
                              <p className="text-gray-600 flex items-center text-sm">
                                <Phone className="w-4 h-4 mr-2 text-gray-500"/>
                                {appointment.student.phone}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center text-blue-600 font-medium">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(appointment.date || appointment.appointmentDate)}
                              </span>
                              <span className="flex items-center text-indigo-600 font-medium">
                                <Clock className="w-4 h-4 mr-1" />
                                {appointment.day} at {formatTime(appointment.time)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                          appointment.status === 'confirmed' || appointment.status === 'booked'
                            ? 'text-green-600 bg-green-50 border-green-200'
                            : appointment.status === 'completed'
                            ? 'text-blue-600 bg-blue-50 border-blue-200'
                            : appointment.status === 'cancelled'
                            ? 'text-red-600 bg-red-50 border-red-200'
                            : appointment.status === 'rejected'
                            ? 'text-gray-600 bg-gray-50 border-gray-200'
                            : 'text-yellow-600 bg-yellow-50 border-yellow-200'
                        }`}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="capitalize">{appointment.status}</span>
                        </div>

                        <div className="flex gap-2">
                          {(appointment.status === 'confirmed' || appointment.status === 'booked') && (
                            <>
                              <button
                                onClick={() => completeAppointment(appointment.id || appointment._id)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => cancelAppointment(appointment.id || appointment._id)}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {(appointment.student?.subject || appointment.student?.message) && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {appointment.student?.subject && (
                          <p className="text-sm text-gray-700 mb-2">
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

                    <div className="mt-4 text-xs text-gray-500 flex justify-between">
                      <span>Created: {formatDate(appointment.createdAt)}</span>
                      <span className="capitalize">By: {appointment.createdBy || 'student'}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Response Modal */}
        {responseModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className={`p-6 rounded-t-2xl ${
                responseModal.type === 'approve' 
                  ? 'bg-gradient-to-r from-green-500 to-green-600' 
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {responseModal.type === 'approve' ? (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      Approve Request
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6" />
                      Reject Request
                    </>
                  )}
                </h2>
              </div>
              
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  {responseModal.type === 'approve' 
                    ? 'Add an optional message for the student:'
                    : 'Please provide a reason for rejection:'
                  }
                </p>
                
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder={
                    responseModal.type === 'approve' 
                      ? 'Optional message for the student...'
                      : 'Please explain why this request is being rejected...'
                  }
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={closeResponseModal}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleModalSubmit}
                    disabled={loading}
                    className={`flex-1 py-3 text-white rounded-lg transition-colors disabled:opacity-50 ${
                      responseModal.type === 'approve' 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {loading ? 'Processing...' : (
                      responseModal.type === 'approve' ? 'Approve' : 'Reject'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAppointmentManager;