import React, { useState, useEffect } from 'react';
import { apiMethods, tokenManager } from '../../services/api';

const UserAppointmentsDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState({});
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is logged in
  const isLoggedIn = tokenManager.isUserLoggedIn();
  const currentUser = tokenManager.getCurrentUser();

  const fetchUserAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is logged in
      if (!isLoggedIn) {
        throw new Error('Please login to view your appointments');
      }

      console.log('🔄 Fetching appointments for current user...');
      const response = await apiMethods.getCurrentUserAppointments();

      if (response.data.success) {
        const appointmentsData = response.data.data?.appointments || response.data.appointments || [];
        const userData = response.data.data?.userInfo || response.data.userInfo || currentUser;
        
        setAppointments(appointmentsData);
        setUserInfo(userData);
        console.log('✅ Appointments fetched successfully:', appointmentsData.length);
      } else {
        throw new Error('Failed to fetch appointments');
      }

    } catch (err) {
      console.error('❌ Error fetching appointments:', err);
      
      // Handle specific error cases
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        setError('Your session has expired. Please login again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/user/login';
        }, 2000);
      } else if (err.message.includes('Cannot connect to server')) {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to fetch appointments');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserAppointments();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserAppointments();
    } else {
      setError('Please login to view your appointments');
      setLoading(false);
    }
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmed: 'bg-green-100 text-green-800 border-green-300',
      booked: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      console.log('🔄 Cancelling appointment:', appointmentId);
      await apiMethods.cancelAppointment(appointmentId, 'Cancelled by student');
      
      // Show success message
      alert('Appointment cancelled successfully');
      
      // Refresh the list
      await handleRefresh();
      
    } catch (error) {
      console.error('❌ Error cancelling appointment:', error);
      alert(error.message || 'Failed to cancel appointment. Please try again.');
    }
  };

  // Filter appointments based on selected filter
  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'all') return true;
    return appointment.status?.toLowerCase() === filter;
  });

  const getFilterCounts = () => {
    return {
      all: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      booked: appointments.filter(a => a.status === 'booked').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      rejected: appointments.filter(a => a.status === 'rejected').length,
    };
  };

  const filterCounts = getFilterCounts();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Appointments</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            {!error.includes('login') && (
              <button
                onClick={handleRefresh}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors mr-3"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => window.location.href = '/user/login'}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
              <p className="text-gray-600 mt-2">
                Welcome back, <span className="font-semibold">{userInfo.name || currentUser?.name || 'Student'}</span>
              </p>
              <p className="text-sm text-gray-500">
                Email: {userInfo.email || currentUser?.email || 'Not available'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center disabled:opacity-50"
            >
              <svg 
                className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Appointments</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', count: filterCounts.all },
              { key: 'pending', label: 'Pending', count: filterCounts.pending },
              { key: 'confirmed', label: 'Confirmed', count: filterCounts.confirmed },
              { key: 'booked', label: 'Booked', count: filterCounts.booked },
              { key: 'completed', label: 'Completed', count: filterCounts.completed },
              { key: 'cancelled', label: 'Cancelled', count: filterCounts.cancelled },
              { key: 'rejected', label: 'Rejected', count: filterCounts.rejected },
            ].map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-gray-400 text-5xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? 'No Appointments Found' : `No ${filter} appointments found`}
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "You haven't scheduled any appointments yet." 
                  : `You don't have any ${filter} appointments.`
                }
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => window.location.href = '/user/appointments'}
                  className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Schedule New Appointment
                </button>
              )}
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <div key={appointment._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.teacherId?.name || appointment.teacherName || 'Unknown Teacher'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Subject: {appointment.teacherId?.subject || 'Subject not specified'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {appointment._id}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                    {appointment.status?.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Date:</span> {formatDate(appointment.date)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Time:</span> {appointment.time}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Day:</span> {appointment.day}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Subject:</span> {appointment.student?.subject || 'Not specified'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Created by:</span> {appointment.createdBy === 'student' ? 'You' : 'Teacher'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Created:</span> {new Date(appointment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {appointment.student?.message && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700">Your Message:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded mt-1">
                      {appointment.student.message}
                    </p>
                  </div>
                )}

                {appointment.notes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700">Notes:</p>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded mt-1">
                      {appointment.notes}
                    </p>
                  </div>
                )}

                {appointment.teacherResponse?.responseMessage && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-green-700">Teacher's Response:</p>
                    <p className="text-sm text-green-600 bg-green-50 p-3 rounded mt-1">
                      {appointment.teacherResponse.responseMessage}
                    </p>
                  </div>
                )}

                {appointment.cancelReason && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-red-700">Cancellation Reason:</p>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded mt-1">
                      {appointment.cancelReason}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  {(appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'booked') && (
                    <button
                      onClick={() => handleCancelAppointment(appointment._id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                    >
                      Cancel Appointment
                    </button>
                  )}
                  
                  {appointment.status === 'confirmed' && (
                    <button
                      onClick={() => window.location.href = `/student/message?appointmentId=${appointment._id}`}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    >
                      Message Teacher
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.href = '/user/appointments'}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors inline-flex items-center mr-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Schedule New Appointment
          </button>
          
          <button
            onClick={() => window.location.href = '/user/dashboard'}
            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAppointmentsDashboard;