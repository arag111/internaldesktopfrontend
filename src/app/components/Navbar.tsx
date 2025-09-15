'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '../lib/authService';
import Image from 'next/image';
import { LogOut, CloudDownload } from 'lucide-react';
export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserName(localStorage.getItem('userName'));
    }
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

      {/* Download Button - Only on medium screens and up */}
      <div className="hidden sm:flex absolute left-1/2 transform -translate-x-1/2">
        <a
          href="https://drive.google.com/file/d/1scJ_sJtXxaxQkZ19w7j1GIR3oOhgTDl2/view?usp=sharing"
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
