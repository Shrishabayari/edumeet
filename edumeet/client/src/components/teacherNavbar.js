import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenManager } from '../services/api'

const TeacherNavbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  // Teacher-specific logout handler
  const handleTeacherLogout = async () => {
    try {
      // Call the teacher logout endpoint
      await logout(); // This should handle teacher logout in your AuthContext
      
      // Clear teacher-specific tokens
      tokenManager.removeTeacherToken();
      
      // Redirect to teacher login page
      navigate('/teacher/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      tokenManager.removeTeacherToken();
      navigate('/teacher/login');
    }
  };

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left Side: Teacher Title and Welcome */}
          <div className="flex items-center space-x-4">
            <Link to="/teacher/dashboard" className="text-xl font-semibold tracking-wide hover:text-gray-300">
              Teacher Dashboard
            </Link>
            {isAuthenticated && user && (
              <span className="text-sm text-gray-300">
                Welcome, {user.name || 'Teacher'}
              </span>
            )}
          </div>

          {/* Right Side: Navigation Links */}
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  to="/teacher/profile"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  Profile
                </Link>
                <Link
                  to="/teacher/appointments"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  My Appointments
                </Link>
                <Link
                  to="/teacher/schedule"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  Manage Schedule
                </Link>
                <Link
                  to="/teacher/messages"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  Messages
                </Link>
                <button
                  onClick={handleTeacherLogout}
                  className="bg-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex space-x-4">
                <Link
                  to="/teacher/login"
                  className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TeacherNavbar;
