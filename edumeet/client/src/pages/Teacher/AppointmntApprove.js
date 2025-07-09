import React, { useEffect, useState } from 'react';
import {
  Clock,
  CalendarDays,
  User,
  Phone
} from 'lucide-react';
import { apiMethods } from '../../services/api'; // adjust path based on your project

const StudentAppointmentManager = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await apiMethods.getAllAppointments();
      setAppointments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const id = selectedAppointment?._id;
    if (!id) return;

    setActionLoading(id);
    try {
      await apiMethods.cancelAppointment(id); // backend handles token auth
      setAppointments(prev => prev.filter(a => a._id !== id));
      setSuccess('Appointment cancelled successfully');
      closeCancelModal();
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const openCancelModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setSelectedAppointment(null);
    setCancelReason('');
    setShowCancelModal(false);
  };

  const formatDate = (date) =>
    new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">My Appointments</h1>

      {success && <div className="bg-green-100 text-green-800 p-3 mb-4 rounded">{success}</div>}
      {error && <div className="bg-red-100 text-red-800 p-3 mb-4 rounded">{error}</div>}

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <p className="text-center text-gray-400">You don’t have any appointments.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div key={appt._id} className="bg-white p-4 rounded shadow border">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4" /> {appt.teacherName || 'Unknown Teacher'}
                </div>
                <span className={`text-sm px-2 py-0.5 rounded-full flex items-center gap-1
                  ${appt.status === 'approved' ? 'bg-green-100 text-green-700'
                    : appt.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'}`}>
                  <Clock className="w-3 h-3" /> {appt.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                <CalendarDays className="w-4 h-4" /> {formatDate(appt.date)}
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4" /> {appt.contact || 'N/A'}
              </div>
              {appt.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => openCancelModal(appt)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Cancel Appointment</h2>
            <p className="mb-4 text-gray-600">
              Are you sure you want to cancel the appointment with <strong>{selectedAppointment?.teacherName}</strong>?
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2 border rounded mb-3"
              placeholder="Reason (optional)"
              rows={3}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeCancelModal}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading === selectedAppointment?._id}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === selectedAppointment?._id ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAppointmentManager;
