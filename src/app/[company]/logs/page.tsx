'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { baseUrl } from '@/app/utils/config';
import {
  Activity,
  AlertTriangle,
  XCircle,
  Shield,
  Zap,
  Users as UsersIcon,
  ChevronDown,
  RefreshCw,
  Filter
} from 'lucide-react';
import { ISOToDatetimeLocal, datetimeLocalToISO } from '@/app/utils/timezone';

interface LogEntry {
  id: number;
  userId: number | null;
  companyId: number | null;
  eventType: string;
  eventName: string;
  message: string;
  metadata: Record<string, unknown> | null;
  level: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  user: {
    id: number;
    name: string;
    email: string;
    username: string;
  } | null;
}

interface LogStats {
  total: number;
  byEventType: {
    socket: number;
    tracking: number;
    error: number;
    permission: number;
    crash: number;
  };
  byLevel: {
    info: number;
    warn: number;
    error: number;
  };
}

interface EventTypeOption {
  value: string;
  label: string;
  color: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
}

type DatePreset = 'today' | 'yesterday' | '7days' | 'custom';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');

  // Dropdowns
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const eventTypeDropdownRef = useRef<HTMLDivElement>(null);
  const levelDropdownRef = useRef<HTMLDivElement>(null);

  // Date range
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);

  const [startDateTime, setStartDateTime] = useState<string>(ISOToDatetimeLocal(todayStart.toISOString()));
  const [endDateTime, setEndDateTime] = useState<string>(ISOToDatetimeLocal(todayEnd.toISOString()));

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const router = useRouter();

  const levelOptions = [
    { value: 'info', label: 'Info', color: 'slate' },
    { value: 'warn', label: 'Warning', color: 'yellow' },
    { value: 'error', label: 'Error', color: 'red' }
  ];

  // Date preset helper
  const getDateRangeForPreset = (preset: DatePreset): { start: string; end: string } => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0);
        end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59);
        break;
      case '7days':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        start = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
        break;
      case 'custom':
      default:
        return { start: startDateTime, end: endDateTime };
    }

    return {
      start: ISOToDatetimeLocal(start.toISOString()),
      end: ISOToDatetimeLocal(end.toISOString())
    };
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getDateRangeForPreset(preset);
      setStartDateTime(start);
      setEndDateTime(end);
    }
  };

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    if (!token) return router.push('/');

    // Only admin and manager can access logs
    if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'superadmin') {
      router.push('/dashboard');
      return;
    }
    setRole(userRole);
  }, [router]);

  // Fetch initial data
  useEffect(() => {
    if (role) {
      fetchEventTypes();
      fetchUsers();
      fetchStats();
      fetchLogs(1);
    }
  }, [role]);

  // Auto-fetch when filters change
  useEffect(() => {
    if (role && startDateTime && endDateTime) {
      fetchLogs(1);
      fetchStats();
    }
  }, [selectedUserId, selectedEventType, selectedLevel, startDateTime, endDateTime]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (eventTypeDropdownRef.current && !eventTypeDropdownRef.current.contains(event.target as Node)) {
        setShowEventTypeDropdown(false);
      }
      if (levelDropdownRef.current && !levelDropdownRef.current.contains(event.target as Node)) {
        setShowLevelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEventTypes = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await axios.get(`${baseUrl}/api/logs/event-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEventTypes(data.eventTypes || []);
    } catch (error) {
      console.error('Error fetching event types:', error);
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await axios.get(`${baseUrl}/api/logs/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await axios.get(`${baseUrl}/api/logs/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLogs = async (page: number = 1) => {
    const token = localStorage.getItem('token');
    if (!token || !startDateTime || !endDateTime) return;

    setLoading(true);

    const startISO = datetimeLocalToISO(startDateTime);
    const endISO = datetimeLocalToISO(endDateTime);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        startDate: startISO,
        endDate: endISO
      });

      if (selectedUserId) params.append('userId', selectedUserId.toString());
      if (selectedEventType) params.append('eventType', selectedEventType);
      if (selectedLevel) params.append('level', selectedLevel);

      const { data } = await axios.get(`${baseUrl}/api/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLogs(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchLogs(newPage);
  };

  const filteredUserList = users.filter((user) =>
    user.name.toLowerCase().includes(searchUser.toLowerCase())
  );

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'socket': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'tracking': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
      case 'error': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
      case 'permission': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
      case 'crash': return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return { bg: 'bg-slate-100', text: 'text-slate-700' };
      case 'warn': return { bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'error': return { bg: 'bg-red-100', text: 'text-red-700' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'socket': return <Zap className="w-4 h-4" />;
      case 'tracking': return <Activity className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'permission': return <Shield className="w-4 h-4" />;
      case 'crash': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ marginLeft: '16rem' }}>
        {/* Hero Banner Section */}
        <div className="mb-8 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Activity Logs</h1>
                <p className="text-sm text-slate-600">Monitor user activities, errors, and system events</p>
              </div>
            </div>
            <button
              onClick={() => { fetchLogs(1); fetchStats(); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-gray-700 hover:border-[#667eea] hover:text-[#667eea] transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600 uppercase">Socket</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.byEventType.socket}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-600 uppercase">Tracking</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.byEventType.tracking}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-medium text-red-600 uppercase">Errors</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{stats.byEventType.error}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-600 uppercase">Permission</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{stats.byEventType.permission}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600 uppercase">Crashes</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{stats.byEventType.crash}</p>
              </div>
            </div>
          )}

          {/* Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* User Dropdown */}
            <div className="relative w-full lg:w-56" ref={userDropdownRef}>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">User</label>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="group relative flex items-center justify-between px-3 py-2 h-[42px] w-full bg-white text-gray-900 rounded-xl text-sm font-medium border border-slate-300 focus:outline-none transition-all duration-200"
                style={{
                  borderColor: showUserDropdown ? '#667eea' : undefined,
                  boxShadow: showUserDropdown ? '0 0 0 3px rgba(102, 126, 234, 0.1)' : undefined
                }}
              >
                <span className="truncate">{selectedUserName || 'All Users'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 flex-shrink-0 ${showUserDropdown ? 'transform rotate-180' : ''}`} />
              </button>

              {showUserDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden w-full z-50">
                  <div className="p-3 border-b border-slate-100 bg-gray-50">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-[#667eea]"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <button
                      onClick={() => { setSelectedUserId(null); setSelectedUserName(null); setShowUserDropdown(false); setSearchUser(''); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-100 hover:bg-[#667eea]/5 ${!selectedUserId ? 'bg-[#667eea]/10' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <UsersIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">All Users</span>
                    </button>
                    {filteredUserList.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => { setSelectedUserId(user.id); setSelectedUserName(user.name); setShowUserDropdown(false); setSearchUser(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-100 last:border-b-0 hover:bg-[#667eea]/5 ${selectedUserId === user.id ? 'bg-[#667eea]/10' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                          <span className="text-xs font-medium text-gray-700">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-900">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Event Type Dropdown */}
            <div className="relative w-full lg:w-48" ref={eventTypeDropdownRef}>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Event Type</label>
              <button
                onClick={() => setShowEventTypeDropdown(!showEventTypeDropdown)}
                className="group relative flex items-center justify-between px-3 py-2 h-[42px] w-full bg-white text-gray-900 rounded-xl text-sm font-medium border border-slate-300 focus:outline-none transition-all duration-200"
                style={{
                  borderColor: showEventTypeDropdown ? '#667eea' : undefined,
                  boxShadow: showEventTypeDropdown ? '0 0 0 3px rgba(102, 126, 234, 0.1)' : undefined
                }}
              >
                <span className="truncate capitalize">{selectedEventType || 'All Types'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 flex-shrink-0 ${showEventTypeDropdown ? 'transform rotate-180' : ''}`} />
              </button>

              {showEventTypeDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden w-full z-50">
                  <button
                    onClick={() => { setSelectedEventType(null); setShowEventTypeDropdown(false); }}
                    className={`w-full px-3 py-2.5 text-left text-sm font-medium border-b border-slate-100 hover:bg-[#667eea]/5 ${!selectedEventType ? 'bg-[#667eea]/10' : ''}`}
                  >
                    All Types
                  </button>
                  {eventTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => { setSelectedEventType(type.value); setShowEventTypeDropdown(false); }}
                      className={`w-full px-3 py-2.5 text-left text-sm font-medium border-b border-slate-100 last:border-b-0 hover:bg-[#667eea]/5 ${selectedEventType === type.value ? 'bg-[#667eea]/10' : ''}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Level Dropdown */}
            <div className="relative w-full lg:w-40" ref={levelDropdownRef}>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Level</label>
              <button
                onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                className="group relative flex items-center justify-between px-3 py-2 h-[42px] w-full bg-white text-gray-900 rounded-xl text-sm font-medium border border-slate-300 focus:outline-none transition-all duration-200"
                style={{
                  borderColor: showLevelDropdown ? '#667eea' : undefined,
                  boxShadow: showLevelDropdown ? '0 0 0 3px rgba(102, 126, 234, 0.1)' : undefined
                }}
              >
                <span className="truncate capitalize">{selectedLevel || 'All Levels'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 flex-shrink-0 ${showLevelDropdown ? 'transform rotate-180' : ''}`} />
              </button>

              {showLevelDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden w-full z-50">
                  <button
                    onClick={() => { setSelectedLevel(null); setShowLevelDropdown(false); }}
                    className={`w-full px-3 py-2.5 text-left text-sm font-medium border-b border-slate-100 hover:bg-[#667eea]/5 ${!selectedLevel ? 'bg-[#667eea]/10' : ''}`}
                  >
                    All Levels
                  </button>
                  {levelOptions.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => { setSelectedLevel(level.value); setShowLevelDropdown(false); }}
                      className={`w-full px-3 py-2.5 text-left text-sm font-medium border-b border-slate-100 last:border-b-0 hover:bg-[#667eea]/5 ${selectedLevel === level.value ? 'bg-[#667eea]/10' : ''}`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Preset Buttons */}
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Time Period</label>
              <div className="flex flex-wrap items-center gap-2">
                {(['today', 'yesterday', '7days', 'custom'] as DatePreset[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleDatePresetChange(preset)}
                    className={`px-4 py-2 h-[42px] rounded-xl text-sm font-medium border transition-all duration-200 ${
                      datePreset === preset
                        ? 'text-white border-transparent shadow-md'
                        : 'bg-white text-gray-700 border-slate-300 hover:border-[#667eea]'
                    }`}
                    style={{
                      background: datePreset === preset ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined
                    }}
                  >
                    {preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday' : preset === '7days' ? 'Last 7 Days' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          {datePreset === 'custom' && (
            <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl mt-5" style={{ backgroundColor: 'rgba(102, 126, 234, 0.05)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <label className="text-xs font-medium text-slate-700">Start Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 h-[42px] border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#667eea] transition-all duration-200 text-sm text-gray-900"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <label className="text-xs font-medium text-slate-700">End Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 h-[42px] border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#667eea] transition-all duration-200 text-sm text-gray-900"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 mb-3 animate-spin rounded-full border-2 border-[#667eea] border-t-transparent" />
              <span className="text-sm font-medium text-slate-600">Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Activity className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-sm font-medium text-slate-600">No logs found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Timestamp</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Event Type</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Event</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Message</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      const eventTypeColor = getEventTypeColor(log.eventType);
                      const levelColor = getLevelColor(log.level);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-6 py-4">
                            {log.user ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100">
                                  <span className="text-xs font-medium text-gray-700">{log.user.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{log.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">System</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${eventTypeColor.bg} ${eventTypeColor.text} border ${eventTypeColor.border}`}>
                              {getEventTypeIcon(log.eventType)}
                              {log.eventType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {log.eventName}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 max-w-md truncate" title={log.message}>
                            {log.message}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${levelColor.bg} ${levelColor.text}`}>
                              {log.level}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-slate-100 px-6 py-5 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    Showing page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
                    <span className="font-semibold text-gray-900">{pagination.totalPages}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="font-medium text-slate-700">{pagination.total}</span> total logs
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-200 ${
                        pagination.hasPrev
                          ? 'bg-white text-gray-700 border-slate-300 hover:border-[#667eea] hover:text-[#667eea]'
                          : 'bg-gray-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-200 ${
                        pagination.hasNext
                          ? 'bg-white text-gray-700 border-slate-300 hover:border-[#667eea] hover:text-[#667eea]'
                          : 'bg-gray-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
