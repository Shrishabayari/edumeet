# 🎓 EduMeet – Student-Teacher Appointment Booking System

A comprehensive MERN stack web application for managing educational appointments with real-time messaging, slot booking, and administrative controls for seamless student-teacher interactions.

## 🎓 Project Overview

EduMeet is a full-stack web application built using the MERN stack. It provides separate interfaces for administrators, teachers, and students, enabling efficient management of educational appointments and seamless communication between students and teachers with real-time messaging and appointment scheduling capabilities.

## 🛠️ Technologies Used

### Frontend
- **React.js (v19.1.0)**: Component-based user interface
- **React Router DOM (v7.6.3)**: Client-side routing
- **Tailwind CSS (v3.4.1)**: Utility-first CSS framework
- **Axios (v1.10.0)**: HTTP client for API requests
- **Heroicons (v2.2.0)**: Beautiful & consistent SVG icons
- **Socket.io Client (v4.8.1)**: Real-time bidirectional communication

### Backend
- **Node.js**: Server-side JavaScript runtime (ES Module support)
- **Express.js (v4.21.2)**: Web application framework
- **MongoDB**: NoSQL database for data storage
- **Mongoose (v8.16.1)**: MongoDB object modeling
- **Socket.io (v4.8.1)**: Real-time communication server
- **Express Validator (v7.2.1)**: Input validation and sanitization

### Security & Authentication
- **JWT (jsonwebtoken v9.0.2)**: JSON Web Tokens for authentication
- **bcryptjs (v3.0.2)**: Password hashing
- **CORS (v2.8.5)**: Cross-Origin Resource Sharing
- **Helmet (v8.1.0)**: Security headers
- **Express Rate Limit (v7.5.1)**: Rate limiting middleware

### Additional Technologies
- **Morgan (v1.10.0)**: HTTP request logging
- **Cookie Parser (v1.4.7)**: Cookie parsing middleware
- **dotenv (v17.0.0)**: Environment variables management
- **Nodemon (v3.1.9)**: Development server auto-restart
- **Debug (v4.4.0)**: Debugging utility
- **Colors (v1.4.0)**: Console output styling

## 📦 Core Dependencies

### Server Dependencies (from package.json)
```json
{
  "dependencies": {
    "express": "^4.21.2",
    "mongoose": "^8.16.1",
    "socket.io": "^4.8.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "helmet": "^8.1.0",
    "express-rate-limit": "^7.5.1",
    "express-validator": "^7.2.1",
    "morgan": "^1.10.0",
    "cookie-parser": "^1.4.7",
    "dotenv": "^17.0.0",
    "debug": "^4.4.0",
    "colors": "^1.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.9"
  }
}
```

### Client Dependencies
```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.3",
    "tailwindcss": "^3.4.1",
    "axios": "^1.10.0",
    "@heroicons/react": "^2.2.0",
    "socket.io-client": "^4.8.1"
  }
}
```

## 📋 Features (Current Implementation Status)

### 👨‍💼 Admin Module 
- **Authentication** 
  - Register new admin account
  - Secure login system
  - Admin logout functionality
- **Teacher Registration** 
  - Register new teacher accounts with complete details
- **Teacher Management** 
  - Add new teachers with details (Name, Department, Subject, etc.)
  - Edit/Update existing teacher information
  - Delete teacher records from the system
  - View all teachers with comprehensive details
- **Student Management**
  - Review and approve or reject new student registrations requests 
  - Update student account status (Approve/Reject)
  - View all registered students 
- **Appointment Management** 
  - View all appointments across the system
  - Monitor real-time appointment bookings
  - Edit appointment status (confirmed/cancelled/completed)

### 👨‍🏫 Teacher Module 
- **Authentication** 
  - Secure teacher login system
  - Teacher logout functionality
- **Appointment Management** 
  - Schedule appointments with students
  - Create and manage appointment windows
  - Approve or decline student appointment requests
  - Track appointment status and completion
- **Real-time Communication**
  - Send and receive messages from students
  - Message history and conversation threads
- **Appointment Overview** 
  - View appointment history and analytics

### 👩‍🎓 Student Module 
- **Authentication** 
  - Student registration (requires admin approval)
  - Secure login system
  - Student logout functionality
