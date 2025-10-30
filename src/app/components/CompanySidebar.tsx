'use client';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { CalendarDays, BarChart2, Settings, Users, ClockPlus, Home, LogOut, User, FileText, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CompanySidebar() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const storedName = localStorage.getItem('username') || 'User';
    setRole(storedRole);
    setUserName(storedName);
  }, []);

  const company = params.company as string;

  const navItems = [
    { label: 'Dashboard', icon: <Home size={20} />, route: `/${company}` },
    { label: 'Attendance', icon: <CalendarDays size={20} />, route: `/${company}/attendance` },
    { label: 'Time Claim', icon: <ClockPlus size={20} />, route: `/${company}/timeClaim` },
    { label: 'Monitoring', icon: <BarChart2 size={20} />, route: `/${company}/monitoring` },
    ...(role === 'admin' || role === 'manager'
      ? [
          { label: 'Reports', icon: <FileText size={20} />, route: `/${company}/reports` },
          { label: 'AI Report', icon: <Brain size={20} />, route: `/${company}/ai-reports` },
        ]
      : []),
    ...(role === 'admin'
      ? [
          { label: 'Users', icon: <Users size={20} />, route: `/${company}/users` },
          { label: 'Configuration', icon: <Settings size={20} />, route: `/${company}/configuration` },
        ]
      : []),
  ];

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const isActive = (route: string) => pathname === route;

  return (
    <aside className="w-64 fixed top-16 left-0 bottom-0 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm">
      {/* Content */}
      <div className="flex flex-col h-full">
        {/* User Profile at top */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm truncate">{userName}</p>
              <p className="text-gray-500 text-xs">{role || 'User'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(({ label, icon, route }) => {
            const active = isActive(route);
            return (
              <div
                key={label}
                onClick={() => router.push(route)}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200
                  ${active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                {/* Icon */}
                <div className={`transition-colors ${active ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                  {icon}
                </div>

                {/* Label */}
                <span className="text-sm">{label}</span>
              </div>
            );
          })}
        </nav>

        {/* Logout button at bottom */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium shadow-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
