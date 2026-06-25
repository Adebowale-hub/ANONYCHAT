// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { generateGeminiResponse } = require('./geminiService');
const { generateRandomUsername } = require('./usernameGenerator');
const { admin, db, auth } = require('./firebase-admin'); // Use new module

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://anonychat-eta.vercel.app'
  ],
  credentials: true
}));

const server = http.createServer(app);

// 1. Setup Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://anonychat-eta.vercel.app'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 2. Middleware: Verify Firebase ID Token
// This runs BEFORE a client connects. If this fails, the connection is rejected.
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    // Verify token with Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user data to the socket object for later use
    socket.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    next(new Error("Authentication error: Invalid token"));
  }
});

// Track users in each room for @mentions: { roomId: [{ socketId, username, email }] }
const roomUsers = {};
// Store room passwords (in production, use database with bcrypt)
const roomPasswords = {}; // { roomId: hashedPassword }

// 3. Socket Connection & Event Handlers
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.user.email} (${socket.user.uid})`);

  // Store room-specific usernames: { roomId: username }
  socket.roomUsernames = {};

  // 1. JOIN ROOM (Entering a chat room)
  socket.on("join_room", (data) => {
    // Support both old format (string) and new format (object with password)
    const roomId = typeof data === 'string' ? data : data.roomId;
    const password = typeof data === 'object' ? data.password : null;
    const requestedUsername = typeof data === 'object' ? data.username : null;

    // Check if room has password and validate
    if (roomPasswords[roomId]) {
      if (!password) {
        // Room needs password but none provided
        socket.emit("password_required", { roomId });
        return;
      }
      if (roomPasswords[roomId] !== password) {
        // Wrong password
        socket.emit("join_error", { error: "Incorrect room password" });
        return;
      }
    } else if (password) {
      // First user sets the password for the room
      roomPasswords[roomId] = password;
      console.log(`Password set for room ${roomId}`);
    }

    socket.join(roomId);
    socket.activeRoom = roomId;

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    // Check if a session already exists for this email in this room
    const existingUserSession = roomUsers[roomId].find(u => u.email === socket.user.email);
    let newUsername = requestedUsername;

    if (existingUserSession) {
      // Reuse their current username
      newUsername = existingUserSession.username;
      // Remove their old socket ID session to avoid duplicates
      roomUsers[roomId] = roomUsers[roomId].filter(u => u.email !== socket.user.email);
      console.log(`Reusing username ${newUsername} for user ${socket.user.email} due to existing session`);
    } else {
      // If a username was requested, check if it's already taken by another email
      const isTaken = roomUsers[roomId].some(u => u.username === requestedUsername);
      if (!newUsername || isTaken) {
        newUsername = generateRandomUsername();
      }
    }

    socket.roomUsernames[roomId] = newUsername;

    // Track user in this room for @mentions
    roomUsers[roomId].push({
      socketId: socket.id,
      username: newUsername,
      email: socket.user.email
    });

    console.log(`User ${socket.user.email} joined room ${roomId} as ${newUsername}`);

    // Send the assigned/reused username to the client
    socket.emit("username_assigned", newUsername);

    // Send updated user list to all clients in room (for @mentions)
    const userList = roomUsers[roomId].map(u => u.username);
    io.to(roomId).emit("room_users_update", userList);

    // Announce Join only if it was not a quick reconnection
    if (!existingUserSession) {
      const systemMessage = {
        text: `${newUsername} HAS ENTERED THE CHAT`,
        senderEmail: "system",
        roomId: roomId,
        createdAt: new Date().toISOString(),
        isSystem: true,
        id: Date.now()
      };
      io.to(roomId).emit("receive_message", systemMessage);
    }
  });

  // 2. NEW EVENT: LEAVE ROOM (Clicking the button)
  socket.on("leave_room", (roomId) => {
    const username = socket.roomUsernames[roomId] || "Anonymous";

    const systemMessage = {
      text: `${username} HAS LEFT THE CHAT`,
      senderEmail: "system",
      roomId: roomId,
      createdAt: new Date().toISOString(),
      isSystem: true,
      id: Date.now()
    };

    // Broadcast before removing them
    io.to(roomId).emit("receive_message", systemMessage);

    // Remove user from room tracking
    if (roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id);

      // Send updated user list
      const userList = roomUsers[roomId].map(u => u.username);
      io.to(roomId).emit("room_users_update", userList);
    }

    socket.leave(roomId);
    delete socket.roomUsernames[roomId]; // Remove username for this room
    socket.activeRoom = null; // Clear their room
  });

  // 3. DISCONNECT (Closing the tab)
  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);

    // If they were in a room, tell that room they left
    if (socket.activeRoom) {
      const username = socket.roomUsernames[socket.activeRoom] || "Anonymous";

      // Remove from room tracking
      if (roomUsers[socket.activeRoom]) {
        roomUsers[socket.activeRoom] = roomUsers[socket.activeRoom].filter(u => u.socketId !== socket.id);

        // Send updated user list
        const userList = roomUsers[socket.activeRoom].map(u => u.username);
        io.to(socket.activeRoom).emit("room_users_update", userList);
      }

      const systemMessage = {
        text: `${username} DISCONNECTED`,
        senderEmail: "system",
        roomId: socket.activeRoom,
        createdAt: new Date().toISOString(),
        isSystem: true,
        id: Date.now()
      };
      io.to(socket.activeRoom).emit("receive_message", systemMessage);
    }
  });

  // 4. TYPING INDICATOR
  socket.on("typing", ({ roomId }) => {
    const username = socket.roomUsernames[roomId] || "Anonymous";
    socket.to(roomId).emit("user_typing", { username });
  });

  // 5. UPDATE STATUS (Visibility change)
  socket.on("update_status", ({ roomId, status }) => {
    if (!roomId || !roomUsers[roomId]) return;

    const userSession = roomUsers[roomId].find(u => u.socketId === socket.id);
    if (!userSession) return;

    const baseUsername = socket.roomUsernames[roomId];
    if (!baseUsername) return;

    if (status === "away") {
      if (!userSession.username.endsWith(" (Away)")) {
        userSession.username = `${baseUsername} (Away)`;
      }
    } else if (status === "active") {
      userSession.username = baseUsername;
    }

    // Send updated user list to all clients in room
    const userList = roomUsers[roomId].map(u => u.username);
    io.to(roomId).emit("room_users_update", userList);
  });

  // Event: Send Message (with threading and Gemini support)
  socket.on("send_message", async (data) => {
    // data expected format: { roomId, text, replyTo (optional) }
    const { roomId, text, replyTo } = data;

    if (!roomId || !text) return;

    // A. Construct the message object
    const username = socket.roomUsernames[roomId] || "Anonymous";

    const messageData = {
      text: text,
      senderId: socket.user.uid,
      senderEmail: socket.user.email,
      senderUsername: username, // Use room-specific username
      roomId: roomId,
      createdAt: new Date().toISOString(),
      replyTo: replyTo || null, // Thread parent message
    };

    try {
      // B. Save to Firestore 'messages' collection
      const docRef = await db.collection("messages").add(messageData);

      // Add the Firestore ID to the message object before sending back
      messageData.id = docRef.id;

      // C. Emit to the specific room (Real-time delivery)
      io.to(roomId).emit("receive_message", messageData);

      console.log(`Message sent in room ${roomId} by ${socket.user.email}`);

      // D. Check if @gemini was mentioned (COMMENTED OUT - uncomment to enable)
      /*
      if (text.toLowerCase().includes("@gemini")) {
        console.log("Gemini mentioned! Generating AI response...");
        
        // Show typing indicator
        io.to(roomId).emit("gemini_typing", true);
        
        try {
          // For now, skip fetching context to avoid Firestore index requirement
          // You can add the index later using the Firebase Console link in the error
          const recentMessages = [];
          
          // Generate Gemini response
          const aiResponse = await generateGeminiResponse(text, username, recentMessages);
          
          // Create Gemini's message
          const geminiMessage = {
            text: aiResponse,
            senderId: "gemini-bot",
            senderEmail: "gemini@bot.ai",
            senderUsername: "Gemini",
            roomId: roomId,
            createdAt: new Date().toISOString(),
            replyTo: messageData.id, // Reply to the message that mentioned Gemini
            isGemini: true,
          };
          
          // Save Gemini's response
          const geminiDocRef = await db.collection("messages").add(geminiMessage);
          geminiMessage.id = geminiDocRef.id;
          
          // Hide typing indicator
          io.to(roomId).emit("gemini_typing", false);
          
          // Send Gemini's response
          io.to(roomId).emit("receive_message", geminiMessage);
          
          console.log("Gemini response sent!");
        } catch (error) {
          console.error("Error generating Gemini response:", error);
          io.to(roomId).emit("gemini_typing", false);
          
          // Send error message
          const errorMessage = {
            text: "Sorry, I encountered an error. Please try again! 🤖",
            senderId: "gemini-bot",
            senderEmail: "gemini@bot.ai",
            senderUsername: "Gemini",
            roomId: roomId,
            createdAt: new Date().toISOString(),
            isGemini: true,
          };
          io.to(roomId).emit("receive_message", errorMessage);
        }
      }
      */

    } catch (error) {
      console.error("Error saving message to Firestore:", error);
      // Optional: Emit an error back to the sender
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});