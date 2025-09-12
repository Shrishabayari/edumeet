import React, { useState, useEffect } from 'react';
import { Users, User, Mail, Calendar, Shield, AlertCircle, RefreshCw, Search, Filter } from 'lucide-react';
import AdminNavbar from '../../components/adminNavbar';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch users using your API endpoint
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the correct API base URL (same logic from your api.js)
      const getApiUrl = () => {
        if (process.env.REACT_APP_API_URL) {
          return process.env.REACT_APP_API_URL;
        }
        
        const hostname = window.location.hostname;
        const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
        
        if (isProduction) {
          return 'https://edumeet.onrender.com';
        }
        
        return 'http://localhost:5000';
      };
      
      const apiBaseUrl = getApiUrl();
      const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin authentication required. Please login as admin.');
      }
      
      console.log('Fetching users from:', `${apiBaseUrl}/auth/admin/users`);
      console.log('Using admin token:', adminToken ? 'Present' : 'Missing');
      
      // Use your actual API endpoint for getting all users (admin only)  
      const response = await fetch(`${apiBaseUrl}/auth/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        setUsers(data.data.users || []);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Failed to fetch users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'pending': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'rejected': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getRoleIcon = (role) => {
    return role === 'teacher' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilteredUsers = () => {
    let filtered = users;
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(user => user.approvalStatus === filter);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const getStatusCount = (status) => {
    return users.filter(user => status === 'all' ? true : user.approvalStatus === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center space-x-4">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Loading Users</h3>
            <p className="text-gray-600">Please wait while we fetch user data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Users</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchUsers}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminNavbar/>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                  <p className="text-gray-600">Manage and monitor user accounts</p>
                </div>
              </div>
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white min-w-[150px]"
                >
                  <option value="all">All Status ({getStatusCount('all')})</option>
                  <option value="approved">Approved ({getStatusCount('approved')})</option>
                  <option value="pending">Pending ({getStatusCount('pending')})</option>
                  <option value="rejected">Rejected ({getStatusCount('rejected')})</option>
                </select>
              </div>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: 'all', label: 'Total Users', color: 'bg-slate-50 border-slate-200 text-slate-700' },
                { key: 'approved', label: 'Approved', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                { key: 'pending', label: 'Pending', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { key: 'rejected', label: 'Rejected', color: 'bg-red-50 border-red-200 text-red-700' }
              ].map((stat) => (
                <div key={stat.key} className={`${stat.color} border rounded-xl p-4 text-center`}>
                  <div className="text-2xl font-bold">{getStatusCount(stat.key)}</div>
                  <div className="text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>

          {/* Users Grid */}
          {filteredUsers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredUsers.map((user) => (
                <div key={user._id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl ${user.role === 'teacher' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
                            {user.name}
                          </h3>
                          <p className="text-sm text-gray-600 capitalize font-medium">{user.role}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(user.approvalStatus)}`}>
                        {user.approvalStatus}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-3 text-gray-600">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{user.email}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-gray-600">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Joined {formatDate(user.createdAt)}</span>
                    </div>
                    
                    {user.lastLogin && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Last login {formatDate(user.lastLogin)}</span>
                      </div>
                    )}

                    {/* Profile Information */}
                    {user.profile && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                        {user.profile.grade && (
                          <div className="text-sm"><span className="font-medium text-gray-700">Grade:</span> <span className="text-gray-600">{user.profile.grade}</span></div>
                        )}
                        {user.profile.subject && (
                          <div className="text-sm"><span className="font-medium text-gray-700">Subject:</span> <span className="text-gray-600">{user.profile.subject}</span></div>
                        )}
                        {user.profile.department && (
                          <div className="text-sm"><span className="font-medium text-gray-700">Department:</span> <span className="text-gray-600">{user.profile.department}</span></div>
                        )}
                      </div>
                    )}

                    {/* Activity Status */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-medium text-gray-700">Account Status</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.isActive 
                          ? 'text-emerald-700 bg-emerald-100' 
                          : 'text-red-700 bg-red-100'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No users found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'No users have been registered yet.'}
              </p>
              {(searchTerm || filter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserList;