import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, AlertCircle, Plus, MessageSquare, Filter, Search, RefreshCw } from 'lucide-react';

// Import the centralized API service
import { apiMethods, tokenManager, utils } from '../../services/api'; // Adjust path as needed

const TeacherAppointmentManager = () => {
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [responseModal, setResponseModal] = useState({ show: false, type: '', appointmentId: '' });
  const [responseMessage, setResponseMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Refs to prevent multiple simultaneous requests
  const fetchingPending = useRef(false);
  const fetchingAppointments = useRef(false);
  const mountedRef = useRef(true);
  const lastRefreshTime = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Enhanced teacher loading with token validation
  useEffect(() => {
    const loadTeacher = () => {
      // Check for teacher data in both storage types
      const teacher = tokenManager.getCurrentTeacher();
      const token = tokenManager.getTeacherToken();
      
      console.log('Loading teacher data:', { teacher, hasToken: !!token });
      
      if (!token) {
        setError('Please log in to access this page');
        return;
      }
      
      if (teacher) {
        console.log('Teacher loaded successfully:', teacher);
        if (mountedRef.current) {
          setCurrentTeacher(teacher);
        }
      } else {
        if (mountedRef.current) {
          setError('Unable to load teacher information. Please log in again.');
        }
      }
    };
    
    loadTeacher();
  }, []);

  // FIXED: Fetch pending requests with better error handling
  const fetchPendingRequests = useCallback(async () => {
    if (!currentTeacher?.id && !currentTeacher?._id) return;
    if (fetchingPending.current) {
      console.log('🔄 Pending request fetch already in progress, skipping...');
      return;
    }
    
    fetchingPending.current = true;
    
    try {
      const teacherId = currentTeacher.id || currentTeacher._id;
      console.log('Fetching pending requests for teacher:', teacherId);
      
      const response = await apiMethods.getTeacherPendingRequests(teacherId);
      console.log('Pending requests response:', response);
      
      if (!mountedRef.current) return;
      
      let requestsData = [];
      if (response?.data?.success && Array.isArray(response.data.data)) {
        requestsData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        requestsData = response.data;
      }
      
      setPendingRequests(requestsData);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      
      if (!mountedRef.current) return;
      
      const errorMessage = utils.extractErrorMessage(error);
      if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        setError('Authentication failed. Please log in again.');
        tokenManager.removeTeacherToken();
      } else {
        setError(`Failed to load pending requests: ${errorMessage}`);
      }
    } finally {
      fetchingPending.current = false;
    }
  }, [currentTeacher]);

  // FIXED: Fetch all appointments with better error handling
  const fetchAllAppointments = useCallback(async () => {
    if (!currentTeacher?.id && !currentTeacher?._id) return;
    if (fetchingAppointments.current) {
      console.log('🔄 Appointments fetch already in progress, skipping...');
      return;
    }
    
    fetchingAppointments.current = true;
    
    try {
      const teacherId = currentTeacher.id || currentTeacher._id;
      console.log('Fetching all appointments for teacher:', teacherId);
      
      const response = await apiMethods.getTeacherAppointments(teacherId);
      console.log('All appointments response:', response);
      
      if (!mountedRef.current) return;
      
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
      
      if (!mountedRef.current) return;
      
      const errorMessage = utils.extractErrorMessage(error);
      if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        setError('Authentication failed. Please log in again.');
        tokenManager.removeTeacherToken();
      } else {
        setError(`Failed to load appointments: ${errorMessage}`);
      }
    } finally {
      fetchingAppointments.current = false;
    }
  }, [currentTeacher]);

  // FIXED: Debounced data fetching with rate limiting
  useEffect(() => {
    if (!currentTeacher) return;

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;
    const minRefreshInterval = 2000; // 2 seconds minimum between refreshes

    if (timeSinceLastRefresh < minRefreshInterval) {
      console.log('Rate limiting: Skipping refresh, too soon since last refresh');
      return;
    }

    // Add delay to prevent multiple rapid requests
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        lastRefreshTime.current = now;
        // Fetch data sequentially to avoid overwhelming the server
        fetchPendingRequests().then(() => {
          if (mountedRef.current) {
            return new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
              return fetchAllAppointments();
            });
          }
        });
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentTeacher, fetchPendingRequests, fetchAllAppointments]);

  const showMessage = useCallback((message, type = 'success') => {
    if (!mountedRef.current) return;
    
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    setTimeout(() => {
      if (mountedRef.current) {
        setSuccess('');
        setError('');
      }
    }, 5000);
  }, []);

  // FIXED: Rate-limited refresh
  const refreshData = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;
    const minRefreshInterval = 3000; // 3 seconds minimum between manual refreshes

    if (timeSinceLastRefresh < minRefreshInterval) {
      showMessage('Please wait a moment before refreshing again to avoid rate limits.', 'error');
      return;
    }

    if (loading || fetchingPending.current || fetchingAppointments.current) {
      console.log('🔄 Refresh already in progress, skipping...');
      return;
    }

    try {
      setLoading(true);
      lastRefreshTime.current = now;
      
      // Sequential fetching to avoid rate limits
      await fetchPendingRequests();
      if (mountedRef.current) {
        await utils.delay(1000); // 1 second delay between requests
        await fetchAllAppointments();
      }
      
      showMessage('Data refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showMessage(`Failed to refresh data: ${utils.extractErrorMessage(error)}`, 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchPendingRequests, fetchAllAppointments, loading, showMessage]);

  // CRITICAL FIX: Enhanced appointment approval with proper error handling
  const handleApproveRequest = async (appointmentId, message = '') => {
    if (loading) {
      showMessage('Please wait for the current operation to complete.', 'error');
      return;
    }

    if (!utils.isValidAppointmentId(appointmentId)) {
      showMessage('Invalid appointment ID format.', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('=== APPROVING APPOINTMENT ===');
      console.log('Appointment ID:', appointmentId);
      console.log('Message:', message);
      console.log('Current teacher:', currentTeacher);
      
      // Use the simplified accept method
      const response = await apiMethods.acceptAppointmentRequest(appointmentId, message);
      console.log('✅ Appointment approved successfully:', response.data);
      
      showMessage('Appointment request approved successfully!');
      
      // Refresh data after a short delay
      setTimeout(() => {
        if (mountedRef.current) {
          refreshData();
        }
      }, 1500);
      
      // Close modal
      setResponseModal({ show: false, type: '', appointmentId: '' });
      setResponseMessage('');
      
    } catch (error) {
      console.error('❌ Error approving appointment:', error);
      
      const errorMessage = utils.extractErrorMessage(error);
      
      // Handle specific error cases
      if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        showMessage('Authentication failed. Please log in again.', 'error');
        tokenManager.removeTeacherToken();
      } else if (error.message?.includes('403')) {
        showMessage('You do not have permission to approve this appointment.', 'error');
      } else if (error.message?.includes('404')) {
        showMessage('Appointment not found. It may have been already processed.', 'error');
      } else if (error.message?.includes('409')) {
        showMessage('This appointment has already been processed by another action.', 'error');
      } else {
        showMessage(`Failed to approve appointment: ${errorMessage}`, 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // CRITICAL FIX: Enhanced appointment rejection with proper error handling
  const handleRejectRequest = async (appointmentId, message = '') => {
    if (loading) {
      showMessage('Please wait for the current operation to complete.', 'error');
      return;
    }

    if (!utils.isValidAppointmentId(appointmentId)) {
      showMessage('Invalid appointment ID format.', 'error');
      return;
    }

    if (!message || message.trim().length === 0) {
      showMessage('Please provide a reason for rejection.', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('=== REJECTING APPOINTMENT ===');
      console.log('Appointment ID:', appointmentId);
      console.log('Message:', message);
      console.log('Current teacher:', currentTeacher);
      
      // Use the simplified reject method
      const response = await apiMethods.rejectAppointmentRequest(appointmentId, message);
      console.log('✅ Appointment rejected successfully:', response.data);
      
      showMessage('Appointment request rejected successfully.');
      
      // Refresh data after a short delay
      setTimeout(() => {
        if (mountedRef.current) {
          refreshData();
        }
      }, 1500);
      
      // Close modal
      setResponseModal({ show: false, type: '', appointmentId: '' });
      setResponseMessage('');
      
    } catch (error) {
      console.error('❌ Error rejecting appointment:', error);
      
      const errorMessage = utils.extractErrorMessage(error);
      
      if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        showMessage('Authentication failed. Please log in again.', 'error');
        tokenManager.removeTeacherToken();
      } else if (error.message?.includes('403')) {
        showMessage('You do not have permission to reject this appointment.', 'error');
      } else if (error.message?.includes('404')) {
        showMessage('Appointment not found. It may have been already processed.', 'error');
      } else if (error.message?.includes('409')) {
        showMessage('This appointment has already been processed by another action.', 'error');
      } else {
        showMessage(`Failed to reject appointment: ${errorMessage}`, 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Cancel appointment
  const cancelAppointment = async (appointmentId) => {
    if (loading) {
      showMessage('Please wait for the current operation to complete.', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiMethods.cancelAppointment(appointmentId, 'Cancelled by teacher');
      showMessage('Appointment cancelled successfully');
      
      setTimeout(() => {
        if (mountedRef.current) {
          refreshData();
        }
      }, 1500);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      showMessage(`Failed to cancel appointment: ${utils.extractErrorMessage(error)}`, 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Complete appointment
  const completeAppointment = async (appointmentId) => {
    if (loading) {
      showMessage('Please wait for the current operation to complete.', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiMethods.completeAppointment(appointmentId);
      showMessage('Appointment marked as completed');
      
      setTimeout(() => {
        if (mountedRef.current) {
          refreshData();
        }
      }, 1500);
    } catch (error) {
      console.error('Error completing appointment:', error);
      showMessage(`Failed to complete appointment: ${utils.extractErrorMessage(error)}`, 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const openResponseModal = (type, appointmentId) => {
    if (!utils.isValidAppointmentId(appointmentId)) {
      showMessage('Invalid appointment ID.', 'error');
      return;
    }
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
                disabled={loading || fetchingPending.current || fetchingAppointments.current}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
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
              <p className="text-gray-600">Processing request...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait...</p>
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
                              {utils.formatDate(request.date || request.appointmentDate)}
                            </span>
                            <span className="flex items-center text-indigo-600 font-medium">
                              <Clock className="w-4 h-4 mr-1" />
                              {request.day} at {utils.formatTime(request.time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      <button
                        onClick={() => openResponseModal('approve', request.id || request._id)}
                        disabled={loading}
                        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => openResponseModal('reject', request.id || request._id)}
                        disabled={loading}
                        className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
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
                    Requested on: {utils.formatDate(request.createdAt)}
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
                                {utils.formatDate(appointment.date || appointment.appointmentDate)}
                              </span>
                              <span className="flex items-center text-indigo-600 font-medium">
                                <Clock className="w-4 h-4 mr-1" />
                                {appointment.day} at {utils.formatTime(appointment.time)}
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
                                disabled={loading}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => cancelAppointment(appointment.id || appointment._id)}
                                disabled={loading}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {(appointment.student?.subject || appointment.student?.message || appointment.teacherResponse?.responseMessage) && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {appointment.student?.subject && (
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Subject:</strong> {appointment.student.subject}
                          </p>
                        )}
                        {appointment.student?.message && (
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Student Message:</strong> {appointment.student.message}
                          </p>
                        )}
                        {appointment.teacherResponse?.responseMessage && (
                          <p className="text-sm text-gray-700">
                            <strong>Teacher Response:</strong> {appointment.teacherResponse.responseMessage}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500 flex justify-between">
                      <span>Created: {utils.formatDate(appointment.createdAt)}</span>
                      <span className="capitalize">By: {appointment.createdBy || 'student'}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Enhanced Response Modal */}
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
                
                {responseModal.type === 'reject' && responseMessage.trim().length === 0 && (
                  <p className="text-red-500 text-sm mt-2">
                    A reason for rejection is required.
                  </p>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={closeResponseModal}
                    disabled={loading}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleModalSubmit}
                    disabled={loading || (responseModal.type === 'reject' && responseMessage.trim().length === 0)}
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