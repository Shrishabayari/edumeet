import React, { useState, useEffect } from 'react';

// NOTE: This component is a single file for easy sharing.
// In a real application, tokenManager and API calls would be in separate files.

const tokenManager = {
  // Simulates a user being logged in for this example
  isUserLoggedIn: () => true,
  // Simulates getting the current user's info
  getCurrentUser: () => ({
    name: 'Jane Doe',
    role: 'student',
  }),
};

// This is a generic modal component to handle alerts and confirmations
const Modal = ({ title, message, onConfirm, onCancel, showInput, inputPlaceholder, onInputChange, inputValue }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-700 mb-4">{message}</p>
        {showInput && (
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200 mb-4"
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={onInputChange}
          />
        )}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {showInput ? 'Confirm' : 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const UserAppointmentsList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [userInfo, setUserInfo] = useState(null);
  const [modal, setModal] = useState({
    isVisible: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    showInput: false,
    inputValue: '',
  });

  useEffect(() => {
    fetchUserAppointments();
  }, [filter]);

  const fetchUserAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!tokenManager.isUserLoggedIn()) {
        setError('Please log in to view your appointments');
        setLoading(false);
        return;
      }

      console.log('Fetching appointments with filter:', filter);

      // --- USER ACTION REQUIRED ---
      // Replace this mock API call with your actual endpoint from api.js.
      // Example: const response = await apiMethods.getCurrentUserAppointments({ status: filter });
      const mockApiCall = new Promise((resolve) => {
        setTimeout(() => {
          const mockData = [
            {
              _id: '1', date: '2024-10-26T10:00:00Z', day: 'Saturday', time: '10:00 AM', status: 'pending', teacherName: 'Mr. Smith',
              student: { name: 'Jane Doe', email: 'jane.doe@example.com', subject: 'History', message: 'Need help with a paper on the Roman Empire.' }
            },
            {
              _id: '2', date: '2024-10-25T14:30:00Z', day: 'Friday', time: '02:30 PM', status: 'confirmed', teacherName: 'Ms. Johnson',
              student: { name: 'Jane Doe', email: 'jane.doe@example.com', subject: 'Math', message: 'Reviewing for my upcoming algebra exam.' }
            },
            {
              _id: '3', date: '2024-10-24T09:00:00Z', day: 'Thursday', time: '09:00 AM', status: 'completed', teacherName: 'Mr. Smith',
              student: { name: 'Jane Doe', email: 'jane.doe@example.com', subject: 'Science', message: 'Questions about cell biology.' }
            },
            {
              _id: '4', date: '2024-10-23T11:00:00Z', day: 'Wednesday', time: '11:00 AM', status: 'cancelled', teacherName: 'Ms. Johnson',
              cancellation: { cancellationReason: 'Student had a scheduling conflict.' },
              student: { name: 'Jane Doe', email: 'jane.doe@example.com', subject: 'English', message: 'Cancelled due to another appointment.' }
            },
          ];
          const filteredAppointments = filter !== 'all' ? mockData.filter(app => app.status === filter) : mockData;
          resolve({
            data: {
              success: true,
              data: { appointments: filteredAppointments },
              userInfo: tokenManager.getCurrentUser(),
            },
          });
        }, 500);
      });
      const response = await mockApiCall;
      // --- END OF MOCK API CALL ---

      console.log('API Response:', response.data);

      if (response.data.success) {
        const appointmentsData = response.data.data.appointments || [];
        const userInfoData = response.data.userInfo || null;

        setAppointments(appointmentsData);
        setUserInfo(userInfoData);

        console.log('Loaded appointments:', appointmentsData.length);
      } else {
        setError(response.data.message || 'Failed to fetch appointments');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      if (err.response?.status === 401) {
        setError('Please log in to view your appointments');
      } else if (err.response?.status === 400) {
        setError('Bad request. Please check your login status.');
      } else if (err.response?.status === 404) {
        setError('Appointments endpoint not found');
      } else {
        setError(err.message || 'Failed to fetch appointments');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
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

  const handleCancelRequest = (appointmentId) => {
    setModal({
      isVisible: true,
      title: 'Cancel Appointment',
      message: 'Please provide a reason for cancellation:',
      showInput: true,
      inputPlaceholder: 'Reason (optional)',
      inputValue: '',
      onInputChange: (e) => setModal(prev => ({ ...prev, inputValue: e.target.value })),
      onConfirm: () => confirmCancelAppointment(appointmentId),
      onCancel: () => setModal({ isVisible: false })
    });
  };

  const confirmCancelAppointment = async (appointmentId) => {
    setModal({ isVisible: false }); // Close the modal

    if (!appointmentId) {
      setModal({ isVisible: true, title: 'Error', message: 'Invalid appointment ID', onConfirm: () => setModal({ isVisible: false }) });
      return;
    }

    try {
      // --- USER ACTION REQUIRED ---
      // Replace this mock API call with your actual endpoint from api.js.
      // Example: await apiMethods.cancelAppointment(appointmentId, modal.inputValue);
      const mockApiCall = new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Mock: Cancelling appointment ID ${appointmentId} with reason: ${modal.inputValue}`);
          resolve({
            data: { success: true, message: 'Appointment cancelled successfully' }
          });
        }, 500);
      });
      await mockApiCall;
      // --- END OF MOCK API CALL ---

      fetchUserAppointments(); // Refresh the list
      setModal({
        isVisible: true,
        title: 'Success',
        message: 'Appointment cancelled successfully.',
        onConfirm: () => setModal({ isVisible: false }),
      });
    } catch (err) {
      console.error('Cancel error:', err);
      setModal({
        isVisible: true,
        title: 'Error',
        message: 'Failed to cancel appointment: ' + (err.message || 'Unknown error'),
        onConfirm: () => setModal({ isVisible: false }),
      });
    }
  };

  // Debug info
  const debugInfo = {
    userLoggedIn: tokenManager.isUserLoggedIn(),
    userInfo: tokenManager.getCurrentUser(),
    appointmentsCount: appointments.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 mt-1">{error}</p>

          {/* Debug Information */}
          <details className="mt-4 text-sm">
            <summary className="text-red-600 cursor-pointer">Debug Info</summary>
            <pre className="mt-2 bg-red-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>

          <div className="mt-4">
            <button
              onClick={fetchUserAppointments}
              className="bg-red-100 px-3 py-2 rounded text-red-800 hover:bg-red-200 mr-2"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-100 px-3 py-2 rounded text-blue-800 hover:bg-blue-200"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">My Appointments</h1>
        {userInfo && (
          <p className="text-gray-600">
            Welcome, {userInfo.name} ({userInfo.role})
          </p>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'confirmed', 'booked', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded text-sm capitalize ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? "You don't have any appointments yet."
              : `No ${filter} appointments found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment._id}
              className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.toUpperCase()}
                    </span>
                    <span className="ml-3 font-medium text-gray-900">
                      {userInfo?.role === 'teacher'
                        ? (appointment.student?.name || 'Unknown Student')
                        : (appointment.teacherName || 'Unknown Teacher')
                      }
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Date:</span> {formatDate(appointment.date)} ({appointment.day})
                    </p>
                    <p>
                      <span className="font-medium">Time:</span> {appointment.time}
                    </p>
                    {appointment.student && (
                      <>
                        {userInfo?.role !== 'teacher' && (
                          <p>
                            <span className="font-medium">Student:</span> {appointment.student.name}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Email:</span> {appointment.student.email}
                        </p>
                        {appointment.student.phone && (
                          <p>
                            <span className="font-medium">Phone:</span> {appointment.student.phone}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {appointment.student?.subject && (
                    <div className="mt-3 p-2 bg-gray-50 rounded">
                      <p className="text-sm">
                        <span className="font-medium">Subject:</span> {appointment.student.subject}
                      </p>
                    </div>
                  )}

                  {appointment.student?.message && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="text-sm">
                        <span className="font-medium">Message:</span> {appointment.student.message}
                      </p>
                    </div>
                  )}

                  {appointment.teacherResponse?.responseMessage && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Teacher Response:</span> {appointment.teacherResponse.responseMessage}
                      </p>
                    </div>
                  )}

                  {appointment.cancellation?.cancellationReason && (
                    <div className="mt-2 p-2 bg-red-50 rounded">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">Cancellation Reason:</span> {appointment.cancellation.cancellationReason}
                      </p>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  {(appointment.status === 'pending' ||
                    appointment.status === 'confirmed' ||
                    appointment.status === 'booked') && (
                    <button
                      onClick={() => handleCancelRequest(appointment._id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Debug Panel */}
      <details className="mt-8 text-xs">
        <summary className="cursor-pointer text-gray-500">Debug Info</summary>
        <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>

      {modal.isVisible && (
        <Modal
          title={modal.title}
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
          showInput={modal.showInput}
          inputPlaceholder={modal.inputPlaceholder}
          inputValue={modal.inputValue}
          onInputChange={modal.onInputChange}
        />
      )}
    </div>
  );
};

export default UserAppointmentsList;
