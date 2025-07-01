import React from "react";
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, Users, Globe, Zap } from 'lucide-react'; // Importing icons from lucide-react
const AdminDashboard = () => {
  const navigate = useNavigate();

  // Array of dashboard items with their details
  const dashboardItems = [
    {
      title: "Add New EV Bunk",
      description: "Register a new electric vehicle charging station to the system.",
      icon: <PlusCircle className="w-10 h-10 text-blue-600 group-hover:text transition-colors duration-300" />,
      bgColor: "bg-blue-50",
      hoverBg: "bg-blue-600",
      textColor: "text-blue-800",
      path: "/admin/add-bunk",
    },
    {
      title: "Manage EV Bunks",
      description: "View, edit, and manage all registered EV charging stations.",
      icon: <MapPin className="w-10 h-10 text-green-600 group-hover:text transition-colors duration-300" />,
      bgColor: "bg-green-50",
      hoverBg: "bg-green-600",
      textColor: "text-green-800",
      path: "/admin/view-bunks",
    },
    {
      title: "View Bunk Locations",
      description: "See all EV bunk locations on an interactive map.",
      icon: <Globe className="w-10 h-10 text-yellow-600 group-hover:text transition-colors duration-300" />,
      bgColor: "bg-yellow-50",
      hoverBg: "bg-yellow-600",
      textColor: "text-yellow-800",
      path: "/admin/view-bunk-locations",
    },
    {
      title: "Manage Users",
      description: "View and manage all registered user accounts.",
      icon: <Users className="w-10 h-10 text-red-600 group-hover:text transition-colors duration-300" />,
      bgColor: "bg-red-50",
      hoverBg: "bg-red-600",
      textColor: "text-red-800",
      path: "/admin/registered-users",
    },
    {
      title: "My Profile",
      description: "Get a high-level overview of system performance and statistics.",
      icon: <Zap className="w-10 h-10 text-indigo-600 group-hover:text transition-colors duration-300" />,
      bgColor: "bg-indigo-50",
      hoverBg: "bg-indigo-400",
      textColor: "text-indigo-800",
      path: "/admin/my-profile", // Example path, adjust as needed
    },
  ];

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 sm:p-10 lg:p-12">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 lg:p-10">
          {/* Header Section */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-3 lg:text-5xl">Admin Dashboard</h1>
            <p className="text-xl text-gray-600 lg:text-2xl">
              Welcome to the administration panel. Manage your EV Charge Hub efficiently.
            </p>
          </div>

          {/* Grid of Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {dashboardItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`group flex flex-col items-center text-center p-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg
                  ${item.bgColor} hover:${item.hoverBg}
                  border border-gray-100 
                `}
              >
                <div className="mb-4">
                  {item.icon}
                </div>
                {/* Removed transition-colors from h2 */}
                <h2 className={`text-2xl font-bold mb-2 group-hover:text ${item.textColor}`}>
                  {item.title}
                </h2>
                {/* Removed transition-colors from p */}
                <p className="text-gray-600 group-hover:text text-base">
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

export default AdminDashboard;
