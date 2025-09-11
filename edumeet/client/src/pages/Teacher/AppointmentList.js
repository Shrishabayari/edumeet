import React, { useState, useEffect } from 'react';
import { User, Calendar, CheckCircle, XCircle, AlertCircle, Clock, Users, BookOpen } from 'lucide-react';
import { apiMethods } from '../../services/api';
import TeacherNavbar from '../../components/teacherNavbar';

const AppointmentList = ({ initialAppointments = [], onAppointmentUpdate }) => {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);

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

  // Helper function to determine if appointment was booked by teacher
  const isBookedByTeacher = (appointment) => {
    // Check various possible fields that might indicate teacher booking
    return appointment.bookedBy === 'teacher' || 
           appointment.createdBy === 'teacher' || 
           appointment.bookingType === 'teacher' ||
           appointment.initiatedBy === 'teacher' ||
           (appointment.metadata && appointment.metadata.bookedBy === 'teacher');
  };

  // Helper function to get initial status based on who booked
  const getInitialStatus = (appointment) => {
    if (isBookedByTeacher(appointment)) {
      return 'confirmed';
    }
    return appointment.status || 'pending';
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

      // Process appointments to set correct initial status
      const processedAppointments = appointmentsArray.map(appointment => ({
        ...appointment,
        status: getInitialStatus(appointment)
      }));

      setAppointments(processedAppointments);
      if (onAppointmentUpdate) {
        onAppointmentUpdate(processedAppointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments. Please try again.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }// eslint-disable-next-line
  }, [onAppointmentUpdate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateStatusDirectly = async (appointmentId, newStatus) => {
    try {
      console.log(`Directly updating appointment ${appointmentId} to status: ${newStatus}`);
      
      const response = await apiMethods.updateAppointment(appointmentId, { 
        status: newStatus,
        updatedBy: 'teacher',
        updatedAt: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      console.error('Direct update failed:', error);
      throw error;
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    if (!window.confirm(`Are you sure you want to change this appointment status to ${newStatus}?`)) {
      return;
    }
    
    setUpdatingStatus(appointmentId);
    setError('');
    
    try {
      let response;
      let usedFallback = false;
      
      switch (newStatus.toLowerCase()) {
        case 'confirmed':
          try {
            response = await apiMethods.acceptAppointmentRequest(appointmentId, 'Appointment confirmed by teacher');
          } catch (error) {
            console.log('Accept method failed, using fallback:', error.message);
            response = await updateStatusDirectly(appointmentId, 'confirmed');
            usedFallback = true;
          }
          break;
          
        case 'rejected':
          try {
            response = await apiMethods.rejectAppointmentRequest(appointmentId, 'Appointment rejected by teacher');
          } catch (error) {
            console.log('Reject method failed, using fallback:', error.message);
            response = await updateStatusDirectly(appointmentId, 'rejected');
            usedFallback = true;
          }
          break;
          
        case 'completed':
          try {
            response = await apiMethods.completeAppointment(appointmentId);
          } catch (error) {
            console.log('Complete method failed, using fallback:', error.message);
            response = await updateStatusDirectly(appointmentId, 'completed');
            usedFallback = true;
          }
          break;
          
        case 'cancelled':
          try {
            response = await apiMethods.cancelAppointment(appointmentId, 'Cancelled by teacher');
          } catch (error) {
            console.log('Cancel method failed, using fallback:', error.message);
            response = await updateStatusDirectly(appointmentId, 'cancelled');
            usedFallback = true;
          }
          break;
          
        case 'pending':
        default:
          response = await updateStatusDirectly(appointmentId, newStatus);
          break;
      }

      console.log('Status update response:', response.data);
      if (usedFallback) {
        console.log('Used fallback method for status update');
      }

      setAppointments(prevAppointments =>
        prevAppointments.map(apt =>
          (apt.id || apt._id) === appointmentId
            ? { ...apt, status: newStatus }
            : apt
        )
      );

      if (onAppointmentUpdate) {
        const updatedAppointments = appointments.map(apt =>
          (apt.id || apt._id) === appointmentId
            ? { ...apt, status: newStatus }
            : apt
        );
        onAppointmentUpdate(updatedAppointments);
      }

      setError(`Appointment status updated to ${newStatus} successfully!${usedFallback ? ' (using fallback method)' : ''}`);
      setTimeout(() => setError(''), 3000);

    } catch (error) {
      console.error('Error updating appointment status:', error);
      console.error('Error details:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      setError(`Failed to update appointment status to ${newStatus}: ${errorMessage}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <TeacherNavbar/>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
              <p className="text-gray-600 mt-1">Manage your student consultations and sessions</p>
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
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>{safeAppointments.filter(apt => apt.status === 'confirmed').length} Confirmed</span>
            </div>
          </div>
        </div>

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
                <p className="text-gray-500 mb-6">Your appointment schedule is currently empty. New student requests will appear here.</p>
                <div className="inline-flex items-center space-x-2 text-blue-600">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Ready to help students learn</span>
                </div>
              </div>
            </div>
          ) : (
            safeAppointments.map(appointment => {
              const statusDisplay = getStatusDisplay(appointment.status);
              const StatusIcon = statusDisplay.icon;
              const appointmentId = appointment.id || appointment._id;
              const isUpdating = updatingStatus === appointmentId;
              const bookedByTeacher = isBookedByTeacher(appointment);

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
                            {appointment.student?.name || 'Student Name'}
                          </h3>
                          <div className={`px-3 py-1 rounded-full border ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
                            <div className="flex items-center space-x-2">
                              <StatusIcon className={`w-4 h-4 ${statusDisplay.color}`} />
                              <span className={`text-sm font-semibold ${statusDisplay.color}`}>
                                {statusDisplay.label}
                              </span>
                            </div>
                          </div>
                          {bookedByTeacher && (
                            <div className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-full">
                              <span className="text-xs font-medium text-green-700">Teacher Booked</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-gray-600">
                          <p className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">Email:</span>
                            <span>{appointment.student?.email || appointment.teacherId?.email || appointment.teacher?.email}</span>
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
                              {appointment.student?.subject || 'General Consultation'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 lg:flex-col lg:space-y-4 lg:space-x-0">
                      {/* Status Dropdown */}
                      <div className="relative w-full sm:w-auto lg:w-full">
                        <select
                          value={appointment.status || 'pending'}
                          onChange={(e) => updateAppointmentStatus(appointmentId, e.target.value)}
                          disabled={isUpdating}
                          className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          {!bookedByTeacher && <option value="pending">📋 Pending Review</option>}
                          <option value="confirmed">✅ Confirmed</option>
                          <option value="completed">🎯 Completed</option>
                          <option value="cancelled">❌ Cancelled</option>
                          <option value="rejected">🚫 Rejected</option>
                        </select>
                        {isUpdating && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>

                      {/* Quick Action Buttons - Only show for student-booked pending appointments */}
                      {appointment.status === 'pending' && !bookedByTeacher && (
                        <div className="flex space-x-2 w-full sm:w-auto lg:w-full">
                          <button
                            onClick={() => updateAppointmentStatus(appointmentId, 'confirmed')}
                            disabled={isUpdating}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-2xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            ✅ Accept
                          </button>
                          <button
                            onClick={() => updateAppointmentStatus(appointmentId, 'rejected')}
                            disabled={isUpdating}
                            className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-2xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            🚫 Reject
                          </button>
                        </div>
                      )}

                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointmentId, 'completed')}
                          disabled={isUpdating}
                          className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white px-6 py-3 rounded-2xl font-semibold hover:from-purple-600 hover:to-violet-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          🎯 Mark Complete
                        </button>
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

export default AppointmentList;