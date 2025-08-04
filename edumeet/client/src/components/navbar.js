import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
      setIsOpen(!isOpen);
    };
  
    return (
      <nav className="bg-blue-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-xl font-bold">
            <Link to="/" className="text-white text-xl font-bold">
              EduMet
            </Link>
          </div>
          
          <div className="md:hidden">
            <button onClick={toggleMenu}>
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          
          <div className="hidden md:flex space-x-6">
            <Link to="/admin/login" className="hover:underline">Admin Login</Link>
            <Link to="/teacher/login" className="hover:underline">Teacher login</Link>
            <Link to="/user/register" className="hover:underline">User Register</Link>
          </div>
        </div>
  
        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden px-4 pb-4 space-y-2 bg-blue-600 text-white flex flex-col">
            <Link to="/admin/login" onClick={toggleMenu} className="block hover:underline">Admin Login</Link>
            <Link to="/teacher/login" onClick={toggleMenu} className="block hover:underline">Teacher login</Link>
            <Link to="/user/register" onClick={toggleMenu} className="block hover:underline">User Register</Link>
          </div>
        )}
      </nav>
    );
  };

export default Navbar;