- **Appointment Booking** 
  - View list of teachers
  - Schedule appointments with teachers (requires teacher confirmation)
  - View booking confirmation and status
  - Cancel appointments
- **Communication** 
  - Direct communication with teachers
  - Conversation history and messaging
- **Teacher Discovery**
  - Search teachers by name, department, or subject
  - Browse teacher profiles and specializations
  - View teacher availability
- **Advanced Booking Management**
  - Track current booking status
  - Cancel appointments

## 🏗️ Project Structure

```
edumeet/
├── client/                     # React frontend
│   ├── node_modules/          # Client dependencies
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/
│   │   │   │   ├── AdminDashboard.js
│   │   │   │   ├── AdminLogin.js
│   │   │   │   ├── AdminManagement.js
│   │   │   │   ├── AdminRegister.js
│   │   │   │   ├── AppointmentManagement.js
│   │   │   │   ├── StudentManagement.js
│   │   │   │   └── TeacherManagement.js
│   │   │   ├── Auth/
│   │   │   │   ├── Login.js
│   │   │   │   └── ProtectedRoute.js
│   │   │   ├── Student/
│   │   │   │   ├── AppointmentBooking.js
│   │   │   │   ├── StudentDashboard.js
│   │   │   │   ├── StudentLogin.js
│   │   │   │   ├── StudentManagement.js
│   │   │   │   ├── StudentRegister.js
│   │   │   │   └── TeacherSearch.js
│   │   │   └── Teacher/
│   │   │       ├── TeacherDashboard.js
│   │   │       ├── TeacherLogin.js
│   │   │       ├── TeacherManagement.js
│   │   │       └── TeacherRegister.js
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   └── constants.js
│   │   ├── App.css
│   │   ├── App.js
│   │   ├── App.test.js
│   │   ├── index.css
│   │   ├── index.js
│   │   ├── logo.svg
│   │   ├── reportWebVitals.js
│   │   └── setupTests.js
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── README.md
│   └── tailwind.config.js
├── server/                     # Node.js backend
│   ├── node_modules/          # Server dependencies
│   ├── config/
│   │   ├── database.js
│   │   ├── socketConfig.js
│   │   └── corsConfig.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── appointmentController.js
│   │   ├── authController.js
│   │   ├── messageController.js
│   │   ├── studentController.js
│   │   └── teacherController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── roleAuth.js
│   │   └── validation.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Appointment.js
│   │   ├── Message.js
│   │   ├── Student.js
│   │   └── Teacher.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── appointments.js
│   │   ├── auth.js
│   │   ├── messages.js
│   │   ├── student.js
│   │   └── teacher.js
│   ├── sockets/
│   │   ├── appointmentSockets.js
│   │   ├── messageSockets.js
│   │   └── socketHandlers.js
│   ├── utils/
│   │   ├── dateHelpers.js
│   │   ├── generateToken.js
│   │   ├── hashPassword.js
│   │   ├── responseHelpers.js
│   │   └── validators.js
│   ├── .env
│   ├── .gitignore
│   ├── index.js
│   ├── package-lock.json
│   └── package.json
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher) - Required for React 19
- npm or yarn
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/edumeet.git
   cd edumeet
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Configuration**
   
   Create `.env` file in the server directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database Configuration
   MONGO_URI=mongodb://localhost:27017/edumeet
   # For MongoDB Atlas:
   # MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/edumeet?retryWrites=true&w=majority
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-for-edumeet-2024
   JWT_EXPIRE=7d
   
   # Socket.io Configuration
   SOCKET_PORT=8080
   
   # CORS Configuration
   CLIENT_URL=http://localhost:3000
   ```

   Create `.env` file in the client directory:
   ```env
   # API Configuration
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_SOCKET_URL=http://localhost:8080
   
   # Production API URLs (fallback)
   # REACT_APP_API_URL=https://edumeet-server.onrender.com
   # REACT_APP_SOCKET_URL=https://edumeet-socket.onrender.com
   ```

5. **Database Setup**
   ```bash
   # MongoDB Local Setup
   # Make sure MongoDB is running on your system
   # The application will automatically create the required collections
   
   # MongoDB Atlas Setup (Recommended for production)
   # Create a cluster and get your connection string
   # Replace the MONGO_URI in your .env file
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   # Server will run on http://localhost:5000
   # Socket.io server will run on http://localhost:8080
   ```

