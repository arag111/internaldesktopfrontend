'use client';
import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Brain, Calendar, TrendingUp, AlertCircle, CheckCircle, Loader2, ArrowLeft, User, Clock, Sparkles, Zap, Activity, Mail, BarChart3, ChevronRight, Search } from 'lucide-react';
import AttendanceReport from './AttendanceReport';
import DateRangePickerComponent from '../../components/DateRangePicker2';
import { rangePresets } from '../../utils/constants';
import AIVerdictSummary from '@/components/AIVerdictSummary';
import ScreenshotPreview from '@/components/ScreenshotPreview';

interface UserSummary {
  user: {
    id: number;
    name: string;
    email: string;
    jobRole: string;
  };
  summary: {
    totalScreenshots: number;
    productiveCount: number;
    unproductiveCount: number;
    averageProductivity: number;
    productivityPercentage: number;
    aiScore?: number;
    timeBasedScore?: number;
    screenshotBasedScore?: number;
    scoreBreakdown?: {
      timeWeight: number;
      screenshotWeight: number;
    };
    error?: string;
  };
  hasData: boolean;
}

interface Analysis {
  timestamp: string;
  activity: string;
  isProductive: boolean;
  productivityScore: number;
  observations: string;
  recommendations: string[];
  category: string;
  screenshotId?: number;
  screenshotUrl?: string;
  hasScreenshot?: boolean;
}

interface AIReport {
  user: {
    id: number;
    name: string;
    jobRole: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  activity?: {
    punchInTime: string | null;
  };
  summary: {
    totalScreenshots: number;
    productiveCount: number;
    unproductiveCount: number;
    averageProductivity: number;
    productivityPercentage: number;
    aiScore?: number;
    timeBasedScore?: number;
    screenshotBasedScore?: number;
    scoreBreakdown?: {
      timeWeight: number;
      screenshotWeight: number;
    };
    topRecommendations: string[];
  };
  analyses: Analysis[];
}

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days';

export default function AIReportsPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5002';
  const [view, setView] = useState<'overview' | 'detail' | 'attendance'>('overview');
  const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
  const [selectedRange, setSelectedRange] = useState<[Date, Date]>(rangePresets[0].range as [Date, Date]);
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 grid

  useEffect(() => {
    // Load overview on mount
    loadOverview();
  }, []);

  useEffect(() => {
    // Reload overview when date changes
    if (view === 'overview') {
      loadOverview();
      setCurrentPage(1); // Reset to first page when data changes
    }
  }, [selectedRange]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    switch (preset) {
      case 'today':
        setSelectedRange([now, now]);
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setSelectedRange([yesterday, yesterday]);
        break;
      case 'last7days':
        setSelectedRange([subDays(now, 6), now]);
        break;
      case 'last30days':
        setSelectedRange([subDays(now, 29), now]);
        break;
    }
  };

  const handleCustomRangeChange = (range: [Date, Date]) => {
    setDatePreset(null);
    setSelectedRange(range);
  };

  const loadOverview = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const [start, end] = selectedRange;
      const startDateTime = startOfDay(start).toISOString();
      const endDateTime = endOfDay(end).toISOString();

      const response = await fetch(
        `${API_BASE_URL}/api/ai-reports/summary?startDate=${startDateTime}&endDate=${endDateTime}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to load overview');
      }

      const data = await response.json();
      setUserSummaries(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedReport = async (userId: number) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const [start, end] = selectedRange;
      const startDateTime = startOfDay(start).toISOString();
      const endDateTime = endOfDay(end).toISOString();

      const response = await fetch(`${API_BASE_URL}/api/ai-reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          startDate: startDateTime,
          endDate: endDateTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to generate detailed report');
      }

