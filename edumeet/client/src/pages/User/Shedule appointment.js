import React, { useState, useEffect } from 'react';
import { apiMethods } from '../../services/api'; // adjust path as needed

const UserScheduleAppointments = () => {
  const [teachers, setTeachers] = useState([]);
  const [formData, setFormData] = useState({
    teacher: '',
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    appointmentDate: '',
    timeSlot: ''
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 1:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM',
    '5:00 PM - 6:00 PM'
  ];

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await apiMethods.getAllTeachers();
        setTeachers(response.data || []);
      } catch (error) {
        console.error('Error fetching teachers:', error.message);
        setErrorMsg('Failed to load teachers. Please try again.');
      }
    };
    fetchTeachers();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const appointmentPayload = {
      teacher: formData.teacher,
      student: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message
      },
      appointmentDate: formData.appointmentDate,
      timeSlot: formData.timeSlot
    };

    try {
      await apiMethods.bookAppointment(appointmentPayload);
      setSuccessMsg('✅ Appointment scheduled successfully!');
      setErrorMsg('');
      setFormData({
        teacher: '',
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        appointmentDate: '',
        timeSlot: ''
      });
    } catch (error) {
      console.error('Error booking appointment:', error.message);
      setErrorMsg(error.message || 'Failed to schedule appointment');
      setSuccessMsg('');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-bold mb-4 text-center text-blue-600">📅 Schedule an Appointment</h2>

      {successMsg && <div className="text-green-600 mb-3">{successMsg}</div>}
      {errorMsg && <div className="text-red-600 mb-3">{errorMsg}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Teacher */}
        <div>
          <label className="block font-medium mb-1">Select Teacher</label>
          <select
            name="teacher"
            value={formData.teacher}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">-- Select Teacher --</option>
            
          </select>
        </div>

        {/* Student Inputs */}
        {['name', 'email', 'phone', 'subject'].map((field) => (
          <div key={field}>
            <label className="block font-medium mb-1 capitalize">{field}</label>
            <input
              name={field}
              value={formData[field]}
              onChange={handleChange}
              required
              type={field === 'email' ? 'email' : 'text'}
              className="w-full p-2 border rounded"
              placeholder={`Enter your ${field}`}
            />
          </div>
        ))}

        {/* Message */}
        <div>
          <label className="block font-medium mb-1">Message (optional)</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border rounded"
            placeholder="Your message to the teacher"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block font-medium mb-1">Appointment Date</label>
          <input
            type="date"
            name="appointmentDate"
            value={formData.appointmentDate}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Time Slot */}
        <div>
          <label className="block font-medium mb-1">Time Slot</label>
          <select
            name="timeSlot"
            value={formData.timeSlot}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">-- Select Time Slot --</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Submit Appointment
        </button>
      </form>
    </div>
  );
};

export default UserScheduleAppointments;
