'use client';

import { getMetricColor, getMetricLabel } from '../styles/aiReportTheme';

interface MetricsOverviewCardProps {
  title: string;
  value: number;
  icon?: string;
  showProgressBar?: boolean;
}

export default function MetricsOverviewCard({
  title,
  value,
  icon = '📊',
  showProgressBar = true
}: MetricsOverviewCardProps) {
  const color = getMetricColor(value);
  const label = getMetricLabel(value);
  const percentage = Math.round(value);

  // Calculate filled circles (out of 10)
  const filledCircles = Math.round((value / 100) * 10);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </span>
      </div>

      {/* Value */}
      <div className="mb-3">
        <div className="text-3xl font-bold" style={{ color }}>
          {percentage}%
        </div>
      </div>

      {/* Progress Bar */}
      {showProgressBar && (
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                backgroundColor: color
              }}
            />
          </div>
        </div>
      )}

      {/* Circles Indicator */}
      <div className="flex justify-center gap-1 mb-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              index < filledCircles ? '' : 'opacity-20'
            }`}
            style={{
              backgroundColor: index < filledCircles ? color : '#d1d5db'
            }}
          />
        ))}
      </div>

      {/* Label */}
      <div className="text-center">
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{
            color,
            backgroundColor: `${color}15`
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
