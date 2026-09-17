'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrophyIcon,
  StarIcon,
  SparklesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function RewardsCenterPage() {
  const { state } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [rewardsData, setRewardsData] = useState<any>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  // Fetch rewards data on mount
  const fetchRewardsData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/user/rewards/${state.user.id}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const result = await response.json();
        setRewardsData(result.rewards || result.data || null);
      } else {
        console.error('Failed to fetch rewards data');
      }

      // Fetch leaderboard rank from community top-members
      try {
        const lbRes = await fetch('/api/community/top-members?limit=50', { credentials: 'include' });
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          const members = lbData.data || [];
          const userName = state.user?.name || state.user?.firstName || '';
          const idx = members.findIndex((m: any) =>
            m.name?.toLowerCase() === userName.toLowerCase()
          );
          setLeaderboardRank(idx >= 0 ? idx + 1 : null);
        }
      } catch (lbErr) {
        console.error('Error fetching leaderboard:', lbErr);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  }, [state.user?.id, state.user?.name, state.user?.firstName, setLoading, setRewardsData]);

  useEffect(() => {
    if (state.user?.id) {
      fetchRewardsData();
    }
  }, [state.user, fetchRewardsData]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  // Use real data or fallback to default values
  const currentLevel = rewardsData?.currentLevel || 1;
  const totalPoints = rewardsData?.totalPoints || 0;
  const pointsToNextLevel = rewardsData?.pointsToNextLevel || 100;
  const badgesEarned = rewardsData?.badges?.length || 0;
  const totalBadges = Math.max(badgesEarned, rewardsData?.achievements?.length || 0);

  // Calculate level progress percentage
  const pointsThisLevel = rewardsData?.pointsThisLevel || 0;
  const levelProgress =
    pointsToNextLevel > 0
      ? (pointsThisLevel / (pointsThisLevel + pointsToNextLevel)) * 100
      : 0;

  return (
    <div className="min-h-screen bg-[#030304]">
      {/* Animated Background - Agents Page Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/[0.03] blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px]" />
        <div className="absolute top-2/3 left-1/2 w-[400px] h-[400px] rounded-full bg-fuchsia-500/[0.02] blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {[...Array(15)].map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 bg-white/20 rounded-full" style={{ left: `${5 + i * 6}%`, top: `${10 + (i % 5) * 18}%` }} />
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl mb-6">
            <TrophyIcon className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>My Rewards</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            Track your progress, earn rewards, and unlock achievements
          </p>
          <div className="flex justify-center gap-3 flex-wrap mb-8">
            <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-mono">REWARDS</span>
            <span className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-mono">ACHIEVEMENTS</span>
            <span className="px-4 py-1.5 rounded-full bg-fuchsia-500/[0.02] border border-pink-500/30 text-pink-400 text-sm font-mono">POINTS</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-white/5 backdrop-blur-sm text-white font-bold rounded-xl border border-white/[0.06] hover:bg-white/10 transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
      </section>

      {/* Rewards Content */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="relative rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            {/* Corner Accents */}
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-white/[0.06] rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-white/[0.06] rounded-bl-lg" />
            <div className="flex items-center justify-between mb-4">
              <TrophyIcon className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">Lv.{currentLevel}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Current Level</h3>
            <div className="w-full bg-gray-700/50 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full h-2 transition-all duration-300"
                style={{ width: `${levelProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">
              {pointsToNextLevel} points to next level
            </p>
          </div>

          <div className="relative rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            {/* Corner Accents */}
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-white/[0.06] rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-white/[0.06] rounded-bl-lg" />
            <div className="flex items-center justify-between mb-4">
              <StarIcon className="w-8 h-8 text-yellow-500" />
              <span className="text-2xl font-bold text-white">
                {totalPoints.toLocaleString()}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Total Points
            </h3>
            <p className="text-sm text-gray-400">Lifetime points earned</p>
          </div>

          <div className="relative rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            {/* Corner Accents */}
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-white/[0.06] rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-white/[0.06] rounded-bl-lg" />
            <div className="flex items-center justify-between mb-4">
              <SparklesIcon className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-white">
                {badgesEarned}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Badges Earned
            </h3>
            <p className="text-sm text-gray-400">
              Out of {totalBadges} available
            </p>
          </div>

          <div className="relative rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            {/* Corner Accents */}
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-white/[0.06] rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-white/[0.06] rounded-bl-lg" />
            <div className="flex items-center justify-between mb-4">
              <ChartBarIcon className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-white">
                {leaderboardRank !== null ? `#${leaderboardRank}` : '—'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Leaderboard
            </h3>
            <p className="text-sm text-gray-400">Current ranking</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 p-1 bg-[#13131a]100 rounded-xl mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'overview'
                ? 'bg-white/5 text-purple-500 shadow-sm'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'badges'
                ? 'bg-white/5 text-purple-500 shadow-sm'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <SparklesIcon className="w-4 h-4 mr-2" />
            Badges
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
              <h3 className="text-xl font-semibold text-white mb-6">
                Recent Activity
              </h3>
              <div className="space-y-4">
                {rewardsData?.rewardHistory &&
                  rewardsData.rewardHistory.length > 0 ? (
                  rewardsData.rewardHistory
                    .slice(0, 5)
                    .map((reward, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-[#030304] rounded-lg"
                      >
                        <div className="flex items-center">
                          <div className="p-2 bg-purple-900/30 text-purple-600 rounded-lg mr-4">
                            <SparklesIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">
                              {reward.title}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {reward.date
                                ? new Date(reward.date).toLocaleDateString()
                                : 'Recently'}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-purple-500">
                          +{reward.points}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12">
                    <TrophyIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500">No recent activity</p>
                    <p className="text-sm text-neutral-400 mt-1">
                      Start using AI tools to earn points and badges!
                    </p>
                  </div>
                )}
              </div>

              {/* Show available badges */}
              {rewardsData?.badges && rewardsData.badges.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-white mb-4">
                    Your Badges
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rewardsData.badges.map((badge, index) => (
                      <div
                        key={index}
                        className="text-center p-4 bg-[#030304] rounded-lg"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        <h5 className="font-medium text-white text-sm">
                          {badge.name}
                        </h5>
                        <p className="text-xs text-gray-400 mt-1">
                          {badge.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="relative rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/[0.06] rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/[0.06] rounded-bl-lg" />
              <h3 className="text-xl font-semibold text-white mb-6">All Badges</h3>
              {rewardsData?.badges && rewardsData.badges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {rewardsData.badges.map((badge: any, index: number) => (
                    <div key={index} className="text-center p-4 bg-[#030304] rounded-lg">
                      <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <SparklesIcon className="w-6 h-6 text-white" />
                      </div>
                      <h5 className="font-medium text-white text-sm">{badge.name}</h5>
                      <p className="text-xs text-gray-400 mt-1">{badge.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <SparklesIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No badges earned yet</p>
                  <p className="text-sm text-neutral-400 mt-1">Start using AI tools to earn badges!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
