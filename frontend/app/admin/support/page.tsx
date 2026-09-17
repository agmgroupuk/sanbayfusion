'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  TicketIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChevronDownIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

interface SupportTicket {
  _id: string;
  ticketId: string;
  ticketNumber: number;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'waiting-customer' | 'waiting-internal' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedName?: string;
  messages: Array<{
    sender: string;
    senderName: string;
    message: string;
    createdAt: string;
    isInternal?: boolean;
  }>;
  sla?: {
    firstResponseDue?: string;
    firstResponseAt?: string;
    resolutionDue?: string;
    breached?: boolean;
  };
  satisfaction?: {
    rating?: number;
    feedback?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waitingCustomer: number;
  resolved: number;
  closed: number;
  breachedSla: number;
  urgent: number;
}

const statusColors: Record<string, string> = {
  'open': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'in-progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'waiting-customer': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'waiting-internal': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'resolved': 'bg-green-500/20 text-green-400 border-green-500/30',
  'closed': 'bg-neural-500/20 text-neural-400 border-neural-500/30',
};

const priorityColors: Record<string, string> = {
  'low': 'bg-neural-500/20 text-neural-400',
  'medium': 'bg-blue-500/20 text-blue-400',
  'high': 'bg-orange-500/20 text-orange-400',
  'urgent': 'bg-red-500/20 text-red-400',
};

const categoryLabels: Record<string, string> = {
  'billing': '💳 Billing',
  'technical': '🔧 Technical',
  'account': '👤 Account',
  'agents': '🤖 Agents',
  'subscription': '📋 Subscription',
  'feature-request': '💡 Feature',
  'bug-report': '🐛 Bug',
  'general': '📝 General',
  'other': '📌 Other',
};

interface SupportAgent {
  id: string;
  name: string;
  email: string;
}

export default function AdminSupportPage() {
  const { state: authState } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0, open: 0, inProgress: 0, waitingCustomer: 0, resolved: 0, closed: 0, breachedSla: 0, urgent: 0
  });
  const [supportAgents, setSupportAgents] = useState<SupportAgent[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSlaBreached, setShowSlaBreached] = useState(false);
  
  // Reply form
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [assignTo, setAssignTo] = useState<string>('');

  // Fetch all tickets
  const fetchTickets = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (showSlaBreached) params.set('slaBreached', 'true');

      const response = await fetch(`/api/admin/support-tickets?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      
      if (data.success) {
        setTickets(data.tickets || []);
        setStats(data.stats || stats);
      }
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, searchQuery, showSlaBreached, stats]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Fetch support agents (admin/moderator users) from backend
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/admin/dashboard/users?role=admin&limit=50', { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.data?.users) {
          const admins = data.data.users.map((u: any) => ({
            id: u.id,
            name: u.name || u.email,
            email: u.email,
          }));
          // Also fetch moderators
          const res2 = await fetch('/api/admin/dashboard/users?role=moderator&limit=50', { credentials: 'include' });
          const data2 = await res2.json();
          if (data2.success && data2.data?.users) {
            const mods = data2.data.users.map((u: any) => ({
              id: u.id,
              name: u.name || u.email,
              email: u.email,
            }));
            setSupportAgents([...admins, ...mods]);
          } else {
            setSupportAgents(admins);
          }
        }
      } catch (err) {
        console.error('Failed to fetch support agents:', err);
      }
    }
    fetchAgents();
  }, []);

  // Select ticket
  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setAssignTo(ticket.assignedTo || '');
    setReplyText('');
    setIsInternal(false);
  };

  // Submit reply
  const handleSubmitReply = async () => {
    if (!selectedTicket || (!replyText.trim() && !newStatus && !assignTo)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticketId: selectedTicket.ticketId,
          message: replyText.trim() || null,
          isInternal,
          newStatus: newStatus !== selectedTicket.status ? newStatus : null,
          assignTo: assignTo !== selectedTicket.assignedTo ? assignTo : null,
          agentName: authState.user?.name || 'Support Agent',
        }),
      });

      if (!response.ok) throw new Error('Failed to update ticket');

      const data = await response.json();
      if (data.success) {
        // Update ticket in list
        setTickets(prev => prev.map(t => 
          t.ticketId === selectedTicket.ticketId ? { ...t, ...data.ticket } : t
        ));
        setSelectedTicket(prev => prev ? { ...prev, ...data.ticket } : null);
        setReplyText('');
        setIsInternal(false);
        fetchTickets(true);
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
      alert('Failed to update ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Check SLA status
  const getSlaStatus = (ticket: SupportTicket) => {
    if (!ticket.sla) return null;
    const now = new Date();
    
    if (ticket.sla.breached) return 'breached';
    
    if (ticket.sla.resolutionDue) {
      const due = new Date(ticket.sla.resolutionDue);
      if (due < now) return 'breached';
      const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursLeft < 4) return 'warning';
    }
    
    return 'ok';
  };

  return (
    <div className="min-h-screen bg-void-950 text-white">
      {/* Header */}
      <div className="border-b border-neural-700 bg-void-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500">
                <TicketIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight"><span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Support Admin</span></h1>
                <p className="text-neural-400 text-sm">Manage customer support tickets</p>
              </div>
            </div>
            
            <button
              onClick={() => fetchTickets(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neural-800 hover:bg-neural-700 transition-colors"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-neural-700 bg-void-900/30">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-neural-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.open}</div>
              <div className="text-xs text-neural-400">Open</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.inProgress}</div>
              <div className="text-xs text-neural-400">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{stats.waitingCustomer}</div>
              <div className="text-xs text-neural-400">Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.resolved}</div>
              <div className="text-xs text-neural-400">Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neural-400">{stats.closed}</div>
              <div className="text-xs text-neural-400">Closed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.urgent}</div>
              <div className="text-xs text-neural-400">Urgent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.breachedSla}</div>
              <div className="text-xs text-neural-400">SLA Breached</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-neural-700 bg-void-900/20">
        <div className="max-w-screen-2xl mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neural-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-neural-800 border border-neural-700 focus:border-primary-500 outline-none text-sm"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-neural-800 border border-neural-700 text-sm"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="waiting-customer">Waiting Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-neural-800 border border-neural-700 text-sm"
            >
              <option value="all">All Priority</option>
              <option value="urgent">🔥 Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-neural-800 border border-neural-700 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="account">Account</option>
              <option value="agents">Agents</option>
              <option value="subscription">Subscription</option>
              <option value="bug-report">Bug Report</option>
              <option value="feature-request">Feature Request</option>
            </select>

            {/* SLA Breached Toggle */}
            <button
              onClick={() => setShowSlaBreached(!showSlaBreached)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                showSlaBreached 
                  ? 'bg-red-500/20 border-red-500 text-red-400' 
                  : 'bg-neural-800 border-neural-700 text-neural-400'
              }`}
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              SLA Breached
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {error ? (
          <div className="text-center py-12">
            <ExclamationCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <ArrowPathIcon className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-neural-400">Loading tickets...</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Ticket List */}
            <div className="flex-1 space-y-3">
              {tickets.length === 0 ? (
                <div className="text-center py-12 bg-neural-800/50 rounded-xl border border-neural-700">
                  <TicketIcon className="w-12 h-12 text-neural-500 mx-auto mb-4" />
                  <p className="text-neural-400">No tickets found</p>
                </div>
              ) : (
                tickets.map((ticket) => {
                  const slaStatus = getSlaStatus(ticket);
                  const isSelected = selectedTicket?.ticketId === ticket.ticketId;
                  
                  return (
                    <div
                      key={ticket.ticketId}
                      onClick={() => handleSelectTicket(ticket)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary-500/10 border-primary-500'
                          : 'bg-neural-800/50 border-neural-700 hover:border-neural-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-neural-400 text-sm">#{ticket.ticketNumber}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${statusColors[ticket.status]}`}>
                              {ticket.status.replace('-', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[ticket.priority]}`}>
                              {ticket.priority === 'urgent' && <FireIcon className="w-3 h-3 inline mr-1" />}
                              {ticket.priority}
                            </span>
                            {slaStatus === 'breached' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                                SLA BREACHED
                              </span>
                            )}
                            {slaStatus === 'warning' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                                SLA Warning
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium truncate">{ticket.subject}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-neural-400">
                            <span>{ticket.userName || ticket.userEmail}</span>
                            <span>•</span>
                            <span>{categoryLabels[ticket.category] || ticket.category}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(ticket.createdAt)}</span>
                          </div>
                        </div>
                        {ticket.assignedName && (
                          <div className="text-xs text-neural-400 flex items-center gap-1">
                            <UserCircleIcon className="w-4 h-4" />
                            {ticket.assignedName}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ticket Detail Panel */}
            {selectedTicket && (
              <div className="w-[500px] bg-neural-800/50 rounded-xl border border-neural-700 flex flex-col max-h-[calc(100vh-300px)] sticky top-40">
                {/* Header */}
                <div className="p-4 border-b border-neural-700 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-neural-400">#{selectedTicket.ticketNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[selectedTicket.status]}`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                    <h3 className="font-medium mt-1">{selectedTicket.subject}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 rounded-lg hover:bg-neural-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Customer Info */}
                <div className="p-4 border-b border-neural-700 bg-neural-900/30">
                  <div className="flex items-center gap-3">
                    <UserCircleIcon className="w-10 h-10 text-neural-400" />
                    <div>
                      <div className="font-medium">{selectedTicket.userName || 'Customer'}</div>
                      <div className="text-sm text-neural-400">{selectedTicket.userEmail}</div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedTicket.messages?.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.sender === 'customer'
                          ? 'bg-neural-700/50'
                          : msg.sender === 'support'
                          ? 'bg-primary-500/10 border border-primary-500/30'
                          : msg.sender === 'ai'
                          ? 'bg-purple-500/10 border border-purple-500/30'
                          : 'bg-neural-800/50 border border-neural-600'
                      } ${msg.isInternal ? 'border-l-4 border-l-yellow-500' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {msg.senderName || msg.sender}
                          {msg.isInternal && <span className="text-yellow-400 ml-2">(Internal)</span>}
                        </span>
                        <span className="text-xs text-neural-400">
                          {formatTimeAgo(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div className="p-4 border-t border-neural-700 space-y-3">
                  {/* Status & Assignment */}
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-neural-700 border border-neural-600 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="waiting-customer">Waiting Customer</option>
                      <option value="waiting-internal">Waiting Internal</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-neural-700 border border-neural-600 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {supportAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reply Text */}
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-neural-700 border border-neural-600 resize-none text-sm"
                  />

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-neural-400">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      Internal note
                    </label>
                    <button
                      onClick={handleSubmitReply}
                      disabled={isSubmitting || (!replyText.trim() && newStatus === selectedTicket.status && assignTo === selectedTicket.assignedTo)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      {isSubmitting ? 'Sending...' : 'Update Ticket'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
