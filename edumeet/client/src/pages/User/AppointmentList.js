import React, { useState, useEffect } from 'react';

// The following is a mock API service to simulate fetching data from your backend.
// In a real application, you would replace this with actual fetch or axios calls
// to your `/api/v1/appointments/me` endpoint.
const mockApiMethods = {
  getCurrentUserAppointments: () => {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        // Mock data structure to match the frontend component's expectations
        const mockAppointments = [
          {
            _id: 'appt1',
            status: 'pending',
            date: '2025-09-25T10:00:00Z',
            time: '10:00 AM',
            day: 'Thursday',
            teacher: { name: 'Mr. David Johnson', email: 'david.j@example.com' },
            teacherName: 'Mr. David Johnson',
            student: { name: 'Jane Doe', email: 'jane.d@example.com', phone: '555-1234', subject: 'Algebra' },
            createdBy: 'student',
            notes: 'Need help with linear equations.'
          },
          {
            _id: 'appt2',
            status: 'confirmed',
            date: '2025-10-01T14:30:00Z',
            time: '02:30 PM',
            day: 'Wednesday',
            teacher: { name: 'Ms. Emily White', email: 'emily.w@example.com' },
            teacherName: 'Ms. Emily White',
            student: { name: 'Jane Doe', email: 'jane.d@example.com', subject: 'Biology' },
            createdBy: 'student',
            teacherResponse: { responseMessage: 'Confirmed. Looking forward to our session.' },
          },
          {
            _id: 'appt3',
            status: 'completed',
            date: '2025-08-20T09:00:00Z',
            time: '09:00 AM',
            day: 'Tuesday',
            teacher: { name: 'Mr. David Johnson', email: 'david.j@example.com' },
            teacherName: 'Mr. David Johnson',
            student: { name: 'Jane Doe', email: 'jane.d@example.com', subject: 'History' },
            createdBy: 'student',
            notes: 'Covered World War II topics.'
          },
          {
            _id: 'appt4',
            status: 'canceled',
            date: '2025-09-30T11:00:00Z',
            time: '11:00 AM',
            day: 'Tuesday',
            teacher: { name: 'Mr. David Johnson', email: 'david.j@example.com' },
            teacherName: 'Mr. David Johnson',
            student: { name: 'Jane Doe', email: 'jane.d@example.com', subject: 'Chemistry' },
            createdBy: 'student',
          },
        ];

        // Group appointments and calculate stats
        const grouped = mockAppointments.reduce((acc, appt) => {
          const status = appt.status.toLowerCase();
          if (!acc[status]) {
            acc[status] = [];
          }
          acc[status].push(appt);
          return acc;
        }, {});

        const stats = {
          total: mockAppointments.length,
          pending: grouped.pending?.length || 0,
          confirmed: grouped.confirmed?.length || 0,
          booked: grouped.booked?.length || 0,
          completed: grouped.completed?.length || 0,
          cancelled: grouped.canceled?.length || 0,
          // Assuming 'confirmed' and 'booked' are considered upcoming for this mock data
          upcoming: (grouped.confirmed?.length || 0) + (grouped.booked?.length || 0),
        };

        const userInfo = {
          name: 'Jane Doe',
          role: 'student',
        };

        resolve({
          data: {
            success: true,
            data: { appointments: mockAppointments, grouped, stats },
            userInfo,
          },
        });
      }, 1500); // 1.5 second delay
    });
  },
};

// Main App component
const Appp = () => {
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

      const response = await mockApiMethods.getCurrentUserAppointments();

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
    // Map 'cancelled' and 'rejected' to the same filter group if needed, or handle separately
    return grouped[filter] || [];
  };

  // Function to handle appointment actions (stubbed out for this mock)
  const handleAction = (appointmentId, action) => {
    console.log(`Performing ${action} on appointment ${appointmentId}`);
    // In a real app, this would trigger an API call and then refresh the data
    // For this mock, we'll just log and then force a data refresh to show state change
    setTimeout(() => {
      fetchMyAppointments();
    }, 500);
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      booked: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      canceled: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Conditional rendering for loading and error states
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
          <h3 className="text-xl font-medium text-red-800">Error fetching data</h3>
          <div className="mt-4 text-sm text-red-700">{error}</div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={fetchMyAppointments}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">My Appointments Dashboard</h1>
          <p className="mt-2 text-gray-600 text-lg">
            Welcome, <span className="font-semibold text-blue-600">{userInfo.name}</span>!
          </p>
          <p className="text-sm text-gray-500 mt-1">Your role: {userInfo.role}</p>
        </div>

        {/* Statistics Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6 border-b-4 border-blue-500">
            <p className="text-sm font-medium text-gray-600">Total Appointments</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-b-4 border-yellow-500">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-3xl font-semibold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-b-4 border-green-500">
            <p className="text-sm font-medium text-gray-600">Confirmed</p>
            <p className="text-3xl font-semibold text-green-600 mt-1">{stats.confirmed}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-b-4 border-gray-500">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-3xl font-semibold text-gray-600 mt-1">{stats.completed}</p>
          </div>
        </div>

        {/* Filter Tabs Section */}
        <div className="mb-6 bg-white rounded-xl shadow p-4">
          <div className="flex flex-wrap space-x-4 sm:space-x-6">
            {[
              { key: 'all', label: 'All', count: stats.total },
              { key: 'pending', label: 'Pending', count: stats.pending },
              { key: 'confirmed', label: 'Confirmed', count: stats.confirmed },
              { key: 'completed', label: 'Completed', count: stats.completed },
              { key: 'canceled', label: 'Canceled', count: stats.canceled },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-2 px-4 rounded-full font-medium text-sm transition-colors duration-200
                  ${filter === tab.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Appointments List Section */}
        <div className="space-y-6">
          {getFilteredAppointments().length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow">
              <p className="text-gray-500 text-lg">No appointments found for this status.</p>
            </div>
          ) : (
            getFilteredAppointments().map((appointment) => (
              <div key={appointment._id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {`Appointment with ${appointment.teacherName}`}
                      </h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(appointment.status)}`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600"><span className="font-medium">Date:</span> {formatDate(appointment.date)}</p>
                        <p className="text-sm text-gray-600"><span className="font-medium">Time:</span> {appointment.time}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600"><span className="font-medium">Teacher:</span> {appointment.teacherName}</p>
                        <p className="text-sm text-gray-600"><span className="font-medium">Subject:</span> {appointment.student.subject}</p>
                      </div>
                    </div>
                    
                    {appointment.notes && (
                      <p className="mt-3 text-sm text-gray-700">
                        <span className="font-medium">Notes:</span> {appointment.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Appp;
