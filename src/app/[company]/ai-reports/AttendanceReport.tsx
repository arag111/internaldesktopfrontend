'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, Mail, Loader2, TrendingUp, CheckCircle, AlertCircle, Building2, Users, Activity, BarChart3 } from 'lucide-react';

interface AttendanceRecord {
  userId: number;
  userName: string;
  userEmail: string;
  jobRole: string;
  date: string;
  punchInTime: string;
  punchInTimeFormatted: string;
  punchInIpAddress: string;
  minutesFromStart: number;
  status: string;
  statusColor: string;
  location: string;
  locationColor: string;
}

interface UserAttendance {
  user: {
    id: number;
    name: string;
    email: string;
    jobRole: string;
  };
  records: AttendanceRecord[];
  stats: {
    totalDays: number;
    onTimeCount: number;
    lateCount: number;
    officeCount: number;
    remoteCount: number;
  };
}

interface AttendanceData {
  period: string;
  startDate: string;
  endDate: string;
  totalRecords: number;
  attendance: UserAttendance[];
}

type Period = 'day' | 'week' | 'month';

export default function AttendanceReport() {
  const [period, setPeriod] = useState<Period>('week');
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const [officeIp, setOfficeIp] = useState<string | null>(null);

  useEffect(() => {
    loadAttendanceReport();
  }, [period]);

  const loadAttendanceReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5002';
      const response = await fetch(`${API_BASE_URL}/api/attendance/report?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load attendance report');
      }

      const data = await response.json();
      setAttendanceData(data);
    } catch (err: any) {
      console.error('Error loading attendance report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (userId: number, email: string) => {
    try {
      setSendingEmail(userId);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5002';

      const response = await fetch(`${API_BASE_URL}/api/attendance/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          email,
          period
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      alert(`Attendance report sent to ${email}`);
    } catch (err: any) {
      console.error('Error sending email:', err);
      alert('Failed to send email: ' + err.message);
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusBadgeClass = (statusColor: string) => {
    switch (statusColor) {
      case 'green': return 'bg-green-50 text-green-700 border-green-200';
      case 'yellow': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'red': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getLocationBadgeClass = (locationColor: string) => {
    switch (locationColor) {
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'gray': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Get all unique dates from all records
  const getAllDates = () => {
    if (!attendanceData) return [];
    const dateSet = new Set<string>();
    attendanceData.attendance.forEach(userAttendance => {
      userAttendance.records.forEach(record => {
        dateSet.add(record.date);
      });
    });
    return Array.from(dateSet).sort().reverse(); // Most recent first
  };

  const allDates = getAllDates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
            Attendance Report
          </h2>
          </div>
          <p className="text-sm text-slate-500 ml-[42px]">
            Track punctuality and work location
            {officeIp && <span className="text-slate-400"> (Office IP: {officeIp})</span>}
          </p>
        </div>

        {/* Period Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
              period === 'day'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg border border-slate-200 p-16 text-center">
          <div className="relative inline-block mb-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Loading Attendance Data...
          </h3>
          <p className="text-sm text-slate-600 font-medium">Please wait while we fetch the data</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-900 mb-1">Error</p>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Attendance Data */}
      {!loading && !error && attendanceData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Records</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{attendanceData.totalRecords}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">On Time / Early</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {attendanceData.attendance.reduce((sum, u) => sum + u.stats.onTimeCount, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Late</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {attendanceData.attendance.reduce((sum, u) => sum + u.stats.lateCount, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Office Days</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {attendanceData.attendance.reduce((sum, u) => sum + u.stats.officeCount, 0)}
              </p>
            </div>
          </div>

          {/* Columnar Attendance Table */}
          {attendanceData.attendance.length > 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-900">
                    <tr>
                      {/* User Info Column */}
                      <th className="sticky left-0 z-10 bg-slate-50 px-6 py-4 text-left border-r border-slate-200">
                        <div className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Employee Details
                        </div>
                      </th>

                      {/* Stats Columns */}
                      <th className="px-4 py-4 text-center border-r border-slate-200">
                        <div className="text-xs font-semibold text-slate-700 uppercase">Days</div>
                      </th>
                      <th className="px-4 py-4 text-center border-r border-slate-200">
                        <div className="text-xs font-semibold text-slate-700 uppercase">On-Time</div>
                      </th>
                      <th className="px-4 py-4 text-center border-r border-slate-200">
                        <div className="text-xs font-semibold text-slate-700 uppercase">Late</div>
                      </th>
                      <th className="px-4 py-4 text-center border-r-2 border-slate-300">
                        <div className="text-xs font-semibold text-slate-700 uppercase">Office</div>
                      </th>

                      {/* Date Columns */}
                      {allDates.map((date) => (
                        <th key={date} className="px-6 py-4 text-center border-r border-slate-200 min-w-[200px]">
                          <div className="text-xs font-semibold text-slate-900">
                            {format(new Date(date), 'MMM dd, yyyy')}
                          </div>
                        </th>
                      ))}

                      {/* Email Action Column */}
                      <th className="px-4 py-4 text-center">
                        <div className="text-xs font-semibold text-slate-700 uppercase">Action</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {attendanceData.attendance.map((userAttendance) => {
                      // Create a map of date -> record for quick lookup
                      const recordsByDate = new Map(
                        userAttendance.records.map(r => [r.date, r])
                      );

                      return (
                        <tr key={userAttendance.user.id} className="hover:bg-slate-50 transition-colors duration-200 border-b border-slate-200">
                          {/* User Info */}
                          <td className="sticky left-0 z-10 bg-white px-6 py-4 border-r border-slate-200">
                            <div className="min-w-[200px]">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="font-semibold text-slate-900">{userAttendance.user.name}</div>
                              </div>
                              <div className="text-sm text-slate-600 font-medium">{userAttendance.user.jobRole}</div>
                              <div className="text-xs text-slate-500 mt-1">{userAttendance.user.email}</div>
                            </div>
                          </td>

                          {/* Stats */}
                          <td className="px-4 py-4 text-center border-r border-slate-200">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {userAttendance.stats.totalDays}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center border-r border-slate-200">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                              {userAttendance.stats.onTimeCount}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center border-r border-slate-200">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
                              {userAttendance.stats.lateCount}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center border-r-2 border-slate-300">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {userAttendance.stats.officeCount}
                            </span>
                          </td>

                          {/* Date Records */}
                          {allDates.map((date) => {
                            const record = recordsByDate.get(date);

                            return (
                              <td key={date} className="px-6 py-4 border-r border-slate-200">
                                {record ? (
                                  <div className="space-y-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-2 text-sm">
                                      <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                                      </div>
                                      <span className="font-semibold text-slate-900">{record.punchInTimeFormatted}</span>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${getStatusBadgeClass(record.statusColor)}`}>
                                        {record.status}
                                      </span>
                                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${getLocationBadgeClass(record.locationColor)}`}>
                                        {record.location}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      <span className="font-mono text-slate-600">{record.punchInIpAddress}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center text-slate-400 text-xs py-2">-</div>
                                )}
                              </td>
                            );
                          })}

                          {/* Email Button */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => handleSendEmail(userAttendance.user.id, userAttendance.user.email)}
                              disabled={sendingEmail === userAttendance.user.id}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              {sendingEmail === userAttendance.user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span className="whitespace-nowrap">Email</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Attendance Data</h3>
              <p className="text-sm text-slate-600 font-medium">
                No attendance records found for the selected period
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