      const data = await response.json();
      setSelectedReport(data);
      setView('detail');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (recipientEmail: string) => {
    if (!selectedReport) return;

    try {
      const token = localStorage.getItem('token');
      const [start, end] = selectedRange;
      const startDateTime = startOfDay(start).toISOString();
      const endDateTime = endOfDay(end).toISOString();

      const response = await fetch(`${API_BASE_URL}/api/ai-reports/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedReport.user.id,
          startDate: startDateTime,
          endDate: endDateTime,
          recipientEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to send email');
      }

      const data = await response.json();
      setToastMessage({ message: `Report sent successfully to ${recipientEmail}! Check your email inbox.`, type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send email';
      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleCardClick = (userId: number) => {
    loadDetailedReport(userId);
  };

  const handleBackToOverview = () => {
    setView('overview');
    setSelectedReport(null);
  };

  // Pagination calculations
  const filteredUsers = userSummaries
    .filter(u => u.hasData) // Only show users with data
    .filter(u => {
      // Filter by search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        u.user.name.toLowerCase().includes(query) ||
        u.user.email.toLowerCase().includes(query) ||
        u.user.jobRole.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Sort by AI Score (ascending - lowest scores first)
      const scoreA = a.summary.aiScore ?? a.summary.productivityPercentage;
      const scoreB = b.summary.aiScore ?? b.summary.productivityPercentage;
      return scoreA - scoreB; // Ascending: problem users appear first
    });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ marginLeft: '16rem' }}>
        <div className="max-w-7xl mx-auto">
          {/* Material UI Inspired Header */}
          <div className="mb-8">
            {/* Title Section */}
            <div className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-normal text-slate-900 mb-1">
                    AI Productivity Reports
                  </h1>
                  <p className="text-sm text-slate-600 font-normal">
                    AI-powered analysis of employee productivity based on screenshots and job roles
                  </p>
                </div>
                {view === 'detail' && (
                  <button
                    onClick={handleBackToOverview}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Overview
                  </button>
                )}
              </div>
            </div>

            {/* Tab Navigation - Material Design */}
            {view !== 'detail' && (
              <div className="border-b border-slate-200 mb-6">
                <div className="flex gap-1">
                  <button
                    onClick={() => setView('overview')}
                    className={`group relative px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                      view === 'overview'
                        ? 'text-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      <span>AI Productivity Reports</span>
                    </div>
                    {view === 'overview' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setView('attendance')}
                    className={`group relative px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                      view === 'attendance'
                        ? 'text-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Attendance Report</span>
                    </div>
                    {view === 'attendance' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Date Filter - Material Design Chips */}
            {view === 'overview' && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Preset Buttons as Chips */}
                <button
                  onClick={() => handleDatePresetChange('today')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    datePreset === 'today'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleDatePresetChange('yesterday')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    datePreset === 'yesterday'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => handleDatePresetChange('last7days')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    datePreset === 'last7days'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleDatePresetChange('last30days')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    datePreset === 'last30days'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Last 30 Days
                </button>

                {/* Custom Date Range Picker */}
                <DateRangePickerComponent
                  selectedRange={selectedRange}
                  setSelectedRange={handleCustomRangeChange}
                  rangePresets={rangePresets}
                />
              </div>
            )}
          </div>

          {/* Attendance View */}
          {view === 'attendance' && <AttendanceReport />}

          {/* Error Message */}
          {view === 'overview' && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-900 mb-1">Error</p>
                <p className="text-red-700 text-sm font-normal">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State with Skeleton Cards */}
          {view === 'overview' && loading && (
            <div className="space-y-6">
              {/* Progress Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-normal text-slate-900 mb-1">
                      Analyzing with AI...
                    </h3>
                    <p className="text-slate-600 text-sm font-normal">
                      Processing screenshots and calculating productivity scores
                    </p>
                    <p className="text-blue-600 text-xs font-normal mt-2">
                      {(() => {
                        const days = Math.ceil((new Date(selectedRange[1]).getTime() - new Date(selectedRange[0]).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        if (days > 7) {
                          return `⏱️ Analyzing ${days} days of data - this may take 1-2 minutes`;
                        }
                        return '⚡ Almost done...';
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skeleton Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse"
                  >
                    {/* User Info Skeleton */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded w-2/3 ml-11"></div>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-8 bg-slate-200 rounded mb-1"></div>
                        <div className="h-3 bg-slate-100 rounded w-12"></div>
                      </div>
                    </div>

                    {/* Stats Skeleton */}
                    <div className="space-y-3">
                      <div className="h-10 bg-slate-100 rounded-lg"></div>
                      <div className="h-10 bg-green-50 rounded-lg border border-green-100"></div>
                      <div className="h-10 bg-red-50 rounded-lg border border-red-100"></div>
                      <div className="h-2 bg-slate-200 rounded-full mt-4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overview View - Classic Data Table */}
          {view === 'overview' && !loading && filteredUsers.length > 0 && (
            <>
            {/* Search Filter */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 uppercase tracking-wide">User</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 uppercase tracking-wide">Role</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 uppercase tracking-wide">AI Score</th>
                    <th className="text-center py-3 px-6 text-sm font-medium text-slate-700 uppercase tracking-wide">Time</th>
                    <th className="text-center py-3 px-6 text-sm font-medium text-slate-700 uppercase tracking-wide">Quality</th>
                    <th className="text-center py-3 px-6 text-sm font-medium text-slate-700 uppercase tracking-wide">Screenshots</th>
                    <th className="text-center py-3 px-6 text-sm font-medium text-slate-700 uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((userSummary) => {
                    // Use aiScore if available, otherwise fall back to productivityPercentage
                    const displayScore = userSummary.summary.aiScore ?? userSummary.summary.productivityPercentage;
                    const isLowScore = displayScore < 60; // Red theme for scores below 60%
                    const isMediumScore = displayScore >= 60 && displayScore < 70; // Yellow theme for 60-70%

                    // Row background color
                    const rowBgClass = isLowScore
                      ? 'bg-red-50 hover:bg-red-100'
                      : isMediumScore
                      ? 'bg-yellow-50 hover:bg-yellow-100'
                      : 'hover:bg-slate-50';

                    // Progress bar color
                    const progressColor = isLowScore
                      ? 'bg-red-500'
                      : isMediumScore
                      ? 'bg-yellow-500'
                      : 'bg-green-500';

                    return (
                      <tr
                        key={userSummary.user.id}
                        onClick={() => userSummary.hasData && handleCardClick(userSummary.user.id)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors ${rowBgClass}`}
                      >
                        {/* User Column */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-base flex-shrink-0">
                              {userSummary.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 text-sm">
                                {userSummary.user.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {userSummary.user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Column */}
                        <td className="py-4 px-6">
                          <span className="text-sm text-slate-700">{userSummary.user.jobRole}</span>
                        </td>

                        {/* AI Score Column with Progress Bar */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                  style={{ width: `${displayScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-slate-900 min-w-[45px]">
                                {displayScore}%
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Time Column */}
                        <td className="py-4 px-6 text-center">
                          {userSummary.summary.timeBasedScore !== null && userSummary.summary.timeBasedScore !== undefined ? (
                            <span className="text-sm font-medium text-slate-700">
                              {userSummary.summary.timeBasedScore}%
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>

                        {/* Quality Column */}
                        <td className="py-4 px-6 text-center">
                          {userSummary.summary.screenshotBasedScore !== null && userSummary.summary.screenshotBasedScore !== undefined ? (
                            <span className="text-sm font-medium text-slate-700">
                              {userSummary.summary.screenshotBasedScore}%
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>

                        {/* Screenshots Column */}
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-3 text-xs">
                            <span className="text-slate-600 font-medium">
                              {userSummary.summary.totalScreenshots}
                            </span>
                            <span className="text-green-600 font-medium">
                              ✅ {userSummary.summary.productiveCount}
                            </span>
                            <span className="text-red-600 font-medium">
                              ❌ {userSummary.summary.unproductiveCount}
                            </span>
                          </div>
                        </td>

                        {/* Details Column */}
                        <td className="py-4 px-6 text-center">
                          <button className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                            <span>►</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first, last, current, and adjacent pages
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);

                      // Show ellipsis
                      const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                      const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                      if (showEllipsisBefore || showEllipsisAfter) {
                        return (
                          <span key={page} className="px-2 text-slate-400">
                            ...
                          </span>
                        );
                      }

                      if (!showPage) return null;

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}

          {/* Detail View - Individual User Report */}
          {view === 'detail' && selectedReport && !loading && (
            <div className="space-y-6">
              {/* User Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-normal text-gray-900">{selectedReport.user.name}</h2>
                    <p className="text-gray-600">{selectedReport.user.jobRole}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-normal text-blue-600">
                      {selectedReport.summary.aiScore ?? selectedReport.summary.productivityPercentage}%
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedReport.summary.aiScore !== undefined ? 'AI Score' : 'Productivity Score'}
                    </p>
                    {selectedReport.summary.aiScore !== undefined && (
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <div>Time: {selectedReport.summary.timeBasedScore}%</div>
                        <div>Quality: {selectedReport.summary.screenshotBasedScore}%</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* NEW: AI Verdict Summary Component */}
              <AIVerdictSummary
                userName={selectedReport.user.name}
                jobRole={selectedReport.user.jobRole}
                punchInTime={selectedReport.activity?.punchInTime}
                officeHours={{ start: '10:00 AM', end: '7:00 PM' }}
                summary={{
                  ai_score: selectedReport.summary.aiScore ?? selectedReport.summary.productivityPercentage,
                  timeBasedScore: selectedReport.summary.timeBasedScore ?? 0,
                  screenshotBasedScore: selectedReport.summary.screenshotBasedScore ?? 0,
                  totalScreenshots: selectedReport.summary.totalScreenshots,
                  productiveCount: selectedReport.summary.productiveCount,
                  unproductiveCount: selectedReport.summary.unproductiveCount,
                  topProductiveCategories: (() => {
                    const productiveAnalyses = selectedReport.analyses.filter(a => a.isProductive);
                    const categories = productiveAnalyses.reduce((acc: any, curr) => {
                      acc[curr.category] = (acc[curr.category] || 0) + 1;
                      return acc;
                    }, {});
                    return Object.entries(categories)
                      .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([category, count]: any) => ({ category, count }));
                  })(),
                  topUnproductiveCategories: (() => {
                    const unproductiveAnalyses = selectedReport.analyses.filter(a => !a.isProductive);
                    const categories = unproductiveAnalyses.reduce((acc: any, curr) => {
                      acc[curr.category] = (acc[curr.category] || 0) + 1;
                      return acc;
                    }, {});
                    return Object.entries(categories)
                      .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([category, count]: any) => ({ category, count }));
                  })()
                }}
                analyses={selectedReport.analyses}
                dateRange={selectedReport.period}
              />

              {/* Email Report Button */}
              <button
                onClick={() => {
                  setEmailInput('');
                  setShowEmailModal(true);
                }}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <Mail className="w-4 h-4" />
                Send Report to Email
              </button>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Total Screenshots</p>
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-normal text-gray-900">{selectedReport.summary.totalScreenshots}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Productive</p>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-normal text-green-600">{selectedReport.summary.productiveCount}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Unproductive</p>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-3xl font-normal text-red-600">{selectedReport.summary.unproductiveCount}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Avg Score</p>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-normal text-blue-600">{selectedReport.summary.averageProductivity}</p>
                </div>
              </div>

              {/* Top Recommendations */}
              {selectedReport.summary.topRecommendations.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-normal text-gray-900 mb-4">Top Recommendations</h2>
                  <ul className="space-y-2">
                    {selectedReport.summary.topRecommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="text-gray-700">{recommendation}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Analysis */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-normal text-gray-900 mb-4">Detailed Analysis</h2>
                <div className="space-y-6">
                  {selectedReport.analyses.map((analysis, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-6 ${
                        analysis.isProductive
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      {/* NEW: Two-column layout with screenshot */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Screenshot */}
                        <div>
                          <ScreenshotPreview
                            screenshotId={analysis.screenshotId || 0}
                            screenshotUrl={analysis.screenshotUrl || ''}
                            timestamp={analysis.timestamp}
                            activity={analysis.activity}
                            isProductive={analysis.isProductive}
                            hasScreenshot={analysis.hasScreenshot}
                          />
                        </div>

                        {/* Right Column: Analysis Details */}
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                {format(new Date(analysis.timestamp), 'PPpp')}
                              </p>
                              <h4 className="font-semibold text-lg mt-1 text-gray-900">{analysis.activity}</h4>
                              <p className="text-sm text-gray-600 mt-1">Category: {analysis.category}</p>
                            </div>
                            <span
                              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                                analysis.isProductive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {analysis.isProductive ? '✅ Productive' : '❌ Unproductive'} ({analysis.productivityScore})
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium text-gray-700 mb-1">🔍 Observations:</h5>
                              <p className="text-sm text-gray-600 leading-relaxed">{analysis.observations}</p>
                            </div>

                            {analysis.recommendations && analysis.recommendations.length > 0 && (
                              <div>
                                <h5 className="font-medium text-gray-700 mb-1">💡 Recommendations:</h5>
                                <ul className="list-disc list-inside space-y-1">
                                  {analysis.recommendations.map((rec, recIndex) => (
                                    <li key={recIndex} className="text-sm text-gray-600">
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {view === 'overview' && !loading && userSummaries.length === 0 && !error && (
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/60 p-16 text-center backdrop-blur-sm">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-normal text-slate-900 mb-3">No Data Available</h3>
              <p className="text-slate-600 font-normal">
                No users with job roles and screenshots found for the selected period
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Email Input Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => {
          setShowEmailModal(false);
          setEmailInput('');
        }}>
          <div 
            className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4">
              <h3 className="text-base font-medium text-slate-900 mb-3">Send Report to Email</h3>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && emailInput.trim()) {
                    handleSendEmail(emailInput.trim());
                    setShowEmailModal(false);
                    setEmailInput('');
                  } else if (e.key === 'Escape') {
                    setShowEmailModal(false);
                    setEmailInput('');
                  }
                }}
                placeholder="Enter email address"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailInput('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (emailInput.trim()) {
                      handleSendEmail(emailInput.trim());
                      setShowEmailModal(false);
                      setEmailInput('');
                    }
                  }}
                  disabled={!emailInput.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Popup */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 toast-slide-in">
          <div className={`rounded-lg border shadow-lg px-4 py-3 min-w-[300px] flex items-center justify-between gap-4 ${
            toastMessage.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              toastMessage.type === 'success' 
                ? 'text-green-900' 
                : 'text-red-900'
            }`}>
              {toastMessage.message}
            </p>
            <button
              onClick={() => setToastMessage(null)}
              className={`hover:opacity-70 transition-colors flex-shrink-0 ${
                toastMessage.type === 'success' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
