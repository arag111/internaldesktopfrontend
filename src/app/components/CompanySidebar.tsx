'use client';
import { useRouter, useParams } from 'next/navigation';
import { CalendarDays, BarChart2, Settings, Users, ClockPlus, Home } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CompanySidebar() {
  const router = useRouter();
  const params = useParams();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    setRole(storedRole);
  }, []);

  const company = params.company as string;

  const navItems = [
    { label: 'Dashboard', icon: <Home size={20} />, route: `/${company}` },
    { label: 'Attendance', icon: <CalendarDays size={20} />, route: `/${company}/attendance` },
    { label: 'Time Claim', icon: <ClockPlus size={20} />, route: `/${company}/timeClaim` },
    { label: 'Monitoring', icon: <BarChart2 size={20} />, route: `/${company}/monitoring` },
    ...(role === 'admin'
      ? [
          { label: 'Users', icon: <Users size={20} />, route: `/${company}/users` },
          { label: 'Configuration', icon: <Settings size={20} />, route: `/${company}/configuration` },
        ]
      : []),
  ];

  return (
    <aside className="w-64 fixed top-16 left-0 bottom-0 bg-white border-r border-gray-200 shadow-sm p-6 flex flex-col z-10">
      <h2 className="text-xl font-semibold mb-4 text-[#075a96]">
        {company?.toUpperCase()} Portal
      </h2>

      <nav className="px-4 space-y-4 text-gray-700 font-medium">
        {navItems.map(({ label, icon, route }) => (
          <div
            key={label}
            onClick={() => router.push(route)}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#075a96]/10 hover:text-[#075a96] cursor-pointer transition"
          >
            {icon}
            <span>{label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}