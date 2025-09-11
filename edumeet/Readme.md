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

### 👨‍💼 Admin Module ✅ **IMPLEMENTED**
- **Teacher Registration** ✅
  - Register new teacher accounts with complete details
- **Authentication** ✅
  - Register new admin account
  - Secure login system
  - Admin logout functionality
- **Teacher Management** ✅
  - Add new teachers with details (Name, Department, Subject, etc.)
  - Edit/Update existing teacher information
  - Delete teacher records from the system
  - View all teachers with comprehensive details
- **Student Management** ⚠️ **PARTIALLY IMPLEMENTED**
  - Review and approve new student registrations ✅
  - View all registered students ❌ *Not yet implemented*
  - Update student account status (active/inactive) ❌ *Not yet implemented*
  - Delete student accounts ❌ *Not yet implemented*
- **Appointment Management** ❌ **NOT YET IMPLEMENTED**
  - View all appointments across the system
  - Monitor real-time appointment bookings
  - Edit appointment status (confirmed/cancelled/completed)
  - System-wide appointment analytics
- **Communication Hub** ❌ **NOT YET IMPLEMENTED**
  - View all messages between students and teachers
  - Monitor system communication logs
  - Moderate platform interactions
- **Profile Management** ❌ **NOT YET IMPLEMENTED**
  - View own admin profile
  - Update name and contact information
  - Change password securely

### 👨‍🏫 Teacher Module ⚠️ **PARTIALLY IMPLEMENTED**
- **Authentication** ✅
  - Secure teacher login system
  - Teacher logout functionality
- **Appointment Management** ✅
  - Schedule appointments with students
  - Create and manage appointment windows
  - Approve or decline student appointment requests
  - Track appointment status and completion
- **Schedule Management** ❌ **NOT YET IMPLEMENTED**
  - Define availability time slots
  - Set recurring availability patterns
  - Block unavailable time periods
- **Real-time Communication** ❌ **NOT YET IMPLEMENTED**
  - Send and receive messages from students
  - Real-time notifications for new messages
  - Message history and conversation threads
- **Appointment Overview** ❌ **NOT YET IMPLEMENTED**
  - View appointment history and analytics
  - Student interaction history
- **Profile Management** ❌ **NOT YET IMPLEMENTED**
  - View personal teacher profile
  - Update department, subject, and contact information
  - Change password and security settings
- **Session Management** ❌ **NOT YET IMPLEMENTED**
  - Session timeout handling

### 👩‍🎓 Student Module ⚠️ **PARTIALLY IMPLEMENTED**
- **Authentication** ✅
  - Student registration (requires admin approval)
  - Secure login system
  - Student logout functionality
- **Appointment Booking** ✅
  - Schedule appointments with teachers (requires teacher confirmation)
  - View booking confirmation and status
  - View personal appointment history
  - Cancel appointments
- **Communication** ✅
  - Direct communication with teachers
  - Conversation history and messaging
- **Teacher Discovery** ❌ **NOT YET IMPLEMENTED**
  - Search teachers by name, department, or subject
  - Browse teacher profiles and specializations
  - View teacher availability and ratings
- **Advanced Booking Management** ❌ **NOT YET IMPLEMENTED**
  - Track current booking status
  - Reschedule appointments
  - Appointment reminders and notifications
- **Real-time Features** ❌ **NOT YET IMPLEMENTED**
  - Real-time message notifications
  - Real-time slot availability checking
- **Profile Management** ❌ **NOT YET IMPLEMENTED**
  - View personal student profile
  - Update academic information and contact details
  - Change password and account settings

## 🚧 Development Roadmap

### Phase 1: Core Authentication & Basic Operations ✅ **COMPLETED**
- Admin authentication and teacher registration
- Basic teacher management (CRUD operations)
- Student registration with admin approval
- Teacher and student login systems
- Core appointment booking workflow

### Phase 2: Appointment System ✅ **COMPLETED**
- Student appointment scheduling
- Teacher appointment confirmation/rejection
- Appointment status tracking
- Basic communication between students and teachers

### Phase 3: Enhanced User Management 🔄 **IN PROGRESS**
- Complete student management features
- Admin profile management
- User status management and controls

### Phase 4: Advanced Features 📋 **PLANNED**
- Teacher availability and schedule management
- Real-time notifications
- Advanced search and filtering
- Appointment analytics

### Phase 5: Communication Enhancement 📋 **PLANNED**
- Real-time messaging system
- Notification system
- Communication hub for admins

### Phase 6: Profile & Settings 📋 **PLANNED**
- User profile management
- Security settings
- Password management

## 🏗️ Project Structure

