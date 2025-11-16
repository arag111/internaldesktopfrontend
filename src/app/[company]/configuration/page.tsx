'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { baseUrl } from '@/app/utils/config';
import { Settings, Eye, EyeOff, Clock, Shield, Camera, Info, CheckCircle, X } from 'lucide-react';

export default function ConfigurationPage() {
  const router = useRouter();

  // Original values for dirty state tracking
  const [originalValues, setOriginalValues] = useState({
    inactivityDurationMins: 0,
    screenshotIntervalMins: 0,
    applicationPunchInTime: '',
    applicationPunchOutTime: '',
  });

  // Current form values
  const [inactivityDurationMins, setInactivityDurationMins] = useState(0);
  const [screenshotIntervalMins, setScreenshotIntervalMins] = useState(0);
  const [applicationAdminPassword, setApplicationAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [applicationPunchInTime, setApplicationPunchInTime] = useState('');
  const [applicationPunchOutTime, setApplicationPunchOutTime] = useState('');

  // UI state
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchConfig = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      setLoading(true);
      try {
        const res = await axios.get(`${baseUrl}/api/config`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const fetchedValues = {
          inactivityDurationMins: res.data.inactivityDurationMins || 1,
          screenshotIntervalMins: res.data.screenshotIntervalMins || 3,
          applicationPunchInTime: res.data.applicationPunchInTime || '10:00',
          applicationPunchOutTime: res.data.applicationPunchOutTime || '19:00',
        };

        setInactivityDurationMins(fetchedValues.inactivityDurationMins);
        setScreenshotIntervalMins(fetchedValues.screenshotIntervalMins);
        setApplicationPunchInTime(fetchedValues.applicationPunchInTime);
        setApplicationPunchOutTime(fetchedValues.applicationPunchOutTime);

        // Store original values for dirty state tracking
        setOriginalValues(fetchedValues);

        // ✅ SECURITY FIX: Do NOT load admin password into state
        // Password field stays empty - only set if user wants to change it
      } catch (err) {
        setToastMessage({ message: 'Failed to load configuration', type: 'error' });
        setTimeout(() => setToastMessage(null), 3000);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // ✅ FEATURE: Dirty state tracking
  const isDirty = useCallback(() => {
    return (
      inactivityDurationMins !== originalValues.inactivityDurationMins ||
      screenshotIntervalMins !== originalValues.screenshotIntervalMins ||
      applicationPunchInTime !== originalValues.applicationPunchInTime ||
      applicationPunchOutTime !== originalValues.applicationPunchOutTime ||
      applicationAdminPassword !== '' ||
      confirmPassword !== ''
    );
  }, [inactivityDurationMins, screenshotIntervalMins, applicationPunchInTime, applicationPunchOutTime, applicationAdminPassword, confirmPassword, originalValues]);

  // ✅ FEATURE: Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate inactivity duration (1-60 minutes)
    if (inactivityDurationMins < 1) {
      newErrors.inactivityDurationMins = 'Must be at least 1 minute';
    } else if (inactivityDurationMins > 60) {
      newErrors.inactivityDurationMins = 'Must be 60 minutes or less';
    }

    // Validate screenshot interval (1-30 minutes)
    if (screenshotIntervalMins < 1) {
      newErrors.screenshotIntervalMins = 'Must be at least 1 minute';
    } else if (screenshotIntervalMins > 30) {
      newErrors.screenshotIntervalMins = 'Must be 30 minutes or less';
    }

    // Validate password if provided
    if (applicationAdminPassword || confirmPassword) {
      if (applicationAdminPassword !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      if (applicationAdminPassword && applicationAdminPassword.length < 6) {
        newErrors.applicationAdminPassword = 'Password must be at least 6 characters';
      }
    }

    // ✅ CRITICAL FIX: Validate punch out > punch in
    if (applicationPunchInTime && applicationPunchOutTime) {
      const punchIn = new Date(`2000-01-01T${applicationPunchInTime}`);
      const punchOut = new Date(`2000-01-01T${applicationPunchOutTime}`);

      if (punchOut <= punchIn) {
        newErrors.applicationPunchOutTime = 'Punch out time must be after punch in time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = () => {
    setInactivityDurationMins(originalValues.inactivityDurationMins);
    setScreenshotIntervalMins(originalValues.screenshotIntervalMins);
    setApplicationPunchInTime(originalValues.applicationPunchInTime);
    setApplicationPunchOutTime(originalValues.applicationPunchOutTime);
    setApplicationAdminPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      setToastMessage({ message: 'Please fix validation errors', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setSaving(true);
    try {
      const payload: any = {
        inactivityDurationMins,
        screenshotIntervalMins,
        applicationPunchInTime,
        applicationPunchOutTime,
      };

      // ✅ SECURITY FIX: Only send password if user entered one
      if (applicationAdminPassword) {
        payload.applicationAdminPassword = applicationAdminPassword;
      }

      await axios.put(
        `${baseUrl}/api/config`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update original values after successful save
      setOriginalValues({
        inactivityDurationMins,
        screenshotIntervalMins,
        applicationPunchInTime,
        applicationPunchOutTime,
      });

      // Clear password fields
      setApplicationAdminPassword('');
      setConfirmPassword('');

      setLastSaved(new Date());
      setToastMessage({ message: 'Configuration saved successfully', type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.msg || 'Failed to update configuration';
      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [applicationAdminPassword, confirmPassword, inactivityDurationMins, screenshotIntervalMins, applicationPunchInTime, applicationPunchOutTime]);

  // Helper to get time ago string
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ marginLeft: '16rem' }}>
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-600">Loading configuration...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ marginLeft: '16rem' }}>
          {/* Hero Banner Section */}
          <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 mb-0.5">
                    Configuration Settings
                  </h1>
                  <p className="text-sm text-slate-500">
                    Manage application settings and preferences for your organization
                  </p>
                </div>
              </div>

              {/* Last Saved Indicator */}
              {lastSaved && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">
                    Saved {getTimeAgo(lastSaved)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="space-y-8">

              {/* ✅ FEATURE: Tracking Settings Section */}
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Tracking Settings</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Configure activity monitoring and screenshot capture</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">
                      Inactivity Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={inactivityDurationMins}
                      onChange={(e) => {
                        setInactivityDurationMins(Number(e.target.value));
                        if (errors.inactivityDurationMins) {
                          const newErrors = { ...errors };
                          delete newErrors.inactivityDurationMins;
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${
                        errors.inactivityDurationMins ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.inactivityDurationMins && (
                      <p className="text-red-500 text-xs mt-1">{errors.inactivityDurationMins}</p>
                    )}
                    <div className="flex items-start gap-1.5 mt-2">
                      <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600">
                        Time of inactivity before marking user as idle. Recommended: 1-5 minutes.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">
                      Screenshot Interval (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={screenshotIntervalMins}
                      onChange={(e) => {
                        setScreenshotIntervalMins(Number(e.target.value));
                        if (errors.screenshotIntervalMins) {
                          const newErrors = { ...errors };
                          delete newErrors.screenshotIntervalMins;
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${
                        errors.screenshotIntervalMins ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.screenshotIntervalMins && (
                      <p className="text-red-500 text-xs mt-1">{errors.screenshotIntervalMins}</p>
                    )}
                    <div className="flex items-start gap-1.5 mt-2">
                      <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600">
                        How often to capture screenshots for activity tracking. Recommended: 3-5 minutes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ FEATURE: Security Settings Section */}
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Security Settings</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Change admin password (leave empty to keep current)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">
                      New Admin Password (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        value={applicationAdminPassword}
                        placeholder="Enter new password to change"
                        onChange={(e) => {
                          setApplicationAdminPassword(e.target.value);
                          if (errors.applicationAdminPassword) {
                            const newErrors = { ...errors };
                            delete newErrors.applicationAdminPassword;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full px-3 pr-10 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${
                          errors.applicationAdminPassword ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                        }`}
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
                    {errors.applicationAdminPassword && (
                      <p className="text-red-500 text-xs mt-1">{errors.applicationAdminPassword}</p>
                    )}
                    <div className="flex items-start gap-1.5 mt-2">
                      <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600">
                        Leave empty to keep current password. Minimum 6 characters.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        placeholder="Confirm new password"
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) {
                            const newErrors = { ...errors };
                            delete newErrors.confirmPassword;
                            setErrors(newErrors);
                          }
                        }}
                        className={`w-full px-3 pr-10 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${
                          errors.confirmPassword ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                        }`}
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
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ FEATURE: Working Hours Section */}
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Working Hours</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Set default punch in and punch out times</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">
                      Punch In Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={applicationPunchInTime}
                      onChange={(e) => {
                        setApplicationPunchInTime(e.target.value);
                        if (errors.applicationPunchInTime) {
                          const newErrors = { ...errors };
                          delete newErrors.applicationPunchInTime;
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${
                        errors.applicationPunchInTime ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.applicationPunchInTime && (
                      <p className="text-red-500 text-xs mt-1">{errors.applicationPunchInTime}</p>
                    )}
                    <div className="flex items-start gap-1.5 mt-2">
                      <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600">
                        Default start time for work day.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 h-4 leading-tight block">
                      Punch Out Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={applicationPunchOutTime}
                      onChange={(e) => {
                        setApplicationPunchOutTime(e.target.value);
                        if (errors.applicationPunchOutTime) {
                          const newErrors = { ...errors };
                          delete newErrors.applicationPunchOutTime;
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2.5 border-b-2 bg-transparent focus:outline-none transition-colors duration-200 text-sm text-slate-900 placeholder:text-slate-400 h-[38px] leading-[1.5] ${
                        errors.applicationPunchOutTime ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.applicationPunchOutTime && (
                      <p className="text-red-500 text-xs mt-1">{errors.applicationPunchOutTime}</p>
                    )}
                    <div className="flex items-start gap-1.5 mt-2">
                      <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600">
                        Default end time for work day. Must be after punch in time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={handleReset}
                disabled={!isDirty() || saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border transition-colors duration-200 font-medium text-sm ${
                  !isDirty() || saving
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
                title={!isDirty() ? 'No changes to reset' : 'Reset to original values'}
              >
                <X className="w-4 h-4" />
                Reset
              </button>

              <button
                onClick={handleSubmit}
                disabled={!isDirty() || saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border transition-colors duration-200 font-medium text-sm ${
                  !isDirty() || saving
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                }`}
                title={!isDirty() ? 'No changes to save' : 'Save configuration'}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>

      {/* Toast Popup */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 toast-slide-in">
          <div className={`rounded-lg border shadow-lg px-4 py-3 min-w-[300px] flex items-center justify-between gap-4 ${
            toastMessage.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'text-green-900'
                : 'text-red-900'
            }`}>
              {toastMessage.message}
            </p>
            <button
              onClick={() => setToastMessage(null)}
              className={`hover:opacity-70 transition-colors flex-shrink-0 ${
                toastMessage.type === 'success'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
