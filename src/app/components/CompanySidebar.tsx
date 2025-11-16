'use client';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { CalendarDays, BarChart2, Settings, Users, ClockPlus, Home, LogOut, User, FileText, Brain } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

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

  const navItems = useMemo(() => [
    { label: 'Dashboard', icon: <Home size={20} />, route: `/${company}/dashboard`, external: false },
    { label: 'Attendance', icon: <CalendarDays size={20} />, route: `/${company}/attendance` },
    { label: 'Time Claim', icon: <ClockPlus size={20} />, route: `/${company}/timeClaim` },
    { label: 'Monitoring', icon: <BarChart2 size={20} />, route: `/${company}/monitoring` },
    // AI Report - show for all users, but route to different pages based on role
    {
      label: 'AI Report',
      icon: <Brain size={20} />,
      route: role === 'admin' || role === 'manager'
        ? `/${company}/ai-reports`
        : `/${company}/my-ai-report`
    },
    ...(role === 'admin' || role === 'manager'
      ? [
          { label: 'Reports', icon: <FileText size={20} />, route: `/${company}/reports` },
        ]
      : []),
    ...(role === 'admin'
      ? [
          { label: 'Users', icon: <Users size={20} />, route: `/${company}/users` },
          { label: 'Configuration', icon: <Settings size={20} />, route: `/${company}/configuration` },
        ]
      : []),
  ], [company, role]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const isActive = (route: string) => pathname === route;

  return (
    <aside className="w-64 fixed top-16 left-0 bottom-0 bg-white border-r border-slate-200 flex flex-col z-10">
      {/* Content */}
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(({ label, icon, route, external }) => {
            const active = !external && isActive(route);
            return (
              <div
                key={label}
                onClick={() => {
                  if (external) {
                    window.location.href = route;
                  } else {
                    router.push(route);
                  }
                }}
                className={`
                  group relative flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors duration-200
                  ${active
                    ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  transition-colors duration-200
                  ${active
                    ? 'text-slate-900'
                    : 'text-slate-500 group-hover:text-slate-700'
                  }
                `}>
                  {icon}
                </div>

                {/* Label */}
                <span className="text-sm font-medium">{label}</span>
              </div>
            );
          })}
        </nav>

        {/* User Profile and Logout button at bottom */}
        <div className="p-5 border-t border-slate-200 bg-white space-y-4">
          {/* User Profile at bottom */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-slate-200">
              <User size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 font-bold text-sm truncate">{userName}</p>
              <p className="text-slate-500 text-xs font-medium capitalize">{role || 'User'}</p>
            </div>
          </div>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white hover:bg-white text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors duration-200 text-sm font-medium"
          >
            <LogOut size={18} className="text-slate-900" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
