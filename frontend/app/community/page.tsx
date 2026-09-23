'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Heart,
  MessageCircle,
  Users,
  TrendingUp,
  Search,
  Filter,
  ChevronDown,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Edit3,
  Trash2,
  X,
  Check,
  CornerDownRight,
} from 'lucide-react';
import { gsap, ScrollTrigger, TextPlugin, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, TextPlugin, Observer);

interface CommunityMessage {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: Date;
  likes: number;
  replies: number;
  category: 'general' | 'agents' | 'ideas' | 'help';
  isPinned?: boolean;
}

interface CommunityUser {
  id: string;
  name: string;
  avatar: string;
  title: string;
  joinedDate: Date;
  postsCount?: number;
}

interface CommunityCommentData {
  id: string;
  postId: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export default function CommunityPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [topMembers, setTopMembers] = useState<CommunityUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [postCategory, setPostCategory] = useState<'general' | 'agents' | 'ideas' | 'help'>('general');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'agents' | 'ideas' | 'help'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<{
    totalMembers: number;
    onlineNow: number;
    totalPosts: number;
    postsThisWeek: number;
    activeReplies: number;
    newMembersWeek: number;
  } | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, CommunityCommentData[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Presence ping
  useEffect(() => {
    const ping = async () => {
      try {
        if (!userProfile?.token) return;
        const userId = userProfile._id || userProfile.id;
        await fetch('/api/community/presence/ping', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: userProfile.name || 'Anonymous', userId, avatar: userProfile.avatar || '👤' }),
        });
      } catch (error) {
        console.error('Presence ping failed:', error);
      }
    };
    ping();
    const interval = setInterval(ping, 20000);
    return () => clearInterval(interval);
  }, [userProfile?.token]);

  // Fetch posts + members
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPosts(true);
        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.set('category', selectedCategory);
        if (searchQuery) params.set('search', searchQuery);

        const res = await fetch(`/api/community/posts?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          const list: CommunityMessage[] = (json.data || []).map((p: any) => ({
            id: p._id,
            author: p.authorName,
            avatar: p.authorAvatar || '👤',
            content: p.content,
            timestamp: new Date(p.createdAt),
            likes: p.likesCount || 0,
            replies: p.repliesCount || 0,
            category: p.category,
            isPinned: !!p.isPinned,
          }));
          setMessages(list);
        } else {
          setError(json.error || 'Failed to load posts');
        }

        const membersRes = await fetch('/api/community/top-members');
        const membersJson = await membersRes.json();
        if (membersJson.success && membersJson.data) {
          const membersList: CommunityUser[] = membersJson.data.map((m: any) => ({
            id: m._id,
            name: m.name || m.email || 'Member',
            avatar: m.avatar || '👤',
            title: m.title || `${m.postsCount || 0} posts`,
            joinedDate: new Date(m.createdAt),
            postsCount: m.postsCount || 0,
          }));
          setTopMembers(membersList);
        }
      } catch (e: any) {
        setError('Failed to load posts');
      } finally {
        setLoadingPosts(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load user profile and user's liked posts
  useEffect(() => {
    const loadUserProfile = async () => {
      const token = document.cookie.match(/token=([^;]+)/)?.[1];
      if (!token) return;
      try {
        const res = await fetch('/api/user/profile', { credentials: 'include' });
        if (res.ok) {
          const profile = await res.json();
          const userData = { ...profile.data, token };
          setUserProfile(userData);

          // Fetch user's liked posts from database
          const userId = userData._id || userData.id;
          if (userId) {
            try {
              const likesRes = await fetch('/api/community/posts/liked', {
                credentials: 'include',
              });
              if (likesRes.ok) {
                const likesData = await likesRes.json();
                if (likesData.success && likesData.data) {
                  setLikedMessages(new Set(likesData.data));
                }
              }
            } catch (likesErr) {
              console.error('Failed to load liked posts:', likesErr);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };
    loadUserProfile();
  }, []);

  // SSE metrics
  useEffect(() => {
    const es = new EventSource('/api/community/stream');
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'metrics') setMetrics(msg.data);
      } catch (_) { }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // GSAP Animations
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // Nebula orbs
      gsap.to('.nebula-orb', {
        x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)',
        duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true },
      });

      // Stardust
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, {
          y: '-=200', x: `random(-60, 60)`, opacity: 0, duration: 4 + Math.random() * 6,
          repeat: -1, delay: i * 0.3, ease: 'power1.out',
          onRepeat: function () { gsap.set(p, { y: '+=200', opacity: 0.6 }); }
        });
      });

      // Scan line
      gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

      // Hero title
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 60, filter: 'blur(20px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 }
        );
      }

      // Subtitle
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 40, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 }
        );
      }

      // Hero icon pulse
      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(6,182,212,0.5), 0 0 160px rgba(6,182,212,0.2), inset 0 0 30px rgba(6,182,212,0.1)',
        scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      // Stats entrance
      if (statsRef.current) {
        const statCards = statsRef.current.querySelectorAll('.stat-card');
        gsap.from(statCards, {
          scrollTrigger: { trigger: statsRef.current, start: 'top 85%' },
          opacity: 0, y: 80, rotationX: -40, scale: 0.85, stagger: 0.15, duration: 1, ease: 'back.out(1.7)',
        });
      }

      // Section headers
      gsap.utils.toArray<HTMLElement>('.section-header').forEach((header) => {
        gsap.from(header, {
          scrollTrigger: { trigger: header, start: 'top 90%' },
          opacity: 0, y: 30, duration: 0.8, ease: 'power3.out',
        });
      });

      // Cards staggered reveal
      gsap.utils.toArray<HTMLElement>('.reveal-card').forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 90%' },
          opacity: 0, y: 60, scale: 0.92, duration: 0.7, delay: (i % 4) * 0.08, ease: 'power3.out',
        });
      });

    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Post message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!userProfile?.token) { setError('Please log in to post messages'); return; }
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userProfile.token}` },
        body: JSON.stringify({ content: newMessage.trim(), category: postCategory }),
      });
      const json = await res.json();
      if (json.success) {
        const p = json.data;
        const newMsg: CommunityMessage = {
          id: p._id, author: p.authorName, avatar: p.authorAvatar || '👤', content: p.content,
          timestamp: new Date(p.createdAt), likes: p.likesCount || 0, replies: p.repliesCount || 0,
          category: p.category, isPinned: !!p.isPinned,
        };
        setMessages((prev) => [newMsg, ...prev]);
        setNewMessage('');
      }
    } catch (_) { }
  };

  // Like / unlike
  const handleLike = async (messageId: string) => {
    if (!userProfile?.token) { setError('Please log in to like posts'); return; }
    const userId = userProfile._id || userProfile.id;
    const isLiked = likedMessages.has(messageId);
    try {
      const endpoint = isLiked ? 'unlike' : 'like';
      const res = await fetch(`/api/community/posts/${messageId}/${endpoint}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      });
      if (!res.ok) throw new Error('Failed to update like');
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, likes: Math.max(0, m.likes + (isLiked ? -1 : 1)) } : m));
      const next = new Set(likedMessages);
      if (isLiked) next.delete(messageId); else next.add(messageId);
      setLikedMessages(next);
    } catch (_) { }
  };

  // Load comments for a post
  const handleToggleComments = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (postComments[postId]) return; // already loaded
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      const json = await res.json();
      if (json.success) {
        setPostComments((prev) => ({ ...prev, [postId]: json.data || [] }));
      }
    } catch (_) { }
    setLoadingComments((prev) => ({ ...prev, [postId]: false }));
  };

  // Submit a comment
  const handleSubmitComment = async (postId: string) => {
    const content = commentInput[postId]?.trim();
    if (!content || !userProfile?.token) return;
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.success) {
        setPostComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), json.data] }));
        setCommentInput((prev) => ({ ...prev, [postId]: '' }));
        setMessages((prev) => prev.map((m) => m.id === postId ? { ...m, replies: m.replies + 1 } : m));
      }
    } catch (_) { }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string, postId: string) => {
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setPostComments((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
        }));
        setMessages((prev) => prev.map((m) => m.id === postId ? { ...m, replies: Math.max(0, m.replies - 1) } : m));
      }
    } catch (_) { }
  };

  // Edit a post
  const handleEditPost = async (postId: string) => {
    if (!editContent.trim() || !userProfile?.token) return;
    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => prev.map((m) => m.id === postId ? { ...m, content: editContent.trim() } : m));
        setEditingPost(null);
        setEditContent('');
      }
    } catch (_) { }
  };

  // Delete a post
  const handleDeletePost = async (postId: string) => {
    if (!userProfile?.token) return;
    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== postId));
      }
    } catch (_) { }
  };

  const filteredMessages = messages
    .filter((msg) => selectedCategory === 'all' || msg.category === selectedCategory)
    .filter((msg) => msg.content.toLowerCase().includes(searchQuery.toLowerCase()) || msg.author.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.timestamp.getTime() - a.timestamp.getTime());

  const stats = [
    { number: metrics?.totalMembers ?? '—', label: 'Community Members', icon: '👥' },
    { number: metrics?.totalPosts ?? '—', label: 'Total Discussions', icon: '💬' },
    { number: metrics?.onlineNow ?? '—', label: 'Online Now', icon: '🟢' },
    { number: metrics?.postsThisWeek ?? '—', label: 'Posts This Week', icon: '📝' },
  ];

  const categories = [
    { id: 'all', label: 'All Discussions', icon: '💭', color: 'from-cyan-500 to-blue-500' },
    { id: 'general', label: 'General', icon: '🌍', color: 'from-violet-500 to-purple-500' },
    { id: 'agents', label: 'Agents & Features', icon: '🤖', color: 'from-emerald-500 to-green-500' },
    { id: 'ideas', label: 'Ideas & Suggestions', icon: '💡', color: 'from-amber-500 to-orange-500' },
    { id: 'help', label: 'Help & Support', icon: '❓', color: 'from-rose-500 to-pink-500' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══ BACKGROUND LAYER ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />

        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />

        {[...Array(20)].map((_, i) => (
          <div key={i} className="stardust absolute rounded-full" style={{
            left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`,
            width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`,
            background: i % 3 === 0 ? 'rgba(6,182,212,0.6)' : i % 3 === 1 ? 'rgba(139,92,246,0.6)' : 'rgba(236,72,153,0.5)',
            opacity: 0.6,
          }} />
        ))}

        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{
          left: mousePos.x - 250, top: mousePos.y - 250,
          background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)',
        }} />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-cyan-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-cyan-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-cyan-400/40 shadow-2xl shadow-cyan-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(59,130,246,0.25) 50%, rgba(6,182,212,0.3) 100%)' }}>
              <Users className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(6,182,212,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-blue-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 1 }}>
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Sanbay Fusion</span>
            <br />
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Community</span>
          </h1>

          <p ref={subtitleRef} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 1 }}>
            Join real-time discussions with thousands of developers, AI enthusiasts, and innovators
          </p>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="relative py-6">
        <div className="container mx-auto px-4">
          <div ref={statsRef} className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="stat-card text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm hover:border-cyan-500/20 transition-colors duration-500">
                  <div className="text-3xl mb-3">{stat.icon}</div>
                  <div className="stat-value text-3xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent mb-1">
                    {stat.number}
                  </div>
                  <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MAIN COMMUNITY SECTION ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">

            {/* ── Sidebar ── */}
            <div className="lg:col-span-1 space-y-6">

              {/* Categories */}
              <div className="reveal-card rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-6">
                <h3 className="text-base font-bold text-gray-200 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-cyan-400/30"
                    style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(59,130,246,0.15))' }}>
                    <Filter size={14} className="text-cyan-300" />
                  </div>
                  Categories
                </h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id as any)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium ${selectedCategory === cat.id
                        ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                        : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.1]'
                        }`}
                    >
                      <span className="mr-2">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Members */}
              <div className="reveal-card rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-6">
                <h3 className="text-base font-bold text-gray-200 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-violet-400/30"
                    style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(192,38,211,0.15))' }}>
                    <Users size={14} className="text-violet-300" />
                  </div>
                  Top Members
                </h3>
                <div className="space-y-3">
                  {topMembers.length === 0 ? (
                    <div className="text-center py-4 text-gray-600 text-sm">No members yet.</div>
                  ) : (
                    topMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 transition-colors duration-300 cursor-pointer">
                        <div className="text-2xl">{member.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-200 truncate">{member.name}</div>
                          <div className="text-xs text-gray-600">{member.title}</div>
                          <div className="text-xs text-gray-700">Joined {new Date(member.joinedDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── Main Chat Area ── */}
            <div className="lg:col-span-3 space-y-6">

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-600" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search discussions..."
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/30 focus:ring-2 focus:ring-cyan-500/10 transition-all duration-300"
                />
              </div>

              {/* Discussion Feed */}
              <div className="reveal-card rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-6 max-h-[680px] overflow-y-auto custom-scrollbar">
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
                )}

                {filteredMessages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">💭</div>
                    <p className="text-gray-600">
                      {loadingPosts ? 'Loading discussions…' : 'No discussions found. Be the first to start one!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((message) => {
                      const isOwner = userProfile && (userProfile._id === message.author || userProfile.id === message.author || userProfile.name === message.author);
                      const isEditing = editingPost === message.id;
                      const isExpanded = expandedPost === message.id;
                      const comments = postComments[message.id] || [];

                      return (
                        <div key={message.id}
                          className={`p-5 rounded-xl border transition-all duration-300 ${message.isPinned
                            ? 'bg-cyan-500/[0.04] border-cyan-500/20 ring-1 ring-cyan-500/10'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl border border-white/[0.06]"
                                style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.1))' }}>
                                {message.avatar}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-gray-200 flex items-center gap-2">
                                  {message.author}
                                  {message.isPinned && (
                                    <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 font-semibold">📌 Pinned</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-700">
                                  {Math.round((Date.now() - message.timestamp.getTime()) / 60000)} mins ago
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isOwner && !isEditing && (
                                <>
                                  <button onClick={() => { setEditingPost(message.id); setEditContent(message.content); }}
                                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-600 hover:text-cyan-400 transition-colors" title="Edit">
                                    <Edit3 size={13} />
                                  </button>
                                  <button onClick={() => handleDeletePost(message.id)}
                                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-600 hover:text-rose-400 transition-colors" title="Delete">
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                              <div className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.06] text-gray-500">
                                {categories.find((c) => c.id === message.category)?.icon} {message.category}
                              </div>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="mb-4">
                              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3}
                                className="w-full bg-white/[0.03] border border-cyan-500/30 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/10 text-sm resize-none" />
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => handleEditPost(message.id)}
                                  className="px-3 py-1.5 bg-cyan-600/80 hover:bg-cyan-500 rounded-lg text-xs font-medium text-white flex items-center gap-1 transition-colors">
                                  <Check size={12} /> Save
                                </button>
                                <button onClick={() => { setEditingPost(null); setEditContent(''); }}
                                  className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-xs font-medium text-gray-400 flex items-center gap-1 transition-colors">
                                  <X size={12} /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-400 mb-4 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          )}

                          <div className="flex gap-6 text-sm text-gray-600">
                            <button onClick={() => handleLike(message.id)}
                              className={`flex items-center gap-2 transition-colors duration-300 ${likedMessages.has(message.id) ? 'text-pink-400' : 'hover:text-pink-400'}`}>
                              <Heart size={14} fill={likedMessages.has(message.id) ? 'currentColor' : 'none'} /> {message.likes}
                            </button>
                            <button onClick={() => handleToggleComments(message.id)}
                              className={`flex items-center gap-2 transition-colors duration-300 ${isExpanded ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>
                              <MessageCircle size={14} /> {message.replies}
                            </button>
                          </div>

                          {/* Comments section */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-white/[0.06]">
                              {loadingComments[message.id] ? (
                                <p className="text-xs text-gray-600">Loading replies...</p>
                              ) : (
                                <>
                                  {comments.length > 0 && (
                                    <div className="space-y-3 mb-4">
                                      {comments.map((c) => (
                                        <div key={c.id} className="flex gap-3 pl-2">
                                          <CornerDownRight size={14} className="text-gray-700 mt-1 flex-shrink-0" />
                                          <div className="flex-1 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="flex items-center gap-2">
                                                <span className="text-lg">{c.authorAvatar}</span>
                                                <span className="text-xs font-semibold text-gray-300">{c.authorName}</span>
                                                <span className="text-[10px] text-gray-700">
                                                  {Math.round((Date.now() - new Date(c.createdAt).getTime()) / 60000)}m ago
                                                </span>
                                              </div>
                                              {userProfile && (userProfile._id === c.authorId || userProfile.id === c.authorId) && (
                                                <button onClick={() => handleDeleteComment(c.id, message.id)}
                                                  className="p-1 rounded hover:bg-white/[0.06] text-gray-700 hover:text-rose-400 transition-colors">
                                                  <Trash2 size={11} />
                                                </button>
                                              )}
                                            </div>
                                            <p className="text-gray-400 text-xs leading-relaxed">{c.content}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {comments.length === 0 && (
                                    <p className="text-xs text-gray-700 mb-3">No replies yet. Be the first!</p>
                                  )}
                                  {userProfile?.token && (
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={commentInput[message.id] || ''}
                                        onChange={(e) => setCommentInput((prev) => ({ ...prev, [message.id]: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(message.id)}
                                        placeholder="Write a reply..."
                                        className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyan-500/30"
                                      />
                                      <button onClick={() => handleSubmitComment(message.id)}
                                        className="px-3 py-2 bg-cyan-600/60 hover:bg-cyan-500/80 rounded-lg text-xs text-white transition-colors">
                                        <Send size={12} />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Post Form */}
              <form onSubmit={handleSendMessage} className="reveal-card rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-6">
                <div className="mb-4">
                  <label className="text-xs text-gray-600 mb-2 block font-medium uppercase tracking-widest">Select Category</label>
                  <div className="relative">
                    <select value={postCategory} onChange={(e) => setPostCategory(e.target.value as any)}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-gray-200 appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/30 focus:ring-2 focus:ring-cyan-500/10 pr-10 transition-all duration-300">
                      <option value="general">🌍 General</option>
                      <option value="agents">🤖 Agents &amp; Features</option>
                      <option value="ideas">💡 Ideas &amp; Suggestions</option>
                      <option value="help">❓ Help &amp; Support</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={18} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Share your thoughts, ask questions, or join the discussion..."
                    className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/30 focus:ring-2 focus:ring-cyan-500/10 transition-all duration-300"
                  />
                  <button type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap text-white shadow-lg shadow-cyan-600/20 hover:shadow-cyan-500/30 text-sm">
                    <Send size={16} /> Post
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMUNITY GUIDELINES ═══ */}
      <section className="relative py-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="section-header text-center mb-12">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Community Guidelines
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '🤝', title: 'Be Respectful', desc: 'Harassment, hate speech, doxxing, and threats are strictly prohibited. Disagreements are fine—keep them civil and on-topic.', color: 'from-cyan-500 to-blue-500', glow: 'rgba(6,182,212,0.4)' },
              { icon: '💡', title: 'Share Knowledge', desc: "Provide constructive, good-faith contributions. Don't post spam, scams, or misleading content.", color: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.4)' },
              { icon: '🎯', title: 'Stay On Topic', desc: "Keep discussions relevant to Sanbay Fusion and applicable law. Don't share illegal content or proprietary data without permission.", color: 'from-emerald-500 to-green-500', glow: 'rgba(16,185,129,0.4)' },
              { icon: '✨', title: 'Be Authentic', desc: "Protect your account. Don't impersonate others. By participating, you agree to our Terms and applicable policies.", color: 'from-violet-500 to-purple-500', glow: 'rgba(139,92,246,0.4)' },
            ].map((rule, idx) => (
              <div key={idx} className="reveal-card group relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]">
                <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${rule.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-white/[0.08] text-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${rule.glow.replace('0.4', '0.2')}, rgba(255,255,255,0.02))`,
                      boxShadow: `0 0 20px ${rule.glow.replace('0.4', '0.08')}`,
                    }}>
                    {rule.icon}
                  </div>
                  <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300">{rule.title}</h3>
                  <p className="text-gray-600 text-[13px] leading-relaxed group-hover:text-gray-500 transition-colors duration-300">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ACTIVITY STATS ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="section-header text-center mb-12">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Community Activity
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { value: metrics?.postsThisWeek ?? '—', label: 'Posts This Week', color: 'from-cyan-500 to-blue-500', glow: 'rgba(6,182,212,0.3)', width: 'w-3/4' },
              { value: metrics?.activeReplies ?? '—', label: 'Active Replies', color: 'from-violet-500 to-purple-500', glow: 'rgba(139,92,246,0.3)', width: 'w-4/5' },
              { value: metrics?.newMembersWeek ?? '—', label: 'New Members', color: 'from-emerald-500 to-green-500', glow: 'rgba(16,185,129,0.3)', width: 'w-2/3' },
            ].map((item, idx) => (
              <div key={idx} className="reveal-card text-center p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-white/[0.1] transition-colors duration-500">
                <div className={`text-5xl font-black bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-2`}>
                  {item.value}
                </div>
                <p className="text-gray-600 text-sm mb-4">{item.label}</p>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${item.color} ${item.width} rounded-full`} style={{ boxShadow: `0 0 12px ${item.glow}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Ready to Join the Conversation?</h3>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">
            Connect with fellow innovators, share your ideas, and help shape the future of AI.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/community/discord"
              className="px-7 py-3.5 bg-gradient-to-r from-cyan-600/90 to-blue-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-cyan-600/15 hover:shadow-cyan-600/30 transition-all duration-400 flex items-center justify-center gap-2">
              💬 Join Discord
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/signup"
              className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ GLOBAL STYLES ═══ */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }

        select option {
          background: #0a0a0f;
          color: #e5e7eb;
        }
      `}</style>
    </div>
  );
}
