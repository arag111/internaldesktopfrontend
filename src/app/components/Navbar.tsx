'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '../lib/authService';
import Image from 'next/image';
import { LogOut, CloudDownload, Calendar } from 'lucide-react';
export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserName(localStorage.getItem('userName'));
    }

    // Set current date
    const updateDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      setCurrentDate(now.toLocaleDateString('en-US', options));
    };

    updateDate();
    // Update date every minute to keep it current
    const interval = setInterval(updateDate, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      await logout(token);
      // Clear all auth-related items from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken'); // Clear refresh token
      localStorage.removeItem('userName');
      localStorage.removeItem('role');
      localStorage.removeItem('companyId');
      router.push('/');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 sm:px-6 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-lg shadow-gray-900/5">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#075a96]/5 via-transparent to-[#075a96]/5 pointer-events-none" />
      
      {/* Logo */}
      <div
        
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#075a96]/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Image
          src="/logo.png"
          alt="Time Nexus Logo"
          width={140}
          height={60}
          className="object-contain relative z-10"
        />
      </div>

      {/* Current Date and Download Button */}
      <div className="hidden sm:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-3">
        {/* Current Date */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/80 text-[#075a96] border border-gray-200/60 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300 hover:scale-105">
          <Calendar size={17} className="text-[#075a96]/70" />
          <span className="text-[#075a96]">{currentDate}</span>
        </div>

        {/* Download Button */}
        <a
          href="https://drive.google.com/drive/folders/1X1n-CLC2yR6I6sXrs48MCpMvcFP9Prz0?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-xl bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
          title="Download Desktop App"
        >
          <CloudDownload size={18} className="text-gray-900" />
          <span>Download App</span>
        </a>
      </div>

      {/* Username and Logout */}
      <div className="flex items-center gap-3">
        {userName && (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#075a96]/20 to-[#0a6fb8]/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span
              className="relative text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-br from-gray-50 to-white text-[#075a96] border border-gray-200/60 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300 hover:scale-105"
              title="User Name"
            >
              <span className="text-gray-500 font-normal">Hi! </span>
              <span className="text-[#075a96]">{userName}</span>
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="group relative !p-2.5 !rounded-xl !bg-gradient-to-br from-gray-100 to-gray-200 !text-[#075a96] hover:!from-red-50 hover:!to-red-100 hover:!text-red-600 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-110 border border-gray-200/60 hover:border-red-200/60"
          title="Sign Out"
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <LogOut size={20} className="relative z-10 transition-transform duration-300 group-hover:rotate-12" />
        </button>
      </div>
    </nav>
  );
}
