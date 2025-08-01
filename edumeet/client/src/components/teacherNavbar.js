import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Make sure this path is correct

const TeacherNavbar = () => {
  // Assuming useAuth provides isAuthenticated and logout for teachers too
  // Your AuthContext might need to differentiate roles or have a single logout
  const { isAuthenticated, logout } = useAuth(); 

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left Side: Teacher Title */}
          <div className="flex items-center">
            {isAuthenticated && ( // Only show if authenticated
              <span className="text-xl font-semibold tracking-wide">Teacher Dashboard</span>
            )}
          </div>

          {/* Right Side: Navigation Links (visible only if authenticated) */}
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  to="/teacher/schedule-appointment"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  Schedule Appointment
                </Link>
                <Link
                  to="/teacher/manage-appointments" // A more generic path for managing both approval/cancellation
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  Approve/Cancel Appointment
                </Link>
                <Link
                  to="/teacher/messages"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  View Messages
                </Link>
                <Link
                  to="/teacher/all-appointments"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  View All Appointments
                </Link>
                <button
                  onClick={logout}
                  className="bg-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              // If not authenticated, you might redirect to teacher login or show nothing
              null 
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TeacherNavbar;