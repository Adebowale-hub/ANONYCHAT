import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Calendar, User, Tag, Heart, Send, Plus, X } from 'lucide-react';
import { auth } from './firebase';
import GoogleAd from './GoogleAd';


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export default function Blog({ navigate, user }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [likes, setLikes] = useState({});
  const [newComment, setNewComment] = useState({ name: "", text: "" });

  // Blog creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", excerpt: "", content: "", category: "General", tags: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch blogs from backend on mount
  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/blogs`);
      if (res.ok) {
        const data = await res.json();
        setBlogs(data);
      } else {
        console.error("Failed to fetch blogs from API");
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
    const savedLikes = localStorage.getItem('anony_blog_likes');
    if (savedLikes) setLikes(JSON.parse(savedLikes));
  }, []);

  const handleLike = async (postId, e) => {
    e.stopPropagation();
    if (likes[postId]) {
      alert("You've already liked this post!");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/blogs/${postId}/like`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        // Update list in state
        setBlogs(prev => prev.map(b => b.id === postId ? { ...b, likes: data.likes } : b));
        
        // Update local likes tracker
        const updatedLikes = { ...likes, [postId]: true };
        setLikes(updatedLikes);
        localStorage.setItem('anony_blog_likes', JSON.stringify(updatedLikes));

        // If selectedPost is currently open, update its likes too
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(prev => ({ ...prev, likes: data.likes }));
        }
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handleCommentSubmit = async (postId, e) => {
    e.preventDefault();
    if (!newComment.name.trim() || !newComment.text.trim()) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/blogs/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newComment.name.trim(),
          text: newComment.text.trim()
        })
      });

      if (res.ok) {
        const addedComment = await res.json();
        
        // Update state
        setBlogs(prev => prev.map(b => {
          if (b.id === postId) {
            return {
              ...b,
              comments: [...(b.comments || []), addedComment]
            };
          }
          return b;
        }));

        // Update selected post view
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(prev => ({
            ...prev,
            comments: [...(prev.comments || []), addedComment]
          }));
        }

        setNewComment({ name: "", text: "" });
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const handlePublishPost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert("Title and Content are required!");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("You must be logged in to publish a blog post.");
        setIsSubmitting(false);
        return;
      }

      const tagsArray = newPost.tags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Pick a random background color class for the neo-brutalist theme card
      const colors = ["bg-yellow-300", "bg-cyan-300", "bg-pink-300", "bg-green-300", "bg-purple-300"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const res = await fetch(`${BACKEND_URL}/api/blogs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newPost.title,
          excerpt: newPost.excerpt,
          content: newPost.content,
          category: newPost.category,
          color: randomColor,
          tags: tagsArray
        })
      });

      if (res.ok) {
        const createdBlog = await res.json();
        // Prepend new blog in state
        setBlogs(prev => [createdBlog, ...prev]);
        
        // Reset form and close modal
        setNewPost({ title: "", excerpt: "", content: "", category: "General", tags: "" });
        setShowCreateModal(false);
        alert("Blog post published successfully!");
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "Failed to publish blog post"}`);
      }
    } catch (err) {
      console.error("Error publishing blog:", err);
      alert("An error occurred while publishing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = selectedCategory === "All"
    ? blogs
    : blogs.filter(post => post.category?.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen w-full bg-gray-100 p-4 md:p-8 font-sans text-black text-left">
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
              {(selectedPost.tags || []).map((tag, i) => (
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
                <span>{selectedPost.likes || 0} LIKES</span>
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
                COMMENTS ({(selectedPost.comments || []).length})
              </h3>

              {/* Comment list */}
              <div className="space-y-4 mb-8">
                {(selectedPost.comments || []).length === 0 ? (
                  <p className="font-mono text-gray-500 text-sm">No comments yet. Write one below!</p>
                ) : (
                  (selectedPost.comments || []).map((c) => (
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
            
            {/* Google Ad for AdSense Compliance */}
            <div className="mt-8 border-t-4 border-black pt-6">
              <GoogleAd isDarkTheme={false} />
            </div>
          </article>
        ) : (
          /* Blog Grid Listing */
          <div>
            {/* Filters and Create Action */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              {/* Category Filters */}
              <div className="flex flex-wrap gap-2">
                {["All", "Security", "Tech", "AI", "General"].map((cat) => (
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

              {/* Create Post Button (only if user is authenticated) */}
              {user && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-400 text-white font-bold border-4 border-black px-6 py-3 shadow-neo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase"
                >
                  <Plus className="w-5 h-5" />
                  CREATE POST
                </button>
              )}
            </div>

            {loading ? (
              <div className="bg-white border-4 border-black p-12 text-center shadow-neo">
                <p className="font-mono font-bold animate-pulse text-lg">LOADING ARTICLE DATABASE...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white border-4 border-black p-12 text-center shadow-neo">
                <p className="font-mono font-bold text-lg">NO BLOG POSTS FOUND IN THIS CATEGORY.</p>
              </div>
            ) : (
              /* Posts Grid */
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
                          <span>{post.likes || 0}</span>
                        </button>
                        <span className="flex items-center gap-1 font-mono text-xs text-gray-600">
                          <MessageSquare className="w-4 h-4" />
                          <span>{(post.comments || []).length}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Google Ad for AdSense Compliance */}
            <div className="mt-8 border-t-4 border-black pt-6">
              <GoogleAd isDarkTheme={false} />
            </div>
          </div>
        )}

        {/* Create Post Modal Overlay */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white border-4 border-black p-6 max-w-2xl w-full shadow-neo text-black relative my-8">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 border-2 border-black p-1 hover:bg-red-400 transition-colors shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-white"
              >
                <X size={16} />
              </button>
              
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-pink-500 text-white border-2 border-black p-1">
                  <Plus className="stroke-[2.5]" size={20} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Write New Blog Post</h3>
              </div>

              <form onSubmit={handlePublishPost} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs font-bold mb-1 uppercase">Post Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter a catchy title..."
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full border-4 border-black p-3 font-mono text-sm focus:outline-none focus:bg-yellow-100"
                    maxLength={100}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs font-bold mb-1 uppercase">Category</label>
                    <select
                      value={newPost.category}
                      onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                      className="w-full border-4 border-black p-3 font-mono text-sm bg-white focus:outline-none focus:bg-yellow-100"
                    >
                      <option value="General">General</option>
                      <option value="Security">Security</option>
                      <option value="Tech">Tech</option>
                      <option value="AI">AI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs font-bold mb-1 uppercase">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. privacy, security, nodes"
                      value={newPost.tags}
                      onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                      className="w-full border-4 border-black p-3 font-mono text-sm focus:outline-none focus:bg-yellow-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold mb-1 uppercase">Short Excerpt</label>
                  <input
                    type="text"
                    placeholder="A brief summary of your post..."
                    value={newPost.excerpt}
                    onChange={(e) => setNewPost({ ...newPost, excerpt: e.target.value })}
                    className="w-full border-4 border-black p-3 font-mono text-sm focus:outline-none focus:bg-yellow-100"
                    maxLength={180}
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold mb-1 uppercase">Content</label>
                  <textarea
                    required
                    placeholder="Write your article content here... Markdown styles can be added manually."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="w-full border-4 border-black p-3 font-mono text-sm focus:outline-none focus:bg-yellow-100 h-64 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-black text-white hover:bg-gray-800 font-bold border-4 border-black py-4 shadow-neo active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all text-sm uppercase tracking-wider disabled:opacity-50"
                >
                  {isSubmitting ? "Publishing..." : "Publish Blog Post"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
