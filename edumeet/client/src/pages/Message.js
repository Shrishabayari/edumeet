import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, ThumbsUp, Star, MessageCircle, User, GraduationCap, Clock, AlertCircle, Key } from 'lucide-react';
import io from 'socket.io-client';

const MessageBoard = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userRole, setUserRole] = useState('student');
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('general');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [tokenDebugInfo, setTokenDebugInfo] = useState('');
  const [showTokenDebug, setShowTokenDebug] = useState(false);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Available reactions
  const reactions = [
    { id: 'heart', icon: Heart, label: 'Heart', color: 'text-red-500' },
    { id: 'thumbs', icon: ThumbsUp, label: 'Thumbs Up', color: 'text-blue-500' },
    { id: 'star', icon: Star, label: 'Star', color: 'text-yellow-500' },
  ];

  // Debug function to check tokens
  const debugTokens = () => {
    const userToken = localStorage.getItem('userToken');
    const teacherToken = localStorage.getItem('teacherToken');
    const adminToken = localStorage.getItem('adminToken');
    
    let debugInfo = 'Token Debug Info:\n';
    debugInfo += `User Token: ${userToken ? `${userToken.substring(0, 20)}... (Length: ${userToken.length})` : 'Not found'}\n`;
    debugInfo += `Teacher Token: ${teacherToken ? `${teacherToken.substring(0, 20)}... (Length: ${teacherToken.length})` : 'Not found'}\n`;
    debugInfo += `Admin Token: ${adminToken ? `${adminToken.substring(0, 20)}... (Length: ${adminToken.length})` : 'Not found'}\n`;
    
    // Try to parse the tokens
    [userToken, teacherToken, adminToken].forEach((token, index) => {
      const tokenNames = ['User', 'Teacher', 'Admin'];
      if (token) {
        try {
          // Check if token has proper JWT structure (3 parts separated by dots)
          const parts = token.split('.');
          debugInfo += `${tokenNames[index]} Token Parts: ${parts.length}\n`;
          
          if (parts.length === 3) {
            // Try to decode the payload (second part)
            const payload = JSON.parse(atob(parts[1]));
            debugInfo += `${tokenNames[index]} Payload: ${JSON.stringify(payload, null, 2)}\n`;
          } else {
            debugInfo += `${tokenNames[index]} Token: Invalid JWT structure\n`;
          }
        } catch (e) {
          debugInfo += `${tokenNames[index]} Token: Error parsing - ${e.message}\n`;
        }
      }
    });
    
    setTokenDebugInfo(debugInfo);
    console.log(debugInfo);
    return debugInfo;
  };

  // Get the appropriate token based on user role
  const getToken = () => {
    let token = null;
    
    if (userRole === 'teacher') {
      token = localStorage.getItem('teacherToken');
      if (!token) {
        token = localStorage.getItem('userToken'); // Fallback
      }
    } else {
      token = localStorage.getItem('userToken');
      if (!token) {
        token = localStorage.getItem('teacherToken'); // Fallback
      }
    }
    
    // Also check admin token as fallback
    if (!token) {
      token = localStorage.getItem('adminToken');
    }
    
    console.log(`Getting token for role: ${userRole}, Found: ${token ? 'Yes' : 'No'}`);
    
    return token;
  };

  // Function to create a demo token for testing (remove this in production)
  const createDemoToken = () => {
    // Create a demo JWT token for testing
    const header = btoa(JSON.stringify({ "alg": "HS256", "typ": "JWT" }));
    const payload = btoa(JSON.stringify({
      id: "demo123",
      name: userName || "Demo User",
      role: userRole,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    }));
    const signature = btoa("demo_signature_for_testing");
    
    const demoToken = `${header}.${payload}.${signature}`;
    
    if (userRole === 'teacher') {
      localStorage.setItem('teacherToken', demoToken);
    } else {
      localStorage.setItem('userToken', demoToken);
    }
    
    console.log('Created demo token:', demoToken);
    return demoToken;
  };

  // Initialize socket connection
  useEffect(() => {
    if (!userName.trim()) {
      setError('Please enter your name to connect');
      return;
    }

    // Debug tokens first
    debugTokens();

    // Get token
    let token = getToken();
    
    if (!token) {
      setError('No authentication token found. Creating demo token for testing...');
      token = createDemoToken();
      setError('Demo token created. This is for testing only - implement proper authentication in production.');
    }

    // Validate token format
    if (!token.includes('.') || token.split('.').length !== 3) {
      setError('Token appears to be malformed. Please login again.');
      localStorage.clear(); // Clear all tokens
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('Attempting to connect with token:', token.substring(0, 30) + '...');
    console.log('User role:', userRole, 'User name:', userName);

    // Connect to socket with better error handling
    socketRef.current = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully');
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
        setError('Authentication failed. Token may be invalid. Please check token debug info.');
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

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userName, userRole]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages with better error handling
  const loadMessages = async () => {
    if (!userName.trim()) return;
    
    setIsLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        setError('No token available for loading messages');
        setIsLoading(false);
        return;
      }

      console.log('Loading messages with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(`http://localhost:5000/api/messages/room/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Messages API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded messages:', data.data);
        setMessages(data.data.messages || []);
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.text();
        console.error('Failed to load messages:', response.status, errorData);
        
        if (response.status === 401) {
          setError('Authentication failed. Token may be invalid or expired.');
          // Clear tokens and suggest re-login
          localStorage.clear();
        } else {
          setError(`Failed to load messages: ${response.status} ${errorData}`);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Network error loading messages: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages when room or user changes
  useEffect(() => {
    if (userName.trim()) {
      loadMessages();
    }
  }, [roomId, userName, userRole]);

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

  const clearTokensAndReload = () => {
    localStorage.clear();
    window.location.reload();
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
          <p className="text-blue-100 mt-2">Connect, communicate, and collaborate in real-time</p>
          
          {/* Debug Controls */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowTokenDebug(!showTokenDebug)}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm flex items-center gap-1"
            >
              <Key className="h-4 w-4" />
              Debug Tokens
            </button>
            <button
              onClick={clearTokensAndReload}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              Clear Tokens & Reload
            </button>
            <button
              onClick={createDemoToken}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
            >
              Create Demo Token
            </button>
          </div>
        </div>

        {/* Token Debug Info */}
        {showTokenDebug && (
          <div className="bg-gray-100 border-b p-4">
            <h3 className="font-semibold mb-2">Token Debug Information:</h3>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
              {tokenDebugInfo || 'Click "Debug Tokens" to see token information'}
            </pre>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div>{error}</div>
              {connectionAttempts > 0 && (
                <div className="text-sm mt-1 text-red-600">
                  Connection attempts: {connectionAttempts}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Setup */}
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
                disabled={isConnected}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Role:</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isConnected}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
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
          
          {!userName.trim() && (
            <p className="text-sm text-orange-600 mt-2">Please enter your name and it will automatically connect</p>
          )}
          
          {!isConnected && userName.trim() && (
            <p className="text-sm text-red-500 mt-2">Connecting to server... Please wait</p>
          )}
          
          {userRole === 'teacher' && isConnected && (
            <p className="text-sm text-green-600 mt-2">As a teacher, you can react to student messages</p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Troubleshooting:</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Token Issues:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Click "Debug Tokens" to inspect your tokens</li>
              <li>• "Clear Tokens & Reload" to reset everything</li>
              <li>• "Create Demo Token" for testing (not for production)</li>
              <li>• Ensure you're properly logged in with a valid JWT token</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Connection Steps:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enter your name and select your role</li>
              <li>• Wait for "Connected" status in header</li>
              <li>• Check browser console for detailed logs</li>
              <li>• Try refreshing if connection fails</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBoard;