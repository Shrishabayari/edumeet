import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock, User } from 'lucide-react';
import { apiMethods } from '../../services/api';

const ViewAllAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await apiMethods.getAllAppointments();
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err.message);
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const options = {
      dateStyle: 'medium',
      timeStyle: 'short'
    };
    return new Date(dateString).toLocaleString('en-IN', options);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded-lg">
      <h1 className="text-2xl font-semibold mb-4">📅 My Appointments</h1>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && appointments.length === 0 && (
        <p className="text-gray-400">No appointments found.</p>
      )}

      <div className="space-y-4">
        {appointments.map((appt) => (
          <div key={appt._id} className="border p-4 rounded shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4" />
                {appt.teacherName || 'Unknown Teacher'}
              </div>
              <span
                className={`text-sm px-2 py-0.5 rounded-full capitalize
                ${appt.status === 'approved' ? 'bg-green-100 text-green-700'
                  : appt.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'}`}
              >
                <Clock className="w-3 h-3 inline-block mr-1" />
                {appt.status}
              </span>
            </div>

            <div className="text-sm text-gray-600 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {formatDateTime(appt.date)}
            </div>
            {appt.reason && (
              <p className="mt-2 text-gray-500 text-sm">
                <strong>Reason:</strong> {appt.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewAllAppointments;
