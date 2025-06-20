import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, AlertCircle, CheckCircle, GraduationCap } from 'lucide-react'; // Added GraduationCap icon for Edumeet context

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); // For success messages
  const [loading, setLoading] = useState(false); // For loading state
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setMessage(""); // Clear previous messages
    setLoading(true); // Set loading to true

    try {
      // CHANGE: Adjust API endpoint for Edumeet login
      const response = await api.post("/api/edumeet/login", {
        email,
        password,
      });

      // Assuming the backend returns a token for Edumeet users
      localStorage.setItem("edumeetToken", response.data.token);
      setMessage("Login successful! Redirecting to Edumeet dashboard..."); // Set success message

      // Delay navigation slightly to allow message to be seen
      setTimeout(() => {
        navigate("/edumeet/dashboard"); // Navigate to Edumeet specific dashboard
      }, 1500); // Redirect after 1.5 seconds

    } catch (err) {
      console.error("Edumeet login error:", err);
      // More specific error message extraction
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false); // Set loading to false regardless of success or failure
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-100 flex flex-col">

      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 transform transition-all duration-300 hover:shadow-3xl">
          <h2 className="text-4xl font-extrabold text-center text-gray-900 dark:text-white mb-8">
            <GraduationCap className="inline-block w-10 h-10 mr-3 text-indigo-600 dark:text-indigo-400" />
            Edumeet Login
          </h2>

          {/* Error Message Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 flex items-center space-x-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="block sm:inline font-medium text-sm">{error}</span>
            </div>
          )}

          {/* Success Message Display */}
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6 flex items-center space-x-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="block sm:inline font-medium text-sm">{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@edumeet.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Login to Edumeet</span>
                </>
              )}
            </button>

            {/* Register Link */}
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
              New to Edumeet?{" "}
              <a href="/edumeet/register" className="text-teal-600 hover:underline font-medium">
                Register here
              </a>
            </p>

            {/* Forgot Password Link (Optional) */}
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-2">
                <a href="/edumeet/forgot-password" className="text-blue-500 hover:underline font-medium">
                    Forgot Password?
                </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;