import React, { useState, useEffect } from 'react';
import { User, Calendar, CheckCircle, XCircle, AlertCircle, Clock, Users, BookOpen, Shield } from 'lucide-react';
import { apiMethods } from '../../services/api';
import UserNavbar from '../../components/userNavbar';

const UserAppointmentList = ({ initialAppointments = [], onAppointmentUpdate }) => {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [showPermissionMessage, setShowPermissionMessage] = useState(false);

  // Helper function to format date for display
  const formatDateForDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Helper function to get status color and icon
  const getStatusDisplay = (status) => {
    const statusConfig = {
      pending: {
        color: 'text-amber-700',
        bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50',
        borderColor: 'border-amber-200',
        icon: Clock,
        label: 'Pending Review',
        dotColor: 'bg-amber-400'
      },
      confirmed: {
        color: 'text-blue-700',
        bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        borderColor: 'border-blue-200',
        icon: CheckCircle,
        label: 'Confirmed',
        dotColor: 'bg-blue-400'
      },
      completed: {
        color: 'text-purple-700',
        bgColor: 'bg-gradient-to-r from-purple-50 to-violet-50',
        borderColor: 'border-purple-200',
        icon: CheckCircle,
        label: 'Completed',
        dotColor: 'bg-purple-400'
      },
      cancelled: {
        color: 'text-red-700',
        bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        label: 'Cancelled',
        dotColor: 'bg-red-400'
      },
      rejected: {
        color: 'text-red-700',
        bgColor: 'bg-gradient-to-r from-red-50 to-rose-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        label: 'Rejected',
        dotColor: 'bg-red-400'
      }
    };

    return statusConfig[status?.toLowerCase()] || statusConfig.pending;
  };

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiMethods.getAllAppointments();
      let appointmentsArray = [];
      const data = response.data;

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
      if (onAppointmentUpdate) {
        onAppointmentUpdate(appointmentsArray);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments. Please try again.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [onAppointmentUpdate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Function to handle permission denied message
  const showPermissionDenied = () => {
    setShowPermissionMessage(true);
    setTimeout(() => {
      setShowPermissionMessage(false);
    }, 4000);
  };

  // Function to handle status change attempts (only allow cancel for users)
  const handleStatusChange = (appointmentId, newStatus) => {
    if (newStatus !== 'cancelled') {
      showPermissionDenied();
      return;
    }
    cancelAppointment(appointmentId);
  };

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }
    
    setUpdatingStatus(appointmentId);
    setError('');
    
    try {
      let response;
      
      try {
        response = await apiMethods.cancelAppointment(appointmentId, 'Cancelled by student');
      } catch (error) {
        console.log('Cancel method failed, using direct update:', error.message);
        response = await apiMethods.updateAppointment(appointmentId, { 
          status: 'cancelled',
          updatedBy: 'student',
          updatedAt: new Date().toISOString()
        });
      }

      console.log('Cancel response:', response.data);

      setAppointments(prevAppointments =>
        prevAppointments.map(apt =>
          (apt.id || apt._id) === appointmentId
            ? { ...apt, status: 'cancelled' }
            : apt
        )
      );

      if (onAppointmentUpdate) {
        const updatedAppointments = appointments.map(apt =>
          (apt.id || apt._id) === appointmentId
            ? { ...apt, status: 'cancelled' }
            : apt
        );
        onAppointmentUpdate(updatedAppointments);
      }

      setError('Appointment cancelled successfully!');
      setTimeout(() => setError(''), 3000);

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      console.error('Error details:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      setError(`Failed to cancel appointment: ${errorMessage}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <UserNavbar/>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Appointments</h1>
              <p className="text-gray-600 mt-1">View and manage your consultation sessions</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{safeAppointments.length} Total</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{safeAppointments.filter(apt => apt.status === 'pending').length} Pending</span>
            </div>
          </div>
        </div>

        {/* Permission Denied Message */}
        {showPermissionMessage && (
          <div className="mb-8 rounded-2xl border-2 p-6 bg-gradient-to-r from-orange-50/80 to-red-50/80 border-orange-200 shadow-orange-100/50 shadow-lg backdrop-blur-sm transition-all duration-300">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-orange-100">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-orange-800">Access Denied</p>
                <p className="text-orange-700">
                  You don't have the authority to change appointment status. Only teachers can modify appointment status. You can only cancel your appointments.
                </p>
              </div>
              <button
                onClick={() => setShowPermissionMessage(false)}
                className="p-1 rounded-full hover:bg-white/50 transition-colors text-orange-600 hover:text-orange-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Error/Success Message */}
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
                <p className={`font-semibold ${
                  error.includes('successfully') ? 'text-emerald-800' : 'text-red-800'
                }`}>
                  {error.includes('successfully') ? 'Success' : 'Error'}
                </p>
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

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 max-w-sm w-full mx-4">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Appointments</h3>
                <p className="text-gray-600">Please wait while we fetch your data...</p>
              </div>
            </div>
          </div>
        )}

        {/* Appointments Grid */}
        <div className="space-y-6">
          {safeAppointments.length === 0 && !loading ? (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <Calendar className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Appointments Yet</h3>
                <p className="text-gray-500 mb-6">You haven't booked any appointments yet. Start by scheduling a consultation with your teacher.</p>
                <div className="inline-flex items-center space-x-2 text-blue-600">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Ready to schedule your first session</span>
                </div>
              </div>
            </div>
          ) : (
            safeAppointments.map(appointment => {
              const statusDisplay = getStatusDisplay(appointment.status);
              const StatusIcon = statusDisplay.icon;
              const appointmentId = appointment.id || appointment._id;
              const isUpdating = updatingStatus === appointmentId;
              const canCancel = appointment.status !== 'cancelled' && appointment.status !== 'completed';

              return (
                <div 
                  key={appointmentId} 
                  className="group bg-white rounded-3xl shadow-lg border border-gray-100 p-8 hover:shadow-2xl hover:border-gray-200 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
                    {/* Appointment Info */}
                    <div className="flex items-start space-x-6">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center">
                          <User className="w-8 h-8 text-white" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-white ${statusDisplay.dotColor}`}></div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 truncate">
                            {appointment.teacher?.name || appointment.teacherId?.name || 'Teacher Name'}
                          </h3>
                          <div className={`px-3 py-1 rounded-full border ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
                            <div className="flex items-center space-x-2">
                              <StatusIcon className={`w-4 h-4 ${statusDisplay.color}`} />
                              <span className={`text-sm font-semibold ${statusDisplay.color}`}>
                                {statusDisplay.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 text-gray-600">
                          <p className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">Teacher Email:</span>
                            <span>{appointment.teacher?.email || appointment.teacherId?.email}</span>
                          </p>
                          <p className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">Date:</span>
                            <span>{formatDateForDisplay(appointment.date || appointment.appointmentDate)}</span>
                          </p>
                          <p className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">Time:</span>
                            <span>{appointment.day} at {appointment.time}</span>
                          </p>
                          <p className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">Subject:</span>
                            <span className="px-2 py-1 bg-gray-100 rounded-lg text-sm">
                              {appointment.subject || 'General Consultation'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center space-y-4">
                      {/* Status Display (Read-only) */}
                      <div className="w-full">
                        <select
                          value={appointment.status || 'pending'}
                          onChange={(e) => handleStatusChange(appointmentId, e.target.value)}
                          disabled={isUpdating}
                          className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:bg-gray-100"
                          title="Only teachers can change appointment status"
                        >
                          <option value="pending">📋 Pending Review</option>
                          <option value="confirmed">✅ Confirmed</option>
                          <option value="completed">🎯 Completed</option>
                          <option value="cancelled">❌ Cancelled</option>
                          <option value="rejected">🚫 Rejected</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          Status managed by teacher
                        </p>
                      </div>

                      {/* Cancel Button */}
                      {canCancel && (
                        <button
                          onClick={() => cancelAppointment(appointmentId)}
                          disabled={isUpdating}
                          className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-2xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:cursor-not-allowed"
                        >
                          {isUpdating ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Cancelling...</span>
                            </div>
                          ) : (
                            '❌ Cancel Appointment'
                          )}
                        </button>
                      )}

                      {!canCancel && (
                        <div className="w-full text-center">
                          <p className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-xl">
                            {appointment.status === 'cancelled' ? 'Appointment Cancelled' : 'Appointment Completed'}
                          </p>
                        </div>
                      )}
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

export default UserAppointmentList;