'use client';

import { aiReportColors } from '../styles/aiReportTheme';

interface Activity {
  name: string;
  count: number;
  icon?: string;
}

interface TopActivitiesChartProps {
  activities: Activity[];
  title: string;
  isProductive: boolean;
  maxItems?: number;
}

export default function TopActivitiesChart({
  activities,
  title,
  isProductive,
  maxItems = 5
}: TopActivitiesChartProps) {
  const topActivities = activities.slice(0, maxItems);
  const totalCount = topActivities.reduce((sum, a) => sum + a.count, 0);

  const baseColor = isProductive
    ? aiReportColors.productive.bg
    : aiReportColors.unproductive.bg;

  const lightColor = isProductive
    ? aiReportColors.productive.light
    : aiReportColors.unproductive.light;

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>{isProductive ? '✅' : '❌'}</span>
        <span>{title}</span>
      </h4>

      {topActivities.length > 0 ? (
        <div className="space-y-3">
          {topActivities.map((activity, index) => {
            const percentage = totalCount > 0 ? (activity.count / totalCount) * 100 : 0;

            return (
              <div key={index} className="group">
                {/* Activity Name and Count */}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{activity.icon || '📋'}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {activity.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {activity.count} {activity.count === 1 ? 'time' : 'times'}
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500 group-hover:opacity-80"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: baseColor
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 text-sm">
          No {isProductive ? 'productive' : 'unproductive'} activities detected
        </div>
      )}
    </div>
  );
}
