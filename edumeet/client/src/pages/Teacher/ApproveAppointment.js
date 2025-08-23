import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Calendar, Clock, User, Mail, Phone, BookOpen, CheckCircle, XCircle, 
  AlertCircle, Filter, Search, RefreshCw, MessageSquare, Send, X
} from 'lucide-react';

// Import your actual API methods
import { apiMethods, tokenManager } from '../../services/api';

const TeacherAppointmentApprovalSystem = () => {
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states for approve/reject
  const [approvalModal, setApprovalModal] = useState({
    show: false,
    type: '', // 'approve' | 'reject'
    appointment: null
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [processingRequest, setProcessingRequest] = useState(null);

  // Refs for component lifecycle management
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Utility functions
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
    
    // Auto-dismiss after 5 seconds
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
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString || 'N/A';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.includes(' - ') ? timeString.split(' - ')[0] : timeString;
  };

  // Load teacher from storage or API
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

  // Fetch pending requests using your API
  const fetchPendingRequests = useCallback(async () => {
    const teacherId = currentTeacher?.id || currentTeacher?._id;
    if (!teacherId || fetchingRef.current) return;
    
    fetchingRef.current = true;

    try {
      setLoading(true);
      
      // Use your API method for getting teacher's pending requests
      const res = await apiMethods.getTeacherPendingRequests();

      if (!mountedRef.current) return;
      
      // Handle different response structures from your API
      let data = [];
      if (res?.data?.success && Array.isArray(res?.data?.data)) {
        data = res.data.data;
      } else if (Array.isArray(res?.data)) {
        data = res.data;
      } else if (res?.data && Array.isArray(res.data.appointments)) {
        data = res.data.appointments;
      }

      setPendingRequests(data || []);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Loaded pending requests:', data?.length || 0);
      }
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
      } else if (code === 404) {
        // No pending requests found - this is normal
        setPendingRequests([]);
        console.log('No pending requests found');
      } else {
        setError('Failed to load pending requests: ' + msg);
        console.error('Error fetching pending requests:', err);
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [currentTeacher]);

  // Load pending requests when teacher is available
  useEffect(() => {
    if (currentTeacher) {
      // Small delay to prevent rate limiting
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          fetchPendingRequests();
        }
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [currentTeacher, fetchPendingRequests]);

  // Approve appointment request using your API
  const handleApproveRequest = async (appointment, message = '') => {
    if (!appointment?._id && !appointment?.id) {
      showMessage('Invalid appointment data', 'error');
      return;
    }

    const appointmentId = appointment._id || appointment.id;
    setProcessingRequest(appointmentId);

    try {
      // Use your API method for accepting appointment requests
      await apiMethods.acceptAppointmentRequest(appointmentId, message.trim());
      
      if (mountedRef.current) {
        showMessage(`Appointment with ${appointment.student?.name || appointment.studentName || 'student'} approved successfully!`);
        
        // Remove approved request from list
        setPendingRequests(prev => prev.filter(req => (req._id || req.id) !== appointmentId));
        
        // Close modal
        setApprovalModal({ show: false, type: '', appointment: null });
        setResponseMessage('');
        
        // Log success for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Appointment approved:', appointmentId);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
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
          // Remove from local list if not found
          setPendingRequests(prev => prev.filter(req => (req._id || req.id) !== appointmentId));
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
        console.error('Approve error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setProcessingRequest(null);
      }
    }
  };

  // Reject appointment request using your API
  const handleRejectRequest = async (appointment, message = '') => {
    if (!appointment?._id && !appointment?.id) {
      showMessage('Invalid appointment data', 'error');
      return;
    }

    if (!message.trim()) {
      showMessage('Please provide a reason for rejection', 'error');
      return;
    }

    const appointmentId = appointment._id || appointment.id;
    setProcessingRequest(appointmentId);

    try {
      // Use your API method for rejecting appointment requests
      await apiMethods.rejectAppointmentRequest(appointmentId, message.trim());
      
      if (mountedRef.current) {
        showMessage(`Appointment with ${appointment.student?.name || appointment.studentName || 'student'} rejected`);
        
        // Remove rejected request from list
        setPendingRequests(prev => prev.filter(req => (req._id || req.id) !== appointmentId));
        
        // Close modal
        setApprovalModal({ show: false, type: '', appointment: null });
        setResponseMessage('');
        
        // Log success for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Appointment rejected:', appointmentId);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
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
          // Remove from local list if not found
          setPendingRequests(prev => prev.filter(req => (req._id || req.id) !== appointmentId));
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
        console.error('Reject error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setProcessingRequest(null);
      }
    }
  };

  // Modal management
  const openApprovalModal = (type, appointment) => {
    setApprovalModal({ show: true, type, appointment });
    setResponseMessage('');
  };

  const closeApprovalModal = () => {
    setApprovalModal({ show: false, type: '', appointment: null });
    setResponseMessage('');
  };

  const handleModalSubmit = () => {
    const { type, appointment } = approvalModal;
    if (!appointment) return;
    
    if (type === 'approve') {
      handleApproveRequest(appointment, responseMessage);
    } else if (type === 'reject') {
      handleRejectRequest(appointment, responseMessage);
    }
  };

  // Quick action buttons (bypass modal for simple approve)
  const handleQuickApprove = async (appointment) => {
    await handleApproveRequest(appointment, 'Your appointment has been approved.');
  };

  // Refresh data function
  const refreshData = useCallback(async () => {
    if (loading || fetchingRef.current) return;
    
    try {
      await fetchPendingRequests();
      showMessage('Data refreshed successfully');
    } catch (err) {
      showMessage('Failed to refresh data', 'error');
    }
  }, [loading, fetchPendingRequests, showMessage]);

  // Filtered pending requests
  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return pendingRequests;

    return pendingRequests.filter(req => {
      const studentName = req?.student?.name || req?.studentName || '';
      const studentEmail = req?.student?.email || req?.studentEmail || '';
      const subject = req?.student?.subject || req?.subject || '';
      
      return (
        studentName.toLowerCase().includes(query) ||
        studentEmail.toLowerCase().includes(query) ||
        subject.toLowerCase().includes(query)
      );
    });
  }, [pendingRequests, searchTerm]);

  // Loading screen for initial load
  if (!currentTeacher && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  // Access denied screen
  if (!currentTeacher && !loading) {
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Student Appointment Requests
              </h1>
              <p className="text-gray-600">Welcome, {currentTeacher?.name || 'Teacher'}</p>
              <p className="text-sm text-gray-500">{filteredRequests.length} pending requests</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refreshData}
                disabled={loading || fetchingRef.current}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || fetchingRef.current) ? 'animate-spin' : ''}`} />
                {(loading || fetchingRef.current) ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-700 font-medium">{success}</span>
              </div>
              <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">
                <X className="w-4 h-4" />
              </button>
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
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {(loading || fetchingRef.current) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-500 mr-2" />
              <span className="text-yellow-700 font-medium">Loading data... Please wait.</span>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by student name, email, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
        </div>

        {/* Pending Requests List */}
        <div className="space-y-6">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {searchTerm ? 'No matching requests found' : 'No pending requests!'}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'All caught up! No student appointment requests to review.'
                }
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const requestId = request._id || request.id;
              const studentInfo = request.student || request;
              
              return (
                <div 
                  key={requestId} 
                  className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-orange-400 hover:shadow-2xl transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Student Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="bg-gradient-to-r from-orange-400 to-red-500 p-3 rounded-full">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          {studentInfo?.name || studentInfo?.studentName || 'Unknown Student'}
                        </h3>
                        
                        <div className="space-y-2 mb-4">
                          <p className="text-gray-600 flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2 text-gray-500" />
                            {studentInfo?.email || studentInfo?.studentEmail || 'N/A'}
                          </p>
                          
                          {(studentInfo?.phone || studentInfo?.studentPhone) && (
                            <p className="text-gray-600 flex items-center text-sm">
                              <Phone className="w-4 h-4 mr-2 text-gray-500" />
                              {studentInfo.phone || studentInfo.studentPhone}
                            </p>
                          )}
                        </div>

                        {/* Appointment Details */}
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                          <span className="flex items-center text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full text-sm">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(request.date || request.appointmentDate)}
                          </span>
                          <span className="flex items-center text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full text-sm">
                            <Clock className="w-4 h-4 mr-1" />
                            {request.day} at {formatTime(request.time)}
                          </span>
                        </div>

                        {/* Subject and Message */}
                        {(studentInfo?.subject || studentInfo?.message || request.subject || request.message) && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            {(studentInfo?.subject || request.subject) && (
                              <p className="text-sm text-gray-700 mb-2">
                                <strong className="text-gray-900">Subject:</strong> {studentInfo.subject || request.subject}
                              </p>
                            )}
                            {(studentInfo?.message || request.message) && (
                              <p className="text-sm text-gray-700">
                                <strong className="text-gray-900">Message:</strong> {studentInfo.message || request.message}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-3 text-xs text-gray-500">
                          Requested on: {formatDate(request.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 min-w-[200px]">
                      <button
                        onClick={() => handleQuickApprove(request)}
                        disabled={processingRequest === requestId}
                        className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingRequest === requestId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        Quick Approve
                      </button>

                      <button
                        onClick={() => openApprovalModal('approve', request)}
                        disabled={processingRequest === requestId}
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <MessageSquare className="w-5 h-5" />
                        Approve with Message
                      </button>

                      <button
                        onClick={() => openApprovalModal('reject', request)}
                        disabled={processingRequest === requestId}
                        className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject Request
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Approval/Rejection Modal */}
        {approvalModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className={`p-6 rounded-t-2xl ${
                approvalModal.type === 'approve'
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {approvalModal.type === 'approve' ? (
                    <>
                      <CheckCircle className="w-6 h-6" /> 
                      Approve Appointment Request
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6" /> 
                      Reject Appointment Request
                    </>
                  )}
                </h2>
              </div>

              <div className="p-6">
                {/* Student Info Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {approvalModal.appointment?.student?.name || approvalModal.appointment?.studentName || 'Unknown Student'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {approvalModal.appointment?.student?.email || approvalModal.appointment?.studentEmail || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {approvalModal.appointment?.day} at {formatTime(approvalModal.appointment?.time)}
                  </p>
                  {(approvalModal.appointment?.student?.subject || approvalModal.appointment?.subject) && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Subject:</strong> {approvalModal.appointment.student?.subject || approvalModal.appointment.subject}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    {approvalModal.type === 'approve' 
                      ? 'Message to Student (Optional)' 
                      : 'Reason for Rejection (Required)'
                    }
                  </label>
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder={approvalModal.type === 'approve'
                      ? 'Add any special instructions or notes for the student...'
                      : 'Please explain why this request cannot be approved...'
                    }
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                  {approvalModal.type === 'reject' && !responseMessage.trim() && (
                    <p className="text-red-500 text-sm mt-1">
                      A reason for rejection is required.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeApprovalModal}
                    disabled={processingRequest === (approvalModal.appointment?._id || approvalModal.appointment?.id)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleModalSubmit}
                    disabled={
                      processingRequest === (approvalModal.appointment?._id || approvalModal.appointment?.id) ||
                      (approvalModal.type === 'reject' && !responseMessage.trim())
                    }
                    className={`flex-1 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      approvalModal.type === 'approve' 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {processingRequest === (approvalModal.appointment?._id || approvalModal.appointment?.id) ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        {approvalModal.type === 'approve' ? 'Approve Request' : 'Reject Request'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Loading Overlay */}
        {(loading || fetchingRef.current) && !processingRequest && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
            <div className="bg-white rounded-2xl p-6 text-center shadow-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3 mx-auto"></div>
              <p className="text-gray-600">Loading requests...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAppointmentApprovalSystem;