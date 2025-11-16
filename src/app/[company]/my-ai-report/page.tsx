'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Brain, Calendar, TrendingUp, AlertCircle, CheckCircle, Loader2, ArrowLeft, User, Clock, Sparkles, Mail, ChevronRight } from 'lucide-react';
import DateRangePickerComponent from '../../components/DateRangePicker2';
import { rangePresets } from '../../utils/constants';

interface UserSummary {
  user: {
    id: number;
    name: string;
    email: string;
    jobRole: string | null;
  };
  summary: {
    totalScreenshots: number;
    productiveCount: number;
    unproductiveCount: number;
    averageProductivity: number;
    productivityPercentage: number;
  };
  hasData: boolean;
  hasJobRole?: boolean;
  msg?: string;
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

export default function MyAIReportPage() {
  const params = useParams();
  const router = useRouter();
  const company = params.company as string;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5002';
  
  const [view, setView] = useState<'overview' | 'detail'>('overview');
  const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
  const [selectedRange, setSelectedRange] = useState<[Date, Date]>(rangePresets[0].range as [Date, Date]);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [selectedReport, setSelectedReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    loadOverview();
  }, []);

  useEffect(() => {
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
      if (!token) {
        router.push('/');
        return;
      }

      const [start, end] = selectedRange;
      const startDateTime = startOfDay(start).toISOString();
      const endDateTime = endOfDay(end).toISOString();

      const response = await fetch(
        `${API_BASE_URL}/api/ai-reports/my-summary?startDate=${startDateTime}&endDate=${endDateTime}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to load summary');
      }

      const data = await response.json();
      setUserSummary(data);
      
      if (data.msg && !data.hasJobRole) {
        setError(data.msg);
      }
    } catch (err: any) {
      setError(err.message);
      setToastMessage({ message: err.message, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const [start, end] = selectedRange;
      const startDateTime = startOfDay(start).toISOString();
      const endDateTime = endOfDay(end).toISOString();

      const response = await fetch(`${API_BASE_URL}/api/ai-reports/generate-my-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
      setToastMessage({ message: err.message, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedReport || !emailInput.trim()) return;

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
          recipientEmail: emailInput.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to send email');
      }

      setToastMessage({ message: `Report sent successfully to ${emailInput.trim()}! Check your email inbox.`, type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
      setShowEmailModal(false);
      setEmailInput('');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send email';
      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleCardClick = () => {
    if (userSummary?.hasData) {
      loadDetailedReport();
    }
  };

  const handleBackToOverview = () => {
    setView('overview');
    setSelectedReport(null);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ marginLeft: '16rem' }}>
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
                    My AI Productivity Report
                  </h1>
                  <p className="text-sm text-slate-500">
                    AI-powered analysis of your productivity based on screenshots and job role
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

            {/* Date Filter */}
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
          </div>

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

          {/* Overview View - User Card */}
          {view === 'overview' && !loading && userSummary && (
            <div className="max-w-2xl mx-auto">
              <div
                onClick={() => userSummary.hasData && handleCardClick()}
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
                        <p className="text-xs text-slate-500 font-medium">{userSummary.user.jobRole || 'No job role set'}</p>
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
                            const officeStartHour = 10;
                            const minutesFromStart = (punchInHour * 60 + punchInMinute) - (officeStartHour * 60);

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

                            return Object.entries(productiveCategories).map(([category, count]: [string, any]) => (
                              <div key={category} className="flex items-center justify-between p-2 bg-green-50 rounded">
                                <span className="text-gray-700 font-medium">{category}</span>
                                <span className="text-green-700 font-bold">{count}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Unproductive Activities Summary */}
                      {selectedReport.summary.unproductiveCount > 0 && (
                        <div className="bg-white rounded-md p-4 border-l-2 border-red-500">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="text-base">❌</span> Unproductive Activities ({selectedReport.summary.unproductiveCount})
                          </h4>
                          <div className="space-y-2 text-sm">
                            {(() => {
                              const unproductiveAnalyses = selectedReport.analyses.filter(a => !a.isProductive);
                              const unproductiveCategories = unproductiveAnalyses.reduce((acc: any, curr) => {
                                acc[curr.category] = (acc[curr.category] || 0) + 1;
                                return acc;
                              }, {});

                              return Object.entries(unproductiveCategories).map(([category, count]: [string, any]) => (
                                <div key={category} className="flex items-center justify-between p-2 bg-red-50 rounded">
                                  <span className="text-gray-700 font-medium">{category}</span>
                                  <span className="text-red-700 font-bold">{count}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Top Recommendations */}
                      {selectedReport.summary.topRecommendations.length > 0 && (
                        <div className="bg-white rounded-md p-4 border-l-2 border-purple-500">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                            Top Recommendations
                          </h4>
                          <ul className="space-y-2 text-sm">
                            {selectedReport.summary.topRecommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 p-2 bg-purple-50 rounded">
                                <span className="text-purple-600 mt-0.5">•</span>
                                <span className="text-gray-700">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Timeline */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Activity Timeline</h3>
                <div className="space-y-4">
                  {selectedReport.analyses.map((analysis, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        analysis.isProductive
                          ? 'bg-green-50 border-green-500'
                          : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">
                              {format(new Date(analysis.timestamp), 'MMM d, yyyy hh:mm a')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                analysis.isProductive
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}
                            >
                              {analysis.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium mb-2">{analysis.activity}</p>
                          <p className="text-xs text-gray-600">{analysis.observations}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{analysis.productivityScore}%</div>
                          <div className="text-xs text-gray-500">Score</div>
                        </div>
                      </div>
                      {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-1">Recommendations:</p>
                          <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                            {analysis.recommendations.map((rec, recIdx) => (
                              <li key={recIdx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Send Report Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setEmailInput(userSummary?.user.email || '');
                    setShowEmailModal(true);
                  }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Send Report to Email
                </button>
              </div>
            </div>
          )}

          {/* Empty State - No Data */}
          {view === 'overview' && !loading && userSummary && !userSummary.hasData && !error && (
            <div className="bg-white rounded-lg border border-slate-200 p-16 text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Screenshots Available</h3>
              <p className="text-slate-600 text-sm font-medium">
                No screenshots found for the selected date range. Try selecting a different period.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Email Modal */}
      {showEmailModal && (
        <div
          className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div
            className="bg-white rounded-lg border border-slate-200 shadow-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Send Report to Email</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && emailInput.trim()) {
                    handleSendEmail();
                  } else if (e.key === 'Escape') {
                    setShowEmailModal(false);
                  }
                }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailInput('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors border border-slate-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailInput.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Send
              </button>
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

