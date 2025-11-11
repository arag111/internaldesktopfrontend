'use client';
import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Brain, Calendar, TrendingUp, AlertCircle, CheckCircle, Loader2, ArrowLeft, User, Clock, Sparkles, Zap, Activity, Mail, BarChart3, ChevronRight } from 'lucide-react';
import Navbar from '../../components/Navbar';
import CompanySidebar from '../../components/CompanySidebar';
import AttendanceReport from './AttendanceReport';
import DateRangePickerComponent from '../../components/DateRangePicker2';
import { rangePresets } from '../../utils/constants';

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

  useEffect(() => {
    // Load overview on mount
    loadOverview();
  }, []);

  useEffect(() => {
    // Reload overview when date changes
    if (view === 'overview') {
      loadOverview();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <Navbar />
      <CompanySidebar />

      <main className="ml-64 mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Hero Banner Section */}
          <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 mb-0.5">
                    AI Productivity Reports
                  </h1>
                  <p className="text-sm text-slate-500">
                    AI-powered analysis of employee productivity based on screenshots and job roles
                  </p>
                </div>
              </div>
              {view === 'detail' && (
                <button
                  onClick={handleBackToOverview}
                  className="group px-4 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Overview
                </button>
              )}
            </div>

            {/* Tab Navigation */}
            {view !== 'detail' && (
              <div className="flex gap-3 mb-5 pt-4">
                <button
                  onClick={() => setView('overview')}
                  className={`group flex-1 px-6 py-4 rounded-lg text-sm font-medium transition-colors duration-200 border ${
                    view === 'overview'
                      ? 'bg-slate-100 text-slate-900 border-slate-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Brain className={`w-4 h-4 ${view === 'overview' ? 'text-purple-500' : 'text-purple-500'}`} />
                    <span>AI Productivity Reports</span>
                  </div>
                </button>
                <button
                  onClick={() => setView('attendance')}
                  className={`group flex-1 px-6 py-4 rounded-lg text-sm font-medium transition-colors duration-200 border ${
                    view === 'attendance'
                      ? 'bg-slate-100 text-slate-900 border-slate-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className={`w-4 h-4 ${view === 'attendance' ? 'text-blue-500' : 'text-blue-500'}`} />
                    <span>Attendance Report</span>
                  </div>
                </button>
              </div>
            )}

            {/* Date Filter - Only show for AI Reports view */}
            {view === 'overview' && (
              <div className="flex items-center gap-3 flex-wrap pt-4">
                {/* Preset Buttons */}
                <button
                  onClick={() => handleDatePresetChange('today')}
                  className={`group px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    datePreset === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleDatePresetChange('yesterday')}
                  className={`group px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    datePreset === 'yesterday'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => handleDatePresetChange('last7days')}
                  className={`group px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    datePreset === 'last7days'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleDatePresetChange('last30days')}
                  className={`group px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    datePreset === 'last30days'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
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

                {/* Date Range Display */}
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Data from {format(selectedRange[0], 'PPP')} to {format(selectedRange[1], 'PPP')}
                </div>
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
                <p className="font-bold text-red-900 mb-1">Error</p>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {view === 'overview' && loading && (
            <div className="bg-white rounded-lg border border-slate-200 p-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Analyzing with AI...
              </h3>
              <p className="text-slate-600 text-sm font-medium">This may take a minute for large datasets</p>
            </div>
          )}

          {/* Overview View - User Cards */}
          {view === 'overview' && !loading && userSummaries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userSummaries.map((userSummary) => (
                <div
                  key={userSummary.user.id}
                  onClick={() => userSummary.hasData && handleCardClick(userSummary.user.id)}
                  className={`group bg-white rounded-lg border border-slate-200 p-6 transition-all duration-200 ${
                    userSummary.hasData
                      ? 'hover:shadow-md hover:border-blue-300 cursor-pointer'
                      : 'opacity-60'
                  }`}
                >
                  {/* User Info */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{userSummary.user.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">{userSummary.user.jobRole}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 ml-11">{userSummary.user.email}</p>
                    </div>
                    {userSummary.hasData && (
                      <div className="text-center">
                        <div
                          className={`text-2xl font-bold ${
                            userSummary.summary.productivityPercentage >= 70
                              ? 'text-green-600'
                              : userSummary.summary.productivityPercentage >= 40
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {userSummary.summary.productivityPercentage}%
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Score</p>
                      </div>
                    )}
                  </div>

                  {/* Summary Stats */}
                  {userSummary.hasData ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-600 font-medium">Total Screenshots:</span>
                        <span className="font-bold text-slate-900 px-3 py-1 bg-white rounded-lg border border-slate-200">
                          {userSummary.summary.totalScreenshots}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm p-2 bg-green-50 rounded-lg border border-green-100">
                        <span className="text-slate-700 font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Productive:
                        </span>
                        <span className="font-bold text-green-700 px-3 py-1 bg-white rounded-lg border border-green-200">
                          {userSummary.summary.productiveCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm p-2 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-slate-700 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          Unproductive:
                        </span>
                        <span className="font-bold text-red-700 px-3 py-1 bg-white rounded-lg border border-red-200">
                          {userSummary.summary.unproductiveCount}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              userSummary.summary.productivityPercentage >= 70
                                ? 'bg-green-500'
                                : userSummary.summary.productivityPercentage >= 40
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${userSummary.summary.productivityPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500 font-medium group-hover:text-blue-600 transition-colors">
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        Click to view detailed analysis
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">No screenshots for this period</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Detail View - Individual User Report */}
          {view === 'detail' && selectedReport && !loading && (
            <div className="space-y-6">
              {/* User Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedReport.user.name}</h2>
                    <p className="text-gray-600">{selectedReport.user.jobRole}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedReport.summary.productivityPercentage}%
                    </div>
                    <p className="text-sm text-gray-600">Productivity Score</p>
                  </div>
                </div>
              </div>

              {/* Verdict Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">AI Verdict Summary</h3>

                    <div className="space-y-4 text-gray-700">
                      {/* Punch-in Time & Punctuality */}
                      {selectedReport.activity?.punchInTime && (
                        <div className="bg-white rounded-md p-4 border-l-2 border-blue-500">
                          {(() => {
                            const punchInTime = new Date(selectedReport.activity.punchInTime);
                            const punchInHour = punchInTime.getHours();
                            const punchInMinute = punchInTime.getMinutes();
                            const officeStartHour = 10; // 10 AM
                            const minutesFromStart = (punchInHour * 60 + punchInMinute) - (officeStartHour * 60);

                            // Helper function to convert minutes to readable format
                            const minutesToReadable = (minutes: number) => {
                              const hours = Math.floor(Math.abs(minutes) / 60);
                              const mins = Math.abs(minutes) % 60;
                              if (hours > 0 && mins > 0) {
                                return `${hours}hrs ${mins}min`;
                              } else if (hours > 0) {
                                return `${hours}hrs`;
                              } else {
                                return `${mins}min`;
                              }
                            };

                            let punctualityIcon = '';
                            let punctualityText = '';
                            let punctualityColor = '';

                            if (minutesFromStart < -30) {
                              punctualityIcon = '✅';
                              punctualityText = `Early Login - Early by ${minutesToReadable(minutesFromStart)}`;
                              punctualityColor = 'text-green-700 bg-white border border-green-200';
                            } else if (minutesFromStart <= 0) {
                              punctualityIcon = '✅';
                              punctualityText = 'On Time - Arrived on time';
                              punctualityColor = 'text-green-700 bg-white border border-green-200';
                            } else if (minutesFromStart <= 15) {
                              punctualityIcon = '⚠️';
                              punctualityText = `Slightly Late - Late by ${minutesToReadable(minutesFromStart)}`;
                              punctualityColor = 'text-yellow-700 bg-white border border-yellow-200';
                            } else {
                              punctualityIcon = '❌';
                              punctualityText = `Late Login - Late by ${minutesToReadable(minutesFromStart)}`;
                              punctualityColor = 'text-red-700 bg-white border border-red-200';
                            }

                            return (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-4 h-4 text-gray-600" />
                                  <span className="font-semibold text-gray-900 text-base">
                                    {format(punchInTime, 'hh:mm a')}
                                  </span>
                                  <span className="text-xs text-gray-500">(Office: 10:00 AM - 7:00 PM)</span>
                                </div>
                                <div className={`${punctualityColor} rounded px-3 py-1.5 font-medium text-sm`}>
                                  {punctualityIcon} {punctualityText}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Productive Activities Summary */}
                      <div className="bg-white rounded-md p-4 border-l-2 border-green-500">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-base">✅</span> Productive Work ({selectedReport.summary.productivityPercentage}%)
                        </h4>
                        <div className="space-y-2 text-sm">
                          {(() => {
                            const productiveAnalyses = selectedReport.analyses.filter(a => a.isProductive);
                            const productiveCategories = productiveAnalyses.reduce((acc: any, curr) => {
                              acc[curr.category] = (acc[curr.category] || 0) + 1;
                              return acc;
                            }, {});
                            const topProductive = Object.entries(productiveCategories)
                              .sort(([, a]: any, [, b]: any) => b - a)
                              .slice(0, 5);

                            // Get sample activities for each category
                            const categoryActivities: any = {};
                            productiveAnalyses.forEach(a => {
                              if (!categoryActivities[a.category]) {
                                categoryActivities[a.category] = a.activity;
                              }
                            });

                            return topProductive.length > 0 ? (
                              <ul className="space-y-1.5">
                                {topProductive.map(([category, count]: any) => (
                                  <li key={category} className="flex items-start gap-2">
                                    <span className="text-green-600 mt-0.5">•</span>
                                    <span className="text-gray-800">
                                      <strong>{category}</strong> - {count} times
                                      <span className="text-gray-600 text-xs ml-2">
                                        ({categoryActivities[category]})
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-gray-600 italic">No productive activities detected</p>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Unproductive Activities Summary */}
                      {selectedReport.summary.unproductiveCount > 0 && (
                        <div className="bg-white rounded-md p-4 border-l-2 border-red-500">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="text-base">❌</span> Unproductive Time ({Math.round((selectedReport.summary.unproductiveCount / selectedReport.summary.totalScreenshots) * 100)}%)
                          </h4>
                          <div className="space-y-2 text-sm">
                            {(() => {
                              const unproductiveAnalyses = selectedReport.analyses.filter(a => !a.isProductive);
                              const unproductiveCategories = unproductiveAnalyses.reduce((acc: any, curr) => {
                                acc[curr.category] = (acc[curr.category] || 0) + 1;
                                return acc;
                              }, {});
                              const topUnproductive = Object.entries(unproductiveCategories)
                                .sort(([, a]: any, [, b]: any) => b - a)
                                .slice(0, 5);

                              // Get sample activities for each category
                              const categoryActivities: any = {};
                              unproductiveAnalyses.forEach(a => {
                                if (!categoryActivities[a.category]) {
                                  categoryActivities[a.category] = a.activity;
                                }
                              });

                              return (
                                <ul className="space-y-1.5">
                                  {topUnproductive.map(([category, count]: any) => (
                                    <li key={category} className="flex items-start gap-2">
                                      <span className="text-red-600 mt-0.5">•</span>
                                      <span className="text-gray-800">
                                        <strong>{category}</strong> - {count} times
                                        <span className="text-gray-600 text-xs ml-2">
                                          ({categoryActivities[category]})
                                        </span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Quick Summary Stats */}
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-sm text-gray-600">Work Quality</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  selectedReport.summary.averageProductivity >= 70 ? 'bg-green-500' :
                                  selectedReport.summary.averageProductivity >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${selectedReport.summary.averageProductivity}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold">{selectedReport.summary.averageProductivity}/100</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Focus Rate</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  selectedReport.summary.productivityPercentage >= 70 ? 'bg-green-500' :
                                  selectedReport.summary.productivityPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${selectedReport.summary.productivityPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold">{selectedReport.summary.productivityPercentage}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Email Report Button */}
                      <button
                        onClick={() => {
                          const email = prompt('Enter email address to send this report:');
                          if (email && email.trim()) {
                            handleSendEmail(email.trim());
                          }
                        }}
                        className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-black text-sm font-medium py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Send Report to Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Total Screenshots</p>
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{selectedReport.summary.totalScreenshots}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Productive</p>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-green-600">{selectedReport.summary.productiveCount}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Unproductive</p>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-3xl font-bold text-red-600">{selectedReport.summary.unproductiveCount}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Avg Score</p>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{selectedReport.summary.averageProductivity}</p>
                </div>
              </div>

              {/* Top Recommendations */}
              {selectedReport.summary.topRecommendations.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Top Recommendations</h2>
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Analysis</h2>
                <div className="space-y-4">
                  {selectedReport.analyses.map((analysis, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        analysis.isProductive
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm text-gray-500">
                            {format(new Date(analysis.timestamp), 'PPpp')}
                          </p>
                          <p className="font-medium text-gray-900 mt-1">{analysis.activity}</p>
                          <p className="text-sm text-gray-600 mt-1">Category: {analysis.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              analysis.isProductive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {analysis.isProductive ? 'Productive' : 'Unproductive'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                            Score: {analysis.productivityScore}
                          </span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Observations:</p>
                        <p className="text-sm text-gray-600">{analysis.observations}</p>
                      </div>

                      {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Recommendations:</p>
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
              <h3 className="text-2xl font-bold text-slate-900 mb-3">No Data Available</h3>
              <p className="text-slate-600 font-medium">
                No users with job roles and screenshots found for the selected period
              </p>
            </div>
          )}
        </div>
      </main>

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
