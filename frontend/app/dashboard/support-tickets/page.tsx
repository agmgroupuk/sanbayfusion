'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  TicketIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface SupportTicket {
  ticketId: string;
  ticketNumber: number;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'waiting-customer' | 'waiting-internal' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedName?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  sla?: {
    firstResponseDue?: string;
    resolutionDue?: string;
    breached?: boolean;
  };
  resolution?: {
    summary?: string;
  };
  satisfaction?: {
    rating?: number;
  };
}

interface TicketCounts {
  total: number;
  open: number;
  'in-progress': number;
  'waiting-customer': number;
  resolved: number;
  closed: number;
}

const statusColors: Record<string, string> = {
  'open': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'in-progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'waiting-customer': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'waiting-internal': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'resolved': 'bg-green-500/20 text-green-400 border-green-500/30',
  'closed': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusLabels: Record<string, string> = {
  'open': 'Open',
  'in-progress': 'In Progress',
  'waiting-customer': 'Waiting on You',
  'waiting-internal': 'Under Review',
  'resolved': 'Resolved',
  'closed': 'Closed',
};

const priorityColors: Record<string, string> = {
  'low': 'text-gray-400',
  'medium': 'text-blue-400',
  'high': 'text-orange-400',
  'urgent': 'text-red-400',
};

const categoryLabels: Record<string, string> = {
  'billing': '💳 Billing',
  'technical': '🔧 Technical',
  'account': '👤 Account',
  'agents': '🤖 Agents',
  'subscription': '📋 Subscription',
  'feature-request': '💡 Feature Request',
  'bug-report': '🐛 Bug Report',
  'general': '📝 General',
  'other': '📌 Other',
};

export default function SupportTicketsPage() {
  const { state: authState } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState<TicketCounts>({
    total: 0,
    open: 0,
    'in-progress': 0,
    'waiting-customer': 0,
    resolved: 0,
    closed: 0,
  });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketDetail, setTicketDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);

  // Fetch tickets
  const fetchTickets = useCallback(async (refresh = false) => {
    if (!authState.user?.id) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        userId: authState.user.id,
        ...(filter !== 'all' && { status: filter }),
      });

      const response = await fetch(`/api/live-support/tickets?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      
      if (data.success) {
        setTickets(data.tickets || []);
        setCounts(data.counts || {
          total: 0,
          open: 0,
          'in-progress': 0,
          'waiting-customer': 0,
          resolved: 0,
          closed: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load support tickets. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authState.user?.id, filter]);

  // Fetch ticket detail
  const fetchTicketDetail = useCallback(async (ticketId: string) => {
    if (!authState.user?.id) return;

    try {
      const response = await fetch(
        `/api/live-support/tickets?userId=${authState.user.id}&ticketId=${ticketId}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTicketDetail(data.ticket);
        }
      }
    } catch (err) {
      console.error('Error fetching ticket detail:', err);
    }
  }, [authState.user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Fetch detail when ticket selected
  useEffect(() => {
    if (selectedTicket) {
      fetchTicketDetail(selectedTicket.ticketId);
    } else {
      setTicketDetail(null);
    }
  }, [selectedTicket, fetchTicketDetail]);

  // Submit reply
  const handleSubmitReply = async () => {
    if (!replyText.trim() || !selectedTicket || !authState.user?.id) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/live-support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticketId: selectedTicket.ticketId,
          userId: authState.user.id,
          userName: authState.user.name,
          message: replyText,
        }),
      });

      if (response.ok) {
        setReplyText('');
        await fetchTicketDetail(selectedTicket.ticketId);
        await fetchTickets(true);
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rate ticket
  const handleRateTicket = async (rating: number) => {
    if (!selectedTicket || !authState.user?.id) return;

    try {
      const response = await fetch('/api/live-support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticketId: selectedTicket.ticketId,
          userId: authState.user.id,
          action: 'rate',
          rating,
        }),
      });

      if (response.ok) {
        setRatingValue(rating);
        await fetchTicketDetail(selectedTicket.ticketId);
        await fetchTickets(true);
      }
    } catch (err) {
      console.error('Error rating ticket:', err);
    }
  };

  // Close ticket
  const handleCloseTicket = async () => {
    if (!selectedTicket || !authState.user?.id) return;

    try {
      const response = await fetch('/api/live-support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticketId: selectedTicket.ticketId,
          userId: authState.user.id,
          action: 'close',
        }),
      });

      if (response.ok) {
        await fetchTickets(true);
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error('Error closing ticket:', err);
    }
  };

  // Filter tickets by search
  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(query) ||
      ticket.ticketNumber.toString().includes(query) ||
      ticket.category.toLowerCase().includes(query)
    );
  });

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="bg-[#13131a] rounded-2xl p-8 border border-white/10 text-center max-w-md">
          <TicketIcon className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight"><span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Support Tickets</span></h1>
          <p className="text-gray-400 mb-6">Please log in to view your support tickets.</p>
          <Link href="/auth/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Animated Background - Agents Page Theme */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/15 blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[120px]" />
          <div className="absolute top-2/3 left-1/2 w-[400px] h-[400px] rounded-full bg-pink-500/10 blur-[100px]" />
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 bg-cyan-400/40 rounded-full" style={{ left: `${5 + i * 6}%`, top: `${10 + (i % 5) * 18}%` }} />
          ))}
        </div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support Tickets</h1>
            <p className="text-gray-400">View and manage your support requests</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTickets(true)}
              disabled={isRefreshing}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/support/live-support"
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              New Support Chat
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total', value: counts.total, color: 'bg-[#13131a]700' },
            { label: 'Open', value: counts.open, color: 'bg-blue-500/20' },
            { label: 'In Progress', value: counts['in-progress'], color: 'bg-yellow-500/20' },
            { label: 'Waiting', value: counts['waiting-customer'], color: 'bg-orange-500/20' },
            { label: 'Resolved', value: counts.resolved, color: 'bg-green-500/20' },
            { label: 'Closed', value: counts.closed, color: 'bg-[#13131a]600/50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-4 border border-neural-700`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#13131a]800 border border-neural-700 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-neural-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#13131a]800 border border-neural-700 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 text-white"
            >
              <option value="all">All Tickets</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="waiting-customer">Waiting on You</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 space-y-3">
            {isLoading ? (
              <div className="bg-[#13131a]800 rounded-xl p-8 text-center border border-neural-700">
                <ArrowPathIcon className="w-8 h-8 mx-auto animate-spin text-brand-400 mb-4" />
                <p className="text-gray-400">Loading tickets...</p>
              </div>
            ) : error ? (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
                <ExclamationCircleIcon className="w-8 h-8 mx-auto text-red-400 mb-3" />
                <p className="text-red-400">{error}</p>
                <button onClick={() => fetchTickets()} className="mt-4 btn-secondary">
                  Try Again
                </button>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="bg-[#13131a]800 rounded-xl p-8 text-center border border-neural-700">
                <TicketIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tickets Found</h3>
                <p className="text-gray-400 mb-6">
                  {filter !== 'all'
                    ? `No ${statusLabels[filter]?.toLowerCase() || filter} tickets.`
                    : "You haven't created any support tickets yet."}
                </p>
                <Link href="/support/live-support" className="btn-primary">
                  Start Support Chat
                </Link>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket.ticketId}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left bg-[#13131a]800 rounded-xl p-4 border transition-all hover:border-purple-500/50 ${
                    selectedTicket?.ticketId === ticket.ticketId
                      ? 'border-purple-500'
                      : 'border-neural-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-gray-500">
                      #{ticket.ticketNumber}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[ticket.status]}`}
                    >
                      {statusLabels[ticket.status]}
                    </span>
                  </div>
                  <h3 className="font-medium text-white mb-2 line-clamp-2">
                    {ticket.subject}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{categoryLabels[ticket.category] || ticket.category}</span>
                    <span>{formatDate(ticket.createdAt)}</span>
                  </div>
                  {ticket.sla?.breached && (
                    <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-4 h-4" />
                      SLA Breached
                    </div>
                  )}
                  {ticket.assignedName && (
                    <div className="mt-2 text-xs text-primary-400 flex items-center gap-1">
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      {ticket.assignedName}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-2">
            {selectedTicket && ticketDetail ? (
              <div className="bg-[#13131a]800 rounded-xl border border-neural-700 overflow-hidden">
                {/* Ticket Header */}
                <div className="p-6 border-b border-neural-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-sm font-mono text-gray-500">
                        Ticket #{ticketDetail.ticketNumber}
                      </span>
                      <h2 className="text-xl font-bold mt-1">{ticketDetail.subject}</h2>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full border text-sm ${statusColors[ticketDetail.status]}`}
                    >
                      {statusLabels[ticketDetail.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span>{categoryLabels[ticketDetail.category]}</span>
                    <span className={priorityColors[ticketDetail.priority]}>
                      {ticketDetail.priority.charAt(0).toUpperCase() + ticketDetail.priority.slice(1)} Priority
                    </span>
                    <span>Created {formatDate(ticketDetail.createdAt)}</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-6 max-h-96 overflow-y-auto space-y-4">
                  {ticketDetail.messages?.map((msg: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl ${
                        msg.sender === 'customer'
                          ? 'bg-purple-600/20 border border-purple-500/30 ml-8'
                          : msg.sender === 'support'
                          ? 'bg-green-600/20 border border-green-500/30 mr-8'
                          : msg.sender === 'ai'
                          ? 'bg-purple-600/20 border border-purple-500/30 mr-8'
                          : 'bg-[#13131a]700 border border-neural-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {msg.sender === 'customer'
                            ? 'You'
                            : msg.sender === 'support'
                            ? 'Support Team'
                            : msg.sender === 'ai'
                            ? '🤖 AI Assistant'
                            : 'System'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-200 whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-neural-700 space-y-4">
                  {/* Reply Form */}
                  {ticketDetail.status !== 'closed' && (
                    <div className="space-y-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        rows={3}
                        className="w-full p-3 bg-[#13131a]900 border border-neural-700 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-neural-500 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleCloseTicket}
                          className="btn-secondary text-sm"
                        >
                          Close Ticket
                        </button>
                        <button
                          onClick={handleSubmitReply}
                          disabled={!replyText.trim() || isSubmitting}
                          className="btn-primary flex items-center gap-2"
                        >
                          {isSubmitting ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          )}
                          Send Reply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rating (for resolved tickets) */}
                  {ticketDetail.status === 'resolved' && !ticketDetail.satisfaction?.rating && (
                    <div className="bg-[#13131a]700/50 rounded-xl p-4">
                      <p className="text-sm text-gray-300 mb-3">
                        How was your support experience?
                      </p>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRateTicket(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            {ratingValue >= star ? (
                              <StarIconSolid className="w-8 h-8 text-yellow-400" />
                            ) : (
                              <StarIcon className="w-8 h-8 text-gray-500 hover:text-yellow-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show existing rating */}
                  {ticketDetail.satisfaction?.rating && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                      <p className="text-sm text-green-400 mb-2">You rated this ticket:</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIconSolid
                            key={star}
                            className={`w-6 h-6 ${
                              star <= ticketDetail.satisfaction.rating
                                ? 'text-yellow-400'
                                : 'text-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#13131a]800 rounded-xl border border-neural-700 p-12 text-center">
                <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Ticket</h3>
                <p className="text-gray-400">
                  Click on a ticket from the list to view details and respond.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
