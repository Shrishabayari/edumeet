import React, { useState, useEffect } from 'react';
import { User, CheckCircle, XCircle, Clock, Mail, Phone, GraduationCap, BookOpen, Users, AlertCircle } from 'lucide-react';

// Import your existing API service
import { adminAPI, apiHelpers } from '../../services/api'; // Adjust path as needed

const StudentApproval = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setCheckingAuth(true);
        setError('');
        
        // First, try to initialize token from localStorage
        apiHelpers.initializeToken();
        
        // Check if token exists in memory or localStorage
        let token = apiHelpers.getToken();
        
        // If no token in memory, try localStorage directly
        if (!token && typeof window !== 'undefined' && window.localStorage) {
          token = localStorage.getItem('adminToken');
          if (token) {
            apiHelpers.setAuthToken(token);
          }
        }
        
        if (token) {
          console.log('Token found, verifying authentication...');
          // Verify token by making an API call
          await adminAPI.getProfile();
          setIsAuthenticated(true);
          console.log('Authentication successful');
        } else {
          console.log('No token found');
          setIsAuthenticated(false);
          setError('No authentication token found. Please login.');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        setError('Authentication failed. Please login again.');
        
        // Clear invalid token
        apiHelpers.clearAuthToken();
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
        }
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !checkingAuth) {
      if (activeTab === 'pending') {
        fetchPendingUsers();
      } else {
        fetchAllUsers();
      }
    }
  }, [activeTab, isAuthenticated, checkingAuth]);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching pending users...');
      const response = await adminAPI.getUsers();
      console.log('Users response:', response);
      
      // Handle different response formats
      let users = [];
      if (response.data) {
        users = Array.isArray(response.data) ? response.data : response.data.users || [];
      } else if (response.users) {
        users = Array.isArray(response.users) ? response.users : [];
      } else if (Array.isArray(response)) {
        users = response;
      }
      
      console.log('Processed users:', users);
      
      // Filter for pending users
      const pending = users.filter(user => 
        user.approvalStatus === 'pending' || 
        user.status === 'pending'
      );
      
      console.log('Pending users:', pending);
      setPendingUsers(pending);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      setError('Failed to fetch pending registrations. Please try again.');
      
      // If it's an auth error, reset authentication
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching all users...');
      const response = await adminAPI.getUsers();
      console.log('All users response:', response);
      
      // Handle different response formats
      let users = [];
      if (response.data) {
        users = Array.isArray(response.data) ? response.data : response.data.users || [];
      } else if (response.users) {
        users = Array.isArray(response.users) ? response.users : [];
      } else if (Array.isArray(response)) {
        users = response;
      }
      
      console.log('All processed users:', users);
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching all users:', error);
      setError('Failed to fetch users. Please try again.');
      
      // If it's an auth error, reset authentication
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    setActionLoading(userId);
    setError('');
    try {
      console.log('Approving user:', userId);
      
      // Find the user to determine the role
      const user = pendingUsers.find(u => u._id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.role === 'teacher') {
        await adminAPI.updateTeacherStatus(userId, 'approved');
      } else {
        // For students, you might need to implement this endpoint
        // For now, throw an error to indicate it's not implemented
        throw new Error('Student approval endpoint not implemented yet. Please contact developer.');
      }
      
      // Remove user from pending list
      setPendingUsers(prev => prev.filter(user => user._id !== userId));
      
      console.log('User approved successfully!');
    } catch (error) {
      console.error('Error approving user:', error);
      setError(`Failed to approve user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    
    setActionLoading(selectedUser._id);
    setError('');
    try {
      console.log('Rejecting user:', selectedUser._id);
      
      // Use the existing updateTeacherStatus function if it's a teacher
      if (selectedUser.role === 'teacher') {
        await adminAPI.updateTeacherStatus(selectedUser._id, 'rejected');
      } else {
        // For students, you might need to add a new API endpoint
        throw new Error('Student rejection endpoint not implemented yet. Please contact developer.');
      }
      
      // Remove user from pending list
      setPendingUsers(prev => prev.filter(user => user._id !== selectedUser._id));
      
      // Reset modal state
      setShowRejectModal(false);
      setSelectedUser(null);
      setRejectionReason('');
      
      console.log('User rejected successfully!');
    } catch (error) {
      console.error('Error rejecting user:', error);
      setError(`Failed to reject user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (user) => {
    setSelectedUser(user);
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedUser(null);
    setRejectionReason('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  const UserCard = ({ user, showActions = true }) => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user.name || 'N/A'}</h3>
            <p className="text-sm text-gray-500 capitalize">{user.role || 'Unknown'}</p>
          </div>
        </div>
        {getStatusBadge(user.approvalStatus || user.status)}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="w-4 h-4 mr-2" />
          {user.email || 'N/A'}
        </div>
        
        {user.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-2" />
            {user.phone}
          </div>
        )}
        
        {user.role === 'student' && user.grade && (
          <div className="flex items-center text-sm text-gray-600">
            <GraduationCap className="w-4 h-4 mr-2" />
            {user.grade}
          </div>
        )}
        
        {user.role === 'teacher' && (
          <>
            {user.subject && (
              <div className="flex items-center text-sm text-gray-600">
                <BookOpen className="w-4 h-4 mr-2" />
                {user.subject}
              </div>
            )}
            {user.department && (
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                {user.department}
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="text-xs text-gray-500 mb-4">
        Applied: {formatDate(user.createdAt)}
      </div>
      
      {(user.approvalStatus === 'rejected' || user.status === 'rejected') && user.rejectionReason && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm font-medium text-red-800">Rejection Reason:</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{user.rejectionReason}</p>
        </div>
      )}
      
      {(user.approvalStatus === 'approved' || user.status === 'approved') && user.approvedBy && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">
              Approved by: {user.approvedBy.name || user.approvedBy || 'Admin'}
            </span>
          </div>
        </div>
      )}
      
      {showActions && (user.approvalStatus === 'pending' || user.status === 'pending') && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleApprove(user._id)}
            disabled={actionLoading === user._id}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {actionLoading === user._id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </>
            )}
          </button>
          
          <button
            onClick={() => openRejectModal(user)}
            disabled={actionLoading === user._id}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </button>
        </div>
      )}
    </div>
  );

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking Authentication</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication error
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">
              {error || 'Please login as an admin to access this page.'}
            </p>
            <button
              onClick={() => window.location.href = '/admin/login'}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage user registrations and approvals</p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Approvals
                {pendingUsers.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                    {pendingUsers.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Users
              </button>
            </nav>
          </div>
        </div>
        
        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : (
              <>
                {activeTab === 'pending' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Pending Registrations ({pendingUsers.length})
                    </h2>
                    {pendingUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No pending registrations</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingUsers.map(user => (
                          <UserCard key={user._id} user={user} showActions={true} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'all' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      All Users ({allUsers.length})
                    </h2>
                    {allUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No users found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {allUsers.map(user => (
                          <UserCard key={user._id} user={user} showActions={false} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject User Registration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject {selectedUser?.name}'s registration?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Please provide a reason for rejection..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {rejectionReason.length}/500 characters
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={closeRejectModal}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === selectedUser?._id}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedUser?._id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                ) : (
                  'Reject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentApproval;