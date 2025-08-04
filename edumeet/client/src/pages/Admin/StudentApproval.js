import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, UserPlus, UserCheck, UserX, Info, Mail, GraduationCap, BookOpen } from 'lucide-react';
import AdminNavbar from '../../components/adminNavbar';

const tempApiMethods = {
  getPendingRegistrations: async () => {
    const adminToken = localStorage.getItem('adminToken');
    const response = await fetch('https://edumeet.onrender.com/auth/admin/pending', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  approveUser: async (userId) => {
    const adminToken = localStorage.getItem('adminToken');
    const response = await fetch(`https://edumeet.onrender.com/auth/admin/approve/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  rejectUser: async (userId, reason) => {
    const adminToken = localStorage.getItem('adminToken');
    const response = await fetch(`https://edumeet.onrender.com/auth/admin/reject/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
};

const tempTokenManager = {
  getAdminToken: () => localStorage.getItem('adminToken'),
  removeAdminToken: () => localStorage.removeItem('adminToken')
};

const UserApproval = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedUserForRejection, setSelectedUserForRejection] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionStatus, setActionStatus] = useState(null);
  const [processingUserId, setProcessingUserId] = useState(null);

  const fetchPendingRegistrations = useCallback(async () => {
    setLoading(true);
    setError('');
    setActionStatus(null);

    const adminToken = tempTokenManager.getAdminToken();
    console.log('Admin token check:', adminToken ? 'Token exists' : 'No token found');
    
    if (!adminToken) {
      setError('Admin not authenticated. Please log in.');
      setLoading(false);
      console.log('No admin token found, will redirect in 3 seconds...');
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 3000);
      return;
    }

    try {
      console.log('Attempting to fetch pending registrations...');
      console.log('Using token:', adminToken ? 'Token available' : 'No token');
      
      const response = await tempApiMethods.getPendingRegistrations();
      console.log('API Response received:', response);
      console.log('Response data:', response?.data);
      
      let users = [];
      if (response.data) {
        if (response.data.users && Array.isArray(response.data.users)) {
          users = response.data.users;
        } else if (Array.isArray(response.data)) {
          users = response.data;
        }
      } else if (response.users && Array.isArray(response.users)) {
        users = response.users;
      }
      
      setPendingUsers(users);
      
      if (users.length === 0) {
        console.log('No pending users found - this is normal if all users are approved');
      } else {
        console.log(`Found ${users.length} pending users`);
      }
    } catch (err) {
      console.error('Error fetching pending registrations:', err);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      
      setError(err.message || 'Failed to fetch pending registrations.');
      setPendingUsers([]);
      
      if (err.message?.includes('401') || err.message?.includes('403')) {
        console.log('Authentication error detected, removing token and redirecting...');
        tempTokenManager.removeAdminToken();
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingRegistrations();
  }, [fetchPendingRegistrations]);

  const handleApproveUser = async (userId) => {
    if (!userId) {
      setError('Invalid user ID');
      return;
    }

    setProcessingUserId(userId);
    setError('');
    setActionStatus(null);
    
    try {
      await tempApiMethods.approveUser(userId);
      setActionStatus('success');
      // Remove the approved user from the list immediately for better UX
      setPendingUsers(prev => prev.filter(user => getUserInfo(user).id !== userId));
    } catch (err) {
      console.error('Error approving user:', err);
      setError(err.message || 'Failed to approve user.');
      setActionStatus('error');
    } finally {
      setProcessingUserId(null);
    }
  };

  const openRejectionModal = (user) => {
    setSelectedUserForRejection(user);
    setRejectionReason('');
    setShowRejectionModal(true);
    setError('');
  };

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

    const userId = getUserInfo(selectedUserForRejection).id;
    setProcessingUserId(userId);
    setError('');
    setActionStatus(null);
    
    try {
      await tempApiMethods.rejectUser(userId, rejectionReason.trim());
      setActionStatus('success');
      closeRejectionModal();
      // Remove the rejected user from the list immediately for better UX
      setPendingUsers(prev => prev.filter(user => getUserInfo(user).id !== userId));
    } catch (err) {
      console.error('Error rejecting user:', err);
      setError(err.message || 'Failed to reject user.');
      setActionStatus('error');
    } finally {
      setProcessingUserId(null);
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
    <>
    <AdminNavbar/>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <style>{`
          .animate-fade-in {
            animation: fadeIn 0.3s ease-in-out;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-pulse-slow {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
        
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
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <span className="text-red-700 font-medium text-sm flex-grow">{error}</span>
                <button
                  onClick={() => setError('')}
                  className="ml-2 text-red-500 hover:text-red-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0"
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
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-green-700 font-medium text-sm flex-grow">Action completed successfully!</span>
                <button
                  onClick={() => setActionStatus(null)}
                  className="ml-2 text-green-500 hover:text-green-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 flex-shrink-0"
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
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <span className="text-red-700 font-medium text-sm flex-grow">Action failed. Please try again.</span>
                <button
                  onClick={() => setActionStatus(null)}
                  className="ml-2 text-red-500 hover:text-red-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0"
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
                    const isProcessing = processingUserId === userInfo.id;
                    
                    return (
                      <div key={userInfo.id} className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col justify-between transition-all duration-200 ${isProcessing ? 'opacity-75 animate-pulse-slow' : ''}`}>
                        <div>
                          <div className="flex items-center mb-3">
                            <UserPlus className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0" />
                            <h3 className="text-xl font-semibold text-gray-800 truncate">{userInfo.name}</h3>
                          </div>
                          <p className="text-gray-600 text-sm mb-1 flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" /> 
                            <span className="truncate">{userInfo.email}</span>
                          </p>
                          <p className="text-gray-600 text-sm mb-3 flex items-center">
                            <Info className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" /> 
                            Role: <span className="font-medium capitalize ml-1">{userInfo.role}</span>
                          </p>
                          
                          {userInfo.role === 'student' && userInfo.profile.grade && (
                            <p className="text-gray-600 text-sm mb-3 flex items-center">
                              <GraduationCap className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" /> 
                              Grade: <span className="font-medium ml-1">{userInfo.profile.grade}</span>
                            </p>
                          )}
                          {userInfo.role === 'teacher' && userInfo.profile.subject && (
                            <p className="text-gray-600 text-sm mb-3 flex items-center">
                              <BookOpen className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" /> 
                              Subject: <span className="font-medium ml-1">{userInfo.profile.subject}</span>
                            </p>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleApproveUser(userInfo.id)}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4 mr-2" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectionModal(user)}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isProcessing}
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
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
                <div className="flex items-center mb-4">
                  <UserX className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
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
                  disabled={processingUserId !== null}
                />
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={closeRejectionModal}
                    className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={processingUserId !== null}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectUser}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={processingUserId !== null || !rejectionReason.trim()}
                  >
                    {processingUserId !== null ? (
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
    </>
  );
};

export default UserApproval;