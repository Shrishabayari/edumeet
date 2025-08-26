import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, Globe, Zap, LogOut, User } from 'lucide-react';
import { apiMethods, tokenManager } from '../../services/api';
import TeacherNavbar from "../../components/teacherNavbar";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication and get teacher data on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if teacher is logged in
        if (!tokenManager.isTeacherLoggedIn()) {
          console.log('❌ No teacher token found, redirecting to login');
          navigate('/teacher/login');
          return;
        }

        // Debug current token state
        tokenManager.debugTokenState();
        
        // Get teacher ID from token
        const teacherId = tokenManager.getTeacherId();
        if (!teacherId) {
          console.error('❌ No teacher ID found in token, redirecting to login');
          tokenManager.removeTeacherToken();
          navigate('/teacher/login');
          return;
        }

        console.log('✅ Teacher authenticated with ID:', teacherId);

        // Try to get teacher profile from API
        try {
          const response = await apiMethods.getTeacherProfile();
          console.log('✅ Teacher profile loaded:', response.data);
          setTeacher(response.data);
        } catch (profileError) {
          console.error('❌ Failed to load teacher profile:', profileError);
          
          // If token is invalid, clear it and redirect
          if (profileError?.response?.status === 401 || profileError?.message?.includes('unauthorized')) {
            console.log('🔄 Token invalid, clearing and redirecting...');
            tokenManager.removeTeacherToken();
            navigate('/teacher/login');
            return;
          }
          
          // For other errors, try to use cached teacher data from token
          const cachedTeacher = tokenManager.getCurrentTeacher();
          if (cachedTeacher) {
            console.log('⚠️ Using cached teacher data from token:', cachedTeacher);
            setTeacher(cachedTeacher);
          } else {
            console.warn('⚠️ No teacher profile available, continuing with basic info');
            setTeacher({ 
              id: teacherId, 
              name: 'Teacher', 
              email: 'Loading...', 
              department: 'Loading...' 
            });
          }
        }

      } catch (error) {
        console.error('❌ Authentication check failed:', error);
        tokenManager.removeTeacherToken();
        navigate('/teacher/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      console.log('🔄 Logging out teacher...');
      
      // Call the logout API endpoint
      await apiMethods.teacherLogout();
      console.log('✅ Teacher logout API call successful');
      
    } catch (err) {
      console.error("❌ Logout API failed:", err.message);
      // Continue with logout even if API call fails
    } finally {
      // Always clear tokens and redirect, regardless of API call result
      console.log('🧹 Clearing teacher tokens and redirecting...');
      tokenManager.removeTeacherToken();
      navigate('/teacher/login');
    }
  };

  const dashboardItems = [
    {
      title: "Schedule Appointment",
      description: "Create appointment slots for students to book meetings.",
      icon: <PlusCircle className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-blue-50",
      hoverBg: "hover:bg-blue-600",
      textColor: "text-blue-800",
      path: "/teacher/shedule-appointment",
    },
    {
      title: "Manage Approvals",
      description: "Approve or reject student appointment requests.",
      icon: <MapPin className="w-10 h-10 text-green-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-green-50",
      hoverBg: "hover:bg-green-600",
      textColor: "text-green-800",
      path: "/teacher/approve-appointment",
    },
    {
      title: "All Appointments",
      description: "View your upcoming and past appointments.",
      icon: <Globe className="w-10 h-10 text-yellow-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-yellow-50",
      hoverBg: "hover:bg-yellow-600",
      textColor: "text-yellow-800",
      path: "/teacher/Appointment-list",
    },
    {
      title: "Message",
      description: "Update your profile and contact information.",
      icon: <Zap className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-indigo-50",
      hoverBg: "hover:bg-indigo-400",
      textColor: "text-indigo-800",
      path: "/teacher/message",
    },
  ];

  // Show loading state
  if (loading) {
    return (
      <div>
        <TeacherNavbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TeacherNavbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 sm:p-10 lg:p-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center max-w-7xl mx-auto mb-6 gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
            {teacher ? (
              <p className="text-gray-500">
                Welcome back, {teacher.name || teacher.firstName || 'Teacher'}!
              </p>
            ) : (
              <p className="text-gray-500">Welcome to your dashboard</p>
            )}
          </div>
          
          {/* Teacher Profile Info */}
          {teacher && (
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{teacher.name || 'Teacher'}</p>
                  <p className="text-gray-500">{teacher.department || 'Department'}</p>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 lg:p-10">
          {/* Teacher Statistics or Quick Info */}
          {teacher && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <h3 className="text-sm text-gray-600 uppercase tracking-wide">Department</h3>
                  <p className="text-xl font-semibold text-gray-800">{teacher.department || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-600 uppercase tracking-wide">Email</h3>
                  <p className="text-xl font-semibold text-gray-800">{teacher.email || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-600 uppercase tracking-wide">Status</h3>
                  <p className="text-xl font-semibold text-green-600">Active</p>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {dashboardItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`group flex flex-col items-center text-center p-6 lg:p-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg 
                  ${item.bgColor} ${item.hoverBg} border border-gray-100`}
              >
                <div className="mb-4">
                  {item.icon}
                </div>
                <h2 className={`text-xl lg:text-2xl font-bold mb-2 ${item.textColor} group-hover:text-white transition-colors duration-300`}>
                  {item.title}
                </h2>
                <p className="text-gray-600 group-hover:text-white text-sm lg:text-base transition-colors duration-300">
                  {item.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;