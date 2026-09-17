'use client';

import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

export const dynamic = 'force-dynamic';

type ConversationItem = {
  id: string;
  agent: string;
  topic: string;
  date: string;
  duration: string;
  messageCount: number;
  lastMessage?: {
    content: string;
    timestamp?: string;
  } | null;
};

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

const normalizePagination = (
  payload?: Partial<PaginationState>
): PaginationState => {
  const page = Number(payload?.page ?? DEFAULT_PAGINATION.page);
  const limit = Number(payload?.limit ?? DEFAULT_PAGINATION.limit);
  const total = Number(payload?.total ?? DEFAULT_PAGINATION.total);
  const totalPages = Number(
    payload?.totalPages ?? DEFAULT_PAGINATION.totalPages
  );

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: Boolean(payload?.hasNext ?? page < totalPages),
    hasPrev: Boolean(payload?.hasPrev ?? page > 1),
  };
};

export default function ConversationHistoryPage() {
  const { state } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Export conversations
  const handleExport = async (format: 'json' | 'csv') => {
    if (!state.user?.id) return;
    
    setExporting(true);
    try {
      const response = await fetch(
        `/api/user/conversations/${state.user.id}/export?format=${format}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export conversations');
    } finally {
      setExporting(false);
    }
  };

  const fetchConversations = useCallback(
    async (
      page = 1,
      search = '',
      options?: { signal?: AbortSignal; silent?: boolean }
    ) => {
      if (!state.user?.id) return;

      const isSearchRequest = Boolean(search);

      if (!options?.silent) {
        setError('');
        if (isSearchRequest) setSearching(true);
        else setLoading(true);
      }

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
          ...(search && { search }),
        });

        const response = await fetch(
          `/api/user/conversations/${state.user.id}?${params.toString()}`,
          {
            credentials: 'include',
            signal: options?.signal,
          }
        );

        if (!response.ok) {
          const message =
            response.status === 404
              ? 'No conversations found for your account yet.'
              : 'Unable to load conversations right now.';
          throw new Error(message);
        }

        const result = await response.json();
        const data = result.data || {};
        setConversations(data.conversations || []);
        setPagination(normalizePagination(data.pagination));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        console.error('Error fetching conversations:', err);
        setConversations([]);
        setPagination(normalizePagination());
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong while loading conversations.'
        );
      } finally {
        setLoading(false);
        setSearching(false);
      }
    },
    [state.user?.id, pagination.limit]
  );

  // Load conversations on mount
  useEffect(() => {
    if (!state.user?.id) return;

    const controller = new AbortController();
    fetchConversations(1, '', { signal: controller.signal });

    return () => controller.abort();
  }, [state.user?.id, fetchConversations]);

  const emptyStateCopy = useMemo(() => {
    if (error) return error;
    if (searchTerm) return 'Try adjusting your search terms';
    return 'Start a conversation to see your history here';
  }, [error, searchTerm]);

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Please log in to view conversations</span>
          </h1>
          <Link href="/auth/login" className="btn-primary inline-block">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Handle search
  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      fetchConversations(1, searchTerm.trim());
    } else {
      fetchConversations(1);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchConversations(newPage, searchTerm, { silent: true });
  };

  return (
    <div className="min-h-screen bg-[#030304] text-white overflow-hidden">
        {/* Background gradient orbs - Legal page theme */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-black" />
        
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${10 + (i * 7)}%`,
                top: `${20 + (i % 4) * 18}%`,
                background: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#a855f7' : '#10b981',
                opacity: 0.3
              }}
            />
          ))}
        </div>

        <div className="container-custom text-center relative z-10">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 shadow-2xl shadow-purple-500/10 mb-8">
            <ChatBubbleLeftRightIcon className="w-14 h-14 text-purple-400" />
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">Conversation History</h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-4 leading-relaxed">
            Review and manage your past interactions
            {pagination.total > 0 && (
              <span className="block mt-2 text-purple-300">
                ({pagination.total} conversations)
              </span>
            )}
          </p>
          <div className="w-40 h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 mx-auto mb-10 rounded-full" />
          <div className="flex flex-wrap items-center justify-center gap-4">
            {pagination.total > 0 && (
              <>
                <button
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                  className="hero-badge px-5 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-medium backdrop-blur-sm hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
                  title="Export as JSON"
                >
                  <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="hero-badge px-5 py-2.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium backdrop-blur-sm hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                  title="Export as CSV"
                >
                  <TableCellsIcon className="w-4 h-4 inline mr-2" />
                  <span>CSV</span>
                </button>
              </>
            )}
            <Link
              href="/dashboard"
              className="hero-badge px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium backdrop-blur-sm hover:bg-emerald-500/20 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 px-4 border-b border-white/[0.06]">
        <div className="container-custom">
          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-20 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-purple-500/20 text-purple-300 text-sm rounded-lg hover:bg-purple-500/30 border border-purple-500/30 disabled:opacity-50 transition-colors"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Conversations List */}
      <section className="relative py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your conversations...</p>
            </div>
          ) : conversations.length > 0 ? (
            <>
              <div className="space-y-4 mb-8">
                {conversations.map((conv, i) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/50 transition-all cursor-pointer group overflow-hidden"
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-500 opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500" />
                    
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mr-3">
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-purple-400" />
                          </div>
                          <h3 className="font-semibold text-white">
                            {conv.agent || 'Assistant'}
                          </h3>
                        </div>
                        <p className="text-gray-300 mb-2">{conv.topic}</p>
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-500">
                            "{conv.lastMessage.content}"
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-400">{conv.date}</p>
                        <p className="text-xs text-gray-500">
                          {conv.duration}
                        </p>
                        <p className="text-xs text-gray-500">
                          {conv.messageCount} messages
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="flex items-center px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4 mr-1" />
                    Previous
                  </button>

                  <span className="text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="flex items-center px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRightIcon className="w-4 h-4 ml-1" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-6">
                <ChatBubbleLeftRightIcon className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                No conversations found
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">{emptyStateCopy}</p>
              <Link
                href="/dashboard/overview"
                className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                Back to Dashboard
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
