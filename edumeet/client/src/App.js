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
 import StudentApproval from './pages/Admin/StudentApproval';
 import AdminTeacherManagement from './pages/Admin/AddTeacher';
 import TeacherLogin from './pages/Teacher/TeacherLogin';
 import TeacherDashboard from './pages/Teacher/TeacherDashboard';
 import TeacherSchedule from './pages/Teacher/SheduleAppointment';
 import UserDashboard from './pages/User/UserDashboard';
 import UserScheduleAppointments from './pages/User/Shedule appointment';
 import AppointmentList from './pages/User/AppointmentList';
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
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/Appointments" element={<UserScheduleAppointments />} />
              <Route path="/teacher/Appointment-list" element={<AppointmentList />} />
              <Route path="/admin/approval" element={<StudentApproval />} />
              <Route path="/admin/teacher-register" element={<AdminTeacherManagement />} />
              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/shedule-appointment" element={<TeacherSchedule />} />
              

            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;