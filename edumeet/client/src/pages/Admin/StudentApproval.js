import React, { useState, useEffect, useCallback } from 'react';
// Corrected import: Ensure Mail, GraduationCap, and BookOpen are explicitly listed
import { CheckCircle, XCircle, AlertCircle, Loader2, UserPlus, UserCheck, UserX, Info, Mail, GraduationCap, BookOpen } from 'lucide-react';
import { apiMethods, tokenManager } from '../../services/api'; // Adjust path as necessary

const AdminUserApprovalPage = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedUserForRejection, setSelectedUserForRejection] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionStatus, setActionStatus] = useState(null); // 'success' or 'error' for approval/rejection actions

  // Function to fetch pending registrations
  const fetchPendingRegistrations = useCallback(async () => {
    setLoading(true);
    setError('');
    setActionStatus(null); // Clear action status on new fetch

    const adminToken = tokenManager.getAdminToken();
    if (!adminToken) {
      setError('Admin not authenticated. Please log in.');
      setLoading(false);
      // Redirect to admin login if no token
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 1500);
      return;
    }

    try {
      // Use the correct API method for fetching pending registrations
      const response = await apiMethods.getPendingRegistrations();
      // Assuming response.data.data.users contains the array of pending users
      if (response.data && response.data.data && Array.isArray(response.data.data.users)) {
        setPendingUsers(response.data.data.users);
      } else {
        setPendingUsers([]);
        console.warn('Unexpected response format for pending registrations:', response.data);
      }
    } catch (err) {
      console.error('Error fetching pending registrations:', err);
      setError(err.message || 'Failed to fetch pending registrations.');
      setPendingUsers([]);
      // If 401, token might be expired or invalid, redirect to login
      if (err.response && err.response.status === 401) {
        tokenManager.removeAdminToken();
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to fetch data on component mount
  useEffect(() => {
    fetchPendingRegistrations();
  }, [fetchPendingRegistrations]);

  // Handle user approval
  const handleApproveUser = async (userId) => {
    setLoading(true);
    setError('');
    setActionStatus(null);
    try {
      await apiMethods.approveUser(userId);
      setActionStatus('success');
      // Re-fetch pending users to update the list
      await fetchPendingRegistrations();
    } catch (err) {
      console.error('Error approving user:', err);
      setError(err.message || 'Failed to approve user.');
      setActionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Open rejection modal
  const openRejectionModal = (user) => {
    setSelectedUserForRejection(user);
    setRejectionReason('');
    setShowRejectionModal(true);
    setError('');
  };

  // Close rejection modal
  const closeRejectionModal = () => {
    setShowRejectionModal(false);
    setSelectedUserForRejection(null);
    setRejectionReason('');
  };

  // Handle user rejection
  const handleRejectUser = async () => {
    if (!selectedUserForRejection || !rejectionReason.trim()) {
      setError('Please provide a rejection reason.');
      return;
    }

    setLoading(true);
    setError('');
    setActionStatus(null);
    try {
      await apiMethods.rejectUser(selectedUserForRejection._id, { reason: rejectionReason.trim() });
      setActionStatus('success');
      closeRejectionModal();
      // Re-fetch pending users to update the list
      await fetchPendingRegistrations();
    } catch (err) {
      console.error('Error rejecting user:', err);
      setError(err.message || 'Failed to reject user.');
      setActionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                User Approval Dashboard
              </h1>
              <p className="text-gray-600">Review and manage pending user registrations.</p>
            </div>
            <div className="text-right">
              <button
                onClick={fetchPendingRegistrations}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center"
                disabled={loading}
              >
                <Loader2 className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 font-medium text-sm">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Close error alert"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Action Status Message */}
        {actionStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-700 font-medium text-sm">Action successful!</span>
              <button
                onClick={() => setActionStatus(null)}
                className="ml-auto text-green-500 hover:text-green-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Close success alert"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        {actionStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 font-medium text-sm">Action failed. Please try again.</span>
              <button
                onClick={() => setActionStatus(null)}
                className="ml-auto text-red-500 hover:text-red-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Close error alert"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator for main content */}
        {loading && pendingUsers.length === 0 && !error ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading pending registrations...</h3>
            <p className="text-gray-500">Please wait while we fetch the latest data.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <UserCheck className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No pending registrations!</h3>
                <p className="text-gray-500">All users have been reviewed and processed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.map(user => (
                  <div key={user._id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center mb-3">
                        <UserPlus className="w-6 h-6 text-purple-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-800">{user.name}</h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-1 flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-500" /> {user.email}</p>
                      <p className="text-gray-600 text-sm mb-3 flex items-center"><Info className="w-4 h-4 mr-2 text-gray-500" /> Role: <span className="font-medium capitalize ml-1">{user.role}</span></p>
                      
                      {user.role === 'student' && user.profile?.grade && (
                        <p className="text-gray-600 text-sm flex items-center"><GraduationCap className="w-4 h-4 mr-2 text-gray-500" /> Grade: <span className="font-medium ml-1">{user.profile.grade}</span></p>
                      )}
                      {user.role === 'teacher' && user.profile?.subject && (
                        <p className="text-gray-600 text-sm flex items-center"><BookOpen className="w-4 h-4 mr-2 text-gray-500" /> Subject: <span className="font-medium ml-1">{user.profile.subject}</span></p>
                      )}
                      {user.role === 'teacher' && user.profile?.department && (
                        <p className="text-gray-600 text-sm flex items-center"><Info className="w-4 h-4 mr-2 text-gray-500" /> Department: <span className="font-medium ml-1">{user.profile.department}</span></p>
                      )}
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={() => handleApproveUser(user._id)}
                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 shadow-md flex items-center justify-center text-sm"
                        disabled={loading}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </button>
                      <button
                        onClick={() => openRejectionModal(user)}
                        className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md flex items-center justify-center text-sm"
                        disabled={loading}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && selectedUserForRejection && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100 opacity-100">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Reject User: {selectedUserForRejection.name}</h2>
              <button
                onClick={closeRejectionModal}
                className="text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded-full p-1"
                aria-label="Close rejection modal"
              >
                <XCircle className="w-7 h-7" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-red-700 text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}
              <p className="text-gray-700">Please provide a reason for rejecting this user's registration:</p>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-y"
                rows="4"
                placeholder="e.g., Incomplete profile, invalid credentials, not meeting criteria..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={loading}
              ></textarea>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeRejectionModal}
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectUser}
                  className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-5 h-5 mr-2" />
                  ) : (
                    <UserX className="w-5 h-5 mr-2" />
                  )}
                  Reject User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserApprovalPage;
