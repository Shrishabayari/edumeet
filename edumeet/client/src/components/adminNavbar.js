import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenManager, apiMethods } from '../services/api';

const AdminNavbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  // Debug current authentication state
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('AdminNavbar - Auth State:', {
        isAuthenticated,
        user,
        currentRole: tokenManager.getCurrentRole(),
        adminToken: tokenManager.getAdminToken(),
        hasAdminData: !!localStorage.getItem('admin')
      });
    }
  }, [isAuthenticated, user]);

  // Admin-specific logout handler
  const handleAdminLogout = async () => {
    try {
      // Call the admin logout endpoint
      await apiMethods.admin.logout();
      
      // Clear admin-specific tokens
      tokenManager.removeAdminToken();
      
      // Clear auth context
      await logout();
      
      // Redirect to admin login page
      navigate('/admin/login');
    } catch (error) {
      console.error('Admin logout error:', error);
      // Force logout even if API call fails
      tokenManager.removeAdminToken();
      try {
        await logout();
      } catch (logoutError) {
        console.error('Auth context logout error:', logoutError);
      }
      navigate('/admin/login');
    }
  };

  // FIXED: Check if current user is admin - Don't rely solely on AuthContext
  const isAdmin = () => {
    const role = tokenManager.getCurrentRole();
    const adminData = localStorage.getItem('admin');
    const adminToken = tokenManager.getAdminToken();
    
    // Check if we have admin credentials regardless of AuthContext state
    const hasAdminCredentials = role === 'admin' && adminData && adminToken;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('isAdmin check:', {
        role,
        hasAdminData: !!adminData,
        hasAdminToken: !!adminToken,
        isAuthenticated,
        hasAdminCredentials,
        finalResult: hasAdminCredentials && !tokenManager.isTokenExpired('admin')
      });
    }
    
    // Return true if we have admin credentials and token is not expired
    return hasAdminCredentials && !tokenManager.isTokenExpired('admin');
  };

  // FIXED: Get admin user data directly from localStorage if AuthContext user is not available
  const getAdminUser = () => {
    if (user && user.role === 'admin') {
      return user;
    }
    
    // Fallback to localStorage admin data
    try {
      const adminData = localStorage.getItem('admin');
      if (adminData) {
        return JSON.parse(adminData);
      }
    } catch (error) {
      console.error('Error parsing admin data:', error);
    }
    
    return null;
  };

  const adminUser = getAdminUser();
  const isAdminLoggedIn = isAdmin();

  return (
    <nav className="bg-gray-900 text-white shadow-lg border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left Side: Admin Title and Welcome */}
          <div className="flex items-center space-x-4">
            <Link 
              to={isAdminLoggedIn ? "/admin/dashboard" : "/admin/login"}
              className="text-xl font-bold tracking-wide hover:text-blue-300 transition-colors duration-200"
            >
              Admin Panel
            </Link>
            {isAdminLoggedIn && adminUser && (
              <span className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-full">
                Welcome, {adminUser.name || adminUser.username || 'Admin'} 
                <span className="ml-2 text-xs text-blue-300">({adminUser.role || 'admin'})</span>
              </span>
            )}
          </div>

          {/* Right Side: Navigation Links */}
          <div className="flex items-center space-x-6">
            {isAdminLoggedIn ? (
              <>
                <Link
                  to="/admin/dashboard"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/users"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  Manage Users
                </Link>
                <Link
                  to="/admin/teachers"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  Manage Teachers
                </Link>
                <Link
                  to="/admin/appointments"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  Appointments
                </Link>
                <Link
                  to="/admin/reports"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  Reports
                </Link>
                <Link
                  to="/admin/profile"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  Profile
                </Link>
                <button
                  onClick={handleAdminLogout}
                  className="bg-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex space-x-4">
                <Link
                  to="/admin/login"
                  className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Admin Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-600 text-black px-4 py-2 text-xs">
          <strong>DEBUG:</strong> 
          Role: {tokenManager.getCurrentRole()} | 
          Auth Context: {isAuthenticated.toString()} | 
          Admin Check: {isAdminLoggedIn.toString()} |
          Token: {tokenManager.getAdminToken() ? 'Present' : 'Missing'} |
          Token Expired: {tokenManager.isTokenExpired('admin').toString()} |
          Admin User: {adminUser ? adminUser.name || adminUser.username || 'Present' : 'Missing'}
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;