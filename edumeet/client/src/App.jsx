import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

 import AdminRegister from './admin/AdminRegister'
 import AdminLogin from './admin/AdminLogin'; // Admin dashboard page
 
const App = () => {
  return (
    <Router>
      <Routes>        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
      </Routes>
    </Router>
  );
};

export default App;