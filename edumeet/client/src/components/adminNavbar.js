import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminNavbar = () => {
  const { isAuthenticated, logout } = useAuth(); // 'user' is not strictly used here, but good practice to keep if potentially needed.

  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Display "Admin" only if authenticated */}
            {isAuthenticated && (
              <span className="text-white text-xl font-bold">Admin</span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Admin specific links */}
                <Link
                  to="/admin/add-teacher"
                  className="text-white hover:text-blue-200"
                >
                  Add Teacher
                </Link>
                <Link
                  to="/admin/manage-teacher"
                  className="text-white hover:text-blue-200"
                >
                  Manage Teacher
                </Link>
                <Link
                  to="/admin/student-approval"
                  className="text-white hover:text-blue-200"
                >
                  Student Approval
                </Link>
                <button
                  onClick={logout}
                  className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
                >
                  Logout
                </button>
              </>
            ) : (
              // Optionally, you can leave this empty or add a single login link here.
              // For this specific request, it's left empty if not authenticated.
              null
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;