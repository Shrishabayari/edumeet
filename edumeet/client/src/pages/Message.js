import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, ThumbsUp, Star, MessageCircle, User, GraduationCap, Clock, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';

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
  const [isRoleDetected, setIsRoleDetected] = useState(false);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Available reactions
  const reactions = [
    { id: 'heart', icon: Heart, label: 'Heart', color: 'text-red-500' },
    { id: 'thumbs', icon: ThumbsUp, label: 'Thumbs Up', color: 'text-blue-500' },
    { id: 'star', icon: Star, label: 'Star', color: 'text-yellow-500' },
  ];

  // Detect user role and info from localStorage on component mount
  useEffect(() => {
    const detectUserRole = () => {
      const teacherToken = localStorage.getItem('teacherToken');
      const userToken = localStorage.getItem('userToken');
      const teacherData = localStorage.getItem('teacher');
      const userData = localStorage.getItem('user');

      console.log('Detecting user role...', { 
        hasTeacherToken: !!teacherToken, 
        hasUserToken: !!userToken,
        hasTeacherData: !!teacherData,
        hasUserData: !!userData
      });

      if (teacherToken) {
        // User is a teacher
        setUserRole('teacher');
        if (teacherData) {
          try {
            const teacher = JSON.parse(teacherData);
            setUserName(teacher.name || teacher.fullName || teacher.email || 'Teacher');
          } catch (e) {
            console.error('Error parsing teacher data:', e);
            setUserName('Teacher');
          }
        } else {
          setUserName('Teacher');
        }
        setIsRoleDetected(true);
        console.log('Detected as teacher');
      } else if (userToken) {
        // User is a student
        setUserRole('student');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            setUserName(user.name || user.fullName || user.email || 'Student');
          } catch (e) {
            console.error('Error parsing user data:', e);
            setUserName('Student');
          }
        } else {
          setUserName('Student');
        }
        setIsRoleDetected(true);
        console.log('Detected as student');
      } else {
        // No authentication found
        setUserRole('student'); // Default fallback
        setUserName('');
        setIsRoleDetected(false);
        setError('Please enter your name to connect');
        console.log('No authentication found, using manual input');
      }
    };

    detectUserRole();

    // Listen for localStorage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      detectUserRole();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!userName.trim()) {
      if (isRoleDetected) {
        setError('User name not found. Please refresh and try again.');
      } else {
        setError('Please enter your name to connect');
      }
      return;
    }

    // Get token from localStorage based on role
    const token = userRole === 'teacher' 
      ? localStorage.getItem('teacherToken')
      : localStorage.getItem('userToken');
    
    if (!token && isRoleDetected) {
      setError('Please login to use the message board');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('Attempting to connect with:', { 
      role: userRole, 
      name: userName, 
      hasToken: !!token,
      isRoleDetected 
    });

    // Connect to socket with better error handling
    socketRef.current = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
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
        // Server disconnected, try to reconnect
        setError('Server disconnected. Attempting to reconnect...');
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Connection failed: ' + err.message);
      setIsConnected(false);
      setConnectionAttempts(prev => prev + 1);
      
      // Show specific error messages based on the error
      if (err.message.includes('Authentication error')) {
        setError('Authentication failed. Please login again.');
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
  }, [roomId, userName, userRole, isRoleDetected]); // Re-run when these change

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    if (userName.trim()) {
      loadMessages();
    }
  }, [roomId, userName]);

  const loadMessages = async () => {
    if (!userName.trim()) return;
    
    setIsLoading(true);
    try {
      const token = userRole === 'teacher' 
        ? localStorage.getItem('teacherToken')
        : localStorage.getItem('userToken');
        
      const response = await fetch(`http://localhost:5000/api/messages/room/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded messages:', data.data);
        setMessages(data.data.messages || []);
      } else {
        console.error('Failed to load messages:', response.status);
        setError('Failed to load previous messages');
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

    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!socketRef.current || !isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    console.log('Sending message:', {
      text: newMessage,
      roomId,
      sender: userName,
      role: userRole
    });

    socketRef.current.emit('send-message', {
      text: newMessage,
      roomId
    });

    setNewMessage('');
    setError(''); // Clear any previous errors
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
      // Leave current room
      socketRef.current.emit('leave-room', roomId);
      // Set new room (useEffect will handle joining)
      setRoomId(newRoomId);
      setMessages([]); // Clear messages when changing rooms
    } else {
      setRoomId(newRoomId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8" />
            Edumeet Message Board
            <span className={`ml-auto text-sm px-2 py-1 rounded flex items-center gap-1 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-200' : 'bg-red-200'}`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </h1>
          <p className="text-blue-100 mt-2">
            {isRoleDetected 
              ? `Connected as: ${userName} (${userRole === 'teacher' ? 'Teacher' : 'Student'})`
              : 'Connect, communicate, and collaborate in real-time'
            }
          </p>
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

        {/* User Setup - Only show if role not auto-detected */}
        {!isRoleDetected && (
          <div className="p-6 border-b bg-gray-50">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Your Name:</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Role:</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Room Selection */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Room:</label>
            <select
              value={roomId}
              onChange={(e) => handleRoomChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="general">General</option>
              <option value="cs101">CS101 - Computer Science</option>
              <option value="math101">Math101 - Mathematics</option>
              <option value="physics101">Physics101 - Physics</option>
            </select>
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
              <p className="text-lg">No messages yet</p>
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
                        {message.role}
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
              disabled={!userName.trim() || !isConnected}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !userName.trim() || !isConnected}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              Send
            </button>
          </div>
          
          {!userName.trim() && !isRoleDetected && (
            <p className="text-sm text-orange-600 mt-2">Please enter your name and it will automatically connect</p>
          )}
          
          {!isConnected && userName.trim() && (
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
              <li>• {isRoleDetected ? 'Automatically identified when logged in' : 'Enter your name and select "Student" role'}</li>
              <li>• Send messages to ask questions in real-time</li>
              <li>• Share thoughts and ideas instantly</li>
              <li>• View teacher reactions on your messages</li>
              <li>• Switch between different class rooms</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">For Teachers:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• {isRoleDetected ? 'Automatically identified when logged in' : 'Enter your name and select "Teacher" role'}</li>
              <li>• React to student messages with emojis</li>
              <li>• Send messages to the class instantly</li>
              <li>• Provide real-time feedback and encouragement</li>
              <li>• Monitor multiple class rooms</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBoard;