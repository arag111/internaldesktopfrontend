'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import ScreenshotGallery from '@/app/components/ScreenshotGallery';
import { baseUrl } from '@/app/utils/config';
import Navbar from '@/app/components/Navbar';
import CompanySidebar from "@/app/components/CompanySidebar";

interface Screenshot {
  _id: string;
  url: string;
  timestamp: string;
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

function getDefaultStartTime(): string {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0); // today at 9:00 AM
  return start.toISOString().slice(0, 16);
}

function getDefaultEndTime(): string {
  const end = new Date();
  end.setHours(23, 99, 0, 0);
  return end.toISOString().slice(0, 16); // current time
}

export default function MonitoringPage() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [userScreenshots, setUserScreenshots] = useState<UserScreenshots>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [startDateTime, setStartDateTime] = useState<string>(getDefaultStartTime());
  const [endDateTime, setEndDateTime] = useState<string>(getDefaultEndTime());

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

      <div className=" ml-60 pt-20 px-6 pb-6 bg-gray-50 min-h-screen overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#075a96] mb-2">Monitoring</h1>
            <div className="flex flex-col md:flex-row items-center gap-3 ">
              <input
                type="datetime-local"
                className="border rounded-md px-3 py-2 text-sm"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
              />
              <span className="text-gray-600">to</span>
              <input
                type="datetime-local"
                className="border rounded-md px-3 py-2 text-sm"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
              />
              <button
                className="bg-[#075a96] text-white px-4 py-2 rounded-md hover:bg-[#064b7d] transition text-sm"
                onClick={handleFetchClick}
              >
                Fetch
              </button>
            </div>
          </div>
        </div>

        {role === 'admin' || role === 'manager' ? (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/4 bg-white rounded-xl shadow-md p-4 border border-gray-200">
              <h2 className="text-lg font-semibold mb-3 text-[#075a96]">Users</h2>
              <input
                type="text"
                placeholder="Search user..."
                className="w-full mb-4 px-3 py-2 border rounded-md text-sm"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {filteredUserList.length > 0 ? (
                  filteredUserList.map((name) => (
                    <div
                      key={name}
                      className={`cursor-pointer px-3 py-2 rounded-lg transition text-sm ${
                        selectedUser === name
                          ? 'bg-[#075a96] text-white'
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                      onClick={() => setSelectedUser(name)}
                    >
                      {name}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No users found.</div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <ScreenshotGallery screenshots={currentUserShots} />
            </div>
          </div>
        ) : (
          <ScreenshotGallery screenshots={currentUserShots} />
        )}
      </div>
      </div>
    </div>
    </>
  );
}