2. **Start the frontend application**
   ```bash
   cd client
   npm start
   # Client will run on http://localhost:3000
   ```

3. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`
   - Socket.io Server: `http://localhost:8080`

## 🔐 Default Login Credentials

### Admin Access
- **Email**: `admin@edumeet.com`
- **Password**: `Admin@123`
- **Role**: Administrator

### Teacher Access
- **Email**: `teacher@edumeet.com`
- **Password**: `Teacher@123`
- **Role**: Teacher

### Student Access
- **Email**: `student@edumeet.com`
- **Password**: `Student@123`
- **Role**: Student

> **Note**: These are default credentials for testing purposes. In production, ensure to change these credentials and implement proper user registration flows with email verification.

## 📊 Database Schema

### Admin Model
```javascript
{
  _id: ObjectId,
  name: String (required, trimmed),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  role: String (default: 'admin'),
  isActive: Boolean (default: true),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

### Teacher Model
```javascript
{
  _id: ObjectId,
  name: String (required, trimmed),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  department: String (required),
  subject: String (required),
  phone: String (required),
  isApproved: Boolean (default: false),
  isActive: Boolean (default: true),
  role: String (default: 'teacher'),
  availability: [{
    day: String (enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
    startTime: String,
    endTime: String,
    isAvailable: Boolean (default: true)
  }],
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

### Student Model
```javascript
{
  _id: ObjectId,
  name: String (required, trimmed),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  studentId: String (required, unique),
  course: String (required),
  year: String (required),
  phone: String (required),
  isApproved: Boolean (default: false),
  isActive: Boolean (default: true),
  role: String (default: 'student'),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

### Appointment Model
```javascript
{
  _id: ObjectId,
  studentId: ObjectId (ref: 'Student', required),
  teacherId: ObjectId (ref: 'Teacher', required),
  appointmentDate: Date (required),
  startTime: String (required, format: "HH:mm"),
  endTime: String (required, format: "HH:mm"),
  subject: String (required),
  description: String,
  status: String (enum: ['pending', 'approved', 'cancelled', 'completed'], default: 'pending'),
  createdBy: String (enum: ['student', 'teacher'], default: 'student'),
  cancelledBy: String (enum: ['student', 'teacher', 'admin']),
  cancelReason: String,
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

### Message Model
```javascript
{
  _id: ObjectId,
  senderId: ObjectId (required),
  senderModel: String (enum: ['Student', 'Teacher'], required),
  receiverId: ObjectId (required),
  receiverModel: String (enum: ['Student', 'Teacher'], required),
  content: String (required, trimmed),
  appointmentId: ObjectId (ref: 'Appointment', optional),
  isRead: Boolean (default: false),
  readAt: Date,
  messageType: String (enum: ['text', 'appointment', 'system'], default: 'text'),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

## 📦 Package Scripts

### Server Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run server tests
```

### Client Scripts
```bash
npm start          # Start React development server
npm run build      # Build React app for production
npm test           # Run React tests with comprehensive testing library
npm run eject      # Eject from Create React App (irreversible)
```

## 🔧 Key Dependencies Explained

### Server Dependencies
- **express-rate-limit**: Prevent abuse with configurable rate limiting
- **express-validator**: Comprehensive input validation and sanitization
- **cookie-parser**: Parse cookies for session management
- **helmet**: Set security-related HTTP headers
- **morgan**: HTTP request logging for debugging and monitoring
- **socket.io**: Real-time bidirectional communication
- **debug**: Flexible debugging utility with namespace support
- **colors**: Add colors and styles to console output
- **nodemon**: Development tool that automatically restarts server on file changes

### Client Dependencies
- **@testing-library/***: Comprehensive testing utilities for React components
- **@heroicons/react**: Beautiful SVG icon library from Heroicons
- **socket.io-client**: Client-side real-time communication
- **react-router-dom v7**: Latest routing library with enhanced data loading
- **axios**: Promise-based HTTP client with interceptors

## 🔧 API Endpoints

### Authentication Routes
#### General Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `GET /auth/verify-token` - Verify authentication token

#### Admin Authentication
- `POST /admin/register` - Admin registration
- `POST /admin/login` - Admin login
- `GET /admin/profile` - Get admin profile
- `PUT /admin/profile` - Update admin profile
- `GET /auth/admin/pending` - Get pending user registrations
- `GET /auth/admin/users` - Get all users for admin
- `PUT /auth/admin/approve/:id` - Approve user registration
- `PUT /auth/admin/reject/:id` - Reject user registration

#### Teacher Authentication
- `POST /teachers/login` - Teacher login
- `POST /teachers/send-setup-link` - Send account setup link to teacher
- `POST /teachers/setup-account/:token` - Setup teacher account with token
- `GET /teachers/profile` - Get teacher profile
- `POST /teachers/logout` - Teacher logout

### Teacher Management Routes
- `GET /teachers` - Get all teachers (with query parameters)
- `GET /teachers/:id` - Get specific teacher by ID
- `POST /teachers` - Create new teacher
- `PUT /teachers/:id` - Update teacher information
- `DELETE /teachers/:id` - Soft delete teacher
- `DELETE /teachers/:id/permanent` - Permanently delete teacher
- `GET /teachers/stats` - Get teacher statistics
- `GET /teachers/department/:department` - Get teachers by department

### Appointment Routes
#### General Appointment Operations
- `GET /appointments` - Get all appointments (with query parameters)
- `GET /appointments/pending/all` - Get all pending appointments
- `GET /appointments/:id` - Get specific appointment by ID
- `GET /appointments/stats` - Get appointment statistics
- `PUT /appointments/:id` - Update appointment details
- `PUT /appointments/:id/cancel` - Cancel appointment

#### Appointment Booking & Management
- `POST /appointments/request` - Request new appointment (student)
- `POST /appointments/book` - Book appointment directly (teacher)
- `PUT /appointments/:id/accept` - Accept appointment request
- `PUT /appointments/:id/reject` - Reject appointment request
- `PUT /appointments/:id/complete` - Mark appointment as completed

#### Teacher-Specific Appointments
- `GET /appointments/teacher/:teacherId` - Get appointments for specific teacher
- `GET /appointments/teacher/:teacherId/pending` - Get pending requests for teacher

### Admin Routes
#### Dashboard & Statistics
- `GET /admin/dashboard/stats` - Get admin dashboard statistics
- `GET /admin/users` - Get all users with filters
- `DELETE /admin/users/:userId` - Delete user account
- `GET /admin/appointments` - Get all appointments for admin view
- `PATCH /admin/teachers/:teacherId/status` - Update teacher approval status

### Message Routes
#### Room & Message Management
- `GET /messages/rooms` - Get all message rooms
- `GET /messages/room/:roomId` - Get messages for specific room
- `GET /messages/room/:roomId/stats` - Get statistics for message room
- `GET /messages/room/:roomId/search` - Search messages within room
- `DELETE /messages/:id` - Delete specific message

### System Health & Monitoring
- `GET /api/health` - API health check endpoint

### Real-time Socket Events
#### Appointment Events
- `appointment:created` - New appointment booking
- `appointment:approved` - Appointment approved by teacher
- `appointment:cancelled` - Appointment cancelled
- `appointment:updated` - Appointment details updated

#### Message Events
- `message:sent` - New message sent
- `message:received` - Message received
- `message:read` - Message marked as read
- `user:online` - User came online
- `user:offline` - User went offline

## ⚡ Real-time Features

### Socket.io Integration
- **Real-time Appointments**: Live appointment booking and status updates
- **Instant Messaging**: Real-time chat between students and teachers
- **Online Status**: Track user online/offline status for messaging

### Event-driven Architecture
- **Appointment Events**: Booking, approval, cancellation, and completion events
- **Message Events**: Send, receive, and read status events
- **User Events**: Login, logout, and status change events
- **Admin Events**: System-wide monitoring and alert events

## 🔧 Development Tools

### Server Development
- **Nodemon**: Automatic server restart on file changes
- **Debug**: Namespace-based debugging with environment variable control
- **Colors**: Enhanced console output with colors and styling
- **Morgan**: HTTP request logging in development and production

### Client Development
- **React DevTools**: Browser extension for React debugging
- **Tailwind CSS IntelliSense**: VS Code extension for Tailwind class completion
- **ES6+ Support**: Modern JavaScript features with Babel compilation

**Made with ❤️ for educational institutions worldwide using the MERN Stack**