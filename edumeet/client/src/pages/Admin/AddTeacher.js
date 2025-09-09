import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, AlertCircle, Users, User, Mail, Phone, GraduationCap, Clock, Building2, BookOpen, Award, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import AdminNavbar from '../../components/adminNavbar';

const AddTeacher = ({ onTeacherAdded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
    setShowPassword(false);
  };

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

    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      setError(`Validation errors: ${validationErrors.join(', ')}`);
      setLoading(false);
      return;
    }

    const cleanFormData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      department: formData.department.trim(),
      subject: formData.subject.trim(),
      experience: formData.experience.trim(),
      qualification: formData.qualification.trim(),
      bio: formData.bio.trim(),
      availability: formData.availability.filter(slot => slot)
    };

    if (formData.password) {
      cleanFormData.password = formData.password;
    }

    if (formData.sendSetupEmail) {
      cleanFormData.sendSetupEmail = true;
    }

    console.log('=== DEBUGGING TEACHER SUBMISSION ===');
    console.log('Form data being sent:', cleanFormData);

    try {
      console.log('Adding new teacher');
      const response = await api.post('/teachers', cleanFormData);
      console.log('Add response:', response.data);
      
      setSuccess('Teacher added successfully!');
      
      if (onTeacherAdded) {
        onTeacherAdded(response.data.data || response.data);
      }
      
      setTimeout(() => {
        resetForm();
        setSuccess('');
      }, 2000);
      
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
          const validationErrors = Object.values(error.response.data.errors).join(', ');
          errorMessage = `Validation errors: ${validationErrors}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, name, type = "text", icon: Icon, required = false, placeholder, ...props }) => (
    <div className="group">
      <label className="flex items-center gap-3 text-sm font-semibold text-gray-800 mb-3">
        <div className="flex items-center justify-center w-5 h-5">
          <Icon className="h-4 w-4 text-indigo-600" />
        </div>
        <span className="flex-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>
      <input
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleInputChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500 hover:border-gray-300"
        {...props}
      />
    </div>
  );

  const SelectField = ({ label, name, options, icon: Icon, required = false, placeholder = "Select an option", disabled = false }) => (
    <div className="group">
      <label className="flex items-center gap-3 text-sm font-semibold text-gray-800 mb-3">
        <div className="flex items-center justify-center w-5 h-5">
          <Icon className="h-4 w-4 text-indigo-600" />
        </div>
        <span className="flex-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>
      <select
        name={name}
        value={formData[name]}
        onChange={handleInputChange}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-300 text-gray-800 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <AdminNavbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Modern Header */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 mb-8 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Add New Teacher
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">Create a comprehensive teacher profile</p>
                </div>
              </div>
              <div className="hidden md:flex bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl">
                <GraduationCap className="h-12 w-12 text-indigo-500" />
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-6 mb-8 flex items-center space-x-3 shadow-lg">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-8 flex items-center space-x-3 shadow-lg">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-green-800 font-medium">{success}</span>
            </div>
          )}

          {/* Main Form */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden border border-gray-100">
            <div className="p-8">
              
              {/* Personal Information Section */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-3 rounded-xl">
                    <User className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <InputField
                    label="Full Name"
                    name="name"
                    icon={User}
                    required
                    placeholder="Enter teacher's full name"
                  />
                  <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    icon={Mail}
                    required
                    placeholder="teacher@school.edu"
                  />
                  <InputField
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    icon={Phone}
                    required
                    placeholder="+1 (555) 123-4567"
                  />
                  <InputField
                    label="Years of Experience"
                    name="experience"
                    type="number"
                    icon={Award}
                    required
                    placeholder="5"
                    min="0"
                  />
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-3 rounded-xl">
                    <GraduationCap className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Professional Information</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <SelectField
                    label="Department"
                    name="department"
                    options={departments}
                    icon={Building2}
                    required
                    placeholder="Select Department"
                  />
                  <SelectField
                    label="Subject"
                    name="subject"
                    options={formData.department ? subjects[formData.department] || [] : []}
                    icon={BookOpen}
                    required
                    placeholder={!formData.department ? "Select Department First" : "Select Subject"}
                    disabled={!formData.department}
                  />
                  <div className="lg:col-span-2">
                    <InputField
                      label="Qualification"
                      name="qualification"
                      icon={Award}
                      required
                      placeholder="e.g., Ph.D. in Computer Science, M.Sc. Mathematics"
                    />
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-gradient-to-r from-green-100 to-teal-100 p-3 rounded-xl">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Biography</h2>
                </div>
                
                <div className="group">
                  <label className="flex items-center gap-3 text-sm font-semibold text-gray-800 mb-3">
                    <div className="flex items-center justify-center w-5 h-5">
                      <FileText className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="flex-1">Professional Bio</span>
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500 hover:border-gray-300 resize-none"
                    placeholder="Brief professional background and teaching philosophy..."
                  />
                </div>
              </div>

              {/* Availability Section */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-gradient-to-r from-orange-100 to-amber-100 p-3 rounded-xl">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Availability Schedule</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availabilitySlots.map(slot => (
                    <label key={slot} className="group cursor-pointer">
                      <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        formData.availability.includes(slot)
                          ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.availability.includes(slot)}
                            onChange={() => handleAvailabilityChange(slot)}
                            className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                          />
                          <span className={`text-sm font-medium ${
                            formData.availability.includes(slot) ? 'text-indigo-700' : 'text-gray-700'
                          }`}>
                            {slot}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Account Setup Section */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-xl">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Account Setup</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                  <div className="group">
                    <label className="flex items-center gap-3 text-sm font-semibold text-gray-800 mb-3">
                      <div className="flex items-center justify-center w-5 h-5">
                        <Eye className="h-4 w-4 text-indigo-600" />
                      </div>
                      <span className="flex-1">Password (Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 pr-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500 hover:border-gray-300"
                        placeholder="Enter secure password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-3 text-sm font-semibold text-gray-800 mb-3">
                      <div className="flex items-center justify-center w-5 h-5">
                        <Eye className="h-4 w-4 text-indigo-600" />
                      </div>
                      <span className="flex-1">Confirm Password</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500 hover:border-gray-300"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-6 pt-8 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-8 py-4 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-200"
                >
                  Reset Form
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Adding Teacher...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Add Teacher</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddTeacher;