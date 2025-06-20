import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'; // Import Lucide icons

const AdminRegister = () => {
  const [adminData, setAdminData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [registrationError, setRegistrationError] = useState("");
  const [registrationMessage, setRegistrationMessage] = useState(""); // For success messages
  const [loading, setLoading] = useState(false); // For loading state
  const navigate = useNavigate();

  const handleChange = (e) => {
    setAdminData({ ...adminData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegistrationError(""); // Clear previous errors
    setRegistrationMessage(""); // Clear previous messages
    setLoading(true); // Set loading to true

    if (adminData.password !== adminData.confirmPassword) {
      setRegistrationError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/api/admin/register", adminData);
      console.log("Registration successful:", response.data);
      setRegistrationMessage("Registration successful! Redirecting to login..."); // Set success message
      
      // Delay navigation slightly to allow message to be seen
      setTimeout(() => {
        navigate("/admin/login");
      }, 1500); // Redirect after 1.5 seconds

    } catch (error) {
      console.error("Registration failed:", error.response ? error.response.data : error.message);
      if (error.response && error.response.data && error.response.data.message) {
        setRegistrationError(error.response.data.message);
      } else {
        setRegistrationError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false); // Set loading to false regardless of success or failure
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex flex-col">
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 transform transition-all duration-300 hover:shadow-3xl animate-fade-in-up">
          <h2 className="text-4xl font-extrabold text-center text-gray-900 dark:text-white mb-8">
            Admin Registration
          </h2>

          {/* Error Message Display */}
          {registrationError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 flex items-center space-x-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="block sm:inline font-medium text-sm">{registrationError}</span>
            </div>
          )}

          {/* Success Message Display */}
          {registrationMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6 flex items-center space-x-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="block sm:inline font-medium text-sm">{registrationMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="animate-fade-in-up delay-100">
              <label htmlFor="name" className="sr-only">Full Name</label> {/* Accessibility label */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Full Name"
                  value={adminData.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="animate-fade-in-up delay-200">
              <label htmlFor="email" className="sr-only">Email Address</label> {/* Accessibility label */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email Address"
                  value={adminData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="animate-fade-in-up delay-300">
              <label htmlFor="password" className="sr-only">Password</label> {/* Accessibility label */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={adminData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="animate-fade-in-up delay-400">
              <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label> {/* Accessibility label */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={adminData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                />
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] animate-fade-in-up delay-500"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Register</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-6 animate-fade-in-up delay-600">
            Already have an account?{" "}
            <a href="/admin/login" className="text-blue-600 hover:underline font-medium">
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;