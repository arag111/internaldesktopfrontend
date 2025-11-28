'use client';

import { format } from 'date-fns';
import MetricsOverviewCard from './MetricsOverviewCard';
import ProductivityBreakdown from './ProductivityBreakdown';
import TopActivitiesChart from './TopActivitiesChart';

interface Analysis {
  activity: string;
  category: string;
  isProductive: boolean;
  productivityScore: number;
  observations: string;
  recommendations: string[];
  timestamp: string;
}

interface Summary {
  ai_score: number;
  timeBasedScore: number;
  screenshotBasedScore: number;
  totalScreenshots: number;
  productiveCount: number;
  unproductiveCount: number;
  topProductiveCategories: Array<{ category: string; count: number }>;
  topUnproductiveCategories: Array<{ category: string; count: number }>;
}

interface AIVerdictSummaryProps {
  userName: string;
  jobRole?: string;
  punchInTime?: string | null;
  officeHours?: { start: string; end: string };
  summary: Summary;
  analyses: Analysis[];
  dateRange: { startDate: string; endDate: string };
}

export default function AIVerdictSummary({
  userName,
  jobRole,
  punchInTime,
  officeHours = { start: '10:00 AM', end: '7:00 PM' },
  summary,
  analyses,
  dateRange
}: AIVerdictSummaryProps) {
  // Calculate percentages
  const productivePercentage = summary.totalScreenshots > 0
    ? (summary.productiveCount / summary.totalScreenshots) * 100
    : 0;
  const unproductivePercentage = 100 - productivePercentage;

  // Calculate focus rate (average productivity score)
  const focusRate = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.productivityScore, 0) / analyses.length
    : 0;

  // Get attendance status
  const getAttendanceStatus = () => {
    if (!punchInTime) return { status: 'No Data', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: '❓' };

    const punchIn = new Date(punchInTime);
    const hours = punchIn.getHours();
    const minutes = punchIn.getMinutes();

    // Office starts at 10:00 AM
    const officeStartHour = 10;

    if (hours < officeStartHour) {
      return { status: '✅ On Time - Arrived Early', color: 'text-green-700', bgColor: 'bg-green-100', icon: '✅' };
    } else if (hours === officeStartHour && minutes === 0) {
      return { status: '✅ On Time - Arrived on time', color: 'text-green-700', bgColor: 'bg-green-100', icon: '✅' };
    } else if (hours === officeStartHour && minutes <= 15) {
      return { status: '⚠️ Slightly Late', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: '⚠️' };
    } else {
      return { status: '❌ Late', color: 'text-red-700', bgColor: 'bg-red-100', icon: '❌' };
    }
  };

  const attendanceStatus = getAttendanceStatus();

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'Coding': '💻',
      'Development': '⚙️',
      'Documentation': '📝',
      'Meeting': '👥',
      'Email': '📧',
      'Data Management': '🔧',
      'Lead Generation': '📊',
      'Recruitment': '👔',
      'Administrative Tasks': '📋',
      'Social Media': '📱',
      'Unknown': '❓'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (category.includes(key)) return icon;
    }

    return '📋';
  };

  // Format activities for charts
  const topProductiveActivities = summary.topProductiveCategories.map(cat => ({
    name: cat.category,
    count: cat.count,
    icon: getCategoryIcon(cat.category)
  }));

  const topUnproductiveActivities = summary.topUnproductiveCategories.map(cat => ({
    name: cat.category,
    count: cat.count,
    icon: getCategoryIcon(cat.category)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">🎯 AI Verdict Summary - {userName}</h2>
            {jobRole && (
              <p className="text-blue-100 text-sm">
                Role: <span className="font-medium">{jobRole}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">📅 {format(new Date(dateRange.startDate), 'MMM dd, yyyy')}</p>
            <p className="text-xs text-blue-200">Office Hours: {officeHours.start} - {officeHours.end}</p>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Quick Metrics Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsOverviewCard
            title="AI SCORE"
            value={summary.ai_score}
            icon="🤖"
          />
          <MetricsOverviewCard
            title="TIME"
            value={summary.timeBasedScore}
            icon="⏱️"
          />
          <MetricsOverviewCard
            title="QUALITY"
            value={summary.screenshotBasedScore}
            icon="⭐"
          />
          <MetricsOverviewCard
            title="FOCUS"
            value={focusRate}
            icon="🎯"
          />
        </div>
      </div>

      {/* Attendance & Punctuality */}
      {punchInTime && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⏰ Attendance & Punctuality</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Arrived:</p>
              <p className="text-2xl font-bold text-gray-800">
                {format(new Date(punchInTime), 'h:mm a')}
              </p>
            </div>
            <div className={`${attendanceStatus.bgColor} ${attendanceStatus.color} px-4 py-2 rounded-lg font-medium`}>
              {attendanceStatus.status}
            </div>
          </div>
        </div>
      )}

      {/* Productivity Breakdown */}
      <ProductivityBreakdown
        productivePercentage={productivePercentage}
        unproductivePercentage={unproductivePercentage}
      />

      {/* Top Activities */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-6">📋 Activity Breakdown</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Productive Activities */}
          <div>
            <TopActivitiesChart
              activities={topProductiveActivities}
              title="Top Productive Activities"
              isProductive={true}
            />
          </div>

          {/* Unproductive Activities */}
          <div>
            <TopActivitiesChart
              activities={topUnproductiveActivities}
              title="Time Wasters"
              isProductive={false}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
