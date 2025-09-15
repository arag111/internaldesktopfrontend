'use client';
import { useRouter } from 'next/navigation';
import { CalendarDays, BarChart2, Settings, ChevronLeft, ChevronRight, Users, ClockPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
export default function Sidebar() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    setRole(storedRole);
  }, []);
  
  const navItems = [
    { label: 'Attendance', icon: <CalendarDays size={20} />, route: '/dashboard' },
    { label: 'Time Claim', icon: <ClockPlus size={20} />, route: '/timeClaim' },
    { label: 'Monitoring', icon: <BarChart2 size={20} />, route: '/dashboard/monitoring' },
    ...(role === 'admin'
      ? [
          { label: 'Configuration', icon: <Settings size={20} />, route: '/configuration' },
          { label: 'Users', icon: <Users size={20} />, route: '/users' },
        ]
      : []),
  ];

  return (
    <aside className="w-64 fixed top-16 left-0 bottom-0 bg-white border-r border-gray-200 shadow-sm p-6 flex flex-col z-10">
      <h2 className="text-xl font-semibold mb-4 text-[#075a96]">Navigation</h2>
      {/* <div className="flex justify-end pr-2 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#075a96] p-1 rounded-full hover:bg-gray-100 transition"
          title="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div> */}

      <nav className="px-4 space-y-4 text-gray-700 font-medium">
        {navItems.map(({ label, icon, route }) => (
          <div
            key={label}
            onClick={() => router.push(route)}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#075a96]/10 hover:text-[#075a96] cursor-pointer transition"
          >
            {icon}
            {!collapsed && <span>{label}</span>}
          </div>
        ))}
      </nav>
    </aside>
  );
}