```
edumeet/
├── client/                     # React frontend
│   ├── node_modules/          # Client dependencies
│   │   ├── @babel/             # Babel compiler packages
│   │   ├── @heroicons/         # Heroicons React components
│   │   ├── @testing-library/   # Testing utilities
│   │   ├── axios/             # HTTP client library
│   │   ├── react/             # React core library
│   │   ├── react-dom/         # React DOM renderer
│   │   ├── react-router-dom/  # React routing
│   │   ├── socket.io-client/  # Socket.io client
│   │   ├── tailwindcss/       # Tailwind CSS framework
│   │   └── ... (other dependencies)
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── logo192.png
│   │   ├── logo512.png
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.js
│   │   │   │   ├── AdminLogin.js
│   │   │   │   ├── AdminRegister.js
│   │   │   │   ├── AdminProfile.js
│   │   │   │   ├── TeacherManagement.js
│   │   │   │   ├── StudentManagement.js
│   │   │   │   ├── AppointmentManagement.js
│   │   │   │   ├── MessageOverview.js
│   │   │   │   └── SystemAnalytics.js
│   │   │   ├── teacher/
│   │   │   │   ├── TeacherDashboard.js
│   │   │   │   ├── TeacherLogin.js
│   │   │   │   ├── TeacherRegister.js
│   │   │   │   ├── TeacherProfile.js
│   │   │   │   ├── ScheduleManagement.js
│   │   │   │   ├── AppointmentControl.js
│   │   │   │   ├── StudentMessages.js
│   │   │   │   └── AppointmentHistory.js
│   │   │   ├── student/
│   │   │   │   ├── StudentDashboard.js
│   │   │   │   ├── StudentLogin.js
│   │   │   │   ├── StudentRegister.js
│   │   │   │   ├── StudentProfile.js
│   │   │   │   ├── TeacherSearch.js
│   │   │   │   ├── AppointmentBooking.js
│   │   │   │   ├── BookingHistory.js
│   │   │   │   ├── TeacherMessages.js
│   │   │   │   └── AppointmentTracker.js
│   │   │   └── common/
│   │   │       ├── Header.js
│   │   │       ├── Footer.js
│   │   │       ├── Navbar.js
│   │   │       ├── LoadingSpinner.js
│   │   │       ├── ErrorBoundary.js
│   │   │       └── ProtectedRoute.js
│   │   ├── contexts/
│   │   │   ├── AdminContext.js
│   │   │   ├── TeacherContext.js
│   │   │   ├── StudentContext.js
│   │   │   ├── AuthContext.js
│   │   │   └── SocketContext.js
│   │   ├── services/
│   │   │   ├── adminService.js
│   │   │   ├── teacherService.js
│   │   │   ├── studentService.js
│   │   │   ├── authService.js
│   │   │   ├── appointmentService.js
│   │   │   ├── messageService.js
│   │   │   └── socketService.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   ├── useAppointments.js
│   │   │   ├── useMessages.js
│   │   │   └── useRealTime.js
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   ├── dateUtils.js
│   │   │   └── validators.js
│   │   ├── styles/
│   │   │   ├── admin.css
│   │   │   ├── teacher.css
│   │   │   ├── student.css
│   │   │   └── global.css
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
│   │   ├── express/           # Express.js framework
│   │   ├── mongoose/          # MongoDB ODM
│   │   ├── socket.io/         # Real-time communication
│   │   ├── jsonwebtoken/      # JWT authentication
│   │   ├── bcryptjs/          # Password hashing
│   │   ├── cors/              # Cross-origin resource sharing
│   │   ├── helmet/            # Security headers
│   │   ├── express-rate-limit/ # Rate limiting
│   │   ├── express-validator/ # Input validation
│   │   ├── morgan/            # HTTP request logging
│   │   ├── cookie-parser/     # Cookie parsing
│   │   ├── dotenv/            # Environment variables
│   │   ├── debug/             # Debugging utility
│   │   ├── colors/            # Console colors
│   │   ├── nodemon/           # Development auto-restart
│   │   └── ... (other dependencies)
│   ├── config/
│   │   ├── database.js
│   │   ├── socketConfig.js
│   │   └── corsConfig.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── teacherController.js
│   │   ├── studentController.js
│   │   ├── authController.js
│   │   ├── appointmentController.js
│   │   └── messageController.js
│   ├── middleware/
│   │   ├── adminAuth.js
│   │   ├── teacherAuth.js
│   │   ├── studentAuth.js
│   │   ├── auth.js
│   │   ├── roleAuth.js
│   │   ├── rateLimiter.js
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Teacher.js
│   │   ├── Student.js
│   │   ├── Appointment.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── teacher.js
│   │   ├── student.js
│   │   ├── auth.js
│   │   ├── appointments.js
│   │   └── messages.js
│   ├── sockets/
│   │   ├── socketHandlers.js
│   │   ├── appointmentSockets.js
│   │   └── messageSockets.js
│   ├── utils/
│   │   ├── generateToken.js
│   │   ├── hashPassword.js
│   │   ├── validators.js
│   │   ├── dateHelpers.js
│   │   └── responseHelpers.js
│   ├── .env
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   └── index.js
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
#### Admin Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/admin/register` - Admin registration
- `GET /api/auth/admin/profile` - Get admin profile
- `PUT /api/auth/admin/profile` - Update admin profile
- `POST /api/auth/admin/logout` - Admin logout

