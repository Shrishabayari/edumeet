import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/navbar';
import Home from './components/home';
 import AdminLogin from './pages/Admin/AdminLogin';
 import AdminRegister from './pages/Admin/AdminRegister';
 import AdminDashboard from './pages/Admin/AdminDashboard';
 import RegistrationForm from './pages/User/RegisterPage';
 import LoginPage from './pages/User/LoginPage';
 import AdminTeacherManagement from './pages/Admin/AddTeacher';
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/register" element={<AdminRegister />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/user/register" element={<RegistrationForm />} />
              <Route path="/user/login" element={<LoginPage />} />
              <Route path="/admin/teacher-register" element={<AdminTeacherManagement />} />

            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;