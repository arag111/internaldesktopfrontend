'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import ScreenshotGallery from '@/app/components/ScreenshotGallery';
import { baseUrl } from '@/app/utils/config';
import Navbar from '@/app/components/Navbar';
import CompanySidebar from "@/app/components/CompanySidebar";
import { Calendar, Users as UsersIcon, BarChart3, RefreshCw, ChevronDown } from 'lucide-react';

interface Screenshot {
  _id: string;
  url: string;
  timestamp: string;
  textExtracted?: boolean;
  embeddingDone?: boolean;
}

interface UserScreenshots {
  [userName: string]: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    screenshots: Screenshot[];
  };
}

export default function MonitoringPage() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [userScreenshots, setUserScreenshots] = useState<UserScreenshots>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Set default to today
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);

  const [startDateTime, setStartDateTime] = useState<string>(
    todayStart.toISOString().slice(0, 16)
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    todayEnd.toISOString().slice(0, 16)
  );

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    if (!token) return router.push('/');
    setRole(userRole);
  }, []);

  useEffect(() => {
    if (role) {
      handleFetchClick(); // fetch once role is set
    }
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFetchClick = async () => {
    const token = localStorage.getItem('token');
    if (!token || !startDateTime || !endDateTime) return;

    try {
      if (role === 'admin' || role === 'manager') {
        const { data } = await axios.get(
          `${baseUrl}/api/screenshots/all-in-range?startDate=${startDateTime}&endDate=${endDateTime}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUserScreenshots(data);
        const userKeys = Object.keys(data);
        if (userKeys.length > 0 && !selectedUser) {
          setSelectedUser(userKeys[0]);
        }
      } else {
        const { data } = await axios.get(
          `${baseUrl}/api/screenshots/range?startDate=${startDateTime}&endDate=${endDateTime}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setScreenshots(data.screenshots || []);
      }
    } catch (error) {
      console.error('Error fetching screenshots:', error);
    }
  };

  const currentUserShots =
    role === 'admin' || role === 'manager'
      ? userScreenshots?.[selectedUser || '']?.screenshots || []
      : screenshots;

  const filteredUserList = Object.keys(userScreenshots).filter((name) =>
    name.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <>
      <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
        <Navbar />
    
        <div className="flex flex-1 overflow-hidden">
          <CompanySidebar />

          <main className="flex-1 ml-64 mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-y-auto">
            {/* Hero Banner Section */}
            <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 mb-0.5">
                      Monitoring
                    </h1>
                    <p className="text-sm text-slate-500">
                      Track and monitor user activity screenshots
                    </p>
                  </div>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-4">
                {(role === 'admin' || role === 'manager') && (
                  <div className="relative w-full sm:w-auto" ref={userDropdownRef}>
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="group relative flex items-center justify-between px-3 py-1.5 h-[38px] w-full sm:w-80 bg-white text-black rounded-md text-sm font-medium hover:bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-200"
                    >
                      <span className="truncate">{selectedUser || 'Select User'}</span>
                      <ChevronDown className={`w-4 h-4 text-black transition-transform duration-200 flex-shrink-0 ${showUserDropdown ? 'transform rotate-180' : ''}`} />
                    </button>

                    {/* User Selector Dropdown */}
                    {showUserDropdown && (
                      <div className="absolute top-full left-0 mt-1.5 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden w-full sm:w-80 z-50">
                        {/* Search Input */}
                        <div className="p-2.5 border-b border-slate-200 bg-white">
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={searchUser}
                            onChange={(e) => setSearchUser(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all duration-200"
                            autoFocus
                          />
                        </div>

                        {/* "All" Category Bar */}
                        <div className="bg-white border-b border-slate-200 px-2.5 py-2">
                          <span className="text-sm font-semibold text-black">All</span>
                        </div>

                        {/* User List */}
                        <div className="max-h-[400px] overflow-y-auto bg-white">
                          {filteredUserList.length > 0 ? (
                            <div className="bg-white">
                              {filteredUserList.map((name) => (
                                <button
                                  key={name}
                                  onClick={() => {
                                    setSelectedUser(name);
                                    setShowUserDropdown(false);
                                    setSearchUser('');
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left bg-white hover:bg-white active:bg-white focus:bg-white border-b border-slate-100 last:border-b-0"
                                  style={{ backgroundColor: 'white' }}
                                >
                                  {/* Avatar Icon */}
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border bg-white border-slate-200">
                                    <UsersIcon className="w-4 h-4 text-black" />
                                  </div>
                                  
                                  {/* User Name */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-black">
                                      {name}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center bg-white">
                              <p className="text-sm text-slate-500">No users found</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Start:</label>
                  <input
                    type="datetime-local"
                    className="flex-1 min-w-0 px-2.5 py-1.5 h-[38px] border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all duration-200 text-sm text-slate-900"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <label className="text-xs font-medium text-slate-600 whitespace-nowrap">End:</label>
                  <input
                    type="datetime-local"
                    className="flex-1 min-w-0 px-2.5 py-1.5 h-[38px] border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all duration-200 text-sm text-slate-900"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                  />
                </div>

                <button
                  className="bg-white hover:bg-white text-black px-3 py-1.5 h-[38px] rounded-md text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap"
                  onClick={handleFetchClick}
                >
                  <RefreshCw size={14} className="text-black" />
                  <span>Fetch</span>
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <ScreenshotGallery screenshots={currentUserShots} />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
