import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './components/home';
import AdminLogin from './pages/Admin/AdminLogin';
import AdminRegister from './pages/Admin/AdminRegister';
import AdminDashboard from './pages/Admin/AdminDashboard';
import RegistrationForm from './pages/User/RegisterPage';
import LoginPage from './pages/User/LoginPage';
import StudentApproval from './pages/Admin/StudentApproval';
import TeacherLogin from './pages/Teacher/TeacherLogin';
import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import TeacherSchedule from './pages/Teacher/SheduleAppointment';
import TeacherApproveAppointments from './pages/Teacher/ApproveAppointment';
import UserDashboard from './pages/User/UserDashboard';
import SheduleApppointment from './pages/User/SheduleAppointment';
import AppointmentList from './pages/Teacher/AppointmentList';
import MessageBoard from './pages/Message';
import ViewTeachers from './pages/Admin/ViewTeacher';
import AddTeacher from './pages/Admin/AddTeacher';
import UserAppointmentList from './pages/User/AppointmentList';
import UserList from './pages/Admin/AllStudents';
import Appointments from './pages/Admin/AppointmentList';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/register" element={<AdminRegister />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/teacher-register" element={<AddTeacher />} />
              <Route path="/admin/view-teachers" element={<ViewTeachers />} />
              <Route path="/admin/approval" element={<StudentApproval />} />
              <Route path="/admin/students" element={<UserList />} />
              <Route path="/admin/appointment-list" element={<Appointments />} />
              
              {/* User Routes */}
              <Route path="/user/register" element={<RegistrationForm />} />
              <Route path="/user/login" element={<LoginPage />} />
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/appointments" element={<SheduleApppointment/>} />
              <Route path="/user/appointment-list" element={<UserAppointmentList />} />
              
              {/* Teacher Routes */}
              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/shedule-appointment" element={<TeacherSchedule />} />
              <Route path="/teacher/appointment-list" element={<AppointmentList />} />
              <Route path="/teacher/approve-appointment" element={<TeacherApproveAppointments />} />
              
              {/* Message Board Route */}
              <Route path="/teacher/message" element={<MessageBoard />} />
              <Route path="/student/message" element={<MessageBoard />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;