import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Search, Users, BookOpen, Building2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const AdminTeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    subject: '',
    experience: '',
    qualification: '',
    bio: '',
    availability: []
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      availability: []
    });
    setEditingTeacher(null);
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
        availability: teacher.availability || []
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingTeacher) {
        // Update teacher
        const response = await api.put(`/teachers/${editingTeacher._id}`, formData);
        
        // Update local state
        setTeachers(prev => prev.map(teacher =>
          teacher._id === editingTeacher._id
            ? { ...teacher, ...formData }
            : teacher
        ));
        
        setSuccess('Teacher updated successfully!');
        console.log('Teacher updated:', response.data);
      } else {
        // Add new teacher
        const response = await api.post('/teachers', formData);
        
        // Add to local state
        setTeachers(prev => [...prev, response.data.data || response.data]);
        
        setSuccess('Teacher added successfully!');
        console.log('Teacher added:', response.data);
      }
      
      closeModal();
    } catch (error) {
      console.error('Error saving teacher:', error);
      setError(error.message || 'Failed to save teacher');
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
        {/* Success/Error Messages */}
        {(error || success) && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            error ? 'bg-red-100 border border-red-200 text-red-700' : 'bg-green-100 border border-green-200 text-green-700'
          }`}>
            <AlertCircle className="h-5 w-5" />
            <span>{error || success}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Teacher Management</h1>
              <p className="text-gray-600 text-lg">Student-Teacher Booking Appointment System</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
                <p className="text-gray-600">Total Teachers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                />
              </div>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Teacher</span>
            </button>
          </div>
        </div>

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map(teacher => (
            <div key={teacher._id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{teacher.name}</h3>
                    <p className="text-blue-100">{teacher.qualification}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal(teacher)}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-all"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher._id)}
                      className="bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{teacher.department}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{teacher.subject}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">Experience:</span> {teacher.experience}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">Email:</span> {teacher.email}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">Phone:</span> {teacher.phone}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">Bio:</span> {teacher.bio}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">Available Slots:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {teacher.availability?.map(slot => (
                        <span key={slot} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTeachers.length === 0 && !initialLoading && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No teachers found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterDepartment ? 'Try adjusting your search or filter criteria' : 'Get started by adding your first teacher'}
            </p>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add First Teacher</span>
            </button>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700 p-2"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

<form onSubmit={handleSubmit}>
  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Subject</option>
                      {formData.department && subjects[formData.department]?.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience *
                    </label>
                    <input
                      type="text"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      placeholder="e.g., 5 years"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qualification *
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    placeholder="e.g., PhD in Computer Science"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Brief description about the teacher..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Time Slots
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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

                <div className="flex justify-end space-x-4 pt-4">
      <button
        type="button"
        onClick={closeModal}
        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        ) : (
          <Save className="h-4 w-4" />
        )}
        <span>{loading ? 'Saving...' : 'Save Teacher'}</span>
      </button>
    </div>
  </div>
</form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTeacherManagement;