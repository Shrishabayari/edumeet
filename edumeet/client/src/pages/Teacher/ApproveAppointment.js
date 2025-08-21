import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, 
  AlertCircle, Filter, Search, RefreshCw 
} from 'lucide-react';

// Use your real API client
import { apiMethods, tokenManager } from '../../services/api';

const TeacherAppointmentManager = () => {
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [responseModal, setResponseModal] = useState({ show: false, type: '', appointmentId: '' });
  const [responseMessage, setResponseMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Refs to prevent concurrent requests + track mount state
  const fetchingPending = useRef(false);
  const fetchingAppointments = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Helpers ------------------------------------------------------------
  const getErrCode = (err) => err?.response?.status || err?.status || null;
  const getErrMsg = (err) => err?.response?.data?.message || err?.message || 'Unknown error';

  const showMessage = useCallback((message, type = 'success') => {
    if (!mountedRef.current) return;
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    // Auto dismiss
    setTimeout(() => {
      if (mountedRef.current) {
        setSuccess('');
        setError('');
      }
    }, 5000);
  }, []);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString || 'N/A';
      return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch {
      return dateString || 'N/A';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.includes(' - ') ? timeString.split(' - ')[0] : timeString;
  };

  // Load teacher from storage or API ----------------------------------
  useEffect(() => {
    const loadTeacher = async () => {
      const token = tokenManager?.getTeacherToken?.();
      if (!token) {
        setError('Please log in to access this page');
        return;
      }

      // Try to get teacher from storage first
      let teacherData = tokenManager.getCurrentTeacher();
      if (teacherData && mountedRef.current) {
        setCurrentTeacher(teacherData);
        return;
      }

      // Fallback to API
      await fetchTeacherProfile();
    };

    loadTeacher();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      setLoading(true);
      const res = await apiMethods.getTeacherProfile();
      const teacher = res?.data?.data || res?.data?.user || res?.data || null;
      
      if (teacher && mountedRef.current) {
        setCurrentTeacher(teacher);
        // Store teacher data
        try { 
          localStorage.setItem('teacher', JSON.stringify(teacher)); 
        } catch (e) {
          console.warn('Failed to store teacher data:', e);
        }
      }
    } catch (err) {
      const code = getErrCode(err);
      const msg = getErrMsg(err);
      if (mountedRef.current) {
        if (code === 401) {
          setError('Authentication failed. Please log in again.');
          tokenManager?.removeTeacherToken?.();
        } else {
          setError('Failed to load teacher profile: ' + msg);
        }
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Fetch pending requests --------------------------------------------
  const fetchPendingRequests = useCallback(async () => {
    const teacherId = currentTeacher?.id || currentTeacher?._id;
    if (!teacherId) return;
    if (fetchingPending.current) return;
    
    fetchingPending.current = true;

    try {
      setLoading(true);
      const res = await apiMethods.getTeacherPendingRequests(teacherId);

      if (!mountedRef.current) return;
      
      // Handle different response structures
      let data = [];
      if (res?.data?.success && Array.isArray(res?.data?.data)) {
        data = res.data.data;
      } else if (Array.isArray(res?.data)) {
        data = res.data;
      } else if (res?.data && Array.isArray(res.data.appointments)) {
        data = res.data.appointments;
      }

      setPendingRequests(data || []);
    } catch (err) {
      if (!mountedRef.current) return;
      const code = getErrCode(err);
      const msg = getErrMsg(err);
      
      if (code === 401) {
        setError('Authentication failed. Please log in again.');
        tokenManager?.removeTeacherToken?.();
      } else if (msg?.toLowerCase?.().includes('cors') || msg?.toLowerCase?.().includes('failed to fetch')) {
        setError('Connection failed. Check server & CORS config.');
      } else if (code === 429 || msg?.toLowerCase?.().includes('too many requests')) {
        setError('Rate limit exceeded. Try again in a moment.');
      } else {
        setError('Failed to load pending requests: ' + msg);
      }
    } finally {
      fetchingPending.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [currentTeacher]);

  // Fetch all appointments --------------------------------------------
  const fetchAllAppointments = useCallback(async () => {
    const teacherId = currentTeacher?.id || currentTeacher?._id;
    if (!teacherId) return;
    if (fetchingAppointments.current) return;
    
    fetchingAppointments.current = true;

    try {
      setLoading(true);
      const res = await apiMethods.getTeacherAppointments(teacherId);

      if (!mountedRef.current) return;
      
      // Handle different response structures
      let data = [];
      if (res?.data?.success && Array.isArray(res?.data?.data)) {
        data = res.data.data;
      } else if (Array.isArray(res?.data)) {
        data = res.data;
      } else if (res?.data && Array.isArray(res.data.appointments)) {
        data = res.data.appointments;
      }

      // Exclude pending appointments; they live in their own tab
      const nonPending = (data || []).filter((apt) => apt?.status !== 'pending');
      setAppointments(nonPending);
    } catch (err) {
      if (!mountedRef.current) return;
      const code = getErrCode(err);
      const msg = getErrMsg(err);
      
      if (code === 401) {
        setError('Authentication failed. Please log in again.');
        tokenManager?.removeTeacherToken?.();
      } else if (msg?.toLowerCase?.().includes('cors') || msg?.toLowerCase?.().includes('failed to fetch')) {
        setError('Connection failed. Check server & CORS config.');
      } else if (code === 429 || msg?.toLowerCase?.().includes('too many requests')) {
        setError('Rate limit exceeded. Try again in a moment.');
      } else {
        setError('Failed to load appointments: ' + msg);
      }
    } finally {
      fetchingAppointments.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [currentTeacher]);

  // Debounced initial fetch when teacher is set -----------------------
  useEffect(() => {
    if (!currentTeacher) return;
    
    const timeout = setTimeout(() => {
      if (!mountedRef.current) return;
      
      // Fetch pending requests first, then appointments
      fetchPendingRequests().then(() => {
        if (mountedRef.current) {
          // Small delay to prevent rate limiting
          setTimeout(() => {
            if (mountedRef.current) {
              fetchAllAppointments();
            }
          }, 300);
        }
      });
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [currentTeacher, fetchPendingRequests, fetchAllAppointments]);

  // Actions ------------------------------------------------------------
  const refreshData = useCallback(async () => {
    if (loading || fetchingPending.current || fetchingAppointments.current) return;
    
    try {
      setLoading(true);
      await fetchPendingRequests();
      
      if (mountedRef.current) {
        // Small gap to be gentle on server
        await new Promise((r) => setTimeout(r, 500)); 
        await fetchAllAppointments();
      }
    } catch (err) {
      showMessage('Failed to refresh data: ' + getErrMsg(err), 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [loading, fetchPendingRequests, fetchAllAppointments, showMessage]);

  const handleApproveRequest = async (appointmentId, message = '') => {
    if (loading) {
      showMessage('Please wait for the current operation to complete.', 'error');
      return;
    }
    
    try {
      setLoading(true);
      await apiMethods.acceptAppointmentRequest(appointmentId, message);
      showMessage('Appointment request approved successfully!');
      
      setResponseModal({ show: false, type: '', appointmentId: '' });
      setResponseMessage('');
      
      // Refresh data after successful operation
      setTimeout(() => {
        if (mountedRef.current) refreshData();
      }, 500);
    } catch (err) {
      const code = getErrCode(err);
      const msg = getErrMsg(err);
      let errorMessage = 'Failed to approve appointment';
      
      if (code === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        tokenManager?.removeTeacherToken?.();
      } else if (code === 403) {
        errorMessage = 'You do not have permission to approve this appointment.';
      } else if (code === 404) {
        errorMessage = 'Appointment not found. It may have been processed already.';
      } else if (code === 400) {
        errorMessage = msg || 'Invalid request data.';
      } else if (msg?.toLowerCase?.().includes('cors') || msg?.toLowerCase?.().includes('failed to fetch')) {
        errorMessage = 'Connection failed. Check server & CORS config.';
      } else if (code === 429 || msg?.toLowerCase?.().includes('too many requests')) {
        errorMessage = 'Rate limit exceeded. Please try again shortly.';
      } else {
        errorMessage = msg || errorMessage;
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleRejectRequest = async (appointmentId, message = '') => {
    if (loading) {
      showMessage('Please wait for the current operation to complete.', 'error');
      return;
    }
    
    try {
      setLoading(true);
      await apiMethods.rejectAppointmentRequest(appointmentId, message || 'Request rejected by teacher');
      showMessage('Appointment request rejected');
      
      setResponseModal({ show: false, type: '', appointmentId: '' });
      setResponseMessage('');
      
      // Refresh data after successful operation
      setTimeout(() => {
        if (mountedRef.current) refreshData();
      }, 500);
    } catch (err) {
      const code = getErrCode(err);
      const msg = getErrMsg(err);
      let errorMessage = 'Failed to reject appointment';
      
      if (code === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        tokenManager?.removeTeacherToken?.();
      } else if (code === 403) {
        errorMessage = 'You do not have permission to reject this appointment.';
      } else if (code === 404) {
        errorMessage = 'Appointment not found. It may have been processed already.';
      } else if (code === 400) {
        errorMessage = msg || 'Invalid request data.';
      } else if (msg?.toLowerCase?.().includes('cors') || msg?.toLowerCase?.().includes('failed to fetch')) {
        errorMessage = 'Connection failed. Check server & CORS config.';
      } else if (code === 429 || msg?.toLowerCase?.().includes('too many requests')) {
        errorMessage = 'Rate limit exceeded. Please try again shortly.';
      } else {
        errorMessage = msg || errorMessage;
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

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
        if (mountedRef.current) refreshData();
      }, 500);
    } catch (err) {
      const code = getErrCode(err);
      const msg = getErrMsg(err);
      let errorMessage = 'Failed to cancel appointment';
      
      if (msg?.toLowerCase?.().includes('cors') || msg?.toLowerCase?.().includes('failed to fetch')) {
        errorMessage = 'Connection failed. Check server & CORS config.';
      } else if (code === 429 || msg?.toLowerCase?.().includes('too many requests')) {
        errorMessage = 'Rate limit exceeded. Please try again shortly.';
      } else {
        errorMessage = 'Failed to cancel appointment: ' + (msg || 'Unknown error');
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

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
        if (mountedRef.current) refreshData();
      }, 500);
    } catch (err) {
      const code = getErrCode(err);
      const msg = getErrMsg(err);
      let errorMessage = 'Failed to complete appointment';
      
      if (msg?.toLowerCase?.().includes('cors') || msg?.toLowerCase?.().includes('failed to fetch')) {
        errorMessage = 'Connection failed. Check server & CORS config.';
      } else if (code === 429 || msg?.toLowerCase?.().includes('too many requests')) {
        errorMessage = 'Rate limit exceeded. Please try again shortly.';
      } else {
        errorMessage = 'Failed to complete appointment: ' + (msg || 'Unknown error');
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
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
    if (!appointmentId) return;
    
    if (type === 'approve') {
      handleApproveRequest(appointmentId, responseMessage);
    } else if (type === 'reject') {
      handleRejectRequest(appointmentId, responseMessage);
    }
  };

  // Derived / filtered lists ------------------------------------------
  const filteredPendingRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (pendingRequests || []).filter((req) => {
      if (!q) return true;
      
      const studentName = req?.student?.name || req?.studentName || '';
      const studentEmail = req?.student?.email || req?.studentEmail || '';
      const subject = req?.student?.subject || req?.subject || '';
      
      return (
        studentName.toLowerCase().includes(q) ||
        studentEmail.toLowerCase().includes(q) ||
        subject.toLowerCase().includes(q)
      );
    });
  }, [pendingRequests, searchTerm]);

  const filteredAppointments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = (appointments || []).filter((apt) => {
      const studentName = apt?.student?.name || apt?.studentName || '';
      const studentEmail = apt?.student?.email || apt?.studentEmail || '';
      const subject = apt?.student?.subject || apt?.subject || '';
      
      const matchesSearch = !q || (
        studentName.toLowerCase().includes(q) ||
        studentEmail.toLowerCase().includes(q) ||
        subject.toLowerCase().includes(q)
      );
      
      const matchesStatus = filterStatus === 'all' || apt?.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // Sort by date ascending
    list = list.sort((a, b) => {
      const dateA = new Date(a?.date || a?.appointmentDate || 0);
      const dateB = new Date(b?.date || b?.appointmentDate || 0);
      return dateA - dateB;
    });
    
    return list;
  }, [appointments, searchTerm, filterStatus]);

  // UI -----------------------------------------------------------------
  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in as a teacher to access this page.</p>
          <button
            onClick={() => (window.location.href = '/teacher/login')}
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
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Appointment Management</h1>
              <p className="text-gray-600">Welcome, {currentTeacher?.name || 'Teacher'}</p>
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

        {/* Success / Error banners */}
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
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {(fetchingPending.current || fetchingAppointments.current) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-500 mr-2" />
              <span className="text-yellow-700 font-medium">Loading data... Please wait to avoid rate limits.</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'pending' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              Pending Requests ({filteredPendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
              <p className="text-gray-600">Processing request...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait to avoid rate limits</p>
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
              filteredPendingRequests.map((request) => (
                <div key={request?._id || request?.id} className="bg-white rounded-2xl shadow-xl p-6 border border-orange-200">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-gradient-to-r from-orange-400 to-red-500 p-3 rounded-full">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                          {request?.student?.name || request?.studentName || 'Unknown Student'}
                        </h3>
                        <div className="space-y-1">
                          <p className="text-gray-600 flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2 text-gray-500" />
                            {request?.student?.email || request?.studentEmail || 'N/A'}
                          </p>
                          {(request?.student?.phone || request?.studentPhone) && (
                            <p className="text-gray-600 flex items-center text-sm">
                              <Phone className="w-4 h-4 mr-2 text-gray-500" />
                              {request?.student?.phone || request?.studentPhone}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center text-blue-600 font-medium">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(request?.date || request?.appointmentDate)}
                            </span>
                            <span className="flex items-center text-indigo-600 font-medium">
                              <Clock className="w-4 h-4 mr-1" />
                              {request?.day} at {formatTime(request?.time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      <button
                        onClick={() => openResponseModal('approve', request?._id || request?.id)}
                        disabled={loading}
                        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => openResponseModal('reject', request?._id || request?.id)}
                        disabled={loading}
                        className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>

                  {(request?.student?.subject || request?.subject || request?.student?.message || request?.message) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {(request?.student?.subject || request?.subject) && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Subject:</strong> {request?.student?.subject || request?.subject}
                        </p>
                      )}
                      {(request?.student?.message || request?.message) && (
                        <p className="text-sm text-gray-700">
                          <strong>Message:</strong> {request?.student?.message || request?.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500">Requested on: {formatDate(request?.createdAt)}</div>
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
              filteredAppointments.map((appointment) => (
                <div key={appointment?._id || appointment?.id} className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-full">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                          {appointment?.student?.name || appointment?.studentName || 'Unknown Student'}
                        </h3>
                        <div className="space-y-1">
                          <p className="text-gray-600 flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2 text-gray-500" />
                            {appointment?.student?.email || appointment?.studentEmail || 'N/A'}
                          </p>
                          {(appointment?.student?.phone || appointment?.studentPhone) && (
                            <p className="text-gray-600 flex items-center text-sm">
                              <Phone className="w-4 h-4 mr-2 text-gray-500" />
                              {appointment?.student?.phone || appointment?.studentPhone}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center text-blue-600 font-medium">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(appointment?.date || appointment?.appointmentDate)}
                            </span>
                            <span className="flex items-center text-indigo-600 font-medium">
                              <Clock className="w-4 h-4 mr-1" />
                              {appointment?.day} at {formatTime(appointment?.time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div
                        className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                          appointment?.status === 'confirmed' || appointment?.status === 'booked'
                            ? 'text-green-600 bg-green-50 border-green-200'
                            : appointment?.status === 'completed'
                            ? 'text-blue-600 bg-blue-50 border-blue-200'
                            : appointment?.status === 'cancelled'
                            ? 'text-red-600 bg-red-50 border-red-200'
                            : appointment?.status === 'rejected'
                            ? 'text-gray-600 bg-gray-50 border-gray-200'
                            : 'text-yellow-600 bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="capitalize">{appointment?.status}</span>
                      </div>

                      <div className="flex gap-2">
                        {(appointment?.status === 'confirmed' || appointment?.status === 'booked') && (
                          <>
                            <button
                              onClick={() => completeAppointment(appointment?._id || appointment?.id)}
                              disabled={loading}
                              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => cancelAppointment(appointment?._id || appointment?.id)}
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

                  {(appointment?.student?.subject || appointment?.subject || appointment?.student?.message || appointment?.message) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {(appointment?.student?.subject || appointment?.subject) && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Subject:</strong> {appointment?.student?.subject || appointment?.subject}
                        </p>
                      )}
                      {(appointment?.student?.message || appointment?.message) && (
                        <p className="text-sm text-gray-700">
                          <strong>Message:</strong> {appointment?.student?.message || appointment?.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500 flex justify-between">
                    <span>Created: {formatDate(appointment?.createdAt)}</span>
                    <span className="capitalize">By: {appointment?.createdBy || 'student'}</span>
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
              <div
                className={`p-6 rounded-t-2xl ${
                  responseModal.type === 'approve'
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {responseModal.type === 'approve' ? (
                    <>
                      <CheckCircle className="w-6 h-6" /> Approve Request
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6" /> Reject Request
                    </>
                  )}
                </h2>
              </div>

              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  {responseModal.type === 'approve'
                    ? 'Add an optional message for the student:'
                    : 'Please provide a reason for rejection:'}
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
                    disabled={loading}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleModalSubmit}
                    disabled={loading}
                    className={`flex-1 py-3 text-white rounded-lg transition-colors disabled:opacity-50 ${
                      responseModal.type === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {loading ? 'Processing...' : responseModal.type === 'approve' ? 'Approve' : 'Reject'}
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