import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Search, Users, BookOpen, Building2, AlertCircle, Key, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

const ViewTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [setSendAccountSetupEmail] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    subject: '',
    experience: '',
    qualification: '',
    bio: '',
    availability: [],
    password: '',
    confirmPassword: '',
    sendSetupEmail: false
  });

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

  const subjects = {
    'Computer Science': ['Programming', 'Data Structures', 'Algorithms', 'Database Systems', 'Web Development', 'Machine Learning'],
    'Mathematics': ['Calculus', 'Algebra', 'Statistics', 'Geometry', 'Discrete Math', 'Applied Mathematics'],
    'Physics': ['Classical Mechanics', 'Thermodynamics', 'Electromagnetism', 'Quantum Physics', 'Optics'],
    'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry'],
    'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Microbiology', 'Anatomy', 'Physiology'],
    'English': ['Literature', 'Grammar', 'Creative Writing', 'Composition', 'Public Speaking'],
    'History': ['World History', 'Ancient History', 'Modern History', 'Political History'],
    'Economics': ['Microeconomics', 'Macroeconomics', 'International Economics', 'Development Economics'],
    'Business Administration': ['Management', 'Marketing', 'Finance', 'Human Resources', 'Operations'],
    'Psychology': ['General Psychology', 'Cognitive Psychology', 'Social Psychology', 'Clinical Psychology']
  };

  const availabilitySlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 1:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM',
    '5:00 PM - 6:00 PM'
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAvailabilityChange = (slot) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(slot)
        ? prev.availability.filter(s => s !== slot)
        : [...prev.availability, slot]
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: '',
      subject: '',
      experience: '',
      qualification: '',
      bio: '',
      availability: [],
      password: '',
      confirmPassword: '',
      sendSetupEmail: false
    });
    setEditingTeacher(null);
    setShowPassword(false);
    setSendAccountSetupEmail(false);
  };

  const openModal = (teacher = null) => {
    if (teacher) {
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        department: teacher.department || '',
        subject: teacher.subject || '',
        experience: teacher.experience || '',
        qualification: teacher.qualification || '',
        bio: teacher.bio || '',
        availability: teacher.availability || [],
        password: '',
        confirmPassword: '',
        sendSetupEmail: false
      });
      setEditingTeacher(teacher);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
    setError('');
    setSuccess('');
  };

  // Validate form data before submission
  const validateFormData = (data) => {
    const errors = [];
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
      errors.push('Valid email is required');
    }
    
    if (!data.phone || data.phone.trim().length < 10) {
      errors.push('Phone number must be at least 10 characters');
    }
    
    if (!data.department) {
      errors.push('Department is required');
    }
    
    if (!data.subject) {
      errors.push('Subject is required');
    }
    
    if (!data.experience) {
      errors.push('Experience is required');
    }
    
    if (!data.qualification) {
      errors.push('Qualification is required');
    }

    // Password validation
    if (data.password && data.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (data.password && data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate form data
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      setError(`Validation errors: ${validationErrors.join(', ')}`);
      setLoading(false);
      return;
    }

    // Clean form data - remove empty strings and trim whitespace
    const cleanFormData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      department: formData.department.trim(),
      subject: formData.subject.trim(),
      experience: formData.experience.trim(),
      qualification: formData.qualification.trim(),
      bio: formData.bio.trim(),
      availability: formData.availability.filter(slot => slot) // Remove empty slots
    };

    // Add password if provided
    if (formData.password) {
      cleanFormData.password = formData.password;
    }

    // Add account setup email flag
    if (formData.sendSetupEmail) {
      cleanFormData.sendSetupEmail = true;
    }

    console.log('=== DEBUGGING TEACHER SUBMISSION ===');
    console.log('Form data being sent:', cleanFormData);
    console.log('Is editing?', !!editingTeacher);
    console.log('Teacher ID:', editingTeacher?._id);

    try {
      if (editingTeacher) {
        // Update teacher
        console.log('Updating teacher with ID:', editingTeacher._id);
        const response = await api.put(`/teachers/${editingTeacher._id}`, cleanFormData);
        console.log('Update response:', response.data);
        
        // Update local state
        setTeachers(prev => prev.map(teacher =>
          teacher._id === editingTeacher._id
            ? { ...teacher, ...cleanFormData }
            : teacher
        ));
        
        setSuccess('Teacher updated successfully!');
      } else {
        // Add new teacher
        console.log('Adding new teacher');
        const response = await api.post('/teachers', cleanFormData);
        console.log('Add response:', response.data);
        
        // Add to local state
        setTeachers(prev => [...prev, response.data.data || response.data]);
        
        setSuccess('Teacher added successfully!');
      }
      
      closeModal();
    } catch (error) {
      console.error('=== DETAILED ERROR INFORMATION ===');
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to save teacher';
      
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.errors) {
          // Handle validation errors array
          const validationErrors = Object.values(error.response.data.errors).join(', ');
          errorMessage = `Validation errors: ${validationErrors}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
                <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
                <p className="text-gray-600">Manage teacher accounts and profiles</p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
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
                      onClick={() => openModal(teacher)}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors duration-200"
                      title="Edit Teacher"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
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
            <p className="text-gray-600 mb-6">
              {searchTerm || filterDepartment
                ? "No teachers match your search criteria."
                : "Get started by adding your first teacher."}
            </p>
            <button
              onClick={() => openModal()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Add Teacher</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter teacher's full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.department}
                  >
                    <option value="">Select Subject</option>
                    {formData.department && subjects[formData.department]?.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter years of experience"
                  />
                </div>

                {/* Qualification */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qualification *
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter highest qualification"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter teacher's bio (optional)"
                />
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Availability
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availabilitySlots.map(slot => (
                    <label key={slot} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.availability.includes(slot)}
                        onChange={() => handleAvailabilityChange(slot)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{slot}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Account Setup Section */}
              {!editingTeacher && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Setup</h3>
                  
                  {/* Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password (Optional)
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="sendSetupEmail"
                        checked={formData.sendSetupEmail}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Send account setup email to teacher
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{editingTeacher ? 'Update Teacher' : 'Add Teacher'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTeachers;