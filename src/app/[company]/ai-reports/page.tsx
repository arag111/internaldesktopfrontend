'use client';
import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Brain, Calendar, TrendingUp, AlertCircle, CheckCircle, Loader2, ArrowLeft, User, Clock } from 'lucide-react';
import Navbar from '../../components/Navbar';
import CompanySidebar from '../../components/CompanySidebar';
import AttendanceReport from './AttendanceReport';

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

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';

export default function AIReportsPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5002';
  const [view, setView] = useState<'overview' | 'detail' | 'attendance'>('overview');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load overview on mount
    loadOverview();
  }, []);

  useEffect(() => {
    // Reload overview when date changes
    if (view === 'overview' && datePreset !== 'custom') {
      loadOverview();
    }
  }, [startDate, endDate]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    switch (preset) {
      case 'today':
        setStartDate(format(now, 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setStartDate(format(yesterday, 'yyyy-MM-dd'));
        setEndDate(format(yesterday, 'yyyy-MM-dd'));
        break;
      case 'last7days':
        setStartDate(format(subDays(now, 6), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'last30days':
        setStartDate(format(subDays(now, 29), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'custom':
        // User will manually set dates
        break;
    }
  };

  const loadOverview = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const startDateTime = startOfDay(new Date(startDate)).toISOString();
      const endDateTime = endOfDay(new Date(endDate)).toISOString();

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
      const startDateTime = startOfDay(new Date(startDate)).toISOString();
      const endDateTime = endOfDay(new Date(endDate)).toISOString();

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
      const startDateTime = startOfDay(new Date(startDate)).toISOString();
      const endDateTime = endOfDay(new Date(endDate)).toISOString();

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
      alert(`✅ Report sent successfully to ${recipientEmail}!\n\nCheck your email inbox.`);
    } catch (err: any) {
      alert(`❌ Failed to send email: ${err.message}`);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <CompanySidebar />

      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-8 h-8 text-blue-600" />
                  <h1 className="text-3xl font-bold text-gray-900">AI Productivity Reports</h1>
                </div>
                <p className="text-gray-600">
                  AI-powered analysis of employee productivity based on screenshots and job roles
                </p>
              </div>
              {view === 'detail' && (
                <button
                  onClick={handleBackToOverview}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Overview
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          {view !== 'detail' && (
            <div className="flex gap-2 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-2">
              <button
                onClick={() => setView('overview')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  view === 'overview'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Brain className="w-5 h-5" />
                  <span>AI Productivity Reports</span>
                </div>
              </button>
              <button
                onClick={() => setView('attendance')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  view === 'attendance'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>Attendance Report</span>
                </div>
              </button>
            </div>
          )}

          {/* Date Filter - Only show for AI Reports view */}
          {view === 'overview' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col gap-4">
              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDatePresetChange('today')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    datePreset === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleDatePresetChange('yesterday')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    datePreset === 'yesterday'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => handleDatePresetChange('last7days')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    datePreset === 'last7days'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleDatePresetChange('last30days')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    datePreset === 'last30days'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => handleDatePresetChange('custom')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    datePreset === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {/* Custom Date Range */}
              {datePreset === 'custom' && (
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={loadOverview}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Date Range Display */}
              <div className="text-sm text-gray-600">
                <Calendar className="w-4 h-4 inline mr-2" />
                Showing data from {format(new Date(startDate), 'PPP')} to {format(new Date(endDate), 'PPP')}
              </div>
            </div>
          </div>
          )}

          {/* Attendance View */}
          {view === 'attendance' && <AttendanceReport />}

          {/* Error Message */}
          {view === 'overview' && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {view === 'overview' && loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Analyzing with AI...</h3>
              <p className="text-gray-600">This may take a minute for large datasets</p>
            </div>
          )}

          {/* Overview View - User Cards */}
          {view === 'overview' && !loading && userSummaries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userSummaries.map((userSummary) => (
                <div
                  key={userSummary.user.id}
                  onClick={() => userSummary.hasData && handleCardClick(userSummary.user.id)}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all ${
                    userSummary.hasData
                      ? 'hover:shadow-lg hover:scale-105 cursor-pointer'
                      : 'opacity-60'
                  }`}
                >
                  {/* User Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-5 h-5 text-gray-400" />
                        <h3 className="font-bold text-gray-900">{userSummary.user.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{userSummary.user.jobRole}</p>
                      <p className="text-xs text-gray-500">{userSummary.user.email}</p>
                    </div>
                    {userSummary.hasData && (
                      <div className="text-center">
                        <div
                          className={`text-3xl font-bold ${
                            userSummary.summary.productivityPercentage >= 70
                              ? 'text-green-600'
                              : userSummary.summary.productivityPercentage >= 40
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {userSummary.summary.productivityPercentage}%
                        </div>
                        <p className="text-xs text-gray-500">Score</p>
                      </div>
                    )}
                  </div>

                  {/* Summary Stats */}
                  {userSummary.hasData ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total Screenshots:</span>
                        <span className="font-medium text-gray-900">
                          {userSummary.summary.totalScreenshots}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Productive:
                        </span>
                        <span className="font-medium text-green-600">
                          {userSummary.summary.productiveCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          Unproductive:
                        </span>
                        <span className="font-medium text-red-600">
                          {userSummary.summary.unproductiveCount}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              userSummary.summary.productivityPercentage >= 70
                                ? 'bg-green-600'
                                : userSummary.summary.productivityPercentage >= 40
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${userSummary.summary.productivityPercentage}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-center text-gray-500 mt-2">
                        Click to view detailed analysis
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No screenshots for this period</p>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedReport.user.name}</h2>
                    <p className="text-gray-600">{selectedReport.user.jobRole}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-blue-600">
                      {selectedReport.summary.productivityPercentage}%
                    </div>
                    <p className="text-sm text-gray-600">Productivity Score</p>
                  </div>
                </div>
              </div>

              {/* Verdict Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6">
                <div className="flex items-start gap-3">
                  <Brain className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">AI Verdict Summary</h3>

                    <div className="space-y-4 text-gray-700">
                      {/* Punch-in Time & Punctuality */}
                      {selectedReport.activity?.punchInTime && (
                        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                          {(() => {
                            const punchInTime = new Date(selectedReport.activity.punchInTime);
                            const punchInHour = punchInTime.getHours();
                            const punchInMinute = punchInTime.getMinutes();
                            const officeStartHour = 10; // 10 AM
                            const minutesFromStart = (punchInHour * 60 + punchInMinute) - (officeStartHour * 60);

                            // Helper function to convert minutes to HH:MM format
                            const minutesToHHMM = (minutes: number) => {
                              const hours = Math.floor(Math.abs(minutes) / 60);
                              const mins = Math.abs(minutes) % 60;
                              return `${hours}:${String(mins).padStart(2, '0')}`;
                            };

                            let punctualityIcon = '';
                            let punctualityText = '';
                            let punctualityColor = '';

                            if (minutesFromStart < -30) {
                              punctualityIcon = '✅';
                              punctualityText = `EARLY LOGIN - Arrived ${minutesToHHMM(minutesFromStart)} before office time`;
                              punctualityColor = 'text-green-700 bg-green-50';
                            } else if (minutesFromStart <= 0) {
                              punctualityIcon = '✅';
                              punctualityText = 'ON TIME - Arrived on time';
                              punctualityColor = 'text-green-700 bg-green-50';
                            } else if (minutesFromStart <= 15) {
                              punctualityIcon = '⚠️';
                              punctualityText = `SLIGHTLY LATE - Arrived ${minutesToHHMM(minutesFromStart)} after office time`;
                              punctualityColor = 'text-yellow-700 bg-yellow-50';
                            } else {
                              punctualityIcon = '❌';
                              punctualityText = `LATE LOGIN - Arrived ${minutesToHHMM(minutesFromStart)} after office time`;
                              punctualityColor = 'text-red-700 bg-red-50';
                            }

                            return (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-5 h-5 text-blue-600" />
                                  <span className="font-bold text-gray-900 text-lg">
                                    {format(punchInTime, 'hh:mm a')}
                                  </span>
                                  <span className="text-sm text-gray-500">(Office: 10:00 AM - 7:00 PM)</span>
                                </div>
                                <div className={`${punctualityColor} rounded-lg px-3 py-2 font-semibold text-sm`}>
                                  {punctualityIcon} {punctualityText}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Productive Activities Summary */}
                      <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                        <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                          <span className="text-xl">✅</span> Productive Work ({selectedReport.summary.productivityPercentage}%)
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
                        <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                          <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                            <span className="text-xl">❌</span> Unproductive Time ({Math.round((selectedReport.summary.unproductiveCount / selectedReport.summary.totalScreenshots) * 100)}%)
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
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-200">
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
                        className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        📧 Send Report to Email
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">
                No users with job roles and screenshots found for the selected period
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
