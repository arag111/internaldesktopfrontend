'use client';

import { aiReportColors } from '../styles/aiReportTheme';

interface ProductivityBreakdownProps {
  productivePercentage: number;
  unproductivePercentage: number;
}

export default function ProductivityBreakdown({
  productivePercentage,
  unproductivePercentage
}: ProductivityBreakdownProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h3 className="text-sm font-semibold mb-3 text-gray-700 flex items-center gap-2">
        <span className="text-base">📈</span>
        Productivity Breakdown
      </h3>

      {/* Progress Bar - Compact */}
      <div className="mb-4">
        <div className="flex w-full h-6 rounded-md overflow-hidden">
          <div
            className="flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{
              width: `${productivePercentage}%`,
              backgroundColor: aiReportColors.productive.bg
            }}
          >
            {productivePercentage > 10 && `${Math.round(productivePercentage)}%`}
          </div>
          <div
            className="flex items-center justify-center text-white text-xs font-semibold transition-all duration-500"
            style={{
              width: `${unproductivePercentage}%`,
              backgroundColor: aiReportColors.unproductive.bg
            }}
          >
            {unproductivePercentage > 10 && `${Math.round(unproductivePercentage)}%`}
          </div>
        </div>
      </div>

      {/* Compact Stats Cards - Side by Side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Productive Card */}
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✅</span>
            <span className="text-xs font-medium text-green-700">Productive</span>
          </div>
          <div className="text-xl font-bold text-green-700">
            {Math.round(productivePercentage)}%
          </div>
        </div>

        {/* Unproductive Card */}
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">❌</span>
            <span className="text-xs font-medium text-red-700">Unproductive</span>
          </div>
          <div className="text-xl font-bold text-red-700">
            {Math.round(unproductivePercentage)}%
          </div>
        </div>
      </div>
    </div>
  );
}
