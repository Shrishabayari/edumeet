import React from "react";
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, Globe, Zap, LogOut } from 'lucide-react';
import { apiMethods, tokenManager } from '../../services/api';
import TeacherNavbar from "../../components/teacherNavbar";

const TeacherDashboard = () => {
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
      icon: <PlusCircle className="w-10 h-10 text-blue-600 group-hover:text-blue-600 transition-colors duration-300" />,
      bgColor: "bg-blue-50",
      hoverBg: "hover:bg-blue-600",
      textColor: "text-blue-800",
      path: "/teacher/shedule-appointment",
    },
    {
      title: "Manage Approvals",
      description: "Approve or reject student appointment requests.",
      icon: <MapPin className="w-10 h-10 text-green-600 group-hover:text-green-600 transition-colors duration-300" />,
      bgColor: "bg-green-50",
      hoverBg: "hover:bg-green-600",
      textColor: "text-green-800",
      path: "/teacher/approve-appointment",
    },
    {
      title: "All Appointments",
      description: "View your upcoming and past appointments.",
      icon: <Globe className="w-10 h-10 text-yellow-600 group-hover:text-yellow-600 transition-colors duration-300" />,
      bgColor: "bg-yellow-50",
      hoverBg: "hover:bg-yellow-600",
      textColor: "text-yellow-800",
      path: "/teacher/Appointment-list",
    },
    {
      title: "Message",
      description: "Update your profile and contact information.",
      icon: <Zap className="w-10 h-10 text-indigo-600 group-hover:text-indigo-600 transition-colors duration-300" />,
      bgColor: "bg-indigo-50",
      hoverBg: "hover:bg-indigo-400",
      textColor: "text-indigo-800",
      path: "/teacher/message",
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <TeacherNavbar />
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">Teacher Dashboard</h1>
            <p className="mt-2 text-lg text-gray-500">Welcome back! Manage your appointments and messages efficiently.</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-6 sm:mt-0 flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Logout</span>
          </button>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`group flex flex-col items-start text-left p-6 rounded-3xl shadow-lg transition-all duration-500 ease-in-out transform hover:scale-105 hover:shadow-2xl 
                ${item.bgColor} ${item.hoverBg} border-2 border-transparent hover:border-white`}
            >
              <div className="mb-4 p-3 rounded-full bg-white bg-opacity-30 group-hover:bg-white transition-colors duration-300">
                {item.icon}
              </div>
              <h2 className={`text-2xl font-bold mb-1 ${item.textColor} group-hover:text-white`}>
                {item.title}
              </h2>
              <p className="text-gray-600 group-hover:text-white transition-colors duration-300 text-base">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;