import React from "react";
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MessageCircle, Calendar, LogOut, Users } from 'lucide-react';
import { apiMethods, tokenManager } from '../../services/api';
import UserNavbar from "../../components/userNavbar";

const UserDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiMethods.userLogout();
    } catch (err) {
      console.error("Logout failed:", err.message);
    } finally {
      tokenManager.removeUserToken();
      localStorage.removeItem('user');
      navigate('/user/login');
    }
  };

  const dashboardItems = [
    {
      title: "Teachers",
      description: "Browse and view all available teachers and their profiles.",
      icon: <Users className="w-10 h-10 text-purple-600 group-hover:text-purple-600 transition-colors duration-300" />,
      bgColor: "bg-purple-50",
      hoverBg: "hover:bg-purple-600",
      textColor: "text-purple-800",
      path: "/user/teachers-list",
    },
    {
      title: "Book an Appointment",
      description: "Find and book appointments with teachers and mentors.",
      icon: <PlusCircle className="w-10 h-10 text-blue-600 group-hover:text-blue-600 transition-colors duration-300" />,
      bgColor: "bg-blue-50",
      hoverBg: "hover:bg-blue-600",
      textColor: "text-blue-800",
      path: "/user/appointments",
    },
    {
      title: "View Appointments",
      description: "Manage and view your upcoming and past appointments.",
      icon: <Calendar className="w-10 h-10 text-green-600 group-hover:text-green-600 transition-colors duration-300" />,
      bgColor: "bg-green-50",
      hoverBg: "hover:bg-green-600",
      textColor: "text-green-800",
      path: "/user/Appointment-list",
    },
    {
      title: "Messages",
      description: "Communicate directly with teachers and other users.",
      icon: <MessageCircle className="w-10 h-10 text-yellow-600 group-hover:text-yellow-600 transition-colors duration-300" />,
      bgColor: "bg-yellow-50",
      hoverBg: "hover:bg-yellow-600",
      textColor: "text-yellow-800",
      path: "/student/message",
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <UserNavbar />
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">User Dashboard</h1>
            <p className="mt-2 text-lg text-gray-500">Welcome! Manage your appointments and messages efficiently.</p>
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
              className={`group flex flex-col items-center text-center p-8 rounded-3xl shadow-lg transition-all duration-500 ease-in-out transform hover:scale-105 hover:shadow-2xl 
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

export default UserDashboard;