import React, { useState, useEffect } from 'react';
import { User, Calendar, CheckCircle, XCircle, AlertCircle, BookOpen } from 'lucide-react';
import { apiMethods } from '../../services/api'; // Assuming this path is correct

const AppointmentList = ({ initialAppointments = [], onAppointmentUpdate }) => {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiMethods.getAllAppointments();
      let appointmentsArray = [];
      const data = response.data;

      // Handle different response formats
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
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiMethods.cancelAppointment(appointmentId);
      setAppointments(prevAppointments =>
        Array.isArray(prevAppointments)
          ? prevAppointments.filter(apt => (apt.id || apt._id) !== appointmentId)
          : []
      );
      if (onAppointmentUpdate) {
        onAppointmentUpdate(
          appointments.filter(apt => (apt.id || apt._id) !== appointmentId)
        );
      }
    } catch (error) {
      console.error('Error canceling appointment:', error);
      setError('Failed to cancel appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  return (
    <div className="p-4">
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

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {safeAppointments.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No appointments yet</h3>
            <p className="text-gray-500">Book your first appointment to get started!</p>
          </div>
        ) : (
          safeAppointments.map(appointment => (
            <div key={appointment.id || appointment._id} className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-green-400 to-blue-500 p-3 rounded-full">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{appointment.teacherName}</h3>
                    <h5 className="text-sm font-semibold text-gray-600">{appointment.teacherId?.email || appointment.teacher?.email}</h5>
                    <p className="text-gray-600">{formatDateForDisplay(appointment.date || appointment.appointmentDate)}</p>
                    <p className="text-sm text-gray-500">{appointment.day} at {appointment.time} - {appointment.student?.subject || 'General'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-1" />
                    <span className="text-sm font-medium capitalize">{appointment.status || 'Pending'}</span>
                  </div>
                  <button
                    onClick={() => cancelAppointment(appointment.id || appointment._id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AppointmentList;