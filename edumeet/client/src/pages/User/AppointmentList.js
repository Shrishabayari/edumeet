// Example React component showing how to use the new user-specific appointment endpoints

import React, { useState, useEffect } from 'react';
import { apiMethods } from '../../services/api';

const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [stats, setStats] = useState({});
  const [userInfo, setUserInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  // Fetch user's appointments
  useEffect(() => {
    fetchMyAppointments();
  }, []);

  const fetchMyAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiMethods.getCurrentUserAppointments();
      
      if (response.data.success) {
        setAppointments(response.data.data.appointments);
        setGrouped(response.data.data.grouped);
        setStats(response.data.data.stats);
        setUserInfo(response.data.userInfo);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  // Get filtered appointments based on current filter
  const getFilteredAppointments = () => {
    if (filter === 'all') return appointments;
    return grouped[filter] || [];
  };

  // Handle appointment actions (for teachers)
  const handleAcceptAppointment = async (appointmentId, responseMessage = '') => {
    try {
      await apiMethods.acceptAppointmentRequest(appointmentId, responseMessage);
      // Refresh appointments after action
      fetchMyAppointments();
    } catch (err) {
      console.error('Error accepting appointment:', err);
      setError(err.message);
    }
  };

  const handleRejectAppointment = async (appointmentId, responseMessage = '') => {
    try {
      await apiMethods.rejectAppointmentRequest(appointmentId, responseMessage);
      fetchMyAppointments();
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      setError(err.message);
    }
  };

  const handleCancelAppointment = async (appointmentId, reason = '') => {
    try {
      await apiMethods.cancelAppointment(appointmentId, reason);
      fetchMyAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError(err.message);
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await apiMethods.completeAppointment(appointmentId);
      fetchMyAppointments();
    } catch (err) {
      console.error('Error completing appointment:', err);
      setError(err.message);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      booked: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={fetchMyAppointments}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
        <p className="mt-2 text-gray-600">
          Welcome {userInfo.name} ({userInfo.role}). You have {stats.total} total appointments.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Upcoming</p>
              <p className="text-2xl font-semibold text-blue-600">{stats.upcoming}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All', count: stats.total },
              { key: 'pending', label: 'Pending', count: stats.pending },
              { key: 'confirmed', label: 'Confirmed', count: stats.confirmed },
              { key: 'booked', label: 'Booked', count: stats.booked },
              { key: 'completed', label: 'Completed', count: stats.completed },
              { key: 'cancelled', label: 'Cancelled', count: stats.cancelled }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {getFilteredAppointments().length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No appointments found for the selected filter.</p>
          </div>
        ) : (
          getFilteredAppointments().map((appointment) => (
            <div key={appointment._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {userInfo.role === 'teacher' 
                        ? `Appointment with ${appointment.student.name}`
                        : `Appointment with ${appointment.teacherName}`
                      }
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600"><span className="font-medium">Date:</span> {formatDate(appointment.date)}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium">Time:</span> {appointment.time}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium">Day:</span> {appointment.day}</p>
                    </div>
                    <div>
                      {userInfo.role === 'teacher' ? (
                        <>
                          <p className="text-sm text-gray-600"><span className="font-medium">Student:</span> {appointment.student.name}</p>
                          <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {appointment.student.email}</p>
                          {appointment.student.phone && (
                            <p className="text-sm text-gray-600"><span className="font-medium">Phone:</span> {appointment.student.phone}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600"><span className="font-medium">Teacher:</span> {appointment.teacherName}</p>
                          <p className="text-sm text-gray-600"><span className="font-medium">Subject:</span> {appointment.teacherId?.subject}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {appointment.student.subject && (
                    <p className="mt-3 text-sm text-gray-600"><span className="font-medium">Subject:</span> {appointment.student.subject}</p>
                  )}

                  {appointment.student.message && (
                    <p className="mt-3 text-sm text-gray-600"><span className="font-medium">Message:</span> {appointment.student.message}</p>
                  )}

                  {appointment.teacherResponse?.responseMessage && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800"><span className="font-medium">Teacher Response:</span> {appointment.teacherResponse.responseMessage}</p>
                    </div>
                  )}

                  {appointment.notes && (
                    <p className="mt-3 text-sm text-gray-600"><span className="font-medium">Notes:</span> {appointment.notes}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="ml-4 flex-shrink-0">
                  {userInfo.role === 'teacher' && appointment.status === 'pending' && appointment.createdBy === 'student' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptAppointment(appointment._id, '')}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectAppointment(appointment._id, '')}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {['confirmed', 'booked'].includes(appointment.status) && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCompleteAppointment(appointment._id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(appointment._id, '')}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyAppointments;