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
  Loader
} from 'lucide-react';
import { apiMethods } from '../../services/api';

const TeacherApproveAppointments = () => {
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [responseMessages, setResponseMessages] = useState({});
  const [showResponseForm, setShowResponseForm] = useState(null);

  // Fetch pending appointments for the teacher
  const fetchPendingAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      // Get all appointments with pending status and student creation
      const response = await apiMethods.getPendingRequests();
      
      let appointmentsArray = [];
      const data = response.data;

      if (Array.isArray(data)) {
        appointmentsArray = data;
      } else if (data && Array.isArray(data.data)) {
        appointmentsArray = data.data;
      } else {
        appointmentsArray = [];
      }

      setPendingAppointments(appointmentsArray);
    } catch (error) {
      console.error('Error fetching pending appointments:', error);
      setError('Failed to load pending appointments. Please try again.');
      setPendingAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAppointments();
  }, []);

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Handle response message change
  const handleResponseMessageChange = (appointmentId, message) => {
    setResponseMessages(prev => ({
      ...prev,
      [appointmentId]: message
    }));
  };

  // Accept appointment
  const acceptAppointment = async (appointmentId) => {
    setProcessingId(appointmentId);
    setError('');
    
    try {
      const responseMessage = responseMessages[appointmentId] || '';
      
      console.log('Accepting appointment:', appointmentId, 'with message:', responseMessage);
      
      await apiMethods.acceptAppointmentRequest(appointmentId, responseMessage);
      
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
      
    } catch (error) {
      console.error('Error accepting appointment:', error);
      setError(error.message || 'Failed to accept appointment. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject appointment
  const rejectAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to reject this appointment request?')) {
      return;
    }

    setProcessingId(appointmentId);
    setError('');
    
    try {
      const responseMessage = responseMessages[appointmentId] || '';
      
      await apiMethods.rejectAppointmentRequest(appointmentId, responseMessage);
      
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
      
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      setError(error.message || 'Failed to reject appointment. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleResponseForm = (appointmentId) => {
    setShowResponseForm(showResponseForm === appointmentId ? null : appointmentId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointment Requests</h1>
              <p className="mt-2 text-gray-600">Review and approve student appointment requests</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 px-4 py-2 rounded-full">
                <span className="text-blue-800 font-semibold">
                  {pendingAppointments.length} Pending
                </span>
              </div>
              <button
                onClick={fetchPendingAppointments}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
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

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading appointments...</p>
            </div>
          </div>
        )}

        {/* Appointment Requests */}
        <div className="space-y-6">
          {pendingAppointments.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No pending requests</h3>
              <p className="text-gray-500">All appointment requests have been processed!</p>
            </div>
          ) : (
            pendingAppointments.map(appointment => {
              const appointmentId = appointment._id || appointment.id;
              const isProcessing = processingId === appointmentId;
              const showForm = showResponseForm === appointmentId;
              
              return (
                <div key={appointmentId} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  {/* Main Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-full">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">
                            {appointment.student?.name || 'Unknown Student'}
                          </h3>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Mail className="w-4 h-4 mr-2" />
                            {appointment.student?.email || 'No email provided'}
                          </p>
                          {appointment.student?.phone && (
                            <p className="text-gray-600 flex items-center mt-1">
                              <Phone className="w-4 h-4 mr-2" />
                              {appointment.student.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                          Pending Approval
                        </span>
                      </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-gray-800">Date & Day</p>
                            <p className="text-gray-600">{formatDateForDisplay(appointment.date || appointment.appointmentDate)}</p>
                            <p className="text-sm text-gray-500">{appointment.day}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-gray-800">Time</p>
                            <p className="text-gray-600">{appointment.time}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {appointment.student?.subject && (
                          <div>
                            <p className="font-medium text-gray-800">Subject</p>
                            <p className="text-gray-600">{appointment.student.subject}</p>
                          </div>
                        )}
                        
                        {appointment.student?.message && (
                          <div>
                            <p className="font-medium text-gray-800 flex items-center">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Student Message
                            </p>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg mt-2">
                              {appointment.student.message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Response Form */}
                    {showForm && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Response Message (Optional)
                        </label>
                        <textarea
                          value={responseMessages[appointmentId] || ''}
                          onChange={(e) => handleResponseMessageChange(appointmentId, e.target.value)}
                          placeholder="Add a personal message for the student..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows="3"
                          maxLength="500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(responseMessages[appointmentId] || '').length}/500 characters
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <button
                        onClick={() => toggleResponseForm(appointmentId)}
                        className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 transition-colors duration-200"
                        disabled={isProcessing}
                      >
                        <Send className="w-4 h-4" />
                        <span>{showForm ? 'Hide' : 'Add'} Response Message</span>
                      </button>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => rejectAppointment(appointmentId)}
                          disabled={isProcessing}
                          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          <span>Reject</span>
                        </button>
                        
                        <button
                          onClick={() => acceptAppointment(appointmentId)}
                          disabled={isProcessing}
                          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
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
  );
};

export default TeacherApproveAppointments;