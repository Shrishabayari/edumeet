import React, { useState, useEffect } from 'react';
import { apiMethods, tokenManager } from '../../services/api';

const UserAppointmentsList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [userInfo, setUserInfo] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState({});

  useEffect(() => {
    fetchUserAppointments();
  }, [filter, currentPage]);

  const fetchUserAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!tokenManager.isUserLoggedIn()) {
        setError('Please log in to view your appointments');
        setLoading(false);
        return;
      }

      console.log('Fetching appointments with filter:', filter, 'page:', currentPage);

      const params = { 
        page: currentPage, 
        limit: 10 
      };
      
      // Add status filter if it's not 'all'
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await apiMethods.getCurrentUserAppointments(params);
      
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        const appointmentsData = response.data.data.appointments || [];
        const userInfoData = response.data.userInfo || null;
        const paginationData = response.data.data.pagination || null;
        
        setAppointments(appointmentsData);
        setUserInfo(userInfoData);
        setPagination(paginationData);
        
        // Calculate status counts for all appointments (not just current page)
        await fetchStatusCounts();
        
        console.log('Loaded appointments:', appointmentsData.length);
      } else {
        setError(response.data.message || 'Failed to fetch appointments');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => {
          tokenManager.removeUserToken();
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.status === 400) {
        setError('Invalid request. Please check your login status.');
      } else if (err.response?.status === 404) {
        setError('Appointments endpoint not found. Please contact support.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.message || 'Failed to fetch appointments. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch status counts for filter buttons
  const fetchStatusCounts = async () => {
    try {
      const statusesToCount = ['all', 'pending', 'confirmed', 'booked', 'completed', 'cancelled', 'rejected'];
      const counts = {};

      // Get count for all appointments
      const allResponse = await apiMethods.getCurrentUserAppointments({ limit: 1000 });
      if (allResponse.data.success) {
        const allAppointments = allResponse.data.data.appointments;
        counts.all = allAppointments.length;
        
        // Count by status
        statusesToCount.slice(1).forEach(status => {
          counts[status] = allAppointments.filter(apt => apt.status === status).length;
        });
      }

      setStatusCounts(counts);
    } catch (error) {
      console.warn('Failed to fetch status counts:', error);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      booked: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      confirmed: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      booked: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      completed: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      cancelled: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      rejected: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
    return icons[status] || icons.pending;
  };

  const handleCancelAppointment = async (appointmentId, appointmentStatus) => {
    if (!appointmentId) {
      alert('Invalid appointment ID');
      return;
    }

    // Check if appointment can be cancelled
    const cancellableStatuses = ['pending', 'confirmed', 'booked'];
    if (!cancellableStatuses.includes(appointmentStatus)) {
      alert('This appointment cannot be cancelled');
      return;
    }

    const confirmCancel = window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.');
    if (!confirmCancel) return;

    try {
      const reason = prompt('Please provide a reason for cancellation (optional):');
      if (reason === null) return; // User clicked cancel

      setLoading(true);
      await apiMethods.cancelAppointment(appointmentId, reason);
      
      // Refresh the appointments list
      await fetchUserAppointments();
      
      alert('Appointment cancelled successfully');
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Failed to cancel appointment: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  // Loading state
  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800">Error Loading Appointments</h3>
          </div>
          <p className="text-red-700 mb-6">{error}</p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchUserAppointments}
              disabled={loading}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Retrying...' : 'Try Again'}
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">My Appointments</h1>
        {userInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-blue-900">
                  Welcome, {userInfo.name}
                </p>
                <p className="text-blue-700">
                  {userInfo.email} • {userInfo.role?.charAt(0).toUpperCase() + userInfo.role?.slice(1)}
                </p>
              </div>
              {pagination && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">{pagination.totalCount}</p>
                  <p className="text-sm text-blue-700">Total Appointments</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          {['all', 'pending', 'confirmed', 'booked', 'completed', 'cancelled', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => handleFilterChange(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                filter === status
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {getStatusIcon(status)}
              <span className="capitalize">{status}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                filter === status 
                  ? 'bg-blue-700 text-blue-100' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {statusCounts[status] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading overlay for page changes */}
      {loading && appointments.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Updating appointments...</span>
          </div>
        </div>
      )}

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-gray-400 mb-6">
            <svg className="mx-auto h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-medium text-gray-900 mb-3">No appointments found</h3>
          <p className="text-gray-600 text-lg mb-6">
            {filter === 'all' 
              ? "You don't have any appointments yet. Book your first appointment to get started!" 
              : `No ${filter} appointments found. Try selecting a different filter or create a new appointment.`
            }
          </p>
          <button
            onClick={() => handleFilterChange('all')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Appointments
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {appointments.map((appointment) => (
            <div 
              key={appointment._id} 
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              {/* Appointment Header */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(appointment.status)}`}>
                      {appointment.status.toUpperCase()}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {userInfo?.role === 'teacher' ? appointment.student.name : appointment.teacherName}
                    </h3>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>ID: #{appointment._id.slice(-8)}</p>
                    <p>{formatDate(appointment.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Body */}
              <div className="p-6">
                {/* Main Details Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Appointment Date</p>
                        <p className="text-lg font-semibold text-gray-900">{formatDate(appointment.date)}</p>
                        <p className="text-sm text-gray-600">{appointment.day}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Time</p>
                        <p className="text-lg font-semibold text-gray-900">{appointment.time}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Student</p>
                        <p className="text-lg font-semibold text-gray-900">{appointment.student.name}</p>
                        <p className="text-sm text-gray-600">{appointment.student.email}</p>
                      </div>
                    </div>
                    
                    {appointment.student.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Phone</p>
                          <p className="text-lg font-semibold text-gray-900">{appointment.student.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject */}
                {appointment.student.subject && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="font-semibold text-blue-900">Subject</span>
                    </div>
                    <p className="text-blue-800">{appointment.student.subject}</p>
                  </div>
                )}

                {/* Message */}
                {appointment.student.message && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="font-semibold text-gray-700">Message</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{appointment.student.message}</p>
                  </div>
                )}

                {/* Teacher Response */}
                {appointment.teacherResponse?.responseMessage && (
                  <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-green-800">Teacher Response</span>
                    </div>
                    <p className="text-green-800 leading-relaxed mb-2">{appointment.teacherResponse.responseMessage}</p>
                    {appointment.teacherResponse.respondedAt && (
                      <p className="text-xs text-green-600">
                        Responded: {formatDateTime(appointment.teacherResponse.respondedAt)}
                      </p>
                    )}
                  </div>
                )}

                {/* Cancellation Info */}
                {appointment.cancellation?.cancellationReason && (
                  <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="font-semibold text-red-800">Cancellation Details</span>
                    </div>
                    <p className="text-red-800 leading-relaxed mb-2">{appointment.cancellation.cancellationReason}</p>
                    <p className="text-xs text-red-600">
                      Cancelled by: {appointment.cancellation.cancelledBy} • {formatDateTime(appointment.cancellation.cancelledAt)}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>Created: {formatDateTime(appointment.createdAt)}</span>
                    <span>Updated: {formatDateTime(appointment.updatedAt)}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      Created by: {appointment.createdBy}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  {['pending', 'confirmed', 'booked'].includes(appointment.status) && (
                    <button
                      onClick={() => handleCancelAppointment(appointment._id, appointment.status)}
                      disabled={loading}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Appointment
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {Math.min((pagination.currentPage - 1) * 10 + 1, pagination.totalCount)} to{' '}
              {Math.min(pagination.currentPage * 10, pagination.totalCount)} of {pagination.totalCount} appointments
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev || loading}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
                  let pageNumber;
                  if (pagination.totalPages <= 5) {
                    pageNumber = index + 1;
                  } else {
                    const current = pagination.currentPage;
                    const total = pagination.totalPages;
                    if (current <= 3) {
                      pageNumber = index + 1;
                    } else if (current >= total - 2) {
                      pageNumber = total - 4 + index;
                    } else {
                      pageNumber = current - 2 + index;
                    }
                  }
                  
                  const isCurrentPage = pageNumber === pagination.currentPage;
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      disabled={loading}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors disabled:cursor-not-allowed ${
                        isCurrentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext || loading}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAppointmentsList;