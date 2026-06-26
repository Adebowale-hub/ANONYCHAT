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
app.use(express.json());

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

// HTTP Middleware: Verify Firebase ID Token
const verifyAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email.split("@")[0],
    };
    next();
  } catch (err) {
    console.error("HTTP Token verification failed:", err.message);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

const cleanStatusFromUsername = (username) => {
  if (!username) return username;
  return username.replace(/\s*\(Away\)\s*$/, '');
};

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
    let newUsername = cleanStatusFromUsername(requestedUsername);

    if (existingUserSession) {
      // Reuse their current username
      newUsername = cleanStatusFromUsername(existingUserSession.username);
      // Remove their old socket ID session to avoid duplicates
      roomUsers[roomId] = roomUsers[roomId].filter(u => u.email !== socket.user.email);
      console.log(`Reusing username ${newUsername} for user ${socket.user.email} due to existing session`);
    } else {
      // If a username was requested, check if it's already taken by another email
      const isTaken = roomUsers[roomId].some(u => cleanStatusFromUsername(u.username) === newUsername);
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
      const roomId = socket.activeRoom;
      const username = cleanStatusFromUsername(socket.roomUsernames[roomId] || "Anonymous");

      // Check if they already have another active session in this room (reconnected)
      const hasReconnected = roomUsers[roomId] && roomUsers[roomId].some(u => u.email === socket.user.email && u.socketId !== socket.id);

      // Remove from room tracking
      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id);

        // Send updated user list
        const userList = roomUsers[roomId].map(u => u.username);
        io.to(roomId).emit("room_users_update", userList);
      }

      // Announce disconnect ONLY if they haven't reconnected on a new socket
      if (!hasReconnected) {
        const systemMessage = {
          text: `${username} DISCONNECTED`,
          senderEmail: "system",
          roomId: roomId,
          createdAt: new Date().toISOString(),
          isSystem: true,
          id: Date.now()
        };
        io.to(roomId).emit("receive_message", systemMessage);
      }
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

    const baseUsername = cleanStatusFromUsername(socket.roomUsernames[roomId]);
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
    // data expected format: { roomId, text, replyTo (optional), replyToDetails (optional) }
    const { roomId, text, replyTo, replyToDetails } = data;

    if (!roomId || !text) return;

    // A. Construct the message object
    const username = cleanStatusFromUsername(socket.roomUsernames[roomId] || "Anonymous");

    const messageData = {
      text: text,
      senderId: socket.user.uid,
      senderEmail: socket.user.email,
      senderUsername: username, // Use room-specific username
      roomId: roomId,
      createdAt: new Date().toISOString(),
      replyTo: replyTo || null, // Thread parent message
      replyToDetails: replyToDetails || null,
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

// DEFAULT SEED BLOGS
const DEFAULT_BLOGS = [
  {
    title: "The Art of Anonymity: Why Privacy Matters in 2026",
    excerpt: "In a world of constant surveillance and data harvesting, anonymous communication isn't just for rebels—it's a fundamental digital right.",
    content: `Privacy is not about having something to hide; it's about having something to protect. As we navigate the complex web of 2026, our digital footprints have become commodity data traded in backrooms. Every click, mention, and message is cataloged.

Here at ANONYCHAT, we believe in a different future. A future where conversations are like real life: whispered, ephemeral, and unmonitored. 

### The Illusion of Free Services
Most messaging apps market themselves as 'free' and 'secure.' Yet, they require your phone number, sync your contacts, and track your location. When a service is free, your metadata is often the product. Who you talk to, when you talk, and for how long can reveal more about you than the content of the messages themselves.

### Why Ephemerality Matters
By not storing messages indefinitely and routing them through anonymous room keys, we return chat to its natural state. Real conversation isn't written in stone. It flows, it happens, and it disappears. 

### How to Protect Yourself Online:
1. **Never use your real name or standard handle** on anonymous platforms.
2. **Avoid sharing personally identifiable details** (PII) even in casual conversation.
3. **Use a VPN or Tor browser** to mask your underlying IP address.
4. **Be skeptical** of links or attachments shared in open channels.`,
    author: "AlphaCode",
    date: "June 18, 2026",
    category: "Security",
    color: "bg-yellow-300",
    tags: ["Privacy", "Security", "Anonymity"],
    likes: 12,
    comments: [],
    createdAt: new Date("2026-06-18T10:00:00Z").toISOString()
  },
  {
    title: "Behind the Scenes: How We Built ANONYCHAT with WebSockets",
    excerpt: "Deep dive into our technology stack, real-time message propagation, and why we chose Socket.io for immediate delivery.",
    content: `Building a real-time chat application that feels instant requires a robust transport layer. Traditional HTTP polling is slow, heavy, and wasteful. For ANONYCHAT, we chose WebSockets via Socket.io to achieve sub-10ms latency.

### The WebSocket Protocol
Unlike standard HTTP where the client must request data, WebSockets establish a persistent, bi-directional TCP connection. Once opened, data can flow freely from client to server and server to client without the overhead of HTTP headers.

\`\`\`javascript
// Client-side socket initialization
const socket = io(BACKEND_URL, {
  auth: { token: idToken }
});

// Emitting a message
socket.emit("send_message", { roomId, text });
\`\`\`

### State Management & Ephemerality
Our backend is designed to act as a router rather than a vault. When a message is sent:
1. It is broadcasted to all users in the socket room.
2. If the user mentions 'gemini', it triggers the AI agent.
3. It is not saved in a database, ensuring complete privacy.

### Scaling Real-Time Connections
As traffic grows, single-server socket architectures hit physical memory and connection limits. We resolve this by utilizing Redis Adapter to broadcast socket events across multiple server instances. This ensures that no matter which server a user is connected to, they receive messages in real time.`,
    author: "DevDynamo",
    date: "June 12, 2026",
    category: "Tech",
    color: "bg-cyan-300",
    tags: ["WebSockets", "React", "NodeJS"],
    likes: 8,
    comments: [],
    createdAt: new Date("2026-06-12T10:00:00Z").toISOString()
  },
  {
    title: "Say Hello to Gemini: Integrating AI into Anonymous Chat Rooms",
    excerpt: "How we embedded Google's advanced Gemini model into live rooms to act as an assistant, moderator, and conversationalist.",
    content: `One of the most exciting additions to ANONYCHAT is the direct integration of Gemini. In any room, typing a message containing '@gemini' prompts the AI to respond in real time.

### The Architecture of the AI Hook
When the socket server receives a message, it parses the text for mentions. If a mention matches '@gemini', the server doesn't just broadcast it; it also forwards the message context to the Gemini API.

To make the integration feel natural, we implement a 'gemini_typing' socket event. This informs everyone in the room that the AI is processing its reply, keeping the chat experience consistent with human interactions.

### Prompt Engineering for Group Chats
In a group chat, context is key. We feed Gemini a specialized system instruction:
- **Act as a friendly, sharp-witted participant.**
- **Keep answers concise (under 3 sentences).**
- **Understand that multiple users are talking at once.**

### Ethical AI in Anonymous Spaces
Because users are anonymous, moderation is challenging. We leverage Gemini's built-in safety filters to block harmful queries while maintaining a free, open-ended discussion style. It's a fine line between censorship and safety, and Gemini helps us walk it.`,
    author: "AIPioneer",
    date: "June 05, 2026",
    category: "AI",
    color: "bg-pink-300",
    tags: ["Gemini", "AI", "LLM"],
    likes: 15,
    comments: [],
    createdAt: new Date("2026-06-05T10:00:00Z").toISOString()
  }
];

// Database Seeding
const seedBlogs = async () => {
  try {
    const blogsCollection = db.collection("blogs");
    const snapshot = await blogsCollection.limit(1).get();
    if (snapshot.empty) {
      console.log("Blogs collection is empty. Seeding default blogs...");
      for (const blog of DEFAULT_BLOGS) {
        await blogsCollection.add(blog);
      }
      console.log("Default blogs seeded successfully.");
    }
  } catch (err) {
    console.error("Error seeding default blogs:", err);
  }
};
seedBlogs();

// --- REST API ENDPOINTS FOR BLOGS ---

// 1. GET all blogs
app.get("/api/blogs", async (req, res) => {
  try {
    const snapshot = await db.collection("blogs").orderBy("createdAt", "desc").get();
    const blogs = [];
    snapshot.forEach(doc => {
      blogs.push({ id: doc.id, ...doc.data() });
    });
    res.json(blogs);
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// 2. POST create a new blog
app.post("/api/blogs", verifyAuthToken, async (req, res) => {
  const { title, excerpt, content, category, color, tags } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and Content are required" });
  }

  const newBlog = {
    title: title.trim(),
    excerpt: (excerpt || content.substring(0, 150) + "...").trim(),
    content: content.trim(),
    category: category || "General",
    color: color || "bg-yellow-300",
    tags: tags || [],
    author: req.user.name || "Anonymous",
    authorEmail: req.user.email,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    likes: 0,
    comments: [],
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await db.collection("blogs").add(newBlog);
    res.status(201).json({ id: docRef.id, ...newBlog });
  } catch (err) {
    console.error("Error creating blog:", err);
    res.status(500).json({ error: "Failed to create blog" });
  }
});

// 3. POST like a blog
app.post("/api/blogs/:id/like", async (req, res) => {
  const blogId = req.params.id;
  try {
    const blogRef = db.collection("blogs").doc(blogId);
    const doc = await blogRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    // Atomically increment the likes field
    await blogRef.update({
      likes: admin.firestore.FieldValue.increment(1)
    });

    const updatedDoc = await blogRef.get();
    res.json({ id: blogId, likes: updatedDoc.data().likes });
  } catch (err) {
    console.error("Error liking blog:", err);
    res.status(500).json({ error: "Failed to like blog" });
  }
});

// 4. POST add a comment to a blog
app.post("/api/blogs/:id/comments", async (req, res) => {
  const blogId = req.params.id;
  const { name, text } = req.body;

  if (!name || !text) {
    return res.status(400).json({ error: "Name and text are required for comments" });
  }

  const newComment = {
    id: Date.now(),
    name: name.trim(),
    text: text.trim(),
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  };

  try {
    const blogRef = db.collection("blogs").doc(blogId);
    const doc = await blogRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    // Atomically add comment to the comments array
    await blogRef.update({
      comments: admin.firestore.FieldValue.arrayUnion(newComment)
    });

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});