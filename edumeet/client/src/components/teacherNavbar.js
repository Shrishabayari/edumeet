import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

const TeacherNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/admin/login");
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-xl font-bold">
          <Link to="/teacher/dashboard">Teacher Panel</Link>
        </div>

        <div className="md:hidden">
          <button onClick={toggleMenu}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <div className="hidden md:flex space-x-6">
          <Link to="/teacher/shedule-appointment" className="hover:underline">Shedule Appointment</Link>
          <Link to="/teacher/approve-appointment" className="hover:underline">Slot Approval</Link>
          <Link to="/teacher/Appointment-list" className="hover:underline">All Appointments</Link>
          <button onClick={handleLogout} className="hover:underline text-red-100">Logout</button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2 bg-blue-600 text-white flex flex-col">
          <Link to="/teacher/shedule-appointment" onClick={toggleMenu} className="block hover:underline">Shedule Appointment</Link>
          <Link to="/teacher/approve-appointment" onClick={toggleMenu} className="block hover:underline">Slot Approval</Link>
          <Link to="/teacher/Appointment-list" onClick={toggleMenu} className="block hover:underline">All Appointments</Link>
          <button onClick={() => { toggleMenu(); handleLogout(); }} className=" text-left hover:underline text-red-100">Logout</button>
        </div>
      )}
    </nav>
  );
};

export default TeacherNavbar;