#### Teacher Authentication
- `POST /api/auth/teacher/login` - Teacher login
- `POST /api/auth/teacher/register` - Teacher registration (requires approval)
- `GET /api/auth/teacher/profile` - Get teacher profile
- `PUT /api/auth/teacher/profile` - Update teacher profile
- `POST /api/auth/teacher/logout` - Teacher logout

#### Student Authentication
- `POST /api/auth/student/login` - Student login
- `POST /api/auth/student/register` - Student registration (requires approval)
- `GET /api/auth/student/profile` - Get student profile
- `PUT /api/auth/student/profile` - Update student profile
- `POST /api/auth/student/logout` - Student logout

### Admin Routes
#### User Management
- `GET /api/admin/teachers` - Get all teachers (with approval status)
- `GET /api/admin/students` - Get all students (with approval status)
- `PUT /api/admin/teachers/:id/approve` - Approve teacher registration
- `PUT /api/admin/students/:id/approve` - Approve student registration
- `DELETE /api/admin/users/:id` - Delete user account
- `PUT /api/admin/users/:id/status` - Update user status

#### System Management
- `GET /api/admin/appointments` - Get all appointments with filters
- `GET /api/admin/messages` - Get all system messages
- `GET /api/admin/statistics` - Get system analytics and statistics
- `PUT /api/admin/appointments/:id` - Update appointment status

### Teacher Routes
#### Schedule Management
- `GET /api/teacher/availability` - Get teacher's availability schedule
- `PUT /api/teacher/availability` - Update availability schedule
- `GET /api/teacher/appointments` - Get teacher's appointments
- `PUT /api/teacher/appointments/:id/approve` - Approve appointment request
- `PUT /api/teacher/appointments/:id/cancel` - Cancel appointment

#### Communication
- `GET /api/teacher/messages` - Get messages from students
- `POST /api/teacher/messages` - Send message to student
- `PUT /api/teacher/messages/:id/read` - Mark message as read

### Student Routes
#### Teacher Discovery & Booking
- `GET /api/student/teachers` - Search teachers by name/subject/department
- `GET /api/student/teachers/:id` - Get specific teacher details and availability
- `POST /api/student/appointments` - Book appointment with teacher
- `GET /api/student/appointments` - Get student's appointments
- `PUT /api/student/appointments/:id/cancel` - Cancel appointment

#### Communication
- `GET /api/student/messages` - Get messages from teachers
- `POST /api/student/messages` - Send message to teacher
- `PUT /api/student/messages/:id/read` - Mark message as read

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
- **Online Status**: Track user online/offline status
- **Notifications**: Real-time notifications for appointments and messages

### Event-driven Architecture
- **Appointment Events**: Booking, approval, cancellation, and completion events
- **Message Events**: Send, receive, and read status events
- **User Events**: Login, logout, and status change events
- **Admin Events**: System-wide monitoring and alert events

## 🧪 Testing

```bash
# Run backend tests
cd server
npm test

# Run frontend tests (with React Testing Library)
cd client
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Build and test production build
npm run build
```

## 📱 Usage Guide

### For Administrators

1. **System Setup**: Login with admin credentials to access the admin dashboard
2. **User Approval**: Review and approve teacher and student registrations
3. **User Management**: Monitor users, update status, or remove accounts
4. **System Monitoring**: View all appointments, messages, and system analytics
5. **Content Management**: Manage system settings and configurations

### For Teachers

1. **Registration**: Register and wait for admin approval
2. **Profile Setup**: Complete profile with department, subject, and contact information
3. **Schedule Management**: Set up availability schedule for different days and times
4. **Appointment Handling**: Review and approve/decline student appointment requests
5. **Communication**: Use real-time messaging to communicate with students
6. **Session Management**: Track completed appointments and student interactions

### For Students

1. **Registration**: Register with academic details and wait for admin approval
2. **Teacher Search**: Search and browse teachers by name, subject, or department
3. **Appointment Booking**: Book available slots with preferred teachers
4. **Communication**: Send messages and communicate with teachers in real-time
5. **Appointment Management**: Track booking status and manage appointments
6. **Academic Planning**: Use the platform for academic guidance and consultation

## 📈 Optimization

- **Database**: MongoDB indexing with Mongoose for efficient queries
- **Frontend**: React 19 features with automatic batching and concurrent rendering
- **API**: RESTful design with proper HTTP status codes and pagination
- **Real-time**: Optimized Socket.io connections with room-based messaging
- **Authentication**: JWT tokens with proper expiration and refresh mechanisms
- **Caching**: Response caching for frequently accessed data
- **Build**: Tailwind CSS purging and React build optimization
- **Security**: Rate limiting, input validation, and XSS protection
- **Development**: Nodemon for automatic server restarts during development
- **Logging**: Morgan for HTTP request logging and debug for flexible debugging

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow React and Node.js best practices
- Write comprehensive tests for new features
- Ensure proper error handling and validation
- Maintain consistent code style and documentation
- Test real-time features thoroughly
- Use the debug utility for development logging
- Leverage nodemon for efficient development workflow

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