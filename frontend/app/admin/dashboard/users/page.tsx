'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldX,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clock,
  Crown,
  Ban,
  CheckCircle,
  UserCog,
  Activity,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  isActive: boolean;
  profileImage: string | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_BADGES: Record<
  string,
  { bg: string; text: string; icon: React.ElementType }
> = {
  admin: { bg: 'bg-red-500/10', text: 'text-red-400', icon: Crown },
  moderator: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    icon: ShieldCheck,
  },
  user: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Shield },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (search) params.set('search', search);
        if (roleFilter) params.set('role', roleFilter);
        const res = await fetch(`${API_BASE}/users?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) {
          setUsers(json.data.users);
          setPagination(json.data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter]
  );

  const fetchUserDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setUserDetail(json.data);
    } catch (err) {
      console.error('Failed to fetch user detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role } : u))
        );
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isActive: !currentStatus } : u
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage users, roles, and account status
          </p>
        </div>
        <button
          onClick={() => fetchUsers()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-400 hover:text-white border border-white/[0.06] transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-white mt-1">
            {pagination.total.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-4">
          <p className="text-xs text-gray-500">Admins</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-4">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-4">
          <p className="text-xs text-gray-500">Subscribers</p>
          <p className="text-2xl font-bold text-violet-400 mt-1">
            {users.filter((u) => u.subscriptionStatus === 'active').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            placeholder="Search by email, name, or ID..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/[0.06] rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white/5 border border-white/[0.06] rounded-lg text-sm text-gray-300 px-3 py-2 outline-none"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">
                  Subscription
                </th>
                <th className="text-left px-4 py-3 font-medium">Logins</th>
                <th className="text-left px-4 py-3 font-medium">Last Login</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleBadge = ROLE_BADGES[u.role] || ROLE_BADGES.user;
                  const RoleIcon = roleBadge.icon;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.profileImage ? (
                            <img
                              src={u.profileImage}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                              {(u.name || u.email)?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <span className="text-white font-medium truncate max-w-[120px]">
                            {u.name || 'No name'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadge.bg} ${roleBadge.text}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 capitalize">
                        {u.subscriptionTier || 'Free'}
                        {u.subscriptionStatus === 'active' && (
                          <CheckCircle className="w-3 h-3 text-green-400 inline ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-center">
                        {u.loginCount}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px]">
                            Banned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUser(u.id);
                              fetchUserDetail(u.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                          <select
                            value={u.role}
                            onChange={(e) => updateRole(u.id, e.target.value)}
                            className="bg-transparent text-gray-500 text-[10px] outline-none cursor-pointer hover:text-white"
                            title="Change Role"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Mod</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => toggleUserStatus(u.id, u.isActive)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.isActive
                                ? 'hover:bg-red-500/10 text-gray-500 hover:text-red-400'
                                : 'hover:bg-green-500/10 text-gray-500 hover:text-green-400'
                            }`}
                            title={u.isActive ? 'Ban User' : 'Unban User'}
                          >
                            {u.isActive ? (
                              <Ban className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchUsers(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 border border-white/[0.06]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchUsers(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 border border-white/[0.06]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && userDetail && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-[#111113] border border-white/[0.08] rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">
                {userDetail.user?.name ||
                  userDetail.user?.email ||
                  'User Detail'}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* User Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      ['Email', userDetail.user?.email],
                      ['Name', userDetail.user?.name || 'N/A'],
                      ['Role', userDetail.user?.role],
                      [
                        'Subscription',
                        `${userDetail.user?.subscriptionTier || 'Free'} (${userDetail.user?.subscriptionStatus || 'none'})`,
                      ],
                      ['Logins', String(userDetail.user?.loginCount)],
                      [
                        'Last Login',
                        userDetail.user?.lastLoginAt
                          ? new Date(
                              userDetail.user.lastLoginAt
                            ).toLocaleString()
                          : 'Never',
                      ],
                      [
                        'Joined',
                        new Date(userDetail.user?.createdAt).toLocaleString(),
                      ],
                      [
                        'Status',
                        userDetail.user?.isActive ? 'Active' : 'Banned',
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="bg-white/[0.02] rounded-lg p-3"
                      >
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          {label}
                        </p>
                        <p className="text-xs text-white font-mono truncate">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Activity Summary */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-400">
                        {userDetail.sessions?.length || 0}
                      </p>
                      <p className="text-[10px] text-gray-500">Sessions</p>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-purple-400">
                        {userDetail.events?.length || 0}
                      </p>
                      <p className="text-[10px] text-gray-500">Events</p>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-pink-400">
                        {userDetail.chats?.length || 0}
                      </p>
                      <p className="text-[10px] text-gray-500">Chats</p>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-emerald-400">
                        {userDetail.transactions?.length || 0}
                      </p>
                      <p className="text-[10px] text-gray-500">Transactions</p>
                    </div>
                  </div>

                  {/* Recent Events */}
                  {userDetail.events?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Recent Events
                      </h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {userDetail.events
                          .slice(0, 15)
                          .map((ev: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-3 py-1.5 text-xs bg-white/[0.02] rounded"
                            >
                              <span className="text-gray-600">
                                {new Date(ev.occurredAt).toLocaleString()}
                              </span>
                              <span className="text-violet-400 font-medium">
                                {ev.eventType}
                              </span>
                              <span className="text-gray-400 truncate flex-1">
                                {ev.action || ev.label || ''}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Transactions */}
                  {userDetail.transactions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Transactions
                      </h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {userDetail.transactions
                          .slice(0, 10)
                          .map((tx: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-3 py-1.5 text-xs bg-white/[0.02] rounded"
                            >
                              <span className="text-gray-600">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </span>
                              <span
                                className={`font-medium ${tx.status === 'completed' ? 'text-green-400' : tx.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}
                              >
                                ${(tx.amount / 100).toFixed(2)}
                              </span>
                              <span className="text-gray-400 capitalize">
                                {tx.type}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  tx.status === 'completed'
                                    ? 'bg-green-500/10 text-green-400'
                                    : tx.status === 'failed'
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-yellow-500/10 text-yellow-400'
                                }`}
                              >
                                {tx.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
