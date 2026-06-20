import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Calendar, User, Tag, Heart, Send } from 'lucide-react';

const BLOG_POSTS = [
  {
    id: 1,
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
    tags: ["Privacy", "Security", "Anonymity"]
  },
  {
    id: 2,
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
    tags: ["WebSockets", "React", "NodeJS"]
  },
  {
    id: 3,
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
    tags: ["Gemini", "AI", "LLM"]
  }
];

export default function Blog({ navigate }) {
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({ name: "", text: "" });

  // Load likes and comments from localStorage on mount
  useEffect(() => {
    const savedLikes = localStorage.getItem('anony_blog_likes');
    const savedComments = localStorage.getItem('anony_blog_comments');
    if (savedLikes) setLikes(JSON.parse(savedLikes));
    if (savedComments) setComments(JSON.parse(savedComments));
  }, []);

  const handleLike = (postId, e) => {
    e.stopPropagation();
    const updated = {
      ...likes,
      [postId]: (likes[postId] || 0) + 1
    };
    setLikes(updated);
    localStorage.setItem('anony_blog_likes', JSON.stringify(updated));
  };

  const handleCommentSubmit = (postId, e) => {
    e.preventDefault();
    if (!newComment.name.trim() || !newComment.text.trim()) return;

    const postComments = comments[postId] || [];
    const updatedComments = [
      ...postComments,
      {
        id: Date.now(),
        name: newComment.name.trim(),
        text: newComment.text.trim(),
        date: new Date().toLocaleDateString()
      }
    ];

    const updated = {
      ...comments,
      [postId]: updatedComments
    };
    setComments(updated);
    localStorage.setItem('anony_blog_comments', JSON.stringify(updated));
    setNewComment({ name: "", text: "" });
  };

  const filteredPosts = selectedCategory === "All"
    ? BLOG_POSTS
    : BLOG_POSTS.filter(post => post.category === selectedCategory);

  return (
    <div className="min-h-screen w-full bg-gray-100 p-4 md:p-8 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white border-4 border-black p-6 shadow-neo mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2 border-2 border-black">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">ANONYCHAT BLOG</h1>
              <p className="font-mono text-xs font-bold text-gray-500">INSIGHTS ON PRIVACY, WEBSOCKETS & AI</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-yellow-300 hover:bg-yellow-200 border-4 border-black px-6 py-3 font-bold shadow-neo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            BACK TO CHAT
          </button>
        </header>

        {selectedPost ? (
          /* Post Detail View */
          <article className="bg-white border-4 border-black p-6 md:p-8 shadow-neo mb-8">
            <button
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 border-2 border-black px-4 py-2 font-bold mb-6 hover:bg-gray-100 transition-colors shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <ArrowLeft className="w-4 h-4" />
              ALL ARTICLES
            </button>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`border-2 border-black px-3 py-1 text-xs font-bold font-mono uppercase ${selectedPost.color}`}>
                {selectedPost.category}
              </span>
              {selectedPost.tags.map((tag, i) => (
                <span key={i} className="bg-gray-200 border-2 border-black px-2 py-1 text-xs font-mono">
                  #{tag}
                </span>
              ))}
            </div>

            <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tight leading-none border-b-4 border-black pb-4">
              {selectedPost.title}
            </h2>

            <div className="flex items-center gap-4 text-sm font-mono text-gray-600 mb-8 border-b-2 border-black pb-4">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="font-bold">{selectedPost.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{selectedPost.date}</span>
              </div>
              <button
                onClick={(e) => handleLike(selectedPost.id, e)}
                className="flex items-center gap-1 hover:text-red-500 font-bold ml-auto transition-colors"
              >
                <Heart className={`w-4 h-4 ${likes[selectedPost.id] ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{likes[selectedPost.id] || 0} LIKES</span>
              </button>
            </div>

            {/* Post Content */}
            <div className="prose max-w-none font-sans text-lg leading-relaxed whitespace-pre-line border-b-4 border-black pb-8">
              {selectedPost.content}
            </div>

            {/* Comments Section */}
            <section className="mt-8">
              <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                COMMENTS ({(comments[selectedPost.id] || []).length})
              </h3>

              {/* Comment list */}
              <div className="space-y-4 mb-8">
                {(comments[selectedPost.id] || []).length === 0 ? (
                  <p className="font-mono text-gray-500 text-sm">No comments yet. Write one below!</p>
                ) : (
                  (comments[selectedPost.id] || []).map((c) => (
                    <div key={c.id} className="bg-gray-50 border-2 border-black p-4 shadow-neo-sm">
                      <div className="flex justify-between items-center mb-2 border-b border-black pb-1">
                        <span className="font-bold font-mono text-sm text-pink-600">@{c.name}</span>
                        <span className="font-mono text-xs text-gray-500">{c.date}</span>
                      </div>
                      <p className="font-medium text-sm md:text-base">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Form */}
              <form onSubmit={(e) => handleCommentSubmit(selectedPost.id, e)} className="bg-yellow-50 border-4 border-black p-4 md:p-6 shadow-neo">
                <h4 className="font-black uppercase mb-4 text-lg">Leave a Comment</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block font-mono text-xs font-bold mb-1">YOUR DISPLAY NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. shadow_hacker"
                      value={newComment.name}
                      onChange={(e) => setNewComment({ ...newComment, name: e.target.value })}
                      className="w-full border-2 border-black p-3 font-mono text-sm focus:outline-none focus:bg-yellow-100"
                      maxLength={30}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs font-bold mb-1">COMMENT CONTENT</label>
                    <textarea
                      placeholder="Share your thoughts anonymously..."
                      value={newComment.text}
                      onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                      className="w-full border-2 border-black p-3 font-mono text-sm focus:outline-none focus:bg-yellow-100 h-24 resize-none"
                      maxLength={300}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-black hover:bg-gray-800 text-white font-bold border-2 border-black py-3 px-6 flex items-center justify-center gap-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-neo-sm transition-all"
                  >
                    <Send className="w-4 h-4" />
                    POST COMMENT
                  </button>
                </div>
              </form>
            </section>
          </article>
        ) : (
          /* Blog Grid Listing */
          <div>
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {["All", "Security", "Tech", "AI"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`border-2 border-black px-4 py-2 font-bold transition-all shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                    selectedCategory === cat
                      ? "bg-black text-white"
                      : "bg-white hover:bg-gray-100 text-black"
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white border-4 border-black p-6 shadow-neo hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className={`border-2 border-black px-2 py-0.5 text-xs font-mono font-bold uppercase ${post.color}`}>
                        {post.category}
                      </span>
                      <span className="font-mono text-xs text-gray-500">{post.date}</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black mb-3 uppercase leading-tight hover:underline">
                      {post.title}
                    </h3>
                    <p className="font-medium text-gray-700 text-sm md:text-base mb-6 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="flex justify-between items-center border-t-2 border-black pt-4 mt-auto">
                    <span className="font-mono text-xs font-bold text-gray-600">BY @{post.author}</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => handleLike(post.id, e)}
                        className="flex items-center gap-1 hover:text-red-500 font-bold font-mono text-xs transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${likes[post.id] ? 'fill-red-500 text-red-500' : ''}`} />
                        <span>{likes[post.id] || 0}</span>
                      </button>
                      <span className="flex items-center gap-1 font-mono text-xs text-gray-600">
                        <MessageSquare className="w-4 h-4" />
                        <span>{(comments[post.id] || []).length}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
