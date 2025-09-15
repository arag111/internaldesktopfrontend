'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { baseUrl } from '@/app/utils/config';
import Navbar from '@/app/components/Navbar';
import CompanySidebar from '@/app/components/CompanySidebar';

export default function ConfigurationPage() {
  const router = useRouter();

  const [inactivityDurationMins, setInactivityDurationMins] = useState(0);
  const [screenshotIntervalMins, setScreenshotIntervalMins] = useState(0);
  const [applicationAdminPassword, setApplicationAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [applicationPunchInTime, setApplicationPunchInTime] = useState('');
  const [applicationPunchOutTime, setApplicationPunchOutTime] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get(`${baseUrl}/api/config`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setInactivityDurationMins(res.data.inactivityDurationMins);
        setScreenshotIntervalMins(res.data.screenshotIntervalMins);
        setApplicationAdminPassword(res.data.applicationAdminPassword || '');
        setApplicationPunchInTime(res.data.applicationPunchInTime || '');
        setApplicationPunchOutTime(res.data.applicationPunchOutTime || '');
      } catch (err) {
        console.error('Failed to fetch config:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (applicationAdminPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError('');

    try {
      await axios.put(
        `${baseUrl}/api/config`,
        {
          inactivityDurationMins,
          screenshotIntervalMins,
          applicationAdminPassword,
          applicationPunchInTime,
          applicationPunchOutTime,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert('Configuration updated successfully');
      router.push('/dashboard');
    } catch (err) {
      alert('Failed to update configuration');
      console.error(err);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <CompanySidebar />
        <div className="ml-60 mt-10 w-full p-8">
          <div className="bg-white p-8 rounded-lg shadow w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuration Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium">Inactivity Duration (mins)</label>
                <input
                  type="number"
                  value={inactivityDurationMins}
                  onChange={(e) => setInactivityDurationMins(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium">Screenshot Interval (mins)</label>
                <input
                  type="number"
                  value={screenshotIntervalMins}
                  onChange={(e) => setScreenshotIntervalMins(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium">Admin Password</label>
                <input
                  type="password"
                  value={applicationAdminPassword}
                  onChange={(e) => setApplicationAdminPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-medium">Punch In Time (HH:MM)</label>
                <input
                  type="time"
                  value={applicationPunchInTime}
                  onChange={(e) => setApplicationPunchInTime(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium">Punch Out Time (HH:MM)</label>
                <input
                  type="time"
                  value={applicationPunchOutTime}
                  onChange={(e) => setApplicationPunchOutTime(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
