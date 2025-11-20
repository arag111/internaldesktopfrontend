'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import ScreenshotGallery from '@/app/components/ScreenshotGallery';
import { baseUrl } from '@/app/utils/config';
import { Calendar, Users as UsersIcon, BarChart3, RefreshCw, ChevronDown } from 'lucide-react';
import { datetimeLocalToISO, ISOToDatetimeLocal } from '@/app/utils/timezone';

interface Screenshot {
  _id: string;
  url: string;
  timestamp: string;
  textExtracted?: boolean;
  embeddingDone?: boolean;
}

interface UserScreenshots {
  [userName: string]: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    screenshots: Screenshot[];
  };
}

type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

export default function MonitoringPage() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // ✅ NEW: Date preset state
  const [datePreset, setDatePreset] = useState<DatePreset>('today');

  // ✅ NEW: Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(false);

  // Set default to today
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);

  // ✅ FIX: Properly format for datetime-local input (keeps local time)
  const [startDateTime, setStartDateTime] = useState<string>(
    ISOToDatetimeLocal(todayStart.toISOString())
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    ISOToDatetimeLocal(todayEnd.toISOString())
  );

  const router = useRouter();

  // ✅ NEW: Helper function to calculate date range based on preset
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
      case '30days':
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        start = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
        break;
      case 'custom':
      default:
        // Use existing state values for custom
        return { start: startDateTime, end: endDateTime };
    }

    return {
      start: ISOToDatetimeLocal(start.toISOString()),
      end: ISOToDatetimeLocal(end.toISOString())
    };
  };

  // ✅ NEW: Handle date preset selection
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getDateRangeForPreset(preset);
      setStartDateTime(start);
      setEndDateTime(end);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    if (!token) return router.push('/');
    setRole(userRole);
  }, []);

  useEffect(() => {
    if (role) {
      if (role === 'admin' || role === 'manager') {
        fetchUsers(); // Fetch user list for dropdown
      }
      // Auto-fetch screenshots on initial load
      fetchScreenshots(1);
    }
  }, [role]);

  // ✅ NEW: Auto-fetch when user selection or date range changes
  useEffect(() => {
    if (role && startDateTime && endDateTime) {
      fetchScreenshots(1);
    }
  }, [selectedUserId, startDateTime, endDateTime]);

  // ✅ NEW: Fetch users for dropdown
  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { data } = await axios.get(
        `${baseUrl}/api/users/company-users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ✅ NEW: Fetch with pagination
  const fetchScreenshots = async (page: number = 1) => {
    const token = localStorage.getItem('token');
    if (!token || !startDateTime || !endDateTime) return;

    setLoading(true);

    // Convert datetime-local to ISO (UTC)
    const startISO = datetimeLocalToISO(startDateTime);
    const endISO = datetimeLocalToISO(endDateTime);

    try {
      if (role === 'admin' || role === 'manager') {
        // ✅ Use new paginated endpoint
        const userIdParam = selectedUserId ? `&userId=${selectedUserId}` : '';
        const { data } = await axios.get(
          `${baseUrl}/api/screenshots/all-in-range-paginated?startDate=${startISO}&endDate=${endISO}&page=${page}&limit=50${userIdParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update screenshots and pagination
        setScreenshots(data.data || []);
        setPagination(data.pagination);
      } else {
        const { data } = await axios.get(
          `${baseUrl}/api/screenshots/range?startDate=${startISO}&endDate=${endISO}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setScreenshots(data.screenshots || []);
      }
    } catch (error) {
      console.error('Error fetching screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Handle page changes
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchScreenshots(newPage);
  };

  const filteredUserList = users.filter((user) =>
    user.name.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ marginLeft: '16rem' }}>
            {/* Hero Banner Section */}
            <div className="mb-8 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 mb-1">
                      Monitoring
                    </h1>
                    <p className="text-sm text-slate-600">
                      Track and monitor user activity screenshots
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* User Dropdown */}
                {(role === 'admin' || role === 'manager') && (
                  <div className="relative w-full lg:w-80" ref={userDropdownRef}>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Select User</label>
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="group relative flex items-center justify-between px-3 py-2 h-[42px] w-full bg-white text-gray-900 rounded-xl text-sm font-medium border border-slate-300 focus:outline-none focus:ring-2 transition-all duration-200"
                      style={{
                        borderColor: showUserDropdown ? '#667eea' : undefined,
                        boxShadow: showUserDropdown ? '0 0 0 3px rgba(102, 126, 234, 0.1)' : undefined
                      }}
                      onMouseEnter={(e) => {
                        if (!showUserDropdown) e.currentTarget.style.borderColor = '#667eea';
                      }}
                      onMouseLeave={(e) => {
                        if (!showUserDropdown) e.currentTarget.style.borderColor = '';
                      }}
                    >
                      <span className="truncate">{selectedUserName || 'All Users'}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 flex-shrink-0 ${showUserDropdown ? 'transform rotate-180' : ''}`} />
                    </button>

                    {/* User Selector Dropdown */}
                    {showUserDropdown && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden w-full sm:w-80 z-50">
                        {/* Search Input */}
                        <div className="p-3 border-b border-slate-100 bg-gray-50">
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={searchUser}
                            onChange={(e) => setSearchUser(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-gray-900 placeholder:text-slate-400 focus:outline-none transition-all duration-200"
                            style={{
                              boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
                              borderColor: '#667eea'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#667eea';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '';
                              e.currentTarget.style.boxShadow = '';
                            }}
                            autoFocus
                          />
                        </div>

                        {/* "All" Category Bar */}
                        <div className="bg-gray-50 border-b border-slate-100 px-3 py-1.5">
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Users</span>
                        </div>

                        {/* User List */}
                        <div className="max-h-[400px] overflow-y-auto bg-white">
                          {/* "All Users" Option */}
                          <button
                            onClick={() => {
                              setSelectedUserId(null);
                              setSelectedUserName(null);
                              setShowUserDropdown(false);
                              setSearchUser('');
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-100 transition-colors duration-150 ${
                              !selectedUserId ? 'bg-white' : 'bg-white'
                            }`}
                            style={{
                              backgroundColor: !selectedUserId ? 'rgba(102, 126, 234, 0.08)' : undefined
                            }}
                            onMouseEnter={(e) => {
                              if (selectedUserId !== null) {
                                e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedUserId !== null) {
                                e.currentTarget.style.backgroundColor = '';
                              }
                            }}
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                              <UsersIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-gray-900">
                                All Users
                              </p>
                            </div>
                          </button>

                          {filteredUserList.length > 0 ? (
                            <div className="bg-white">
                              {filteredUserList.map((user) => (
                                <button
                                  key={user.id}
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setSelectedUserName(user.name);
                                    setShowUserDropdown(false);
                                    setSearchUser('');
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-100 last:border-b-0 transition-colors duration-150 ${
                                    selectedUserId === user.id ? 'bg-white' : 'bg-white'
                                  }`}
                                  style={{
                                    backgroundColor: selectedUserId === user.id ? 'rgba(102, 126, 234, 0.08)' : undefined
                                  }}
                                  onMouseEnter={(e) => {
                                    if (selectedUserId !== user.id) {
                                      e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (selectedUserId !== user.id) {
                                      e.currentTarget.style.backgroundColor = '';
                                    }
                                  }}
                                >
                                  {/* Avatar Icon */}
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                                    <span className="text-xs font-medium text-gray-700">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>

                                  {/* User Name */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-gray-900">
                                      {user.name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {user.email}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center bg-white">
                              <p className="text-sm text-slate-500">No users found</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Date Preset Buttons */}
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Time Period</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleDatePresetChange('today')}
                      className={`px-5 py-2.5 h-[42px] rounded-xl text-sm font-medium border transition-all duration-200 ${
                        datePreset === 'today'
                          ? 'text-white border-transparent shadow-md'
                          : 'bg-white text-gray-700 border-slate-300'
                      }`}
                      style={{
                        background: datePreset === 'today'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : undefined
                      }}
                      onMouseEnter={(e) => {
                        if (datePreset !== 'today') {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (datePreset !== 'today') {
                          e.currentTarget.style.borderColor = '';
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => handleDatePresetChange('yesterday')}
                      className={`px-5 py-2.5 h-[42px] rounded-xl text-sm font-medium border transition-all duration-200 ${
                        datePreset === 'yesterday'
                          ? 'text-white border-transparent shadow-md'
                          : 'bg-white text-gray-700 border-slate-300'
                      }`}
                      style={{
                        background: datePreset === 'yesterday'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : undefined
                      }}
                      onMouseEnter={(e) => {
                        if (datePreset !== 'yesterday') {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (datePreset !== 'yesterday') {
                          e.currentTarget.style.borderColor = '';
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                    >
                      Yesterday
                    </button>
                    <button
                      onClick={() => handleDatePresetChange('7days')}
                      className={`px-5 py-2.5 h-[42px] rounded-xl text-sm font-medium border transition-all duration-200 ${
                        datePreset === '7days'
                          ? 'text-white border-transparent shadow-md'
                          : 'bg-white text-gray-700 border-slate-300'
                      }`}
                      style={{
                        background: datePreset === '7days'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : undefined
                      }}
                      onMouseEnter={(e) => {
                        if (datePreset !== '7days') {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (datePreset !== '7days') {
                          e.currentTarget.style.borderColor = '';
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                    >
                      Last 7 Days
                    </button>
                    <button
                      onClick={() => handleDatePresetChange('30days')}
                      className={`px-5 py-2.5 h-[42px] rounded-xl text-sm font-medium border transition-all duration-200 ${
                        datePreset === '30days'
                          ? 'text-white border-transparent shadow-md'
                          : 'bg-white text-gray-700 border-slate-300'
                      }`}
                      style={{
                        background: datePreset === '30days'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : undefined
                      }}
                      onMouseEnter={(e) => {
                        if (datePreset !== '30days') {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (datePreset !== '30days') {
                          e.currentTarget.style.borderColor = '';
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                    >
                      Last 30 Days
                    </button>
                    <button
                      onClick={() => handleDatePresetChange('custom')}
                      className={`px-5 py-2.5 h-[42px] rounded-xl text-sm font-medium border transition-all duration-200 ${
                        datePreset === 'custom'
                          ? 'text-white border-transparent shadow-md'
                          : 'bg-white text-gray-700 border-slate-300'
                      }`}
                      style={{
                        background: datePreset === 'custom'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : undefined
                      }}
                      onMouseEnter={(e) => {
                        if (datePreset !== 'custom') {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (datePreset !== 'custom') {
                          e.currentTarget.style.borderColor = '';
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                    >
                      Custom
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Date Range Inputs - Only shown when Custom is selected */}
              {datePreset === 'custom' && (
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-4 p-4 rounded-xl mt-5" style={{ backgroundColor: 'rgba(102, 126, 234, 0.05)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(102, 126, 234, 0.2)' }}>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <label className="text-xs font-medium text-slate-700">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 h-[42px] border border-slate-300 rounded-xl bg-white focus:outline-none transition-all duration-200 text-sm text-gray-900"
                      value={startDateTime}
                      onChange={(e) => setStartDateTime(e.target.value)}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <label className="text-xs font-medium text-slate-700">End Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 h-[42px] border border-slate-300 rounded-xl bg-white focus:outline-none transition-all duration-200 text-sm text-gray-900"
                      value={endDateTime}
                      onChange={(e) => setEndDateTime(e.target.value)}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              {/* Loading Indicator */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-8 h-8 mb-3 animate-spin" style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitMask: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2\'/%3E%3C/svg%3E") center/contain no-repeat',
                    mask: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2\'/%3E%3C/svg%3E") center/contain no-repeat'
                  }} />
                  <span className="text-sm font-medium text-slate-600">Loading screenshots...</span>
                  <span className="text-xs text-slate-400 mt-1">Please wait</span>
                </div>
              )}

              {/* Screenshots Gallery */}
              {!loading && (
                <>
                  <div className="p-6">
                    <ScreenshotGallery screenshots={screenshots} />
                  </div>

                  {/* Pagination Controls */}
                  {screenshots.length > 0 && (
                    <div className="border-t border-slate-100 px-6 py-5 bg-gray-50">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Page Info */}
                        <div className="text-sm text-slate-600">
                          Showing page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
                          <span className="font-semibold text-gray-900">{pagination.totalPages}</span>
                          <span className="text-slate-400 mx-1">·</span>
                          <span className="font-medium text-slate-700">{pagination.total}</span> total screenshots
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={!pagination.hasPrev}
                            className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-200 ${
                              pagination.hasPrev
                                ? 'bg-white text-gray-700 border-slate-300'
                                : 'bg-gray-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            }`}
                            onMouseEnter={(e) => {
                              if (pagination.hasPrev) {
                                e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.color = '#667eea';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (pagination.hasPrev) {
                                e.currentTarget.style.backgroundColor = '';
                                e.currentTarget.style.borderColor = '';
                                e.currentTarget.style.color = '';
                              }
                            }}
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={!pagination.hasNext}
                            className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-200 ${
                              pagination.hasNext
                                ? 'bg-white text-gray-700 border-slate-300'
                                : 'bg-gray-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            }`}
                            onMouseEnter={(e) => {
                              if (pagination.hasNext) {
                                e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.color = '#667eea';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (pagination.hasNext) {
                                e.currentTarget.style.backgroundColor = '';
                                e.currentTarget.style.borderColor = '';
                                e.currentTarget.style.color = '';
                              }
                            }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
    </div>
  );
}
