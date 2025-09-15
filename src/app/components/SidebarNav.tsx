'use client';

import { CalendarDays, BarChart2, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SidebarNav() {
  const router = useRouter();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 shadow-sm p-6 flex flex-col">
      <h2 className="text-2xl font-semibold mb-8 text-blue-600">Dashboard</h2>
      <nav className="space-y-4 text-gray-700 font-medium">
        <div className="flex items-center space-x-2 hover:text-blue-600 cursor-pointer">
          <CalendarDays size={20} />
          <span>Attendance</span>
        </div>
        <div className="flex items-center space-x-2 hover:text-blue-600 cursor-pointer">
          <BarChart2 size={20} />
            <span
            onClick={() => router.push('/dashboard/monitoring')}
            className="cursor-pointer hover:text-blue-600"
            >
            Monitoring
            </span>
        </div>
        <div
          className="flex items-center space-x-2 hover:text-blue-600 cursor-pointer"
          onClick={() => router.push('/configuration')}
        >
          <Settings size={20} />
          <span>Configuration</span>
        </div>
      </nav>
    </aside>
  );
}