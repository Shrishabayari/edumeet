import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, ThumbsUp, Star, MessageCircle, User, GraduationCap, Clock, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';

// Import the respective navbars
import UserNavbar from "../components/userNavbar";
import TeacherNavbar from "../components/teacherNavbar"; // Adjust path as needed

const MessageBoard = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userRole, setUserRole] = useState(''); // Will be determined from auth
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('general');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [authToken, setAuthToken] = useState('');
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Available reactions
  const reactions = [
    { id: 'heart', icon: Heart, label: 'Heart', color: 'text-red-500' },
    { id: 'thumbs', icon: ThumbsUp, label: 'Thumbs Up', color: 'text-blue-500' },
    { id: 'star', icon: Star, label: 'Star', color: 'text-yellow-500' },
  ];

  // FIXED: Better token and user detection
  useEffect(() => {
    const detectUserType = () => {
      // Check for teacher authentication first
      const teacherToken = localStorage.getItem('teacherToken') || sessionStorage.getItem('teacherToken');
      const teacherData = localStorage.getItem('teacher') || sessionStorage.getItem('teacher');
      
      // Check for student/user authentication
      const userToken = localStorage.getItem('userToken') || localStorage.getItem('studentToken') || 
                       sessionStorage.getItem('userToken') || sessionStorage.getItem('studentToken');
      const userData = localStorage.getItem('user') || localStorage.getItem('student') ||
                      sessionStorage.getItem('user') || sessionStorage.getItem('student');

      let detectedRole = '';
      let detectedName = '';
      let detectedToken = '';

      if (teacherToken) {
        // User is a teacher
        detectedRole = 'teacher';
        detectedToken = teacherToken;
        
        if (teacherData) {
          try {
            const teacher = JSON.parse(teacherData);
            detectedName = teacher.name || teacher.fullName || teacher.email || 'Teacher';
          } catch (e) {
            console.error('Error parsing teacher data:', e);
            detectedName = 'Teacher';
          }
        } else {
          detectedName = 'Teacher';
        }
      } else if (userToken) {
        // User is a student
        detectedRole = 'student';
        detectedToken = userToken;
        
        if (userData) {
          try {
            const user = JSON.parse(userData);
            detectedName = user.name || user.fullName || user.email || 'Student';
          } catch (e) {
            console.error('Error parsing user data:', e);
            detectedName = 'Student';
          }
        } else {
          detectedName = 'Student';
        }
      }

      if (detectedRole && detectedToken) {
        setUserRole(detectedRole);
        setUserName(detectedName);
        setAuthToken(detectedToken);
        setError('');
        console.log('Detected user:', { role: detectedRole, name: detectedName, hasToken: !!detectedToken });
        return true;
      } else {
        setError('Please login to use the message board');
        console.log('No valid authentication found');
        return false;
      }
    };

    detectUserType();
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!authToken || !userRole || !userName) {
      console.log('Missing auth requirements:', { authToken: !!authToken, userRole, userName });
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('Attempting to connect with:', { 
      role: userRole, 
      name: userName, 
      token: authToken.substring(0, 20) + '...' 
    });

    // Connect to socket with better error handling
    socketRef.current = io('http://localhost:5000', {
      auth: { 
        token: authToken,
        role: userRole,
        name: userName
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully as:', userRole);
      setIsConnected(true);
      setError('');
      setConnectionAttempts(0);
      
      // Join the room
      socketRef.current.emit('join-room', roomId);
      console.log('Joined room:', roomId);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setError('Server disconnected. Attempting to reconnect...');
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Connection failed: ' + err.message);
      setIsConnected(false);
      setConnectionAttempts(prev => prev + 1);
      
      if (err.message.includes('Authentication error')) {
        setError('Authentication failed. Please login again.');
        // Clear invalid tokens
        localStorage.removeItem('teacherToken');
        localStorage.removeItem('userToken');
        localStorage.removeItem('studentToken');
        sessionStorage.removeItem('teacherToken');
        sessionStorage.removeItem('userToken');
        sessionStorage.removeItem('studentToken');
      } else if (err.message.includes('No token provided')) {
        setError('No authentication token found. Please login.');
      }
    });

    // Message events
    socketRef.current.on('new-message', (message) => {
      console.log('Received new message:', message);
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socketRef.current.on('message-updated', (updatedMessage) => {
      console.log('Message updated:', updatedMessage);
      setMessages(prev => prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'An error occurred');
    });

    // Room events
    socketRef.current.on('user-joined', (data) => {
      console.log('User joined:', data);
    });

    socketRef.current.on('user-left', (data) => {
      console.log('User left:', data);
    });

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
      }
    };
  }, [roomId, authToken, userRole, userName]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // FIXED: Load initial messages with proper authentication headers
  useEffect(() => {
    if (authToken && userRole) {
      loadMessages();
    }// eslint-disable-next-line
  }, [roomId, authToken, userRole]);

  const loadMessages = async () => {
    if (!authToken) return;
    
    setIsLoading(true);
    try {
      // FIXED: Use the correct endpoint structure and headers
      const response = await fetch(`http://localhost:5000/api/messages/room/${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded messages:', data);
        // FIXED: Handle different possible response structures
        const messagesArray = data.data?.messages || data.messages || data.data || [];
        setMessages(messagesArray);
      } else if (response.status === 401) {
        setError('Authentication failed. Please login again.');
        // Clear tokens and redirect
        localStorage.clear();
        sessionStorage.clear();
      } else {
        console.error('Failed to load messages:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to load previous messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Error loading messages: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!authToken || !userRole) {
      setError('Please login to send messages');
      return;
    }

    if (!socketRef.current || !isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    console.log('Sending message as:', { role: userRole, name: userName });

    socketRef.current.emit('send-message', {
      text: newMessage,
      roomId
    });

    setNewMessage('');
    setError('');
  };

  const handleReaction = (messageId, reactionType) => {
    if (userRole !== 'teacher' || !socketRef.current) return;

    console.log('Adding reaction:', { messageId, reactionType });
    socketRef.current.emit('add-reaction', {
      messageId,
      reactionType
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleRoomChange = (newRoomId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave-room', roomId);
      setRoomId(newRoomId);
      setMessages([]);
    } else {
      setRoomId(newRoomId);
    }
  };

  const handleLogout = () => {
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Clear all auth data from both storage types
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacher');
    localStorage.removeItem('userToken');
    localStorage.removeItem('studentToken');
    localStorage.removeItem('user');
    localStorage.removeItem('student');
    sessionStorage.removeItem('teacherToken');
    sessionStorage.removeItem('teacher');
    sessionStorage.removeItem('userToken');
    sessionStorage.removeItem('studentToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('student');
    
    // Reset state
    setUserRole('');
    setUserName('');
    setAuthToken('');
    setIsConnected(false);
    setMessages([]);
    setError('Logged out. Please login again.');
    
    // Redirect to home or login page
    window.location.href = '/';
  };

  // Show login message if not authenticated
  if (!authToken || !userRole) {
    return (
      <div className="min-h-screen">
        {/* Show default navbar or no navbar when not authenticated */}
        <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Message Board</h2>
            <p className="text-gray-600 mb-6">Please login as a teacher or student to access the message board.</p>
            <div className="flex gap-4 justify-center">
              <a 
                href="/teacher/login" 
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Teacher Login
              </a>
              <a 
                href="/login" 
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Student Login
              </a>
            </div>
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Render navbar based on user role */}
      {userRole === 'teacher' ? <TeacherNavbar /> : <UserNavbar />}
      
      <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <MessageCircle className="h-8 w-8" />
                  Edumeet Message Board
                </h1>
                <p className="text-blue-100 mt-1">
                  Connected as: <span className="font-semibold">{userName}</span> 
                  ({userRole === 'teacher' ? 'Teacher' : 'Student'})
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-200' : 'bg-red-200'}`}></div>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
              {connectionAttempts > 0 && (
                <span className="ml-auto text-sm">
                  (Attempt {connectionAttempts})
                </span>
              )}
            </div>
          )}

          {/* Room Selection */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Current Room:</label>
              <select
                value={roomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General Discussion</option>
                <option value="cs101">CS101 - Computer Science</option>
                <option value="math101">Math101 - Mathematics</option>
                <option value="physics101">Physics101 - Physics</option>
              </select>
              <span className="text-sm text-gray-600 ml-auto">
                {messages.length} message{messages.length !== 1 ? 's' : ''} in this room
              </span>
            </div>
          </div>

          {/* Messages Display */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No messages yet in {roomId}</p>
                <p className="text-sm">Start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id || message._id}
                    className={`p-4 rounded-lg ${
                      message.role === 'student' 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'bg-green-50 border-l-4 border-green-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        {message.role === 'student' ? (
                          <User className="h-5 w-5 text-blue-600" />
                        ) : (
                          <GraduationCap className="h-5 w-5 text-green-600" />
                        )}
                        <span className="font-semibold text-gray-900">{message.sender}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          message.role === 'student' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {message.role === 'student' ? 'Student' : 'Teacher'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Clock className="h-4 w-4" />
                        {formatTime(message.timestamp || message.createdAt)}
                      </div>
                    </div>
                    
                    <p className="text-gray-800 mb-3">{message.text}</p>
                    
                    {/* Reactions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      {userRole === 'teacher' && message.role === 'student' && (
                        <div className="flex gap-1">
                          {reactions.map((reaction) => {
                            const ReactionIcon = reaction.icon;
                            const count = message.reactions?.[reaction.id] || 0;
                            return (
                              <button
                                key={reaction.id}
                                onClick={() => handleReaction(message.id || message._id, reaction.id)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                                  count > 0 
                                    ? 'bg-gray-100 text-gray-700' 
                                    : 'hover:bg-gray-100 text-gray-500'
                                }`}
                              >
                                <ReactionIcon className={`h-4 w-4 ${reaction.color}`} />
                                {count > 0 && <span className="text-xs">{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Display reactions for all users */}
                      {message.role === 'student' && message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className="flex gap-1 ml-auto">
                          {Object.entries(message.reactions).map(([reactionId, count]) => {
                            const reaction = reactions.find(r => r.id === reactionId);
                            if (!reaction || count === 0) return null;
                            const ReactionIcon = reaction.icon;
                            return (
                              <div key={reactionId} className={`flex items-center gap-1 ${reaction.color}`}>
                                <ReactionIcon className="h-4 w-4" />
                                <span className="text-xs">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`${userRole === 'student' ? 'Ask a question or share a thought...' : 'Send a message to students...'}`}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isConnected}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !isConnected}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="h-5 w-5" />
                Send
              </button>
            </div>
            
            {!isConnected && (
              <p className="text-sm text-red-500 mt-2">Connecting to server... Please wait</p>
            )}
            
            {userRole === 'teacher' && isConnected && (
              <p className="text-sm text-green-600 mt-2">As a teacher, you can react to student messages with hearts, thumbs up, or stars</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">How it works:</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">For Students:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Automatically identified when you login as a student</li>
                <li>• Send messages to ask questions in real-time</li>
                <li>• Share thoughts and ideas instantly</li>
                <li>• View teacher reactions on your messages</li>
                <li>• Switch between different class rooms</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">For Teachers:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Automatically identified when you login as a teacher</li>
                <li>• React to student messages with emojis</li>
                <li>• Send messages to the class instantly</li>
                <li>• Provide real-time feedback and encouragement</li>
                <li>• Monitor multiple class rooms</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBoard;