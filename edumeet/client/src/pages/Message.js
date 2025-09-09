import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, ThumbsUp, Star, MessageCircle, User, GraduationCap, Clock, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';

// Import the respective navbars
import UserNavbar from "../components/userNavbar";
import TeacherNavbar from "../components/teacherNavbar";

const MessageBoard = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('general');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [authToken, setAuthToken] = useState('');
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // FIXED: Simple and clear API URL - NO /api/ suffix to avoid double path
  const getApiUrl = () => {
    // Production environment
    if (process.env.NODE_ENV === 'production' || window.location.hostname === 'edumeet-1.onrender.com') {
      return 'https://edumeet.onrender.com';
    }
    
    // Development environment
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    return 'http://localhost:5000';
  };

  const API_BASE_URL = getApiUrl();

  console.log('API Base URL:', API_BASE_URL);

  // Available reactions
  const reactions = [
    { id: 'heart', icon: Heart, label: 'Heart', color: 'text-red-500' },
    { id: 'thumbs', icon: ThumbsUp, label: 'Thumbs Up', color: 'text-blue-500' },
    { id: 'star', icon: Star, label: 'Star', color: 'text-yellow-500' },
  ];

  // User detection with proper token validation
  useEffect(() => {
    const detectUserType = () => {
      console.log('Detecting user type...');
      
      // Check for teacher authentication first
      const teacherToken = localStorage.getItem('teacherToken') || sessionStorage.getItem('teacherToken');
      const teacherData = localStorage.getItem('teacher') || sessionStorage.getItem('teacher');
      
      // Check for student/user authentication
      const userToken = localStorage.getItem('userToken') || localStorage.getItem('studentToken') || 
                       sessionStorage.getItem('userToken') || sessionStorage.getItem('studentToken');
      const userData = localStorage.getItem('user') || localStorage.getItem('student') ||
                      sessionStorage.getItem('user') || sessionStorage.getItem('student');

      console.log('Auth check:', {
        hasTeacherToken: !!teacherToken,
        hasUserToken: !!userToken,
        hasTeacherData: !!teacherData,
        hasUserData: !!userData
      });

      let detectedRole = '';
      let detectedName = '';
      let detectedToken = '';

      if (teacherToken && teacherToken.trim() !== '') {
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
      } else if (userToken && userToken.trim() !== '') {
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

      if (detectedRole && detectedToken && detectedName) {
        console.log('User detected:', { role: detectedRole, name: detectedName });
        setUserRole(detectedRole);
        setUserName(detectedName);
        setAuthToken(detectedToken);
        setError('');
        return true;
      } else {
        console.log('No valid authentication found');
        setError('Please login to use the message board');
        return false;
      }
    };

    detectUserType();
  }, []);

  // FIXED: Socket connection with proper error handling
  useEffect(() => {
    if (!authToken || !userRole || !userName) {
      console.log('Missing auth requirements:', { 
        hasToken: !!authToken, 
        role: userRole, 
        name: userName 
      });
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      console.log('Disconnecting existing socket');
      socketRef.current.disconnect();
    }

    console.log('Attempting socket connection to:', API_BASE_URL);

    // FIXED: Clean socket configuration
    socketRef.current = io(API_BASE_URL, {
      auth: { 
        token: authToken,
        role: userRole,
        name: userName
      },
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      path: '/socket.io/' // Default Socket.IO path
    });

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      setError('');
      setConnectionAttempts(0);
      
      // Join the room after connection
      console.log('Joining room:', roomId);
      socketRef.current.emit('join-room', roomId);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        setError('Server disconnected. Attempting to reconnect...');
      } else if (reason === 'transport close' || reason === 'transport error') {
        setError('Connection lost. Reconnecting...');
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
      setConnectionAttempts(prev => prev + 1);
      
      if (err.message.includes('Authentication') || err.message.includes('auth')) {
        setError('Authentication failed. Please login again.');
      } else if (err.message.includes('Invalid namespace')) {
        setError('Connection configuration error. Please refresh the page.');
      } else if (err.message.includes('CORS')) {
        setError('Connection blocked by server policy. Please contact support.');
      } else {
        setError(`Connection failed: ${err.message || 'Network error'}`);
      }
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setError('');
      setConnectionAttempts(0);
      setIsConnected(true);
    });

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
      setConnectionAttempts(attemptNumber);
      setError(`Reconnecting... (attempt ${attemptNumber}/10)`);
    });

    socketRef.current.on('reconnect_error', (error) => {
      console.error('Reconnection failed:', error);
    });

    socketRef.current.on('reconnect_failed', () => {
      console.error('All reconnection attempts failed');
      setError('Failed to reconnect. Please refresh the page.');
      setConnectionAttempts(0);
    });

    // Message event handlers
    socketRef.current.on('new-message', (message) => {
      console.log('Received new message:', message);
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('message-updated', (updatedMessage) => {
      console.log('Message updated:', updatedMessage);
      setMessages(prev => prev.map(msg => 
        (msg.id || msg._id) === (updatedMessage.id || updatedMessage._id) ? updatedMessage : msg
      ));
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'Socket error occurred');
    });

    // Room events
    socketRef.current.on('room-joined', (data) => {
      console.log('Successfully joined room:', data.roomId);
    });

    socketRef.current.on('user-joined', (data) => {
      console.log('User joined room:', data);
    });

    socketRef.current.on('user-left', (data) => {
      console.log('User left room:', data);
    });

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, authToken, userRole, userName, API_BASE_URL]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // FIXED: Load messages with correct URL construction
  useEffect(() => {
    if (authToken && userRole) {
      loadMessages();
    }
  }, [roomId, authToken, userRole]);

  const loadMessages = async () => {
    if (!authToken) {
      console.log('No auth token for loading messages');
      return;
    }
    
    setIsLoading(true);
    try {
      // FIXED: Construct URL carefully to avoid double /api/
      const endpoint = `/messages/room/${roomId}`;
      const fullURL = API_BASE_URL + endpoint;
      
      console.log('Loading messages from:', fullURL);
      
      const response = await fetch(fullURL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Messages API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded messages response:', data);
        
        // Handle different possible response structures
        let messagesArray = [];
        if (data.success && data.data) {
          messagesArray = data.data.messages || data.data || [];
        } else if (data.messages) {
          messagesArray = data.messages;
        } else if (Array.isArray(data)) {
          messagesArray = data;
        }
        
        console.log('Setting messages:', messagesArray);
        setMessages(messagesArray);
        
      } else {
        const errorText = await response.text();
        console.error('Failed to load messages:', response.status, errorText);
        
        if (response.status === 401) {
          setError('Authentication failed. Please login again.');
          // Clear invalid tokens
          localStorage.removeItem(userRole === 'teacher' ? 'teacherToken' : 'userToken');
          sessionStorage.removeItem(userRole === 'teacher' ? 'teacherToken' : 'userToken');
        } else if (response.status === 404) {
          setError('Messages endpoint not found. Please contact support.');
        } else {
          setError(`Failed to load messages: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(`Network error loading messages: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      setError('Please enter a message');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!authToken || !userRole) {
      setError('Please login to send messages');
      return;
    }

    if (!socketRef.current || !isConnected) {
      setError('Not connected to server. Please wait for connection.');
      return;
    }

    console.log('Sending message:', {
      text: newMessage,
      roomId,
      as: `${userName} (${userRole})`
    });

    socketRef.current.emit('send-message', {
      text: newMessage.trim(),
      roomId
    });

    setNewMessage('');
    setError('');
  };

  const handleReaction = (messageId, reactionType) => {
    if (userRole !== 'teacher') {
      setError('Only teachers can add reactions');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!socketRef.current || !isConnected) {
      setError('Not connected to server');
      return;
    }

    console.log('Adding reaction:', { messageId, reactionType });
    socketRef.current.emit('add-reaction', {
      messageId: messageId || messageId,
      reactionType
    });
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid time';
    }
  };

  const handleRoomChange = (newRoomId) => {
    console.log('Changing room from', roomId, 'to', newRoomId);
    
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave-room', roomId);
    }
    
    setRoomId(newRoomId);
    setMessages([]); // Clear messages when switching rooms
  };

  const handleLogout = () => {
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Clear all auth data
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset state
    setUserRole('');
    setUserName('');
    setAuthToken('');
    setIsConnected(false);
    setMessages([]);
    setError('Logged out successfully');
    
    // Redirect to home
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  // Show login message if not authenticated
  if (!authToken || !userRole) {
    return (
      <div className="min-h-screen">
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
                <p className="text-blue-200 text-sm mt-1">
                  Server: {API_BASE_URL} | Room: {roomId}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-200' : 'bg-red-200'} animate-pulse`}></div>
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
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              {connectionAttempts > 0 && (
                <span className="text-sm">
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
                disabled={!isConnected}
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
          <div className="p-6 max-h-96 overflow-y-auto bg-gray-50">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No messages yet in {roomId}</p>
                <p className="text-sm">
                  {isConnected ? 'Start a conversation!' : 'Waiting for connection...'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id || message._id || index}
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
                    
                    <p className="text-gray-800 mb-3 whitespace-pre-wrap">{message.text}</p>
                    
                    {/* Reactions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      {userRole === 'teacher' && message.role === 'student' && (
                        <div className="flex gap-1">
                          {reactions.map((reaction) => {
                            const ReactionIcon = reaction.icon;
                            const count = message.reactions?.[reaction.id] || 0;
                            return (
                              <button
                                key={reaction.id}
                                onClick={() => handleReaction(message.id || message._id, reaction.id)}
                                disabled={!isConnected}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors disabled:opacity-50 ${
                                  count > 0 
                                    ? 'bg-gray-100 text-gray-700' 
                                    : 'hover:bg-gray-100 text-gray-500'
                                }`}
                                title={`Add ${reaction.label}`}
                              >
                                <ReactionIcon className={`h-4 w-4 ${reaction.color}`} />
                                {count > 0 && <span className="text-xs">{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Display reactions for all users */}
                      {message.reactions && Object.keys(message.reactions).some(key => message.reactions[key] > 0) && (
                        <div className="flex gap-2 ml-auto">
                          {Object.entries(message.reactions).map(([reactionId, count]) => {
                            if (count === 0) return null;
                            const reaction = reactions.find(r => r.id === reactionId);
                            if (!reaction) return null;
                            const ReactionIcon = reaction.icon;
                            return (
                              <div key={reactionId} className={`flex items-center gap-1 ${reaction.color}`}>
                                <ReactionIcon className="h-4 w-4" />
                                <span className="text-xs font-medium">{count}</span>
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
          <div className="p-6 border-t bg-white">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`${userRole === 'student' ? 'Ask a question or share a thought...' : 'Send a message to students...'}`}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                disabled={!isConnected}
                maxLength={1000}
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
            
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm text-gray-500">
                {!isConnected ? (
                  <span className="text-red-500">Connecting to server...</span>
                ) : (
                  <span className="text-green-600">Connected and ready to chat</span>
                )}
              </div>
              
              <div className="text-xs text-gray-400">
                {newMessage.length}/1000 characters
              </div>
            </div>
            
            {userRole === 'teacher' && isConnected && (
              <p className="text-sm text-green-600 mt-2">
                As a teacher, you can react to student messages with hearts, thumbs up, or stars
              </p>
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
                <li>• Login and join different class rooms</li>
                <li>• Send messages to ask questions in real-time</li>
                <li>• Share thoughts and ideas instantly</li>
                <li>• View teacher reactions on your messages</li>
                <li>• Switch between different class rooms</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">For Teachers:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Login and moderate class discussions</li>
                <li>• React to student messages with emojis</li>
                <li>• Send messages to the class instantly</li>
                <li>• Provide real-time feedback and encouragement</li>
                <li>• Monitor multiple class rooms</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
            <h4 className="font-semibold text-yellow-800 mb-2">Debug Info:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• API Base URL: {API_BASE_URL}</li>
              <li>• Socket Connected: {isConnected ? 'Yes' : 'No'}</li>
              <li>• Current Room: {roomId}</li>
              <li>• User Role: {userRole}</li>
              <li>• Messages Loaded: {messages.length}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBoard;