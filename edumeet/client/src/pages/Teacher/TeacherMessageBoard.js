import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, ThumbsUp, Star, MessageCircle, User, GraduationCap, Clock, AlertCircle } from 'lucide-react';

const TeacherMessageBoard = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userRole, setUserRole] = useState('teacher'); // Default to teacher
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('general');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Available reactions
  const reactions = [
    { id: 'heart', icon: Heart, label: 'Heart', color: 'text-red-500' },
    { id: 'thumbs', icon: ThumbsUp, label: 'Thumbs Up', color: 'text-blue-500' },
    { id: 'star', icon: Star, label: 'Star', color: 'text-yellow-500' },
  ];

  // Initialize user from localStorage on component mount
  useEffect(() => {
    const initializeUser = () => {
      try {
        // Get teacher data from localStorage (saved during login)
        const teacherData = localStorage.getItem('teacher');
        const teacherToken = localStorage.getItem('teacherToken');
        
        if (teacherData && teacherToken) {
          const teacher = JSON.parse(teacherData);
          console.log('Found teacher data:', teacher);
          
          // Set user name from teacher data - handle different possible field names
          let fullName = '';
          if (teacher.name) {
            fullName = teacher.name;
          } else if (teacher.fullName) {
            fullName = teacher.fullName;
          } else if (teacher.firstName && teacher.lastName) {
            fullName = teacher.firstName + ' ' + teacher.lastName;
          } else if (teacher.firstName) {
            fullName = teacher.firstName;
          } else if (teacher.email) {
            // Use email as fallback if no name is available
            fullName = teacher.email.split('@')[0];
          }
          
          if (fullName) {
            setUserName(fullName);
            setUserRole('teacher');
            console.log('Set teacher name:', fullName);
          } else {
            console.warn('No name found in teacher data:', teacher);
            setError('Teacher name not found. Please update your profile.');
          }
        } else {
          console.log('No teacher data found, checking for student data...');
          
          // Fallback: Check for student data
          const studentData = localStorage.getItem('student');
          const studentToken = localStorage.getItem('userToken');
          
          if (studentData && studentToken) {
            const student = JSON.parse(studentData);
            let fullName = '';
            if (student.name) {
              fullName = student.name;
            } else if (student.fullName) {
              fullName = student.fullName;
            } else if (student.firstName && student.lastName) {
              fullName = student.firstName + ' ' + student.lastName;
            } else if (student.firstName) {
              fullName = student.firstName;
            } else if (student.email) {
              fullName = student.email.split('@')[0];
            }
            
            if (fullName) {
              setUserName(fullName);
              setUserRole('student');
              console.log('Set student name:', fullName);
            }
          } else {
            setError('Please login to use the message board');
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setError('Error loading user data. Please login again.');
      }
    };

    initializeUser();
  }, []);

  // Mock socket connection (since we can't use actual socket.io in artifacts)
  useEffect(() => {
    if (!userName.trim()) {
      return;
    }

    // Simulate connection
    const timer = setTimeout(() => {
      setIsConnected(true);
      setError('');
      console.log('Mock connection established for:', userName);
      
      // Load mock messages
      loadMockMessages();
    }, 1000);

    return () => clearTimeout(timer);
  }, [userName, roomId]);

  // Mock message loading
  const loadMockMessages = () => {
    const mockMessages = [
      {
        id: '1',
        text: 'Welcome to the message board! This is a demo message.',
        sender: 'System',
        role: 'teacher',
        timestamp: new Date().toISOString(),
        reactions: { heart: 2, thumbs: 1 }
      },
      {
        id: '2',
        text: 'Can someone help me with the assignment from last week?',
        sender: 'Student A',
        role: 'student',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        reactions: { star: 1 }
      }
    ];
    setMessages(mockMessages);
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!userName.trim()) {
      setError('User name not found. Please login again.');
      return;
    }

    if (!isConnected) {
      setError('Not connected. Please wait for connection.');
      return;
    }

    // Create new message
    const message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: userName,
      role: userRole,
      timestamp: new Date().toISOString(),
      reactions: {}
    };

    console.log('Sending message:', message);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setError('');
  };

  const handleReaction = (messageId, reactionType) => {
    if (userRole !== 'teacher') return;

    console.log('Adding reaction:', { messageId, reactionType });
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        reactions[reactionType] = (reactions[reactionType] || 0) + 1;
        return { ...msg, reactions };
      }
      return msg;
    }));
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleRoomChange = (newRoomId) => {
    setRoomId(newRoomId);
    setMessages([]);
    setIsConnected(false);
    
    // Simulate reconnection
    setTimeout(() => {
      setIsConnected(true);
      loadMockMessages();
    }, 1000);
  };

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem('teacher');
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('student');
    localStorage.removeItem('userToken');
    
    // Reset state
    setUserName('');
    setUserRole('student');
    setIsConnected(false);
    setMessages([]);
    setError('Logged out successfully');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="h-8 w-8" />
                Edumeet Message Board
              </h1>
              <p className="text-blue-100 mt-2">Connect, communicate, and collaborate in real-time</p>
              {userName && (
                <p className="text-blue-200 text-sm mt-1">
                  Logged in as: <strong>{userName}</strong> ({userRole})
                </p>
              )}
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
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors"
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

        {/* User Info & Room Selection */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Current User:</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {userName || 'Not logged in'} ({userRole})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Room:</label>
              <select
                value={roomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!userName}
              >
                <option value="general">General</option>
                <option value="cs101">CS101 - Computer Science</option>
                <option value="math101">Math101 - Mathematics</option>
                <option value="physics101">Physics101 - Physics</option>
              </select>
            </div>

            {!userName && (
              <div className="text-sm text-orange-600">
                Please login to access the message board
              </div>
            )}
          </div>
        </div>

        {/* Messages Display */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {!userName ? (
            <div className="text-center py-12 text-gray-500">
              <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Please Login</p>
              <p className="text-sm">You need to be logged in to view and send messages</p>
            </div>
          ) : isLoading ? (
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
                  } ${message.sender === userName ? 'bg-opacity-80' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'student' ? (
                        <User className="h-5 w-5 text-blue-600" />
                      ) : (
                        <GraduationCap className="h-5 w-5 text-green-600" />
                      )}
                      <span className="font-semibold text-gray-900">
                        {message.sender}
                        {message.sender === userName && <span className="text-blue-600 ml-1">(You)</span>}
                      </span>
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
                    {userRole === 'teacher' && message.role === 'student' && message.sender !== userName && (
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
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
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
              placeholder={userName ? `${userRole === 'student' ? 'Ask a question or share a thought...' : 'Send a message to students...'}` : 'Please login to send messages'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!userName || !isConnected}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !userName || !isConnected}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              Send
            </button>
          </div>
          
          {!userName && (
            <p className="text-sm text-orange-600 mt-2">Please login to send messages</p>
          )}
          
          {!isConnected && userName && (
            <p className="text-sm text-red-500 mt-2">Connecting... Please wait</p>
          )}
          
          {userRole === 'teacher' && isConnected && userName && (
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
              <li>• Login with your student credentials</li>
              <li>• Send messages to ask questions in real-time</li>
              <li>• Share thoughts and ideas instantly</li>
              <li>• View teacher reactions on your messages</li>
              <li>• Switch between different class rooms</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">For Teachers:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Login with your teacher credentials</li>
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

export default TeacherMessageBoard;