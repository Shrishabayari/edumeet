import React, { useState, useEffect } from 'react';
import { User, CheckCircle, XCircle, Clock, Mail, Phone, GraduationCap, BookOpen, Users, AlertCircle } from 'lucide-react';

// Mock API for demonstration - replace with your actual API
const mockApi = {
  getPendingRegistrations: () => Promise.resolve({
    data: [
      {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        studentId: 'STU001',
        grade: '10th',
        department: 'Science',
        role: 'student',
        approvalStatus: 'pending',
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        _id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567891',
        studentId: 'STU002',
        grade: '11th',
        department: 'Arts',
        role: 'student',
        approvalStatus: 'pending',
        createdAt: '2024-01-16T09:15:00Z'
      }
    ]
  }),
  getAllUsersForAdmin: () => Promise.resolve({
    data: [
      {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        studentId: 'STU001',
        grade: '10th',
        department: 'Science',
        role: 'student',
        approvalStatus: 'approved',
        createdAt: '2024-01-15T10:30:00Z',
        approvedAt: '2024-01-16T14:20:00Z',
        approvedBy: { name: 'Admin User' }
      },
      {
        _id: '3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        phone: '+1234567892',
        studentId: 'STU003',
        grade: '12th',
        department: 'Commerce',
        role: 'student',
        approvalStatus: 'rejected',
        createdAt: '2024-01-14T11:45:00Z',
        rejectionReason: 'Incomplete documentation'
      }
    ]
  }),
  approveUser: (id) => Promise.resolve({ success: true, message: 'User approved successfully' }),
  rejectUser: (id, reason) => Promise.resolve({ success: true, message: 'User rejected successfully' }),
  getAdminProfile: () => Promise.resolve({ data: { name: 'Admin User', email: 'admin@example.com' } })
};

const tokenManager = {
  getAdminToken: () => 'mock-admin-token',
  removeAdminToken: () => {},
  clearAllTokens: () => {}
};

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
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setCheckingAuth(true);
        setError('');
        
        // Check if admin token exists
        const token = tokenManager.getAdminToken();
        
        if (token) {
          console.log('Admin token found, verifying authentication...');
          // Verify token by making an API call
          await mockApi.getAdminProfile();
          setIsAuthenticated(true);
          console.log('Authentication successful');
        } else {
          console.log('No admin token found');
          setIsAuthenticated(false);
          setError('No authentication token found. Please login as admin.');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        setError('Authentication failed. Please login again.');
        
        // Clear invalid token
        tokenManager.removeAdminToken();
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
    setSuccess('');
    
    try {
      console.log('Fetching pending users...');
      const response = await mockApi.getPendingRegistrations();
      console.log('Pending users response:', response);
      
      // Handle different response formats more robustly
      let users = [];
      if (response?.data) {
        users = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        users = response;
      } else if (response?.users) {
        users = Array.isArray(response.users) ? response.users : [response.users];
      }
      
      // Filter only pending users
      const pendingOnly = users.filter(user => 
        user.approvalStatus === 'pending' || user.status === 'pending'
      );
      
      console.log('Processed pending users:', pendingOnly);
      setPendingUsers(pendingOnly);
      
    } catch (error) {
      console.error('Error fetching pending users:', error);
      setError('Failed to fetch pending registrations. Please try again.');
      
      // If it's an auth error, reset authentication
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setIsAuthenticated(false);
        tokenManager.removeAdminToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Fetching all users...');
      const response = await mockApi.getAllUsersForAdmin();
      console.log('All users response:', response);
      
      // Handle different response formats more robustly
      let users = [];
      if (response?.data) {
        users = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        users = response;
      } else if (response?.users) {
        users = Array.isArray(response.users) ? response.users : [response.users];
      }
      
      console.log('All processed users:', users);
      setAllUsers(users);
      
    } catch (error) {
      console.error('Error fetching all users:', error);
      setError('Failed to fetch users. Please try again.');
      
      // If it's an auth error, reset authentication
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setIsAuthenticated(false);
        tokenManager.removeAdminToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!userId) {
      setError('Invalid user ID');
      return;
    }

    setActionLoading(userId);
    setError('');
    setSuccess('');
    
    try {
      console.log('Approving user:', userId);
      
      // Find the user to get their details
      const user = pendingUsers.find(u => u._id === userId);
      if (!user) {
        throw new Error('User not found in pending list');
      }
      
      // Call the API to approve the user
      const response = await mockApi.approveUser(userId);
      console.log('Approval response:', response);
      
      if (response.success || response.data?.success) {
        // Remove user from pending list
        setPendingUsers(prev => prev.filter(user => user._id !== userId));
        
        // Show success message
        setSuccess(`User ${user.name || user.fullName} approved successfully!`);
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
        
        console.log('User approved successfully!');
      } else {
        throw new Error(response.message || 'Approval failed');
      }
      
    } catch (error) {
      console.error('Error approving user:', error);
      setError(`Failed to approve user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) {
      setError('No user selected for rejection');
      return;
    }
    
    setActionLoading(selectedUser._id);
    setError('');
    setSuccess('');
    
    try {
      console.log('Rejecting user:', selectedUser._id, 'with reason:', rejectionReason);
      
      // Call the API to reject the user
      const response = await mockApi.rejectUser(selectedUser._id, rejectionReason);
      console.log('Rejection response:', response);
      
      if (response.success || response.data?.success) {
        // Remove user from pending list
        setPendingUsers(prev => prev.filter(user => user._id !== selectedUser._id));
        
        // Show success message
        setSuccess(`User ${selectedUser.name || selectedUser.fullName} rejected successfully!`);
        
        // Reset modal state
        setShowRejectModal(false);
        setSelectedUser(null);
        setRejectionReason('');
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
        
        console.log('User rejected successfully!');
      } else {
        throw new Error(response.message || 'Rejection failed');
      }
      
    } catch (error) {
      console.error('Error rejecting user:', error);
      setError(`Failed to reject user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (user) => {
    if (!user) {
      setError('Invalid user selected');
      return;
    }
    setSelectedUser(user);
    setShowRejectModal(true);
    setError(''); // Clear any existing errors
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedUser(null);
    setRejectionReason('');
    setError(''); // Clear any existing errors
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
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
            <h3 className="text-lg font-semibold text-gray-900">{user.name || user.fullName || 'N/A'}</h3>
            <p className="text-sm text-gray-500 capitalize">{user.role || 'Student'}</p>
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
        
        {user.studentId && (
          <div className="flex items-center text-sm text-gray-600">
            <GraduationCap className="w-4 h-4 mr-2" />
            ID: {user.studentId}
          </div>
        )}
        
        {user.grade && (
          <div className="flex items-center text-sm text-gray-600">
            <BookOpen className="w-4 h-4 mr-2" />
            Grade: {user.grade}
          </div>
        )}
        
        {user.department && (
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            {user.department}
          </div>
        )}
        
        {user.subject && (
          <div className="flex items-center text-sm text-gray-600">
            <BookOpen className="w-4 h-4 mr-2" />
            Subject: {user.subject}
          </div>
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
          {user.approvedAt && (
            <p className="text-sm text-green-700 mt-1">
              Approved on: {formatDate(user.approvedAt)}
            </p>
          )}
        </div>
      )}
      
      {showActions && (user.approvalStatus === 'pending' || user.status === 'pending') && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleApprove(user._id)}
            disabled={actionLoading === user._id}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
              onClick={() => {
                // Clear any existing tokens and redirect to login
                tokenManager.clearAllTokens();
                window.location.href = '/admin/login';
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Admin Login
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
          <h1 className="text-3xl font-bold text-gray-900">Student Approval Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage student registrations and approvals</p>
        </div>
        
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">{success}</span>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
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
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
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
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Users
                {allUsers.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {allUsers.length}
                  </span>
                )}
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
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Pending Registrations ({pendingUsers.length})
                      </h2>
                      <button
                        onClick={fetchPendingUsers}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {loading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                    {pendingUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No pending registrations</p>
                        <p className="text-sm text-gray-400 mt-2">New registrations will appear here for approval</p>
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
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        All Users ({allUsers.length})
                      </h2>
                      <button
                        onClick={fetchAllUsers}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {loading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                    {allUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No users found</p>
                        <p className="text-sm text-gray-400 mt-2">Registered users will appear here</p>
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
              Are you sure you want to reject <strong>{selectedUser?.name || selectedUser?.fullName}</strong>'s registration?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
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
                disabled={actionLoading === selectedUser?._id}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === selectedUser?._id}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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