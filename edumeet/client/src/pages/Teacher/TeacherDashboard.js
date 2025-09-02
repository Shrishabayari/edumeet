import React from "react";
import { PlusCircle, MapPin, Globe, Zap, LogOut, User } from 'lucide-react';

const TeacherDashboard = () => {
  const navigate = (path) => {
    console.log('Navigate to:', path);
    // Your navigation logic here
  };

  const handleLogout = async () => {
    try {
      // await apiMethods.teacherLogout();
    } catch (err) {
      console.error("Logout failed:", err.message);
    } finally {
      // tokenManager.removeTeacherToken();
      // localStorage.removeItem('teacher');
      navigate('/teacher/login');
    }
  };

  const dashboardItems = [
    {
      title: "Schedule Appointment",
      description: "Create appointment slots for students to book meetings.",
      icon: <PlusCircle className="w-8 h-8" />,
      gradient: "from-blue-500 to-blue-600",
      shadowColor: "shadow-blue-500/25",
      path: "/teacher/shedule-appointment",
    },
    {
      title: "Manage Approvals",
      description: "Approve or reject student appointment requests.",
      icon: <MapPin className="w-8 h-8" />,
      gradient: "from-emerald-500 to-emerald-600",
      shadowColor: "shadow-emerald-500/25",
      path: "/teacher/approve-appointment",
    },
    {
      title: "All Appointments",
      description: "View your upcoming and past appointments.",
      icon: <Globe className="w-8 h-8" />,
      gradient: "from-purple-500 to-purple-600",
      shadowColor: "shadow-purple-500/25",
      path: "/teacher/Appointment-list",
    },
    {
      title: "Messages",
      description: "Communicate with students and manage conversations.",
      icon: <Zap className="w-8 h-8" />,
      gradient: "from-orange-500 to-orange-600",
      shadowColor: "shadow-orange-500/25",
      path: "/teacher/message",
    },
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Teacher Portal</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-red-500/40 hover:scale-105 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Teacher Dashboard</h2>
              <p className="text-blue-100 text-lg">Manage your appointments and connect with students</p>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {dashboardItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`group relative bg-white/60 backdrop-blur-sm hover:bg-white/90 rounded-2xl p-8 border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${item.shadowColor} text-left overflow-hidden`}
            >
              {/* Gradient Overlay on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-95 transition-opacity duration-300 rounded-2xl`}></div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${item.gradient} text-white mb-4 group-hover:bg-white/20 transition-colors duration-300`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-white mb-2 transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-gray-600 group-hover:text-white/90 transition-colors duration-300 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Arrow Indicator */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>


      </div>
    </div>
  );
};

export default TeacherDashboard;