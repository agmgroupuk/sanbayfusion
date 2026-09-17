'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer } from '@/lib/gsap';
import { Trophy, Star, Gift, Award, Crown, Zap, TrendingUp, Users, MessageSquare, Share2, Calendar, Check, ChevronRight, Sparkles, Target, Flame, Medal, Diamond, ArrowRight, Rocket, Heart, Clock, Coins, Timer, PartyPopper, Terminal, Copy, CheckCircle } from 'lucide-react';

const levels = [
  { name: 'Bronze', minPoints: 0, maxPoints: 999, gradient: 'from-amber-600 to-orange-700', benefits: ['5% bonus points', 'Access to basic agents', 'Weekly rewards'], icon: <Award className="w-6 h-6" /> },
  { name: 'Silver', minPoints: 1000, maxPoints: 2499, gradient: 'from-gray-400 to-gray-500', benefits: ['10% bonus points', 'Access to premium agents', 'Daily rewards', 'Priority support'], icon: <Medal className="w-6 h-6" /> },
  { name: 'Gold', minPoints: 2500, maxPoints: 4999, gradient: 'from-yellow-400 to-amber-500', benefits: ['15% bonus points', 'Access to all agents', 'Daily rewards', 'Priority support', 'Exclusive features'], icon: <Crown className="w-6 h-6" /> },
  { name: 'Platinum', minPoints: 5000, maxPoints: 9999, gradient: 'from-purple-400 to-violet-500', benefits: ['25% bonus points', 'Unlimited agent access', 'Daily rewards', 'VIP support', 'Exclusive features', 'Early access'], icon: <Star className="w-6 h-6" /> },
  { name: 'Diamond', minPoints: 10000, maxPoints: Infinity, gradient: 'from-cyan-400 to-blue-500', benefits: ['50% bonus points', 'Lifetime access', 'Daily rewards', 'VIP support', 'All features', 'Early access', 'Custom agents'], icon: <Diamond className="w-6 h-6" /> },
];

const earnActions = [
  { id: '1', title: 'Daily Login', description: 'Login to your account every day', points: 20, icon: <Calendar className="w-6 h-6" />, category: 'activity', gradient: 'from-blue-500 to-cyan-500' },
  { id: '2', title: 'Subscribe to Agent', description: 'Subscribe to any agent and earn based on plan', points: 50, icon: <Star className="w-6 h-6" />, category: 'subscription', gradient: 'from-violet-500 to-purple-500' },
  { id: '3', title: 'Chat with Agent', description: 'Send messages to any agent', points: 10, icon: <MessageSquare className="w-6 h-6" />, category: 'activity', gradient: 'from-emerald-500 to-teal-500' },
  { id: '4', title: 'Refer a Friend', description: 'Share your referral code and earn 500 pts', points: 500, icon: <Share2 className="w-6 h-6" />, category: 'social', gradient: 'from-pink-500 to-rose-500' },
  { id: '5', title: 'Use a Tool', description: 'Use any tool from the tools section', points: 15, icon: <Zap className="w-6 h-6" />, category: 'activity', gradient: 'from-orange-500 to-red-500' },
  { id: '6', title: 'Run Lab Experiment', description: 'Run an experiment in the lab', points: 25, icon: <Target className="w-6 h-6" />, category: 'activity', gradient: 'from-yellow-500 to-amber-500' },
  { id: '7', title: 'Community Post', description: 'Create a post in the community', points: 10, icon: <Users className="w-6 h-6" />, category: 'social', gradient: 'from-indigo-500 to-blue-500' },
  { id: '8', title: 'Sign Up Bonus', description: 'Earned automatically when you join', points: 100, icon: <Gift className="w-6 h-6" />, category: 'milestone', gradient: 'from-amber-500 to-yellow-500' },
];

const flipWords = ['Rewards', 'Points', 'Badges', 'Levels', 'Perks'];
const tagWords = ['EARN', 'REDEEM', 'LEVEL UP', 'UNLOCK', 'WIN'];

export default function RewardsCenterPage() {
  const { state } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'agents' | 'leaderboard' | 'referral'>('overview');
  const [userPoints, setUserPoints] = useState(0);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [currentFlipWord, setCurrentFlipWord] = useState(0);
  const flipWordRef = useRef<HTMLSpanElement>(null);
  const tagContainerRef = useRef<HTMLDivElement>(null);
  const [rewardsData, setRewardsData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [referralData, setReferralData] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<any[]>([]);

  // Fetch all rewards data
  useEffect(() => {
    if (!state.user?.id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [rewardsRes, leaderboardRes, catalogRes, referralRes] = await Promise.all([
          fetch(`/api/user/rewards/${state.user.id}`, { credentials: 'include' }),
          fetch('/api/rewards/leaderboard', { credentials: 'include' }),
          fetch('/api/rewards/catalog', { credentials: 'include' }),
          fetch('/api/rewards/referral', { credentials: 'include' }),
        ]);

        if (rewardsRes.ok) {
          const rd = await rewardsRes.json();
          const data = rd.rewards || rd.data || rd;
          setRewardsData(data);
          setUserPoints(data.pointsBalance || 0);
          setTotalPointsEarned(data.totalPointsEarned || 0);
          setBadges(data.badges || []);
        }
        if (leaderboardRes.ok) {
          const ld = await leaderboardRes.json();
          setLeaderboardData(ld.leaderboard || ld.data || []);
        }
        if (catalogRes.ok) {
          const cd = await catalogRes.json();
          setCatalog(cd.catalog || cd.data || []);
        }
        if (referralRes.ok) {
          const ref = await referralRes.json();
          setReferralData(ref.data || ref);
        }
      } catch (e) {
        console.error('Failed to fetch rewards:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [state.user?.id]);

  const handleRedeem = async (rewardId: string, pointsCost: number) => {
    if (userPoints < pointsCost) return;
    setRedeemingId(rewardId);
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rewardId })
      });
      if (res.ok) {
        setUserPoints(prev => prev - pointsCost);
        const rd = await res.json();
        alert(`Redeemed! Your code: ${rd.redemption?.code || 'Check your dashboard'}`);
      }
    } catch (e) {
      console.error('Redeem error:', e);
    } finally {
      setRedeemingId(null);
    }
  };

  const copyReferralCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.shareUrl || referralData.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCurrentLevel = () => levels.find(l => userPoints >= l.minPoints && userPoints <= l.maxPoints) || levels[0];
  const getNextLevel = () => {
    const idx = levels.findIndex(l => l.name === getCurrentLevel().name);
    return idx < levels.length - 1 ? levels[idx + 1] : null;
  };
  const getProgress = () => {
    const curr = getCurrentLevel();
    const next = getNextLevel();
    if (!next) return 100;
    return Math.min(((userPoints - curr.minPoints) / (next.minPoints - curr.minPoints)) * 100, 100);
  };

  /* ── Scroll to top on mount ── */
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
  }, []);

  /* ── Twinkling stars ── */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffffff', '#c4b5fd', '#93c5fd', '#86efac', '#fca5a5', '#fde68a'];
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3, alpha: Math.random(), speed: Math.random() * 0.008 + 0.003,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.r > 1) { ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill(); }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* ── GSAP ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger, TextPlugin, Flip, MotionPathPlugin, ScrollToPlugin, Observer);
      CustomWiggle.create('rewardWiggle', { wiggles: 6, type: 'uniform' });
      CustomEase.create('bounceOut', 'M0,0 C0.14,0 0.27,0.58 0.32,0.8 0.37,1.02 0.45,1.12 0.5,1.12 0.55,1.12 0.63,1.02 0.68,0.8 0.73,0.58 0.86,0 1,0');

      // Hero entrance
      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9');

      // Hero icon pulse
      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(251,191,36,0.5), 0 0 160px rgba(251,191,36,0.2), inset 0 0 30px rgba(251,191,36,0.1)',
        scale: 1.08,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Rotating rings
      gsap.to('.hero-ring', {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none',
      });

      // Typewriter
      if (typewriterRef.current) {
        const phrases = [
          'Earn 50 points daily',
          'Level up to Diamond',
          'Unlock premium agents',
          'Refer friends for 500 pts',
          'Redeem exclusive rewards',
          'Climb the leaderboard',
          'Complete weekly streaks',
          'Get VIP benefits',
        ];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      // Flip word animation
      const flipWordAnimation = () => {
        if (flipWordRef.current) {
          gsap.to(flipWordRef.current, {
            duration: 0.4, rotationX: -90, opacity: 0, ease: 'power2.in',
            onComplete: () => {
              setCurrentFlipWord(prev => (prev + 1) % flipWords.length);
              gsap.fromTo(flipWordRef.current,
                { rotationX: 90, opacity: 0 },
                { rotationX: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
              );
            }
          });
        }
      };
      const flipInterval = setInterval(flipWordAnimation, 2500);

      // Stat cards
      gsap.set('.stat-card', { rotationY: -180, opacity: 0, transformPerspective: 1000, transformOrigin: 'center center' });
      gsap.to('.stat-card', { rotationY: 0, opacity: 1, duration: 1, stagger: 0.2, ease: 'back.out(1.5)', delay: 1.2 });

      // Points counter
      gsap.to({ val: 0 }, {
        val: userPoints, duration: 2.5, delay: 1.8, ease: 'power2.out',
        onUpdate: function () { setDisplayPoints(Math.round(this.targets()[0].val)); }
      });

      // Stat card hover magnetic
      document.querySelectorAll('.stat-card').forEach(card => {
        const cardEl = card as HTMLElement;
        cardEl.addEventListener('mousemove', (e) => {
          const rect = cardEl.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(cardEl, { rotationY: x / 10, rotationX: -y / 10, duration: 0.3, ease: 'power2.out' });
        });
        cardEl.addEventListener('mouseleave', () => {
          gsap.to(cardEl, { rotationY: 0, rotationX: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        });
      });

      // Stat icons rotation
      gsap.to('.stat-icon', { rotation: 360, duration: 8, repeat: -1, ease: 'none', stagger: 0.5 });

      // Progress bar
      gsap.set('.progress-container', { opacity: 0, scaleX: 0 });
      gsap.to('.progress-container', { opacity: 1, scaleX: 1, duration: 0.8, ease: 'power3.out', delay: 2 });
      gsap.set('.progress-fill', { width: '0%' });
      gsap.to('.progress-fill', { width: `${getProgress()}%`, duration: 2, ease: 'power2.out', delay: 2.3 });
      gsap.to('.progress-shimmer', { x: '100%', duration: 1.5, repeat: -1, ease: 'power1.inOut', delay: 3 });

      // Rotating tags marquee
      if (tagContainerRef.current) {
        const tags = tagContainerRef.current.querySelectorAll('.rotating-tag');
        gsap.set(tags, { opacity: 0, scale: 0 });
        gsap.to(tags, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(2)', delay: 2 });
        gsap.to('.tag-track', { x: '-50%', duration: 20, repeat: -1, ease: 'none' });
      }

      // Tab buttons
      gsap.set('.tab-btn', { y: 50, opacity: 0, scale: 0.8 });
      gsap.to('.tab-btn', { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)', delay: 2.2 });

      document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnEl = btn as HTMLElement;
        btnEl.addEventListener('mouseenter', () => {
          gsap.to(btnEl, { scale: 1.1, y: -5, duration: 0.3, ease: 'back.out(2)' });
          gsap.to(btnEl.querySelector('.tab-icon'), { rotation: 360, duration: 0.5, ease: 'power2.out' });
        });
        btnEl.addEventListener('mouseleave', () => {
          gsap.to(btnEl, { scale: 1, y: 0, duration: 0.3, ease: 'power2.out' });
        });
      });

      // Floating icons
      gsap.utils.toArray<HTMLElement>('.floating-icon').forEach((icon, i) => {
        gsap.fromTo(icon,
          { y: 30, opacity: 0, scale: 0 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, delay: 0.3 + i * 0.1, ease: 'back.out(2)' }
        );
        gsap.to(icon, {
          y: `random(-15, 15)`, x: `random(-10, 10)`, rotation: `random(-10, 10)`,
          duration: `random(3, 5)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.2
        });
      });

      // ScrollTrigger batches
      ScrollTrigger.batch('.content-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { y: 80, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.15, ease: 'back.out(1.5)' }
          );
        },
        start: 'top 85%', once: true
      });

      ScrollTrigger.batch('.level-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { x: -100, opacity: 0, scaleX: 0.5 },
            { x: 0, opacity: 1, scaleX: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
          );
        },
        start: 'top 80%', once: true
      });

      ScrollTrigger.batch('.reward-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { y: 60, opacity: 0, scale: 0.7 },
            { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.08, ease: 'elastic.out(1, 0.5)' }
          );
        },
        start: 'top 85%', once: true
      });

      ScrollTrigger.batch('.agent-card', {
        onEnter: (elements) => {
          elements.forEach((el, i) => {
            gsap.fromTo(el,
              { opacity: 0, scale: 0, rotation: 180 + (i * 45), x: (i % 2 === 0 ? -50 : 50) },
              { opacity: 1, scale: 1, rotation: 0, x: 0, duration: 0.8, delay: i * 0.1, ease: 'back.out(1.5)' }
            );
          });
        },
        start: 'top 85%', once: true
      });

      ScrollTrigger.batch('.leaderboard-row', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { x: -200, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
          );
        },
        start: 'top 85%', once: true
      });

      ScrollTrigger.refresh();

      return () => { clearInterval(flipInterval); };
    }, containerRef);

    return () => ctx.revert();
  }, [userPoints]);

  // Tab change with Flip
  const handleTabChange = useCallback((newTab: typeof activeTab) => {
    const state = Flip.getState('.tab-btn');
    setActiveTab(newTab);
    requestAnimationFrame(() => {
      Flip.from(state, { duration: 0.5, ease: 'power2.inOut', absolute: true });
      gsap.fromTo('.tab-content',
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }
      );
    });
  }, []);

  const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm';

  return (
    <div ref={containerRef} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      {/* Twinkling stars */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Nebula orbs */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="absolute top-[55%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.025) 0%, transparent 70%)' }} />
      </div>

      {/* Scan line */}
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(251,191,36,0.015) 2px, rgba(251,191,36,0.015) 4px)' }} />

      {/* Micro grid */}
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Floating icons */}
      <div className="fixed inset-0 pointer-events-none z-[3]">
        <div className="floating-icon absolute top-24 left-[8%]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-32 right-[10%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-violet-500/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-violet-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-1/3 left-[5%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-48 left-[12%]">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-emerald-500/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-32 right-[8%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-pink-500/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-1/2 right-[6%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-yellow-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* ════════ HERO ════════ */}
      <section className="relative z-10 pt-28 pb-8 lg:pt-36 lg:pb-12 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* Animated icon with rotating rings */}
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-amber-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-amber-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-amber-400/40 shadow-2xl shadow-amber-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.35) 0%, rgba(139,92,246,0.25) 50%, rgba(251,191,36,0.3) 100%)' }}>
              <Trophy className="w-14 h-14 relative z-10" style={{ color: '#fde68a', filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.8)) drop-shadow(0 0 40px rgba(251,191,36,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Earn Amazing</span>
            </h1>

            {/* Flip Word */}
            <div className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 h-24 flex items-center justify-center">
              <span
                ref={flipWordRef}
                className="inline-block"
                style={{ background: 'linear-gradient(to right, #fbbf24, #f59e0b, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', perspective: '1000px', transformStyle: 'preserve-3d' }}
              >
                {flipWords[currentFlipWord]}
              </span>
            </div>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light">
            Unlock rewards and level up your AI experience with
            <span className="text-amber-400"> every interaction!</span>
          </p>

          {/* Typewriter badge */}
          <div className="flex justify-center items-center mb-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600/15 via-yellow-600/10 to-amber-600/15 border border-amber-500/25 backdrop-blur-sm shadow-lg shadow-amber-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500/30">
                <Terminal className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-amber-400 font-semibold">I can</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-amber-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>

          {/* Rotating Tags Marquee */}
          <div ref={tagContainerRef} className="overflow-hidden py-4 mb-8">
            <div className="tag-track flex gap-4 w-max">
              {[...tagWords, ...tagWords, ...tagWords, ...tagWords].map((tag, i) => (
                <span
                  key={i}
                  className="rotating-tag px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.06] text-sm font-bold text-gray-400 whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8" style={{ perspective: '1000px' }}>
            <div className={`stat-card group p-6 ${card} hover:border-amber-500/20 transition-all shadow-xl`} style={{ transformStyle: 'preserve-3d' }}>
              <div className="stat-icon w-12 h-12 mx-auto mb-3 rounded-xl bg-white/[0.03] border border-amber-500/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-4xl font-black text-white mb-1 tabular-nums">{displayPoints.toLocaleString()}</div>
              <div className="text-gray-500 font-medium">Total Points</div>
            </div>

            <div className={`stat-card group p-6 rounded-2xl bg-gradient-to-br ${getCurrentLevel().gradient} border border-white/20 shadow-xl`} style={{ transformStyle: 'preserve-3d' }}>
              <div className="stat-icon w-12 h-12 mx-auto mb-3 rounded-xl bg-white/20 flex items-center justify-center text-white">
                {getCurrentLevel().icon}
              </div>
              <div className="text-4xl font-black text-white mb-1">{getCurrentLevel().name}</div>
              <div className="text-white/80 font-medium">Current Level</div>
            </div>

            <div className={`stat-card group p-6 ${card} hover:border-emerald-500/20 transition-all shadow-xl`} style={{ transformStyle: 'preserve-3d' }}>
              <div className="stat-icon w-12 h-12 mx-auto mb-3 rounded-xl bg-white/[0.03] border border-emerald-500/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-4xl font-black text-white mb-1">{badges.length}</div>
              <div className="text-gray-500 font-medium">Badges Earned</div>
            </div>
          </div>

          {/* Progress Bar */}
          {getNextLevel() && (
            <div className="progress-container max-w-2xl mx-auto origin-left">
              <div className="h-5 rounded-full bg-white/[0.04] overflow-hidden border border-white/[0.06] relative">
                <div className="progress-fill h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-full relative overflow-hidden">
                  <div className="progress-shimmer absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full" />
                </div>
              </div>
              <div className="flex justify-between mt-3 text-sm font-medium">
                <span className="text-gray-500">{getCurrentLevel().name}</span>
                <span className="text-amber-400">{Math.round(getProgress())}%</span>
                <span className="text-gray-500">{getNextLevel()?.name}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ════════ TAB NAVIGATION ════════ */}
      <section className="relative z-10 pb-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-4 justify-center">
          {[
            { id: 'overview', label: 'Overview', icon: Trophy },
            { id: 'rewards', label: 'Earn Rewards', icon: Gift },
            { id: 'referral', label: 'Referral', icon: Share2 },
            { id: 'leaderboard', label: 'Leaderboard', icon: Award },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as typeof activeTab)}
              className={`tab-btn flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all ${activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-white/[0.02] border border-white/[0.06] text-gray-400 hover:border-white/[0.1] hover:text-white'
                }`}
            >
              <tab.icon className="tab-icon w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ════════ TAB CONTENT ════════ */}
      <section className="relative z-10 pb-20 px-4">
        <div className="tab-content max-w-6xl mx-auto">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Levels */}
              <div className={`content-card p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm shadow-2xl`}>
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                  <Crown className="w-8 h-8 text-yellow-400" />
                  Membership Levels
                </h2>
                <div className="space-y-3">
                  {levels.map((level) => (
                    <div
                      key={level.name}
                      className={`level-card p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] ${level.name === getCurrentLevel().name
                        ? `bg-gradient-to-r ${level.gradient} border-white/30 shadow-lg`
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={level.name === getCurrentLevel().name ? 'text-white' : 'text-gray-500'}>{level.icon}</div>
                          <div>
                            <div className={`font-bold ${level.name === getCurrentLevel().name ? 'text-white' : 'text-gray-300'}`}>{level.name}</div>
                            <div className={`text-xs ${level.name === getCurrentLevel().name ? 'text-white/70' : 'text-gray-600'}`}>
                              {level.maxPoints === Infinity ? `${level.minPoints.toLocaleString()}+` : `${level.minPoints.toLocaleString()} - ${level.maxPoints.toLocaleString()}`} pts
                            </div>
                          </div>
                        </div>
                        {level.name === getCurrentLevel().name && (
                          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">Current</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions & Redeem */}
              <div className="space-y-8">
                <div className={`content-card p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm shadow-2xl`}>
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <Zap className="w-8 h-8 text-yellow-400" />
                    Quick Actions
                  </h2>
                  <div className="space-y-3">
                    {earnActions.slice(0, 4).map((reward) => (
                      <div
                        key={reward.id}
                        className="reward-card flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/20 hover:bg-white/[0.04] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${reward.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                            {reward.icon}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-amber-400 transition-colors">{reward.title}</div>
                            <div className="text-sm text-gray-600">{reward.description}</div>
                          </div>
                        </div>
                        <span className="text-amber-400 font-black text-lg">+{reward.points}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`content-card p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm shadow-2xl overflow-hidden relative`}>
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
                      <Gift className="w-8 h-8 text-violet-400" />
                      Redeem Points
                    </h2>
                    <p className="text-gray-500 mb-6">Exchange your points for amazing rewards!</p>
                    <div className="space-y-3">
                      {catalog.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/20 transition-all group">
                          <div>
                            <span className="text-white font-medium">{item.name}</span>
                            <div className="text-xs text-gray-600">{(item.pointsCost || 0).toLocaleString()} pts</div>
                          </div>
                          <button
                            onClick={() => handleRedeem(item.id, item.pointsCost)}
                            disabled={userPoints < item.pointsCost || redeemingId === item.id}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${userPoints >= item.pointsCost
                              ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/20 hover:scale-105'
                              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                              }`}
                          >
                            {redeemingId === item.id ? 'Redeeming...' : 'Redeem'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REWARDS TAB */}
          {activeTab === 'rewards' && (
            <div>
              <h2 className="text-4xl font-black text-white mb-10 text-center">Earn Points Every Day</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {earnActions.map((reward) => (
                  <div
                    key={reward.id}
                    className={`reward-card group p-6 ${card} hover:border-amber-500/20 hover:bg-white/[0.04] transition-all cursor-pointer hover:scale-105`}
                  >
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${reward.gradient} flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                      {reward.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white text-center mb-2 group-hover:text-amber-400 transition-colors">{reward.title}</h3>
                    <p className="text-gray-600 text-center text-sm mb-4">{reward.description}</p>
                    <div className="text-center">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black">
                        <Star className="w-4 h-4" />
                        +{reward.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REFERRAL TAB */}
          {activeTab === 'referral' && (
            <div>
              <h2 className="text-4xl font-black text-white mb-4 text-center">Referral Program</h2>
              <p className="text-gray-500 text-center mb-10 text-lg">Share your code and earn 500 points for every friend who joins!</p>

              <div className="max-w-2xl mx-auto space-y-8">
                {/* Referral Code Card */}
                <div className={`content-card p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm shadow-2xl text-center`}>
                  <Share2 className="w-12 h-12 text-pink-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Your Referral Code</h3>
                  {referralData?.referralCode ? (
                    <>
                      <div className="flex items-center justify-center gap-3 my-6">
                        <code className="text-3xl font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-xl tracking-wider">
                          {referralData.referralCode}
                        </code>
                        <button
                          onClick={copyReferralCode}
                          className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-amber-500/30 hover:bg-white/[0.08] transition-all"
                        >
                          {copied ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6 text-gray-400" />}
                        </button>
                      </div>
                      <p className="text-gray-500 text-sm mb-6">Share the link below with friends</p>
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-gray-400 break-all">
                        {referralData.shareUrl}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500 mt-4">{state.user?.id ? 'Loading your referral code...' : 'Sign in to get your referral code'}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-6">
                  <div className={`content-card p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center`}>
                    <div className="text-4xl font-black text-emerald-400 mb-2">{referralData?.totalReferrals || 0}</div>
                    <div className="text-gray-500 font-medium">Friends Referred</div>
                  </div>
                  <div className={`content-card p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center`}>
                    <div className="text-4xl font-black text-amber-400 mb-2">{referralData?.totalPointsEarned || 0}</div>
                    <div className="text-gray-500 font-medium">Points from Referrals</div>
                  </div>
                </div>

                {/* Recent Referrals */}
                {referralData?.referrals?.length > 0 && (
                  <div className={`content-card p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm shadow-2xl`}>
                    <h3 className="text-xl font-bold text-white mb-4">Recent Referrals</h3>
                    <div className="space-y-3">
                      {referralData.referrals.map((ref: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-white font-medium">{ref.referredUser || 'User'}</div>
                              <div className="text-xs text-gray-600">{new Date(ref.completedAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <span className={`text-sm font-bold ${ref.status === 'completed' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                            {ref.status === 'completed' ? `+${ref.pointsAwarded} pts` : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* How it works */}
                <div className={`content-card p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm shadow-2xl`}>
                  <h3 className="text-xl font-bold text-white mb-6">How It Works</h3>
                  <div className="space-y-4">
                    {[
                      { step: '1', text: 'Copy your unique referral code above' },
                      { step: '2', text: 'Share it with friends' },
                      { step: '3', text: 'They sign up using your code' },
                      { step: '4', text: 'You both earn bonus points!' },
                    ].map((item) => (
                      <div key={item.step} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-black font-black text-lg flex-shrink-0">
                          {item.step}
                        </div>
                        <p className="text-gray-300">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <div>
              <h2 className="text-4xl font-black text-white mb-10 text-center">Top Performers</h2>
              <div className={`max-w-3xl mx-auto content-card p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm shadow-2xl`}>
                {leaderboardData.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboardData.map((user: any) => {
                      const isYou = user.userId === state.user?.id;
                      const avatarIcons = ['👑', '💎', '⭐'];
                      return (
                        <div
                          key={user.rank}
                          className={`leaderboard-row flex items-center justify-between p-5 rounded-xl transition-all cursor-pointer ${isYou
                            ? 'bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-cyan-500/10 border-2 border-violet-500/30 shadow-lg shadow-violet-500/10'
                            : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04]'
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black ${user.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30' :
                              user.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black shadow-lg shadow-gray-400/30' :
                                user.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-lg shadow-amber-600/30' :
                                  'bg-white/[0.04] text-gray-500'
                              }`}>
                              {user.rank <= 3 ? avatarIcons[user.rank - 1] : user.rank}
                            </div>
                            <div>
                              <div className={`font-bold text-lg ${isYou ? 'text-cyan-400' : 'text-white'}`}>{isYou ? 'You' : user.name}</div>
                              <div className="text-sm text-gray-600">{user.level} &middot; {user.badgeCount || 0} badges</div>
                            </div>
                          </div>
                          <div className="text-amber-400 font-black text-xl">{(user.totalPoints || 0).toLocaleString()} pts</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-10">Be the first to earn points and climb the leaderboard!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="relative z-10 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`content-card relative p-10 md:p-16 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center overflow-hidden shadow-2xl`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.03) 0%, transparent 70%)' }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-500/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-violet-500/20 rounded-bl-lg" />

            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/20">
                <Rocket className="w-10 h-10 text-amber-300" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Start Earning Today!</h2>
              <p className="text-gray-500 mb-8 text-lg max-w-2xl mx-auto">
                Join thousands of users already earning rewards. Every interaction counts!
              </p>
              <Link
                href="https://maula.ai/agents"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black font-black text-xl hover:shadow-2xl hover:shadow-amber-500/30 hover:scale-105 transition-all"
              >
                Explore Agents
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(251,191,36,0.5); }
        .typewriter-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
