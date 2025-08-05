import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, UserPlus, UserCheck, UserX, Info, Mail, GraduationCap, BookOpen } from 'lucide-react';
import AdminNavbar from '../../components/adminNavbar';

const tempApiMethods = {
  getPendingRegistrations: async () => {
    const adminToken = localStorage.getItem('adminToken');
    
    // Try multiple possible endpoints
    const possibleEndpoints = [
      'https://edumeet.onrender.com/auth/admin/pending',
      'https://edumeet.onrender.com/admin/pending', 
      'https://edumeet.onrender.com/api/auth/admin/pending',
      'https://edumeet.onrender.com/api/admin/pending'
    ];

    let lastError = null;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log(`Success with endpoint: ${endpoint}`);
          return response.json();
        } else if (response.status !== 404) {
          // If it's not a 404, throw the error
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // If it's 404, continue to next endpoint
        console.log(`404 for endpoint: ${endpoint}, trying next...`);
      } catch (error) {
        console.log(`Error with endpoint ${endpoint}:`, error.message);
        lastError = error;
        // Continue to next endpoint
      }
    }
    
    // If all endpoints failed, throw the last error
    throw lastError || new Error('All API endpoints failed');
  },
  
  approveUser: async (userId) => {
    const adminToken = localStorage.getItem('adminToken');
    
    // Try multiple possible endpoints for approve
    const possibleEndpoints = [
      `https://edumeet.onrender.com/auth/admin/approve/${userId}`,
      `https://edumeet.onrender.com/admin/approve/${userId}`,
      `https://edumeet.onrender.com/api/auth/admin/approve/${userId}`,
      `https://edumeet.onrender.com/api/admin/approve/${userId}`
    ];

    let lastError = null;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying approve endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log(`Success with approve endpoint: ${endpoint}`);
          return response.json();
        } else if (response.status !== 404) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        console.log(`404 for approve endpoint: ${endpoint}, trying next...`);
      } catch (error) {
        console.log(`Error with approve endpoint ${endpoint}:`, error.message);
        lastError = error;
      }
    }
    
    throw lastError || new Error('All approve API endpoints failed');
  },
  
  rejectUser: async (userId, reason) => {
    const adminToken = localStorage.getItem('adminToken');
    
    // Try multiple possible endpoints for reject
    const possibleEndpoints = [
      `https://edumeet.onrender.com/auth/admin/reject/${userId}`,
      `https://edumeet.onrender.com/admin/reject/${userId}`,
      `https://edumeet.onrender.com/api/auth/admin/reject/${userId}`,
      `https://edumeet.onrender.com/api/admin/reject/${userId}`
    ];

    let lastError = null;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying reject endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        });
        
        if (response.ok) {
          console.log(`Success with reject endpoint: ${endpoint}`);
          return response.json();
        } else if (response.status !== 404) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        console.log(`404 for reject endpoint: ${endpoint}, trying next...`);
      } catch (error) {
        console.log(`Error with reject endpoint ${endpoint}:`, error.message);
        lastError = error;
      }
    }
    
    throw lastError || new Error('All reject API endpoints failed');
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
  const [debugInfo, setDebugInfo] = useState('');

  const fetchPendingRegistrations = useCallback(async () => {
    setLoading(true);
    setError('');
    setActionStatus(null);
    setDebugInfo('');

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
      
      const response = await tempApiMethods.getPendingRegistrations();
      console.log('API Response received:', response);
      
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
      setDebugInfo(`Successfully loaded ${users.length} pending users`);
      
      if (users.length === 0) {
        console.log('No pending users found - this is normal if all users are approved');
      } else {
        console.log(`Found ${users.length} pending users`);
      }
    } catch (err) {
      console.error('Error fetching pending registrations:', err);
      
      setError(`Failed to fetch pending registrations: ${err.message}`);
      setDebugInfo(`Error details: ${err.message}. Please check if the API endpoints are correct and the server is running.`);
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
      setDebugInfo('User approved successfully');
    } catch (err) {
      console.error('Error approving user:', err);
      setError(`Failed to approve user: ${err.message}`);
      setActionStatus('error');
      setDebugInfo(`Approve error: ${err.message}`);
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
      setDebugInfo('User rejected successfully');
    } catch (err) {
      console.error('Error rejecting user:', err);
      setError(`Failed to reject user: ${err.message}`);
      setActionStatus('error');
      setDebugInfo(`Reject error: ${err.message}`);
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
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  User Approval Dashboard
                </h1>
                <p className="text-gray-600 text-lg">Review and manage pending user registrations.</p>
                {debugInfo && (
                  <p className="text-blue-600 text-sm mt-2">Debug: {debugInfo}</p>
                )}
              </div>
              <div className="text-right">
                <button
                  onClick={fetchPendingRegistrations}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  disabled={loading}
                >
                  <Loader2 className={`w-6 h-6 mr-3 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Refreshing...' : 'Refresh List'}
                </button>
              </div>
            </div>
          </div>

          {/* Global Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 animate-fade-in">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                <div className="flex-grow">
                  <span className="text-red-700 font-medium text-base block">{error}</span>
                  {debugInfo && (
                    <span className="text-red-600 text-sm mt-1 block">{debugInfo}</span>
                  )}
                </div>
                <button
                  onClick={() => setError('')}
                  className="ml-3 text-red-500 hover:text-red-700 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0"
                  aria-label="Close error alert"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {/* Action Status Message */}
          {actionStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 animate-fade-in">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-green-700 font-medium text-base flex-grow">Action completed successfully!</span>
                <button
                  onClick={() => setActionStatus(null)}
                  className="ml-3 text-green-500 hover:text-green-700 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 flex-shrink-0"
                  aria-label="Close success alert"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
          
          {actionStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 animate-fade-in">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                <span className="text-red-700 font-medium text-base flex-grow">Action failed. Please try again.</span>
                <button
                  onClick={() => setActionStatus(null)}
                  className="ml-3 text-red-500 hover:text-red-700 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0"
                  aria-label="Close error alert"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator for main content */}
          {loading && pendingUsers.length === 0 && !error ? (
            <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
              <Loader2 className="w-20 h-20 text-blue-600 mx-auto mb-6 animate-spin" />
              <h3 className="text-2xl font-semibold text-gray-600 mb-3">Loading pending registrations...</h3>
              <p className="text-gray-500 text-lg">Please wait while we fetch the latest data.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingUsers.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
                  <UserCheck className="w-20 h-20 text-green-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-gray-600 mb-3">No pending registrations!</h3>
                  <p className="text-gray-500 text-lg">All users have been reviewed and processed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {pendingUsers.map(user => {
                    const userInfo = getUserInfo(user);
                    const isProcessing = processingUserId === userInfo.id;
                    
                    return (
                      <div key={userInfo.id} className={`bg-white rounded-2xl shadow-lg p-8 border border-gray-100 flex flex-col justify-between transition-all duration-200 hover:shadow-xl min-h-[320px] ${isProcessing ? 'opacity-75 animate-pulse-slow' : ''}`}>
                        <div>
                          <div className="flex items-center mb-6">
                            <UserPlus className="w-8 h-8 text-purple-600 mr-4 flex-shrink-0" />
                            <h3 className="text-2xl font-semibold text-gray-800 truncate">{userInfo.name}</h3>
                          </div>
                          <div className="space-y-4 mb-6">
                            <p className="text-gray-600 text-base flex items-center">
                              <Mail className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" /> 
                              <span className="truncate">{userInfo.email}</span>
                            </p>
                            <p className="text-gray-600 text-base flex items-center">
                              <Info className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" /> 
                              Role: <span className="font-medium capitalize ml-2 text-lg">{userInfo.role}</span>
                            </p>
                            
                            {userInfo.role === 'student' && userInfo.profile.grade && (
                              <p className="text-gray-600 text-base flex items-center">
                                <GraduationCap className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" /> 
                                Grade: <span className="font-medium ml-2 text-lg">{userInfo.profile.grade}</span>
                              </p>
                            )}
                            {userInfo.role === 'teacher' && userInfo.profile.subject && (
                              <p className="text-gray-600 text-base flex items-center">
                                <BookOpen className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" /> 
                                Subject: <span className="font-medium ml-2 text-lg">{userInfo.profile.subject}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-4 mt-6 pt-6 border-t border-gray-100">
                          <button
                            onClick={() => handleApproveUser(userInfo.id)}
                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                              <UserCheck className="w-5 h-5 mr-2" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectionModal(user)}
                            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                            disabled={isProcessing}
                          >
                            <UserX className="w-5 h-5 mr-2" />
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
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg animate-fade-in">
                <div className="flex items-center mb-6">
                  <UserX className="w-8 h-8 text-red-600 mr-4 flex-shrink-0" />
                  <h3 className="text-2xl font-semibold text-gray-800">Reject User Registration</h3>
                </div>
                
                <p className="text-gray-600 mb-6 text-lg">
                  You are about to reject the registration for{' '}
                  <span className="font-medium">{selectedUserForRejection?.name}</span>.
                  Please provide a reason for rejection.
                </p>
                
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-base"
                  rows="5"
                  maxLength="500"
                  disabled={processingUserId !== null}
                />
                
                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    onClick={closeRejectionModal}
                    className="px-8 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    disabled={processingUserId !== null}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectUser}
                    className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                    disabled={processingUserId !== null || !rejectionReason.trim()}
                  >
                    {processingUserId !== null ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <UserX className="w-5 h-5 mr-2" />
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