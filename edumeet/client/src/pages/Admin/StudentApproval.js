import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, UserPlus, UserCheck, UserX, Info, Mail, GraduationCap, BookOpen } from 'lucide-react';
import { apiMethods, tokenManager } from '../../services/api';

const StudentApproval= () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedUserForRejection, setSelectedUserForRejection] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionStatus, setActionStatus] = useState(null);

  // Function to fetch pending registrations
  const fetchPendingRegistrations = useCallback(async () => {
    setLoading(true);
    setError('');
    setActionStatus(null);

    const adminToken = tokenManager.getAdminToken();
    if (!adminToken) {
      setError('Admin not authenticated. Please log in.');
      setLoading(false);
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 1500);
      return;
    }

    try {
      const response = await apiMethods.getPendingRegistrations();
      console.log('Pending registrations response:', response.data);
      
      // Handle different possible response formats
      let users = [];
      if (response.data) {
        if (response.data.data && Array.isArray(response.data.data.users)) {
          users = response.data.data.users;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          users = response.data.data;
        } else if (Array.isArray(response.data.users)) {
          users = response.data.users;
        } else if (Array.isArray(response.data)) {
          users = response.data;
        }
      }
      
      setPendingUsers(users);
      
      if (users.length === 0) {
        console.log('No pending users found');
      }
    } catch (err) {
      console.error('Error fetching pending registrations:', err);
      setError(err.message || 'Failed to fetch pending registrations.');
      setPendingUsers([]);
      
      // If 401 or 403, token might be expired or invalid
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        tokenManager.removeAdminToken();
        setTimeout(() => {
          window.location.href = '/admin/approval';
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
    if (!userId) {
      setError('Invalid user ID');
      return;
    }

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
      await apiMethods.rejectUser(selectedUserForRejection._id, rejectionReason.trim());
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

  // Helper function to safely get user info
  const getUserInfo = (user) => {
    return {
      id: user._id || user.id,
      name: user.name || 'Unknown',
      email: user.email || 'No email',
      role: user.role || 'student',
      profile: user.profile || {}
    };
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
                {pendingUsers.map(user => {
                  const userInfo = getUserInfo(user);
                  return (
                    <div key={userInfo.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center mb-3">
                          <UserPlus className="w-6 h-6 text-purple-600 mr-3" />
                          <h3 className="text-xl font-semibold text-gray-800">{userInfo.name}</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-1 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-500" /> 
                          {userInfo.email}
                        </p>
                        <p className="text-gray-600 text-sm mb-3 flex items-center">
                          <Info className="w-4 h-4 mr-2 text-gray-500" /> 
                          Role: <span className="font-medium capitalize ml-1">{userInfo.role}</span>
                        </p>
                        
                        {userInfo.role === 'student' && userInfo.profile.grade && (
                          <p className="text-gray-600 text-sm mb-3 flex items-center">
                            <GraduationCap className="w-4 h-4 mr-2 text-gray-500" /> 
                            Grade: <span className="font-medium ml-1">{userInfo.profile.grade}</span>
                          </p>
                        )}
                        {userInfo.role === 'teacher' && userInfo.profile.subject && (
                          <p className="text-gray-600 text-sm mb-3 flex items-center">
                            <BookOpen className="w-4 h-4 mr-2 text-gray-500" /> 
                            Subject: <span className="font-medium ml-1">{userInfo.profile.subject}</span>
                          </p>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleApproveUser(userInfo.id)}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50"
                          disabled={loading}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectionModal(user)}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50"
                          disabled={loading}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <UserX className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-800">Reject User Registration</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                You are about to reject the registration for{' '}
                <span className="font-medium">{selectedUserForRejection?.name}</span>.
                Please provide a reason for rejection.
              </p>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows="4"
                maxLength="500"
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeRejectionModal}
                  className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectUser}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50"
                  disabled={loading || !rejectionReason.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserX className="w-4 h-4 mr-2" />
                  )}
                  Reject User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentApproval;