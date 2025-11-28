'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { aiReportColors } from '../styles/aiReportTheme';

interface ProductivityBreakdownProps {
  productivePercentage: number;
  unproductivePercentage: number;
}

export default function ProductivityBreakdown({
  productivePercentage,
  unproductivePercentage
}: ProductivityBreakdownProps) {
  const data = [
    { name: 'Productive', value: productivePercentage, color: aiReportColors.productive.bg },
    { name: 'Unproductive', value: unproductivePercentage, color: aiReportColors.unproductive.bg }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-bold mb-4 text-gray-800">
        📈 Productivity Breakdown
      </h3>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex w-full h-8 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-center text-white text-sm font-bold transition-all duration-500"
            style={{
              width: `${productivePercentage}%`,
              backgroundColor: aiReportColors.productive.bg
            }}
          >
            {productivePercentage > 15 && `${Math.round(productivePercentage)}%`}
          </div>
          <div
            className="flex items-center justify-center text-white text-sm font-bold transition-all duration-500"
            style={{
              width: `${unproductivePercentage}%`,
              backgroundColor: aiReportColors.unproductive.bg
            }}
          >
            {unproductivePercentage > 15 && `${Math.round(unproductivePercentage)}%`}
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* Productive Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✅</span>
            <span className="text-xs font-medium text-green-700 uppercase">Productive</span>
          </div>
          <div className="text-2xl font-bold text-green-700">
            {Math.round(productivePercentage)}%
          </div>
        </div>

        {/* Unproductive Card */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">❌</span>
            <span className="text-xs font-medium text-red-700 uppercase">Unproductive</span>
          </div>
          <div className="text-2xl font-bold text-red-700">
            {Math.round(unproductivePercentage)}%
          </div>
        </div>
      </div>
    </div>
  );
}
