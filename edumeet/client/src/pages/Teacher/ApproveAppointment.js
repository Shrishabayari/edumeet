import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Clock, 
  Mail, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Send,
  Loader,
  BookOpen,
  GraduationCap,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import TeacherNavbar from '../../components/teacherNavbar';
import { apiMethods } from '../../services/api';

const TeacherApproveAppointments = () => {
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [responseMessages, setResponseMessages] = useState({});
  const [showResponseForm, setShowResponseForm] = useState(null);
  const [expandedCards, setExpandedCards] = useState(new Set());

const fetchPendingAppointments = async () => {
  console.log('🔄 Fetching ALL pending appointments...');
  setLoading(true);
  setError('');
  
  try {
    let response;
    
    // SOLUTION 1: Get ALL appointments with pending status (not teacher-specific)
    try {
      console.log('🔄 Fetching all pending appointments...');
      response = await apiMethods.getAllAppointments({ status: 'pending' });
    } catch (error) {
      console.log('Primary method failed, trying fallback:', error.message);
      // Fallback: get all appointments and filter client-side
      response = await apiMethods.getAllAppointments();
    }
    
    console.log('📦 Raw API response:', response);
    
    let appointmentsArray = [];
    const data = response.data;

    // Enhanced data extraction logic
    if (Array.isArray(data)) {
      appointmentsArray = data;
      console.log('✅ Data is array, using directly');
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) {
        appointmentsArray = data.data;
        console.log('✅ Data found in data.data property');
      } else if (Array.isArray(data.appointments)) {
        appointmentsArray = data.appointments;
        console.log('✅ Data found in data.appointments property');
      } else if (Array.isArray(data.results)) {
        appointmentsArray = data.results;
        console.log('✅ Data found in data.results property');
      } else {
        console.log('⚠️ Data object structure not recognized:', Object.keys(data));
        appointmentsArray = [];
      }
    } else {
      console.log('⚠️ Unexpected data format:', typeof data, data);
      appointmentsArray = [];
    }

    // Filter only pending appointments (client-side filtering as backup)
    const pendingOnly = appointmentsArray.filter(appointment => 
      appointment.status === 'pending' && appointment.createdBy === 'student'
    );

    console.log(`📊 Found ${appointmentsArray.length} total appointments, ${pendingOnly.length} pending`);
    console.log('📋 Pending appointments:', pendingOnly);

    setPendingAppointments(pendingOnly);
    
    if (pendingOnly.length === 0) {
      console.log('ℹ️ No pending appointments found');
    }

  } catch (error) {
    console.error('❌ Error fetching pending appointments:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    setError('Failed to load pending appointments. Please try again.');
    setPendingAppointments([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    console.log('🚀 Component mounted, fetching appointments...');
    fetchPendingAppointments();
  }, []);

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return dateString || 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'Invalid Date';
    }
  };

  // Format time since creation
  const getTimeSinceCreation = (dateString) => {
    try {
      const created = new Date(dateString);
      if (isNaN(created.getTime())) {
        return 'Unknown time';
      }
      
      const now = new Date();
      const diffInHours = Math.floor((now - created) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } catch (error) {
      console.error('Error calculating time since creation:', error);
      return 'Unknown time';
    }
  };

  // Handle response message change
  const handleResponseMessageChange = (appointmentId, message) => {
    setResponseMessages(prev => ({
      ...prev,
      [appointmentId]: message
    }));
  };

  // Accept appointment with fallback mechanism
  const acceptAppointment = async (appointmentId) => {
    console.log(`🔄 Accepting appointment: ${appointmentId}`);
    setProcessingId(appointmentId);
    setError('');
    
    try {
      const responseMessage = responseMessages[appointmentId] || '';
      let response;
      let usedFallback = false;
      
      try {
        response = await apiMethods.acceptAppointmentRequest(appointmentId, responseMessage);
      } catch (error) {
        console.log('Accept method failed, using fallback:', error.message);// eslint-disable-next-line
        response = await apiMethods.updateAppointment(appointmentId, { 
          status: 'confirmed',
          updatedBy: 'teacher',
          updatedAt: new Date().toISOString()
        });
        usedFallback = true;
      }
      
      // Remove from pending list
      setPendingAppointments(prev => 
        prev.filter(apt => (apt._id || apt.id) !== appointmentId)
      );
      
      // Clear response message
      setResponseMessages(prev => {
        const updated = { ...prev };
        delete updated[appointmentId];
        return updated;
      });
      
      setShowResponseForm(null);
      
      // Show success message
      setError(`Appointment accepted successfully!${usedFallback ? ' (using fallback method)' : ''}`);
      setTimeout(() => setError(''), 3000);
      
    } catch (error) {
      console.error('❌ Error accepting appointment:', error);
      setError(error.message || 'Failed to accept appointment. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject appointment with enhanced error handling and fallback
  const rejectAppointment = async (appointmentId) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to reject this appointment request? This action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }

    console.log(`🔄 Rejecting appointment: ${appointmentId}`);
    setProcessingId(appointmentId);
    setError('');
    
    try {
      const responseMessage = responseMessages[appointmentId] || '';
      let response;
      let usedFallback = false;
      
      // Validate appointment ID format before sending
      if (!appointmentId) {
        throw new Error('Invalid appointment ID');
      }
      
      // Try the primary reject method first, then fallback to direct update
      try {
        response = await apiMethods.rejectAppointmentRequest(appointmentId, responseMessage);
        console.log('✅ Primary rejection response:', response);
      } catch (error) {
        console.log('Primary reject method failed, using fallback:', error.message);
        response = await apiMethods.updateAppointment(appointmentId, { 
          status: 'rejected',
          updatedBy: 'teacher',
          updatedAt: new Date().toISOString()
        });
        usedFallback = true;
        console.log('✅ Fallback rejection response:', response);
      }
      
      // Remove from pending list only if the API call was successful
      setPendingAppointments(prev => 
        prev.filter(apt => (apt._id || apt.id) !== appointmentId)
      );
      
      // Clear response message
      setResponseMessages(prev => {
        const updated = { ...prev };
        delete updated[appointmentId];
        return updated;
      });
      
      setShowResponseForm(null);
      
      // Show success message
      setError(`Appointment rejected successfully!${usedFallback ? ' (using fallback method)' : ''}`);
      setTimeout(() => setError(''), 3000);
      
      console.log('✅ Appointment rejected successfully');
      
    } catch (error) {
      console.error('❌ Error rejecting appointment:', error);
      setError('Failed to reject appointment. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleResponseForm = (appointmentId) => {
    setShowResponseForm(showResponseForm === appointmentId ? null : appointmentId);
  };

  const toggleCardExpansion = (appointmentId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId);
      } else {
        newSet.add(appointmentId);
      }
      return newSet;
    });
  };

  // Debug information
  console.log('🔍 Current component state:', {
    pendingAppointments: pendingAppointments.length,
    loading,
    error,
    processingId
  });

  return (
    <>
      <TeacherNavbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Modern Header with Glass Morphism */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Appointment Requests
                  </h1>
                  <p className="mt-1 text-gray-600">Review and manage student appointment requests</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-blue-200/50">
                  <span className="text-blue-700 font-semibold flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>{pendingAppointments.length} Pending</span>
                  </span>
                </div>
                <button
                  onClick={fetchPendingAppointments}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Error/Success Message */}
          {error && (
            <div className={`mb-8 rounded-2xl border-2 p-6 backdrop-blur-sm transition-all duration-300 ${
              error.includes('successfully') 
                ? 'bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-emerald-200 shadow-emerald-100/50 shadow-lg' 
                : 'bg-gradient-to-r from-red-50/80 to-pink-50/80 border-red-200 shadow-red-100/50 shadow-lg'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  error.includes('successfully') ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${
                    error.includes('successfully') ? 'text-emerald-600' : 'text-red-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    error.includes('successfully') ? 'text-emerald-800' : 'text-red-800'
                  }`}>
                    {error.includes('successfully') ? 'Success' : 'Error'}
                  </h3>
                  <p className={error.includes('successfully') ? 'text-emerald-700' : 'text-red-700'}>
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => setError('')}
                  className={`p-1 rounded-full hover:bg-white/50 transition-colors ${
                    error.includes('successfully') ? 'text-emerald-600 hover:text-emerald-800' : 'text-red-600 hover:text-red-800'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Loading Overlay */}
          {loading && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl border border-white/20">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-indigo-600 rounded-full animate-pulse mx-auto"></div>
                </div>
                <p className="text-gray-700 font-medium">Loading appointments...</p>
                <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the latest requests</p>
              </div>
            </div>
          )}

          {/* Enhanced Appointment Cards */}
          <div className="space-y-6">
            {pendingAppointments.length === 0 && !loading ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-16 text-center border border-white/20">
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-6 rounded-full w-24 h-24 mx-auto mb-6 shadow-lg">
                  <CheckCircle className="w-12 h-12 text-white mx-auto mt-1.5" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">All Caught Up!</h3>
                <p className="text-gray-600 text-lg">No pending appointment requests at the moment.</p>
                <p className="text-gray-500 mt-2">New requests will appear here automatically.</p>
              </div>
            ) : (
              pendingAppointments.map(appointment => {
                const appointmentId = appointment._id || appointment.id;
                const isProcessing = processingId === appointmentId;
                const showForm = showResponseForm === appointmentId;
                const isExpanded = expandedCards.has(appointmentId);
                
                return (
                  <div key={appointmentId} className="group bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/20 hover:border-white/40">
                    {/* Enhanced Card Header */}
                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-6 border-b border-gray-100/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse"></div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {appointment.student?.name || 'Unknown Student'}
                            </h3>
                            <div className="flex items-center space-x-4 mt-2">
                              <p className="text-gray-600 flex items-center">
                                <Mail className="w-4 h-4 mr-2" />
                                {appointment.student?.email || 'No email provided'}
                              </p>
                              {appointment.student?.phone && (
                                <p className="text-gray-600 flex items-center">
                                  <Phone className="w-4 h-4 mr-2" />
                                  {appointment.student.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-2xl text-sm font-medium border border-yellow-200 shadow-sm">
                            ⏳ Pending Review
                          </div>
                          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {getTimeSinceCreation(appointment.createdAt)}
                          </div>
                          <button
                            onClick={() => toggleCardExpansion(appointmentId)}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            {isExpanded ? 
                              <EyeOff className="w-4 h-4 text-gray-500" /> : 
                              <Eye className="w-4 h-4 text-gray-500" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Card Content */}
                    <div className="p-6">
                      {/* Appointment Details Grid */}
                      <div className={`grid gap-6 transition-all duration-300 ${isExpanded ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3 p-4 bg-blue-50/50 rounded-2xl">
                            <Calendar className="w-6 h-6 text-blue-600 mt-1" />
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Date & Day</p>
                              <p className="text-gray-700">{formatDateForDisplay(appointment.date || appointment.appointmentDate)}</p>
                              <p className="text-sm text-blue-600 font-medium">{appointment.day}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3 p-4 bg-green-50/50 rounded-2xl">
                            <Clock className="w-6 h-6 text-green-600 mt-1" />
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Time Slot</p>
                              <p className="text-gray-700 font-medium">{appointment.time}</p>
                              <p className="text-xs text-gray-500">60 minutes duration</p>
                            </div>
                          </div>
                        </div>

                        {appointment.student?.subject && (
                          <div className="space-y-4">
                            <div className="flex items-start space-x-3 p-4 bg-purple-50/50 rounded-2xl">
                              <BookOpen className="w-6 h-6 text-purple-600 mt-1" />
                              <div>
                                <p className="font-semibold text-gray-900 mb-1">Subject</p>
                                <p className="text-gray-700 font-medium">{appointment.student.subject}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Student Message */}
                      {appointment.student?.message && (
                        <div className="mt-6">
                          <div className="bg-gradient-to-r from-gray-50/50 to-blue-50/50 p-6 rounded-2xl border border-gray-200/50">
                            <p className="font-semibold text-gray-900 flex items-center mb-3">
                              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                              Student's Message
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                              {appointment.student.message}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Response Form */}
                      {showForm && (
                        <div className="mt-6 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 rounded-2xl p-6 border border-blue-200/30">
                          <label className="block text-sm font-semibold text-gray-800 mb-3  items-center">
                            <Send className="w-4 h-4 mr-2" />
                            Response Message (Optional)
                          </label>
                          <textarea
                            value={responseMessages[appointmentId] || ''}
                            onChange={(e) => handleResponseMessageChange(appointmentId, e.target.value)}
                            placeholder="Add a personal message for the student... (e.g., 'Looking forward to our session!' or 'Please bring your textbook.')"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm"
                            rows="4"
                            maxLength="500"
                          />
                          <div className="flex justify-between items-center mt-3">
                            <p className="text-xs text-gray-500">
                              {(responseMessages[appointmentId] || '').length}/500 characters
                            </p>
                            <div className="flex space-x-2">
                              <span className="text-xs text-gray-500">💡 Tip: Keep it friendly and professional</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Action Buttons */}
                      <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200/50">
                        <button
                          onClick={() => toggleResponseForm(appointmentId)}
                          className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 transition-colors duration-200 px-4 py-2 rounded-xl hover:bg-blue-50"
                          disabled={isProcessing}
                        >
                          <Send className="w-4 h-4" />
                          <span>{showForm ? 'Hide Message' : 'Add Response Message'}</span>
                        </button>
                        
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => rejectAppointment(appointmentId)}
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          >
                            {isProcessing ? 
                              <Loader className="w-4 h-4 animate-spin" /> : 
                              <Trash2 className="w-4 h-4" />
                            }
                            <span>Reject</span>
                          </button>
                          
                          <button
                            onClick={() => acceptAppointment(appointmentId)}
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          >
                            {isProcessing ? 
                              <Loader className="w-4 h-4 animate-spin" /> : 
                              <CheckCircle className="w-4 h-4" />
                            }
                            <span>Accept</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TeacherApproveAppointments;