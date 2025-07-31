import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, BookOpen, Building2, AlertCircle, Key, Mail, Shield, Trash2 } from 'lucide-react';
import api from '../../services/api';

const ViewTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const departments = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'History',
    'Economics',
    'Business Administration',
    'Psychology'
  ];

  // Fetch teachers from API
  const fetchTeachers = async () => {
    try {
      setInitialLoading(true);
      setError('');
      const response = await api.get('/teachers');
      setTeachers(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setError(error.message || 'Failed to fetch teachers');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleDelete = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        setError('');
        setSuccess('');
        
        await api.delete(`/teachers/${teacherId}`);
        
        // Remove from local state
        setTeachers(prev => prev.filter(teacher => teacher._id !== teacherId));
        
        setSuccess('Teacher deleted successfully!');
        console.log('Teacher deleted:', teacherId);
      } catch (error) {
        console.error('Error deleting teacher:', error);
        setError(error.message || 'Failed to delete teacher');
      }
    }
  };

  const handleSendAccountSetup = async (teacherId) => {
    try {
      setError('');
      setSuccess('');
      
      // API call to send account setup email
      await api.post(`/teachers/${teacherId}/send-account-setup`);
      
      setSuccess('Account setup email sent successfully!');
      console.log('Account setup email sent for teacher:', teacherId);
    } catch (error) {
      console.error('Error sending account setup email:', error);
      setError(error.message || 'Failed to send account setup email');
    }
  };

  const handleResetPassword = async (teacherId) => {
    try {
      setError('');
      setSuccess('');
      
      // API call to send password reset email
      await api.post(`/teachers/${teacherId}/reset-password`);
      
      setSuccess('Password reset email sent successfully!');
      console.log('Password reset email sent for teacher:', teacherId);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setError(error.message || 'Failed to send password reset email');
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === '' || teacher.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Teachers...</h2>
          <p className="text-gray-600">Please wait while we fetch the teacher data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">View Teachers</h1>
                <p className="text-gray-600">View and manage teacher profiles</p>
              </div>
            </div>
            <button
              onClick={() => {
                // Navigate to add teacher page or open add teacher modal
                console.log('Navigate to add teacher');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add Teacher</span>
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search teachers by name, email, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div key={teacher._id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{teacher.name}</h3>
                      <p className="text-sm text-gray-500">{teacher.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {teacher.hasAccount ? (
                      <div className="bg-green-100 p-1 rounded-full">
                        <Shield className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="bg-yellow-100 p-1 rounded-full">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{teacher.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{teacher.subject}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{teacher.experience} years experience</span>
                  </div>
                </div>

                {teacher.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{teacher.bio}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {teacher.availability?.slice(0, 3).map((slot, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {slot}
                    </span>
                  ))}
                  {teacher.availability?.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{teacher.availability.length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDelete(teacher._id)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors duration-200"
                      title="Delete Teacher"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!teacher.hasAccount ? (
                      <button
                        onClick={() => handleSendAccountSetup(teacher._id)}
                        className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors duration-200"
                        title="Send Account Setup Email"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleResetPassword(teacher._id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-colors duration-200"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTeachers.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Teachers Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterDepartment
                ? "No teachers match your search criteria."
                : "No teachers available to display."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewTeachers;