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
      localStorage.removeItem('userName');
      localStorage.removeItem('role');
      localStorage.removeItem('companyId');
      router.push('/');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white text-[#075a96] h-16 flex items-center justify-between px-4 sm:px-6 shadow-md">
      {/* Logo */}
      <div
        className="cursor-pointer flex items-center h-full"
        onClick={() => router.push('/dashboard')}
      >
        <Image
          src="/logo.png"
          alt="Time Nexus Logo"
          width={140}
          height={60}
          className="object-contain"
        />
      </div>

      {/* Current Date and Download Button */}
      <div className="hidden sm:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-4">
        {/* Current Date */}
        <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded bg-gray-50 text-[#075a96] border border-gray-200">
          <Calendar size={16} />
          <span>{currentDate}</span>
        </div>

        {/* Download Button */}
        <a
          href="https://drive.google.com/file/d/1NCeYjDh3f75b27dbb385_z81wI0MVNld/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded border border-[#075a96]/40 bg-[#075a96]/10 text-[#075a96] hover:bg-[#075a96] hover:text-white transition shadow"
          title="Download Desktop App"
        >
          <CloudDownload size={18} />
          Download App
        </a>
      </div>

      {/* Username and Logout */}
      <div className="flex items-center gap-3">
        {userName && (
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-300"
            title="User Name"
          >
            Hi! {userName}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="!p-2 !rounded-full !bg-gray-300 !text-gray-600 hover:!bg-gray-200 hover:!text-black transition-shadow shadow"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
