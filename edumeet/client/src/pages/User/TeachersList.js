import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { 
  Search, 
  Filter, 
  Users, 
  Mail, 
  Phone, 
  BookOpen,
  ChevronDown,
  UserCheck,
  Calendar,
  Loader
} from 'lucide-react';
import { apiMethods, constants } from '../../services/api'; // Adjust path as needed
import UserNavbar from '../../components/userNavbar';

// Fetch teachers from actual API
const fetchTeachers = async (params) => {
  try {
    console.log('Fetching teachers with params:', params);
    
    // Prepare query parameters for API
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      sortBy: params.sortBy || 'name',
      sortOrder: params.sortOrder || 'asc'
    };

    // Add filters if they exist
    if (params.department && params.department !== '') {
      queryParams.department = params.department;
    }

    if (params.search && params.search.trim() !== '') {
      queryParams.search = params.search.trim();
    }

    // Call your actual API endpoint: GET /api/teachers
    const response = await apiMethods.getAllTeachers(queryParams);
    
    console.log('Teachers fetched successfully:', response.data);

    let teachers = response.data.data || response.data || [];
    
    // Apply status filter on frontend if needed
    if (params.status && params.status !== '') {
      if (params.status === 'active') {
        teachers = teachers.filter(teacher => teacher.hasAccount);
      } else if (params.status === 'inactive') {
        teachers = teachers.filter(teacher => !teacher.hasAccount);
      }
    }

    return {
      data: teachers,
      pagination: response.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalTeachers: teachers.length,
        hasNext: false,
        hasPrev: false
      }
    };

  } catch (error) {
    console.error('Error fetching teachers:', error);
    
    // Handle different types of errors
    if (error.response) {
      const { status, data } = error.response;
      console.error(`API Error ${status}:`, data);
      
      switch (status) {
        case 404:
          throw new Error('Teachers endpoint not found');
        case 500:
          throw new Error('Server error while fetching teachers');
        default:
          throw new Error(data.message || `HTTP Error ${status}`);
      }
    } else if (error.request) {
      throw new Error('Unable to connect to server. Please check your internet connection.');
    } else {
      throw new Error(error.message || 'An unexpected error occurred while fetching teachers');
    }
  }
};

// Use departments from your API constants
const DEPARTMENTS = constants.DEPARTMENTS;

const TeacherCard = ({ teacher, onBookAppointment }) => {
  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{teacher.name}</h3>
              <p className="text-blue-100">{teacher.department}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {teacher.hasAccount ? (
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <UserCheck className="w-4 h-4 mr-1" />
                Active
              </span>
            ) : (
              <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Pending Setup
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Contact Info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center text-gray-600">
            <Mail className="w-4 h-4 mr-3 text-blue-500" />
            <span className="text-sm">{teacher.email}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Phone className="w-4 h-4 mr-3 text-green-500" />
            <span className="text-sm">{teacher.phone}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <BookOpen className="w-4 h-4 mr-3 text-purple-500" />
            <span className="text-sm font-medium">{teacher.subject}</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Experience:</span>
            <span className="font-medium text-sm">{teacher.experience}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Qualification:</span>
            <span className="font-medium text-sm text-right flex-1 ml-2">{teacher.qualification}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Availability Slots:</span>
            <span className="font-medium text-sm">{teacher.availability?.length || 0} slots</span>
          </div>
        </div>

        {/* Availability Preview */}
        {teacher.availability && teacher.availability.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {teacher.availability.slice(0, 3).map((slot, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
                >
                  {slot}
                </span>
              ))}
              {teacher.availability.length > 3 && (
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  +{teacher.availability.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {teacher.hasAccount && (
            <button
              onClick={() => onBookAppointment(teacher)}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TeachersListPage = () => {
  const navigate = useNavigate(); // Added for navigation
  
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState(null);

  // Fetch teachers with proper error handling
  const loadTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        search: searchTerm,
        department: selectedDepartment,
        status: selectedStatus,
        sortBy,
        sortOrder,
        limit: 50 // Increased limit to get more teachers
      };

      const response = await fetchTeachers(params);
      setTeachers(response.data || []);
      setPagination(response.pagination);
      
      console.log(`Loaded ${response.data?.length || 0} teachers`);
    } catch (error) {
      console.error('Error loading teachers:', error);
      setError(error.message || 'Failed to load teachers. Please try again.');
      setTeachers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    loadTeachers();
  }, [selectedDepartment, selectedStatus, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadTeachers();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // Handler functions
  const handleViewProfile = (teacher) => {
    console.log('View profile:', teacher);
    // Navigate to teacher profile page
    navigate(`/teachers/${teacher._id}`, { 
      state: { teacher } 
    });
  };

  const handleBookAppointment = (teacher) => {
    console.log('Book appointment with:', teacher);
    
    // Navigate to appointments page with teacher information
    navigate('/user/appointments', { 
      state: { 
        selectedTeacher: teacher,
        action: 'book',
        // Additional data you might need
        teacherId: teacher._id,
        teacherName: teacher.name,
        teacherDepartment: teacher.department,
        teacherSubject: teacher.subject,
        teacherAvailability: teacher.availability
      } 
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedStatus('');
    setSortBy('name');
    setSortOrder('asc');
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    loadTeachers();
  };

  return (
    <>
      <UserNavbar/>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-4">
              Our <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Teachers</span>
            </h1>
            <p className="text-xl text-gray-600 mx-auto">
              Connect with expert educators and book appointments to enhance your learning journey
            </p>
          </div>

          {/* Compact Search and Filters Bar */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            {/* Main Search and Filter Row */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Search Bar - Takes most space */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teachers by name, email, subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Compact Filter Controls */}
              <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                {/* Department Filter */}
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-0"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Pending</option>
                </select>

                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-1 px-3 py-2.5 text-gray-600 hover:text-blue-600 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors text-sm"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">More</span>
                  <ChevronDown className={`w-3 h-3 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* Clear Filters Button */}
                {(selectedDepartment || selectedStatus || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters (Collapsible) */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sort By */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="name">Name</option>
                      <option value="department">Department</option>
                      <option value="experience">Experience</option>
                      <option value="createdAt">Date Added</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="asc">A to Z</option>
                      <option value="desc">Z to A</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-red-600 text-lg">⚠</span>
                  </div>
                  <div>
                    <h3 className="text-red-800 font-medium">Unable to load teachers</h3>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                </div>
                <button
                  onClick={handleRetry}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Try Again'}
                </button>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {!loading && !error && pagination && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Showing {pagination.totalTeachers} teacher{pagination.totalTeachers !== 1 ? 's' : ''}
                {searchTerm && ` for "${searchTerm}"`}
                {selectedDepartment && ` in ${selectedDepartment}`}
              </p>
              {pagination.totalTeachers > 0 && (
                <p className="text-sm text-gray-500">
                  {teachers.filter(t => t.hasAccount).length} active, {teachers.filter(t => !t.hasAccount).length} pending setup
                </p>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading teachers...</p>
              </div>
            </div>
          )}

          {/* Teachers Grid */}
          {!loading && !error && teachers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {teachers.map((teacher) => (
                <TeacherCard
                  key={teacher._id}
                  teacher={teacher}
                  onViewProfile={handleViewProfile}
                  onBookAppointment={handleBookAppointment}
                />
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && !error && teachers.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No teachers found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedDepartment || selectedStatus
                  ? 'Try adjusting your search criteria or filters.'
                  : 'No teachers are available at the moment.'}
              </p>
              {(searchTerm || selectedDepartment || selectedStatus) && (
                <button
                  onClick={clearFilters}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
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

export default TeachersListPage;