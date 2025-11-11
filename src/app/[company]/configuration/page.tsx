'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { baseUrl } from '@/app/utils/config';
import Navbar from '@/app/components/Navbar';
import CompanySidebar from '@/app/components/CompanySidebar';
import { Settings, Eye, EyeOff } from 'lucide-react';

export default function ConfigurationPage() {
  const router = useRouter();

  const [inactivityDurationMins, setInactivityDurationMins] = useState(0);
  const [screenshotIntervalMins, setScreenshotIntervalMins] = useState(0);
  const [applicationAdminPassword, setApplicationAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [applicationPunchInTime, setApplicationPunchInTime] = useState('');
  const [applicationPunchOutTime, setApplicationPunchOutTime] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleSubmit = useCallback(async () => {
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
  }, [applicationAdminPassword, confirmPassword, inactivityDurationMins, screenshotIntervalMins, applicationPunchInTime, applicationPunchOutTime, router]);

  return (
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
                  <Settings className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 mb-0.5">
                    Configuration Settings
                  </h1>
                  <p className="text-sm text-slate-500">
                    Manage application settings and preferences
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">Inactivity Duration (mins)</label>
                <input
                  type="number"
                  value={inactivityDurationMins}
                  onChange={(e) => setInactivityDurationMins(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">Screenshot Interval (mins)</label>
                <input
                  type="number"
                  value={screenshotIntervalMins}
                  onChange={(e) => setScreenshotIntervalMins(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">Admin Password</label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={applicationAdminPassword}
                    onChange={(e) => setApplicationAdminPassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-2 top-[70%] -translate-y-1/2 flex items-center justify-center hover:text-blue-600 transition-colors duration-200 cursor-pointer z-10"
                    style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, outline: 'none', color: '#64748b' }}
                    title={showAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showAdminPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 pr-10 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-[70%] -translate-y-1/2 flex items-center justify-center hover:text-blue-600 transition-colors duration-200 cursor-pointer z-10"
                    style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, outline: 'none', color: '#64748b' }}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-500 text-xs mt-1.5">{passwordError}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">Punch In Time (HH:MM)</label>
                <input
                  type="time"
                  value={applicationPunchInTime}
                  onChange={(e) => setApplicationPunchInTime(e.target.value)}
                  className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">Punch Out Time (HH:MM)</label>
                <input
                  type="time"
                  value={applicationPunchOutTime}
                  onChange={(e) => setApplicationPunchOutTime(e.target.value)}
                  className="w-full px-3 py-2.5 border-b-2 border-slate-200 bg-transparent focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-white hover:bg-white text-black rounded-lg text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors duration-200"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
