import React from "react";
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, Globe, Zap, LogOut } from 'lucide-react';
import { apiMethods, tokenManager } from '../../services/api';

const UserDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiMethods.teacherLogout();
    } catch (err) {
      console.error("Logout failed:", err.message);
    } finally {
      tokenManager.removeTeacherToken();
      localStorage.removeItem('teacher');
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
      path: "/user/appointments",
    },
    {
      title: "Manage Approvals",
      description: "Approve or reject student appointment requests.",
      icon: <MapPin className="w-10 h-10 text-green-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-green-50",
      hoverBg: "hover:bg-green-600",
      textColor: "text-green-800",
      path: "/teacher/approval",
    },
    {
      title: "All Appointments",
      description: "View your upcoming and past appointments.",
      icon: <Globe className="w-10 h-10 text-yellow-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-yellow-50",
      hoverBg: "hover:bg-yellow-600",
      textColor: "text-yellow-800",
      path: "/user/Appointment-list",
    },
    {
      title: "My Profile",
      description: "Update your profile and contact information.",
      icon: <Zap className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" />,
      bgColor: "bg-indigo-50",
      hoverBg: "hover:bg-indigo-400",
      textColor: "text-indigo-800",
      path: "/teacher/profile",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 sm:p-10 lg:p-12">
      <div className="flex justify-between items-center max-w-7xl mx-auto mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">User Dashboard</h1>
          <p className="text-gray-500">Welcome to your dashboard</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 lg:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {dashboardItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`group flex flex-col items-center text-center p-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg 
                ${item.bgColor} ${item.hoverBg} border border-gray-100`}
            >
              <div className="mb-4">
                {item.icon}
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${item.textColor} group-hover:text-white`}>
                {item.title}
              </h2>
              <p className="text-gray-600 group-hover:text-white text-base">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
