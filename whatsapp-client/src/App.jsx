import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Send, LogOut, MessageSquare, Zap, Reply, X, AtSign } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import Blog from './Blog';
import About from './About';
import GoogleAd from './GoogleAd';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// Swipeable component to enable swipe-to-reply gesture on mobile
function SwipeableMessage({ children, onSwipeReply, isMe }) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!swiping) return;
    const diffX = e.touches[0].clientX - startX;
    const diffY = e.touches[0].clientY - startY;

    if (Math.abs(diffX) > Math.abs(diffY) * 1.2) {
      if (diffX > 0) {
        if (e.cancelable) e.preventDefault();
        setOffset(Math.min(diffX, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offset >= 50) {
      onSwipeReply();
      if (navigator.vibrate) {
        try {
          navigator.vibrate(15);
        } catch (err) {}
      }
    }
    setOffset(0);
  };

  return (
    <div className="relative w-full overflow-hidden select-none">
      <div 
        className="absolute left-4 top-0 bottom-0 flex items-center transition-all duration-150 pointer-events-none"
        style={{ 
          opacity: offset > 10 ? Math.min((offset - 10) / 40, 1) : 0,
          transform: `scale(${offset >= 50 ? 1.15 : 0.85})`,
        }}
      >
        <div className="bg-yellow-300 border-2 border-black p-1.5 rounded-full shadow-neo-sm text-black flex items-center justify-center">
          <Reply size={14} className="stroke-[2.5]" />
        </div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        className="w-full"
      >
        {children}
      </div>
    </div>
  );
}

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new Event('popstate'));
  };

  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(() => localStorage.getItem('active_room_username') || ""); // Store the random username
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(() => localStorage.getItem('active_room') || "");
  const [isInRoom, setIsInRoom] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // Threading state
  const [replyingTo, setReplyingTo] = useState(null);

  // Mention state
  const [roomUsers, setRoomUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");

  // Gemini typing indicator
  const [geminiTyping, setGeminiTyping] = useState(false);

  // Dark theme toggle
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Loading states
  const [isLogging, setIsLogging] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // User count
  const [onlineCount, setOnlineCount] = useState(0);

  // Character limit
  const MAX_MESSAGE_LENGTH = 500;

  // Room password
  const [roomPassword, setRoomPassword] = useState(() => localStorage.getItem('active_room_password') || "");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [snackbar, setSnackbar] = useState({ show: false, message: "" });

  const showSnackbar = (msg) => {
    setSnackbar({ show: true, message: msg });
    setTimeout(() => {
      setSnackbar(prev => prev.message === msg ? { show: false, message: "" } : prev);
    }, 4000);
  };

  // Refs to avoid stale closures in socket events
  const roomRef = useRef(room);
  const isInRoomRef = useRef(isInRoom);
  const roomPasswordRef = useRef(roomPassword);
  const usernameRef = useRef(username);

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { isInRoomRef.current = isInRoom; }, [isInRoom]);
  useEffect(() => { roomPasswordRef.current = roomPassword; }, [roomPassword]);
  useEffect(() => { usernameRef.current = username; }, [username]);

  // Search messages
  const [searchQuery, setSearchQuery] = useState("");

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Handle actions triggered from the Google Ad banner
  const handleAdAction = (actionId) => {
    if (actionId === 'blog') {
      navigate('/blog');
    } else if (actionId === 'gemini') {
      if (inputRef.current) {
        inputRef.current.focus();
        setMessage("@gemini ");
      }
    } else if (actionId === 'privacy') {
      leaveRoom();
      setShowPasswordInput(true);
    }
  };

  // Filter messages based on search
  const filteredMessages = searchQuery
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Apply dark theme to body background
  useEffect(() => {
    if (isDarkTheme) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkTheme]);

  // Dynamic Away Status System
  useEffect(() => {
    if (!socket || !isInRoom || !room) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        socket.emit("update_status", { roomId: room, status: "away" });
      } else {
        socket.emit("update_status", { roomId: room, status: "active" });
      }
    };

    const handleBlur = () => {
      socket.emit("update_status", { roomId: room, status: "away" });
    };

    const handleFocus = () => {
      socket.emit("update_status", { roomId: room, status: "active" });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [socket, isInRoom, room]);

  useEffect(() => {
    return auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const token = await currentUser.getIdToken();
        setUser(currentUser);
        initSocket(token);
      } else {
        setUser(null);
        if (socket) socket.disconnect();
      }
    });
  }, []);

  const initSocket = (token) => {
    const newSocket = io(BACKEND_URL, {
      auth: { token: token }
    });

    // Auto-rejoin on connect/reconnect, or auto-join stored room on initial page load
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);

      const savedRoom = localStorage.getItem('active_room');
      const savedPassword = localStorage.getItem('active_room_password');
      const savedUsername = localStorage.getItem('active_room_username');

      if (isInRoomRef.current && roomRef.current) {
        console.log("Rejoining active room:", roomRef.current);
        newSocket.emit("join_room", {
          roomId: roomRef.current,
          password: roomPasswordRef.current || undefined,
          username: usernameRef.current || undefined
        });
      } else if (savedRoom) {
        console.log("Auto-joining stored room on load:", savedRoom);
        setIsJoining(true);
        newSocket.emit("join_room", {
          roomId: savedRoom,
          password: savedPassword || undefined,
          username: savedUsername || undefined
        });
      }
    });

    // Listen for username from backend (sent when joining a room)
    newSocket.on("username_assigned", (assignedUsername) => {
      setUsername(assignedUsername);
      localStorage.setItem('active_room_username', assignedUsername);
      setIsInRoom(true); // Successfully joined room
      setIsJoining(false); // Stop loading
      console.log("Username assigned:", assignedUsername);
    });

    // Listen for room users update (for @mentions)
    newSocket.on("room_users_update", (userList) => {
      setRoomUsers(userList);
      setOnlineCount(userList.length); // Update online count
      console.log("Room users updated:", userList);
    });

    // Listen for typing indicators
    newSocket.on("user_typing", ({ username: typingUser }) => {
      setTypingUsers(prev => {
        if (!prev.includes(typingUser)) {
          return [...prev, typingUser];
        }
        return prev;
      });

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== typingUser));
      }, 3000);
    });

    // Listen for Gemini typing indicator
    newSocket.on("gemini_typing", (isTyping) => {
      setGeminiTyping(isTyping);
    });

    newSocket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);

      // Play sound notification (only if not from current user)
      if (data.senderEmail !== user?.email && !data.isSystem) {
        playNotificationSound();
      }
    });

    // Listen for join errors (e.g., wrong password)
    newSocket.on("join_error", ({ error }) => {
      alert(error);
      setIsJoining(false);
      // Clear storage to avoid infinite reconnect loop
      localStorage.removeItem('active_room');
      localStorage.removeItem('active_room_password');
      localStorage.removeItem('active_room_username');
      setRoom("");
      setRoomPassword("");
      setIsInRoom(false);
    });

    // Listen for password requirement
    newSocket.on("password_required", ({ roomId }) => {
      setShowPasswordInput(true);
      setIsJoining(false);
      alert(`Room "${roomId}" is password protected. Please enter the password.`);
      // Clear storage
      localStorage.removeItem('active_room');
      localStorage.removeItem('active_room_password');
      localStorage.removeItem('active_room_username');
      setIsInRoom(false);
    });

    setSocket(newSocket);
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiDgJF2m98OScTgwPUKjj8LdjHAU7ltjzymgoBSp+zPLaizsKFWS56+yjWBELTKXh8bllHgU2kdj0w2goBSp+zPLaizsKFWS56+yjWBELTKXh8bllHgU2kdj0w2goBSp+zPLaizsKFWS56+yjWBELTKXh8bllHgU2kdj0w2goBSp+zPLaizsKFWS56+yjWBELTKXh8bllHgU2kdj0w2goBSp+zPLaizsKFWS56+yjWBELTKXh8bllHgU2kdj0w');
      audio.volume = 0.3;
      audio.play().catch(() => { }); // Ignore errors if blocked by browser
    } catch (e) {
      // Sound failed, continue silently
    }
  };

  // Sanitize room name
  const sanitizeRoomName = (name) => {
    return name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  };

  // Emit typing indicator
  const handleTypingIndicator = () => {
    if (socket && room) {
      socket.emit("typing", { roomId: room });
    }
  };

  const handleLogin = async () => {
    setIsLogging(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLogging(false);
    }
  };

  const handleJoinRoom = () => {
    const sanitized = sanitizeRoomName(room);

    if (!sanitized) {
      alert("Please enter a valid room name (letters, numbers, - and _ only)");
      return;
    }

    setShowProtocolModal(true);
  };

  const confirmJoinRoom = () => {
    const sanitized = sanitizeRoomName(room);
    if (sanitized && socket) {
      setIsJoining(true);
      setRoom(sanitized); // Update with sanitized version

      // Clear the previous stored username only if we are manually joining a different room/zone
      const savedRoom = localStorage.getItem('active_room');
      let savedUsername = undefined;
      
      if (savedRoom !== sanitized) {
        localStorage.removeItem('active_room_username');
        setUsername("");
      } else {
        savedUsername = localStorage.getItem('active_room_username') || username;
      }

      localStorage.setItem('active_room', sanitized);
      if (roomPassword) {
        localStorage.setItem('active_room_password', roomPassword);
      } else {
        localStorage.removeItem('active_room_password');
      }

      socket.emit("join_room", { 
        roomId: sanitized, 
        password: roomPassword || undefined,
        username: savedUsername || undefined
      });
      setShowProtocolModal(false);
    }
  };

  const leaveRoom = () => {
    // Confirm before leaving if messages exist
    if (messages.length > 0) {
      const confirmed = window.confirm("Are you sure you want to leave this room?");
      if (!confirmed) return;
    }

    if (socket && room) {
      socket.emit("leave_room", room);
    }
    setMessages([]);
    setRoomUsers([]);
    setTypingUsers([]);
    setOnlineCount(0);
    setIsInRoom(false);
    setRoom("");
    setRoomPassword("");
    setReplyingTo(null);
    setShowUsersList(false);

    // Clear localStorage
    localStorage.removeItem('active_room');
    localStorage.removeItem('active_room_password');
    localStorage.removeItem('active_room_username');
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/?room=${room}`;
    navigator.clipboard.writeText(link);
    alert("Room link copied!");
  };

  const sendMessage = async () => {
    if (!message.trim() || !socket) return;

    // Check character limit
    if (message.length > MAX_MESSAGE_LENGTH) {
      alert(`Message too long! Maximum ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setIsSending(true);
    const msgData = {
      roomId: room,
      text: message.trim(),
      replyTo: replyingTo?.id || null,
      replyToDetails: replyingTo ? {
        senderUsername: replyingTo.senderUsername,
        text: replyingTo.text
      } : null
    };

    await socket.emit("send_message", msgData);
    setMessage("");
    setReplyingTo(null);
    setShowMentionDropdown(false);
    setIsSending(false);
  };

  const handleLocateMessage = (replyToId, replyToDetails) => {
    const parentMsg = messages.find(m => m.id === replyToId);
    if (parentMsg) {
      const element = document.getElementById(`msg-${replyToId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('locate-highlight');
        setTimeout(() => {
          element.classList.remove('locate-highlight');
        }, 1500);
      }
    } else {
      showSnackbar("You cannot see this message because you weren't in the room when it was sent.");
    }
  };

  // Handle @ mentions
  const handleMessageChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Emit typing indicator
    handleTypingIndicator();

    // Check for @ mentions
    const words = value.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@") && lastWord.length > 1) {
      const filter = lastWord.substring(1).toLowerCase();
      setMentionFilter(filter);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Insert mention
  const insertMention = (username) => {
    const words = message.split(/\s/);
    words[words.length - 1] = `@${username} `;
    setMessage(words.join(" "));
    setShowMentionDropdown(false);
    inputRef.current?.focus();
  };

  // Handle emoji selection
  const onEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Get filtered mention suggestions
  const getMentionSuggestions = () => {
    const allUsers = ["gemini", ...roomUsers.filter(u => u !== username)];
    if (!mentionFilter) return allUsers;
    return allUsers.filter(u => u.toLowerCase().includes(mentionFilter.toLowerCase()));
  };

  // Find parent message for threading
  const findParentMessage = (replyToId) => {
    return messages.find(m => m.id === replyToId);
  };

  // Render highlighted text with @mentions
  const renderTextWithMentions = (text) => {
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      if (word.startsWith("@")) {
        const mentionedUser = word.substring(1);
        const isMe = mentionedUser.toLowerCase() === username.toLowerCase();
        return (
          <span
            key={index}
            className={`${isMe ? 'bg-yellow-400' : 'bg-blue-200'} border-2 border-black px-1 font-black`}
          >
            {word}
          </span>
        );
      }
      return <span key={index}>{word}</span>;
    });
  };

  // --- RENDER COMPONENTS ---

  // Blog and About routes
  if (currentPath === '/blog') {
    return <Blog navigate={navigate} />;
  }
  if (currentPath === '/about') {
    return <About navigate={navigate} />;
  }

  // 1. LOGIN SCREEN (Mobile Optimized)
  if (!user) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center p-4 bg-gray-100">
        {/* Hidden SEO/Navigation links as requested */}
        <a href="/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} style={{ display: 'none' }} className="hidden" aria-hidden="true">Blog</a>
        <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }} style={{ display: 'none' }} className="hidden" aria-hidden="true">About</a>
        <div className="bg-white border-4 border-black shadow-neo w-full max-w-[calc(100vw-2rem)] sm:max-w-md p-6 md:p-8 text-center">
          <div className="bg-black border-2 border-black w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 flex items-center justify-center shadow-neo-sm overflow-hidden">
            <img src="/logo.jpg" alt="ANONYCHAT Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 uppercase tracking-tighter">ANONY<br />CHAT</h1>
          <p className="font-mono mb-8 text-gray-600 font-bold text-sm md:text-base">ANONYMOUS. SECURE. INSTANT.</p>

          <button
            onClick={handleLogin}
            disabled={isLogging}
            className="w-full bg-pink-500 hover:bg-pink-400 text-white font-bold border-4 border-black py-3 md:py-4 px-6 shadow-neo active:shadow-none active:translate-x-[5px] active:translate-y-[5px] transition-all flex items-center justify-center gap-3 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLogging ? "LOGGING IN..." : "LOGIN WITH GOOGLE"}
          </button>

          {/* AI Coming Soon Badge */}
          <div className="mt-6 bg-purple-200 border-2 border-black p-3 text-center">
            <p className="font-mono text-xs font-bold text-purple-800">
              🤖 AI ASSISTANT COMING SOON
            </p>
          </div>

          {/* Google Ads */}
          <div className="mt-6 border-t-2 border-black pt-4">
            <GoogleAd
              isDarkTheme={false}
              onAction={handleAdAction}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. ROOM SELECTION (Mobile Optimized)
  if (!isInRoom) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center p-4 bg-gray-100">
        {/* Hidden SEO/Navigation links as requested */}
        <a href="/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} style={{ display: 'none' }} className="hidden" aria-hidden="true">Blog</a>
        <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }} style={{ display: 'none' }} className="hidden" aria-hidden="true">About</a>
        <div className="bg-white border-4 border-black shadow-neo w-full max-w-[calc(100vw-2rem)] sm:max-w-md p-6 md:p-8">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-black uppercase">Select Zone</h2>
            <button onClick={() => auth.signOut()} className="border-2 border-black p-2 hover:bg-red-500 hover:text-white transition-colors shadow-neo-sm active:shadow-none active:translate-x-[3px] active:translate-y-[3px]">
              <LogOut size={18} />
            </button>
          </div>

          <label className="block font-mono font-bold mb-2 text-sm">ENTER ROOM ID</label>
          <input
            type="text"
            placeholder="e.g. general"
            value={room}
            className="w-full border-4 border-black p-3 font-mono mb-4 focus:outline-none focus:bg-yellow-100 text-lg"
            onChange={(e) => setRoom(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
          />

          {/* Password Option */}
          <div className="mb-4">
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswordInput}
                onChange={(e) => setShowPasswordInput(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-mono font-bold text-sm">🔒 Password Protected</span>
            </label>

            {showPasswordInput && (
              <input
                type="password"
                placeholder="Enter room password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                className="w-full border-4 border-black p-3 font-mono focus:outline-none focus:bg-yellow-100 text-base"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
            )}
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={isJoining}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold border-4 border-black py-3 shadow-neo active:translate-y-[5px] active:translate-x-[5px] active:shadow-none transition-all text-sm md:text-base disabled:opacity-50"
          >
            {isJoining ? "JOINING..." : "ENTER CHAT"}
          </button>

          {/* AI Coming Soon Badge */}
          <div className="mt-6 bg-purple-200 border-2 border-black p-3 text-center">
            <p className="font-mono text-xs font-bold text-purple-800">
              🤖 AI ASSISTANT COMING SOON
            </p>
          </div>

          {/* Google Ads */}
          <div className="mt-6 border-t-2 border-black pt-4">
            <GoogleAd
              isDarkTheme={false}
              onAction={handleAdAction}
            />
          </div>
        </div>

        {/* Protocol Modal Overlay */}
        {showProtocolModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-yellow-100 border-4 border-black p-6 max-w-md w-full shadow-neo text-black relative">
              <button 
                onClick={() => setShowProtocolModal(false)}
                className="absolute top-4 right-4 border-2 border-black p-1 hover:bg-red-400 transition-colors shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-white"
              >
                <X size={16} />
              </button>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-red-400 border-2 border-black p-1">
                  <Zap className="stroke-[2.5]" size={20} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight font-mono">🚨 ZONE PROTOCOL</h3>
              </div>

              <div className="space-y-4 font-mono text-sm leading-relaxed mb-6 text-left">
                <div className="bg-white border-2 border-black p-3 shadow-neo-sm">
                  <p className="font-black text-xs text-pink-600 uppercase mb-1">⚡ Away Auto-Status</p>
                  <p className="font-bold">
                    When you minimize the browser or switch tabs, your username will auto-update to indicate you are <span className="underline">Away</span> (e.g. <span className="italic">JollyBear (Away)</span>). This alerts others that you are inactive.
                  </p>
                </div>

                <div className="bg-white border-2 border-black p-3 shadow-neo-sm">
                  <p className="font-black text-xs text-purple-600 uppercase mb-1">⏳ Real-Time Only</p>
                  <p className="font-bold">
                    This is an ephemeral real-time chat. Any messages sent while you are not active in this browser tab will not appear in your window. Once you're gone, past messages stay gone!
                  </p>
                </div>
              </div>

              <button
                onClick={confirmJoinRoom}
                className="w-full bg-black text-white hover:bg-gray-800 font-bold border-4 border-black py-3 shadow-neo active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all text-sm uppercase tracking-wider"
              >
                I Understand, Enter Zone
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. CHAT INTERFACE (with threading, mentions, and Gemini)
  return (
    <div className={`h-[100dvh] flex flex-col w-full md:max-w-3xl md:mx-auto md:p-4 ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-100'} md:bg-transparent`}>
      {/* Hidden SEO/Navigation links as requested */}
      <a href="/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} style={{ display: 'none' }} className="hidden" aria-hidden="true">Blog</a>
      <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }} style={{ display: 'none' }} className="hidden" aria-hidden="true">About</a>

      {/* Header */}
      <div className={`${isDarkTheme ? 'bg-gray-900 text-white' : 'bg-white'} border-b-4 md:border-4 border-black md:shadow-neo p-3 md:p-4 flex justify-between items-center z-10 sticky top-0 shrink-0`}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-green-400 border-2 border-black w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0">
            <MessageSquare size={18} className="md:w-6 md:h-6" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-black text-lg md:text-xl leading-none truncate max-w-[150px] md:max-w-none">{room}</h2>
            <div className="flex items-center gap-2 relative">
              <span className="font-mono text-[10px] md:text-xs text-green-600 font-bold">● LIVE</span>
              <button 
                onClick={() => setShowUsersList(!showUsersList)}
                className="font-mono text-[10px] md:text-xs text-gray-600 font-bold border-2 border-black px-2 py-0.5 hover:bg-yellow-100 flex items-center gap-1 shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-white text-black"
                title="View Online Users"
              >
                👥 {onlineCount}
              </button>
              
              {showUsersList && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white border-2 border-black shadow-neo z-50 max-h-48 overflow-y-auto font-mono text-xs text-black">
                  <div className="bg-black text-white px-2 py-1 font-bold text-center border-b-2 border-black">
                    ONLINE USERS
                  </div>
                  <div className="divide-y-2 divide-black">
                    {roomUsers.map((userNickname, idx) => {
                      const isUserAway = userNickname.endsWith(" (Away)");
                      const displayName = isUserAway ? userNickname.replace(" (Away)", "") : userNickname;
                      return (
                        <div key={idx} className="p-2 flex items-center justify-between font-bold">
                          <span className="truncate flex-1 pr-1">@{displayName}</span>
                          {isUserAway ? (
                            <span className="text-gray-400 text-[10px] shrink-0 font-normal">Away 💤</span>
                          ) : (
                            <span className="text-green-600 text-[10px] shrink-0">Active ●</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="font-bold border-2 border-black px-2 py-1 hover:bg-gray-200 text-xs md:text-sm shadow-neo-sm active:shadow-none active:translate-x-[3px] active:translate-y-[3px] dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            title={isDarkTheme ? "Light Mode" : "Dark Mode"}
          >
            {isDarkTheme ? "☀️" : "🌙"}
          </button>

          {/* Copy Room Link */}
          <button
            onClick={copyRoomLink}
            className="font-bold border-2 border-black px-2 md:px-3 py-1 hover:bg-gray-200 text-xs md:text-sm shadow-neo-sm active:shadow-none active:translate-x-[3px] active:translate-y-[3px] dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            title="Copy Room Link"
          >
            📋
          </button>

          <button
            onClick={leaveRoom}
            className="font-bold border-2 border-black px-3 py-1 md:px-4 md:py-1 hover:bg-gray-200 text-xs md:text-sm shadow-neo-sm active:shadow-none active:translate-x-[3px] active:translate-y-[3px] dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            LEAVE
          </button>
        </div>
      </div>

      {/* Google Ads */}
      <GoogleAd
        isDarkTheme={isDarkTheme}
        onAction={handleAdAction}
      />

      {/* Search Bar */}
      <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-gray-50'} border-b-2 border-black p-2 md:p-3`}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="🔍 Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 ${isDarkTheme ? 'bg-gray-700 text-white' : 'bg-white'} border-2 border-black px-3 py-2 text-sm font-mono focus:outline-none focus:bg-yellow-100`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="border-2 border-black px-3 py-2 hover:bg-red-200 text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-1">
            Found {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Messages Area - Now fills available space */}
      <div className={`flex-1 overflow-y-auto p-2 md:p-4 space-y-4 md:space-y-6 ${isDarkTheme ? 'bg-gray-900' : ''}`}>
        {/* Empty State */}
        {filteredMessages.length === 0 && !searchQuery && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="font-mono text-2xl text-gray-300 mb-2">📭</p>
              <p className="font-mono text-sm text-gray-400">
                NO MESSAGES YET
              </p>
              <p className="font-mono text-xs text-gray-300 mt-1">
                Be the first to say hello!
              </p>
            </div>
          </div>
        )}

        {/* No search results */}
        {filteredMessages.length === 0 && searchQuery && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="font-mono text-2xl text-gray-300 mb-2">🔍</p>
              <p className="font-mono text-sm text-gray-400">
                NO RESULTS FOUND
              </p>
              <p className="font-mono text-xs text-gray-300 mt-1">
                Try a different search term
              </p>
            </div>
          </div>
        )}

        {filteredMessages.map((msg, index) => {
          // 1. CHECK IF IT IS A SYSTEM MESSAGE
          if (msg.isSystem) {
            return (
              <div key={index || msg.id} className="flex justify-center my-4 opacity-60">
                <span className="font-mono text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b-2 border-gray-300 pb-1">
                  {msg.text}
                </span>
              </div>
            );
          }

          // 2. NORMAL MESSAGE LOGIC (with threading and mentions)
          const isMe = msg.senderEmail === user.email;
          const isGemini = msg.isGemini || msg.senderUsername === "Gemini";
          const parentMsg = msg.replyTo ? findParentMessage(msg.replyTo) : null;

          return (
            <SwipeableMessage
              key={index || msg.id}
              onSwipeReply={() => setReplyingTo(msg)}
              isMe={isMe}
            >
              <div
                id={`msg-${msg.id}`}
                className={`flex ${isMe ? "justify-end" : "justify-start"} px-2`}
              >
                <div
                  className={`
                    max-w-[85%] md:max-w-[70%] border-4 border-black p-2 md:p-3 relative
                    ${isMe
                      ? "bg-yellow-300 shadow-neo rounded-none"
                      : isGemini
                        ? "bg-purple-200 shadow-neo rounded-none"
                        : "bg-white shadow-neo-sm rounded-none"
                    }
                  `}
                >
                  {/* Thread indicator - parent message preview */}
                  {msg.replyTo && (
                    <div 
                      onClick={() => handleLocateMessage(msg.replyTo, msg.replyToDetails)}
                      className="mb-2 pb-2 border-b-2 border-black border-dashed opacity-60 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      title="Click to locate original message"
                    >
                      <div className="flex items-start gap-1 min-w-0 w-full">
                        <Reply size={12} className="mt-0.5 shrink-0" />
                        <div className="text-[10px] font-mono min-w-0 flex-1">
                          <span className="font-bold">
                            @{parentMsg ? parentMsg.senderUsername : (msg.replyToDetails?.senderUsername || "Unknown")}
                          </span>
                          <p className="truncate">
                            {parentMsg ? parentMsg.text : (msg.replyToDetails?.text || "Message not available")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sender info */}
                  {!isMe && (
                    <p className={`font-mono text-[10px] md:text-xs font-bold mb-1 truncate ${isGemini ? 'text-purple-700' : 'text-pink-600'}`}>
                      @{msg.senderUsername || msg.senderEmail.split('@')[0]}
                      {isGemini && " 🤖"}
                    </p>
                  )}

                  {/* Message text with mention highlighting */}
                  <p className="font-bold text-base md:text-lg leading-snug break-words">
                    {renderTextWithMentions(msg.text)}
                  </p>

                  {/* Timestamp and reply button */}
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <div className="flex items-center gap-1.5">
                      <p className="font-mono text-[10px] opacity-60">
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!isMe && !isGemini && (
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                        title="Reply to this message"
                      >
                        <Reply size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </SwipeableMessage>
          );
        })}

        {/* Gemini typing indicator */}
        {geminiTyping && (
          <div className="flex justify-start">
            <div className="bg-purple-200 border-4 border-black p-3 shadow-neo">
              <p className="font-mono text-xs font-bold text-purple-700">
                Gemini is typing<span className="typing-dots">...</span>
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicators */}
      {(typingUsers.length > 0 || geminiTyping) && (
        <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-gray-100'} px-4 py-2 border-t border-gray-200`}>
          {typingUsers.length > 0 && (
            <p className="text-xs text-gray-600 italic">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </p>
          )}
          {geminiTyping && (
            <p className="text-xs text-purple-600 italic font-bold">
              Gemini is typing...
            </p>
          )}
        </div>
      )}

      {/* Input Area - Sticky Bottom */}
      <div className={`${isDarkTheme ? 'bg-gray-900' : 'bg-white'} border-t-4 md:border-4 border-black md:shadow-neo p-2 md:p-4 sticky bottom-0 shrink-0 pb-safe`}>
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-2 bg-blue-100 border-2 border-black p-2 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <Reply size={12} />
                <span className="font-mono text-xs font-bold">Replying to @{replyingTo.senderUsername}</span>
              </div>
              <p className="text-xs truncate opacity-70">{replyingTo.text}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mb-2 relative">
            <div className="absolute bottom-0 left-0 z-50">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme={isDarkTheme ? "dark" : "light"}
                width={300}
                height={400}
              />
            </div>
          </div>
        )}

        {/* Mention Dropdown */}
        {showMentionDropdown && getMentionSuggestions().length > 0 && (
          <div className={`mb-2 ${isDarkTheme ? 'bg-gray-800 text-white' : 'bg-white'} border-2 border-black shadow-neo max-h-32 overflow-y-auto`}>
            {getMentionSuggestions().map((user, idx) => (
              <button
                key={idx}
                onClick={() => insertMention(user)}
                className={`w-full text-left px-3 py-2 ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-yellow-100'} border-b border-gray-200 last:border-b-0 font-mono text-sm font-bold flex items-center gap-2`}
              >
                <AtSign size={14} />
                {user}
                {user === "gemini" && " 🤖"}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            placeholder="TYPE LOUD..."
            className={`flex-1 ${isDarkTheme ? 'bg-gray-800 text-white' : 'bg-gray-100'} border-2 border-black p-3 font-mono text-base focus:outline-none ${isDarkTheme ? 'focus:bg-gray-700' : 'focus:bg-white'}`}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            onChange={handleMessageChange}
          />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="bg-yellow-400 text-black px-3 md:px-4 border-2 border-black hover:bg-yellow-300 transition-colors shadow-neo-sm active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
            title="Add Emoji"
          >
            😊
          </button>
          <button
            onClick={sendMessage}
            disabled={isSending}
            className="bg-black text-white px-4 md:px-6 border-2 border-black hover:bg-gray-800 transition-colors shadow-neo-sm active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50"
          >
            <Send size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        {/* Character Counter */}
        <div className="flex justify-between items-center mt-2">
          <p className={`text-xs ${message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
            {message.length}/{MAX_MESSAGE_LENGTH} characters
            {message.length > MAX_MESSAGE_LENGTH * 0.9 && message.length <= MAX_MESSAGE_LENGTH && (
              <span className="ml-2">⚠️ {MAX_MESSAGE_LENGTH - message.length} left</span>
            )}
          </p>
        </div>
      </div>

      {/* Snackbar Notification */}
      {snackbar.show && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-sm">
          <div className="bg-red-400 text-black border-4 border-black p-3 shadow-neo font-mono text-xs font-bold flex items-center justify-between gap-2">
            <span>⚠️ {snackbar.message}</span>
            <button 
              onClick={() => setSnackbar({ show: false, message: "" })}
              className="border-2 border-black bg-white hover:bg-gray-100 p-0.5 font-bold shadow-neo-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;